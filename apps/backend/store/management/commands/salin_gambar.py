"""Salin foto produk dari CDN Shopee ke server Urbanix (WebP), supaya toko tidak bergantung pada Shopee.

  python manage.py salin_gambar                 # laporan: berapa foto masih dari Shopee
  python manage.py salin_gambar --simpan        # salin semua (bisa diulang; yang sudah disalin dilewati)
  python manage.py salin_gambar --simpan --maks 20

Setiap foto disimpan 2 ukuran di media/products/<id-produk>/: <kode>.webp (maks. 1200 px, halaman produk)
dan <kode>-450.webp (kartu produk). Link asli dicatat di media/products/_sumber.json (untuk dipulihkan).
"""
import hashlib
import io
import json
import re
import time
import urllib.request

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand

from store.images import ImageError, to_webp
from store.models import Product, ProductVariation

SHOPEE = re.compile(r"^https?://[^/]*(shopee\.co\.id|susercontent\.com)/file/[^/?@]+")
UA = "Mozilla/5.0 (compatible; UrbanixStore-ImageSync/1.0; +https://urbanix.id)"


def public_url(path: str) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}{settings.MEDIA_URL}{path}"


class Command(BaseCommand):
    help = "Salin foto produk dari Shopee ke server sendiri (WebP 1200 px + 450 px)."

    def add_arguments(self, parser):
        parser.add_argument("--simpan", action="store_true", help="Benar-benar menyalin & mengganti link")
        parser.add_argument("--maks", type=int, default=0, help="Maks. produk per jalan (0 = semua)")

    def handle(self, *args, **o):
        products = list(Product.objects.prefetch_related("variations").order_by("-id"))
        todo = [p for p in products if self._remote(p)]
        total_imgs = sum(len(self._remote(p)) for p in todo)
        self.stdout.write(f"{len(todo)} produk masih memakai foto dari Shopee ({total_imgs} foto).")
        if not o["simpan"]:
            self.stdout.write("Jalankan dengan --simpan untuk menyalin.")
            return
        if o["maks"]:
            todo = todo[: o["maks"]]

        log_path = "products/_sumber.json"
        try:
            with default_storage.open(log_path) as f:
                sources = json.load(f)
        except Exception:  # noqa: BLE001 — belum ada
            sources = {}

        copied = failed = 0
        for p in todo:
            changed = []
            mapping = {}
            for url in self._remote(p):
                try:
                    mapping[url] = self._copy(p.id, url)
                    sources[mapping[url]] = url
                    copied += 1
                except Exception as exc:  # noqa: BLE001 — lanjut, laporkan
                    failed += 1
                    self.stdout.write(f"  [gagal] #{p.id} {url[-40:]} — {str(exc)[:80]}")
                time.sleep(0.2)  # sopan ke CDN
            if not mapping:
                continue
            if p.image_url in mapping:
                p.image_url = mapping[p.image_url]
                changed.append("image_url")
            if p.images:
                new = [mapping.get(u, u) for u in p.images]
                if new != p.images:
                    p.images = new
                    changed.append("images")
            if changed:
                p.save(update_fields=changed)
            for v in p.variations.all():
                if v.image_url in mapping:
                    ProductVariation.objects.filter(pk=v.pk).update(image_url=mapping[v.image_url])
            self.stdout.write(f"  [ok] #{p.id} {p.name[:60]} ({len(mapping)} foto)")

        default_storage.delete(log_path) if default_storage.exists(log_path) else None
        default_storage.save(log_path, io.BytesIO(json.dumps(sources, indent=1).encode()))
        sisa = sum(1 for p in Product.objects.all() if self._remote(p))
        self.stdout.write(f"Selesai: {copied} foto disalin, {failed} gagal. Produk yang masih dari Shopee: {sisa}.")

    @staticmethod
    def _remote(p) -> list[str]:
        urls = [p.image_url, *(p.images or [])]
        urls += [v.image_url for v in p.variations.all()]
        seen, out = set(), []
        for u in urls:
            if u and SHOPEE.match(u) and u not in seen:
                seen.add(u)
                out.append(u)
        return out

    def _copy(self, product_id: int, url: str) -> str:
        key = hashlib.sha1(url.encode()).hexdigest()[:12]
        big = f"products/{product_id}/{key}.webp"
        small = f"products/{product_id}/{key}-450.webp"
        if default_storage.exists(big) and default_storage.exists(small):
            return public_url(big)
        req = urllib.request.Request(SHOPEE.match(url).group(0), headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310 (hanya CDN Shopee, dicek regex)
            raw = resp.read(15 * 1024 * 1024)
        try:
            webp_big = to_webp(io.BytesIO(raw), 1200)
            webp_small = to_webp(io.BytesIO(raw), 450)
        except ImageError as exc:
            raise ValueError("bukan gambar") from exc
        for path, content in ((big, webp_big), (small, webp_small)):
            if default_storage.exists(path):
                default_storage.delete(path)
            default_storage.save(path, content)
        return public_url(big)
