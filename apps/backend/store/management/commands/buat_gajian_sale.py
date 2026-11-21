"""Buat promo "Gajian Sale": produk yang sudah diskon dipotong lagi X% dari harga promonya.

  python manage.py buat_gajian_sale                          # pratinjau 25–28 Nov tahun ini, potong 1%
  python manage.py buat_gajian_sale --simpan                 # benar-benar membuat promo
  python manage.py buat_gajian_sale --mulai 2026-12-25 --selesai 2026-12-28 --persen 1 --simpan

- Hanya produk/varian yang SUDAH lebih murah dari harga normal pada waktu mulai promo
  (diskon lama atau promo "Potong harga" lain yang masih berjalan saat itu). Produk tanpa diskon tidak ikut.
- Promo berkuota (flash sale) tidak dijadikan dasar, supaya harga kuota terbatas tidak jadi harga tanpa batas.
- Harga baru dibulatkan ke bawah ke ratusan rupiah. Promo dibuat sebagai "Potong harga" biasa (bisa diubah
  atau dimatikan di Seller Center). Menjalankan ulang dengan nama & tanggal sama akan mengganti isinya.
"""
import datetime as dt
from decimal import ROUND_FLOOR, Decimal
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from store.models import PriceCut, PriceCutItem, Product
from store.pricing import price_info, running_items_queryset

WIB = ZoneInfo("Asia/Jakarta")


def rupiah(n) -> str:
    return "Rp" + f"{int(n):,}".replace(",", ".")


class Command(BaseCommand):
    help = "Buat promo Gajian Sale: harga promo yang sudah ada dipotong lagi X%."

    def add_arguments(self, parser):
        year = timezone.localtime().year
        parser.add_argument("--mulai", default=f"{year}-11-25", help="Tanggal mulai (YYYY-MM-DD), mulai 00:00 WIB")
        parser.add_argument("--selesai", default=f"{year}-11-28", help="Tanggal selesai (YYYY-MM-DD), sampai 23:59 WIB")
        parser.add_argument("--persen", type=Decimal, default=Decimal("1"), help="Potongan tambahan dari harga promo (%)")
        parser.add_argument("--nama", default="Gajian Sale", help="Nama promo")
        parser.add_argument("--simpan", action="store_true", help="Benar-benar membuat promo (tanpa ini = pratinjau)")

    def handle(self, *args, **o):
        try:
            start = dt.datetime.combine(dt.date.fromisoformat(o["mulai"]), dt.time(0, 0), WIB)
            end = dt.datetime.combine(dt.date.fromisoformat(o["selesai"]), dt.time(23, 59, 59), WIB)
        except ValueError as exc:
            raise CommandError("Format tanggal harus YYYY-MM-DD") from exc
        if end <= start:
            raise CommandError("Tanggal selesai harus setelah tanggal mulai")
        pct = o["persen"]
        if not (0 < pct < 50):
            raise CommandError("--persen harus antara 0 dan 50")
        bulan = "Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des".split()
        name = f"{o['nama']} {start.day}–{end.day} {bulan[end.month - 1]}"

        existing = PriceCut.objects.filter(name=name, starts_at=start).first()
        base_items = running_items_queryset(now=start)
        if existing:
            base_items = base_items.exclude(price_cut=existing)

        rows = []  # (product, variation|None, normal, base, new)
        products = Product.objects.filter(stock__gt=0).prefetch_related("variations").order_by("name")
        for p in products:
            p.running_promo_items = [i for i in base_items.filter(product=p) if i.quota is None]
            variations = p.buyable_variations()
            targets = [(v, price_info(p, v)) for v in variations if v.stock > 0] if variations else [(None, price_info(p))]
            for v, info in targets:
                if info.final >= info.normal:
                    continue  # belum diskon → tidak ikut
                new = (info.final * (Decimal(100) - pct) / Decimal(100) / 100).to_integral_value(ROUND_FLOOR) * 100
                if 0 < new < info.final:
                    rows.append((p, v, info.normal, info.final, new))

        self.stdout.write(f"{name}: {start:%d %b %Y %H:%M} – {end:%d %b %Y %H:%M} WIB, potong {pct}% dari harga promo")
        self.stdout.write(f"{len(rows)} produk/varian ikut (yang belum diskon tidak ikut).\n")
        for p, v, normal, base, new in rows[:400]:
            label = f"{p.name[:46]}{' · ' + v.name[:18] if v else ''}"
            disc = int(round((1 - new / normal) * 100))
            self.stdout.write(f"  {label:<68} {rupiah(base):>13} → {rupiah(new):>13}  (-{disc}% dari normal)")

        if not o["simpan"]:
            self.stdout.write("\nPratinjau saja. Jalankan dengan --simpan untuk membuat promonya.")
            return
        if not rows:
            self.stdout.write("Tidak ada produk diskon, promo tidak dibuat.")
            return
        with transaction.atomic():
            cut = existing or PriceCut(name=name)
            cut.starts_at, cut.ends_at, cut.is_active, cut.is_flash_sale = start, end, True, False
            cut.save()
            cut.items.all().delete()
            PriceCutItem.objects.bulk_create(
                [PriceCutItem(price_cut=cut, product=p, variation=v, promo_price=new) for p, v, _n, _b, new in rows]
            )
        self.stdout.write(self.style.SUCCESS(f"\nPromo \"{name}\" {'diperbarui' if existing else 'dibuat'}: {len(rows)} produk/varian."))
