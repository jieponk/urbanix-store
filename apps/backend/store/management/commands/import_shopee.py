"""
Impor data terbaru dari file ekspor Shopee Seller Centre.

File yang dibaca (default dari folder apps/backend/data/shopee/):
- informasi_dasar.xlsx     : nama, SKU induk, deskripsi
- informasi_media.xlsx     : kategori, foto sampul, foto produk 1-8, foto variasi
- informasi_penjualan.xlsx : variasi, SKU, harga normal, stok
- diskon_*.xlsx            : harga diskon per variasi -> menu "Potong harga"

Contoh (PowerShell, di folder apps/backend dengan venv aktif):
    python manage.py import_shopee --coba        # lihat ringkasan saja, tanpa menyimpan
    python manage.py import_shopee               # simpan ke database

Aturan:
- Produk & varian diperbarui sesuai file (nama, deskripsi, kategori, gambar, harga, stok).
- Varian yang sudah tidak ada di file dihapus; produk yang tidak ada di file dinonaktifkan
  (tidak dihapus, supaya riwayat pesanan tetap utuh).
- Kategori dirapikan memakai store/category_map.py.
- Promo dari file diskon menggantikan isi promo dengan nama yang sama.
"""
import calendar
import re
from datetime import datetime, time
from decimal import Decimal, InvalidOperation
from pathlib import Path
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from store.category_map import clean_category
from store.models import Category, PriceCut, PriceCutItem, Product, ProductVariation
from store.xlsx_reader import read_sheets

DEFAULT_FOLDER = Path(settings.BASE_DIR) / "data" / "shopee"
WIB = ZoneInfo("Asia/Jakarta")
MONTHS = {
    "januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5, "juni": 6, "juli": 7,
    "agustus": 8, "september": 9, "oktober": 10, "november": 11, "desember": 12,
}


class DryRun(Exception):
    pass


def first_sheet(path: Path) -> list[list[str]]:
    sheets = read_sheets(path)
    return next(iter(sheets.values()))


def column_map(header: list[str]) -> dict[str, int]:
    return {h.strip(): i for i, h in enumerate(header) if h and h.strip()}


def data_rows(rows, id_col=0):
    """Baris data = baris yang kolom Kode Produk-nya berupa angka (lewati judul & petunjuk)."""
    for row in rows:
        if len(row) > id_col and row[id_col].strip().isdigit():
            yield row


def cell(row, index):
    return row[index].strip() if index is not None and index < len(row) else ""


def to_decimal(value: str):
    try:
        number = Decimal(str(value).replace(",", "").strip())
    except (InvalidOperation, ValueError):
        return None
    return number if number.is_finite() else None


def to_int(value: str) -> int:
    number = to_decimal(value)
    return max(0, int(number)) if number is not None else 0


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


class Command(BaseCommand):
    help = "Perbarui produk, varian, stok, harga, gambar, kategori, dan diskon dari file ekspor Shopee."

    def add_arguments(self, parser):
        parser.add_argument("--folder", default=str(DEFAULT_FOLDER), help="Folder berisi file xlsx Shopee.")
        parser.add_argument("--diskon", help="File diskon (default: diskon_*.xlsx di folder).")
        parser.add_argument("--nama-promo", help='Nama promo (default dari nama file, mis. "Diskon November").')
        parser.add_argument("--promo-selesai", help="Tanggal selesai promo YYYY-MM-DD (default: akhir bulan di nama file).")
        parser.add_argument("--coba", action="store_true", help="Hanya tampilkan ringkasan, tidak menyimpan.")

    # ------------------------------------------------------------------ baca file
    def find(self, folder: Path, name: str) -> Path:
        matches = sorted(folder.glob(f"*{name}*.xlsx"))
        if not matches:
            raise CommandError(f"File {name}.xlsx tidak ditemukan di {folder}")
        return matches[-1]

    def read_basic(self, path):
        rows = first_sheet(path)
        cols = column_map(rows[0])
        result = {}
        for r in data_rows(rows):
            result[r[0]] = {
                "parent_sku": cell(r, cols.get("et_title_parent_sku")),
                "name": cell(r, cols.get("et_title_product_name")),
                "description": cell(r, cols.get("et_title_product_description")),
            }
        return result

    def read_media(self, path):
        rows = first_sheet(path)
        cols = column_map(rows[0])
        image_cols = [cols.get(f"ps_item_image.{i}") for i in range(1, 9)]
        first_option = cols.get("et_title_variation_1", 0) + 1  # nama opsi 1, lalu foto opsi 1, dst.
        result = {}
        for r in data_rows(rows):
            options = {}
            for i in range(first_option, len(r) - 1, 2):
                option, image = r[i].strip(), r[i + 1].strip()
                if option and image.startswith("http"):
                    options[norm(option)] = image
            result[r[0]] = {
                "category": cell(r, cols.get("et_title_product_category")),
                "cover": cell(r, cols.get("ps_item_cover_image")),
                "images": [cell(r, c) for c in image_cols if cell(r, c).startswith("http")],
                "option_images": options,
            }
        return result

    def read_sales(self, path):
        rows = first_sheet(path)
        cols = column_map(rows[0])
        result: dict[str, list[dict]] = {}
        for r in data_rows(rows):
            result.setdefault(r[0], []).append(
                {
                    "name": cell(r, cols.get("et_title_product_name")),
                    "variation_id": cell(r, cols.get("et_title_variation_id")),
                    "variation_name": cell(r, cols.get("et_title_variation_name")),
                    "parent_sku": cell(r, cols.get("et_title_parent_sku")),
                    "sku": cell(r, cols.get("et_title_variation_sku")),
                    "price": to_decimal(cell(r, cols.get("et_title_variation_price"))),
                    "stock": to_int(cell(r, cols.get("et_title_variation_stock"))),
                }
            )
        return result

    def read_discount(self, path):
        rows = first_sheet(path)
        header = [h.replace("\xa0", " ").strip().lower() for h in rows[0]]

        def find_col(*names):
            for name in names:
                for i, h in enumerate(header):
                    if h.startswith(name):
                        return i
            raise CommandError(f"Kolom '{names[0]}' tidak ditemukan di file diskon {path.name}")

        c_pid, c_vid = find_col("kode produk"), find_col("kode variasi")
        c_price = find_col("harga diskon")
        return [
            {"product_id": r[c_pid].strip(), "variation_id": cell(r, c_vid), "price": to_decimal(cell(r, c_price))}
            for r in data_rows(rows, c_pid)
        ]

    # ------------------------------------------------------------------ promo
    def promo_defaults(self, path: Path, opts):
        stem = path.stem.split("-", 1)[-1] if "-" in path.stem else path.stem
        name = opts.get("nama_promo") or stem.replace("_", " ").strip().title()
        ends = None
        if opts.get("promo_selesai"):
            day = datetime.strptime(opts["promo_selesai"], "%Y-%m-%d").date()
            ends = datetime.combine(day, time(23, 59, 59), WIB)
        else:
            month = next((m for word, m in MONTHS.items() if word in stem.lower()), None)
            if month:
                today = datetime.now(WIB).date()
                year = today.year + (1 if month < today.month - 6 else 0)
                last = calendar.monthrange(year, month)[1]
                ends = datetime(year, month, last, 23, 59, 59, tzinfo=WIB)
        return name, ends

    # ------------------------------------------------------------------ utama
    def handle(self, *args, **opts):
        folder = Path(opts["folder"])
        basic = self.read_basic(self.find(folder, "informasi_dasar"))
        media = self.read_media(self.find(folder, "informasi_media"))
        sales = self.read_sales(self.find(folder, "informasi_penjualan"))
        discount_path = Path(opts["diskon"]) if opts.get("diskon") else None
        if discount_path is None:
            found = sorted(folder.glob("*diskon*.xlsx"))
            discount_path = found[-1] if found else None
        discounts = self.read_discount(discount_path) if discount_path else []

        self.stdout.write(
            f"File dibaca: {len(basic)} produk (dasar), {len(media)} (media), "
            f"{sum(map(len, sales.values()))} variasi (penjualan), {len(discounts)} baris diskon."
        )
        missing = set(sales) - set(basic) - set(media)
        if missing:
            self.stdout.write(self.style.WARNING(f"{len(missing)} produk hanya ada di file penjualan."))

        try:
            with transaction.atomic():
                report = self.import_all(basic, media, sales)
                if discount_path:
                    report.update(self.import_discount(discount_path, discounts, opts))
                self.print_report(report)
                if opts["coba"]:
                    raise DryRun
        except DryRun:
            self.stdout.write(self.style.WARNING("Mode --coba: tidak ada yang disimpan."))
            return
        self.stdout.write(self.style.SUCCESS("IMPOR SELESAI. Data toko sudah memakai file Shopee terbaru."))

    def import_all(self, basic, media, sales):
        report = {"baru": 0, "diperbarui": 0, "nonaktif": 0, "varian": 0, "varian_dihapus": 0,
                  "foto_varian": 0, "kategori": {}, "kategori_dihapus": 0}
        used_skus = set()
        categories: dict[str, Category] = {}

        for pid, rows in sales.items():
            info, med = basic.get(pid, {}), media.get(pid, {})
            name = info.get("name") or rows[0]["name"]

            cat_name = clean_category(med.get("category", ""), name)
            if cat_name not in categories:
                categories[cat_name], _ = Category.objects.get_or_create(
                    name=cat_name, defaults={"slug": slugify(cat_name) or "lainnya"}
                )
            report["kategori"][cat_name] = report["kategori"].get(cat_name, 0) + 1

            # SKU induk unik: dari file, atau SKU varian tunggal, atau SHOPEE-<id>.
            sku = info.get("parent_sku") or rows[0]["parent_sku"]
            if not sku and len(rows) == 1 and rows[0]["sku"]:
                sku = rows[0]["sku"]
            sku = (sku or f"SHOPEE-{pid}")[:50]
            if sku in used_skus or Product.objects.filter(sku=sku).exclude(pk=pid).exists():
                sku = f"{sku[:38]}-{pid}"
            used_skus.add(sku)

            prices = [r["price"] for r in rows if r["price"] is not None]
            cover = med.get("cover") or ""
            gallery = [u for u in dict.fromkeys(med.get("images", [])) if u != cover][:8]

            product = Product.objects.filter(pk=pid).first()
            values = {
                "name": name[:255],
                "description": info.get("description") or (product.description if product else ""),
                "category": categories[cat_name],
                "sku": sku,
                "price": min(prices) if prices else Decimal("0"),
                "discount_price": None,  # diskon sekarang lewat menu Potong harga
                "stock": sum(r["stock"] for r in rows),
                "is_active": True,
                "images": gallery,
            }
            if cover:
                values["image_url"] = cover
            if product:
                for field, value in values.items():
                    setattr(product, field, value)
                product.save()
                report["diperbarui"] += 1
            else:
                slug = f"{slugify(name)[:36]}-{pid}"[:50]
                product = Product.objects.create(id=int(pid), slug=slug, **values)
                report["baru"] += 1

            option_images = med.get("option_images", {})
            keep = []
            for r in rows:
                if not r["variation_id"] or r["price"] is None:
                    continue
                first_option = norm(r["variation_name"].split(",")[0])
                image = option_images.get(first_option, "")
                report["foto_varian"] += bool(image)
                ProductVariation.objects.update_or_create(
                    variation_id=r["variation_id"],
                    defaults={
                        "product": product,
                        "name": r["variation_name"][:255],
                        "sku": r["sku"][:100],
                        "price": r["price"],
                        "stock": r["stock"],
                        "image_url": image,
                    },
                )
                keep.append(r["variation_id"])
                report["varian"] += 1
            deleted, _ = product.variations.exclude(variation_id__in=keep).delete()
            report["varian_dihapus"] += deleted

        report["nonaktif"] = (
            Product.objects.filter(is_active=True).exclude(pk__in=[int(p) for p in sales]).update(is_active=False)
        )
        empty = Category.objects.filter(products__isnull=True)
        report["kategori_dihapus"] = empty.count()
        empty.delete()
        return report

    def import_discount(self, path, discounts, opts):
        name, ends = self.promo_defaults(path, opts)
        cut, _ = PriceCut.objects.get_or_create(name=name)
        cut.is_active, cut.ends_at = True, ends
        cut.save()
        cut.items.all().delete()

        products = Product.objects.prefetch_related("variations").in_bulk([int(d["product_id"]) for d in discounts])
        created, skipped = 0, []
        for d in discounts:
            product = products.get(int(d["product_id"]))
            variation = None
            if product and d["variation_id"]:
                variation = next((v for v in product.variations.all() if v.variation_id == d["variation_id"]), None)
            if not product or d["price"] is None:
                skipped.append(f"{d['product_id']}/{d['variation_id']}: produk/harga tidak ditemukan")
                continue
            # Produk satu varian tanpa nama dibeli sebagai produk biasa -> promo level produk.
            if variation and not product.buyable_variations():
                variation = None
            normal = variation.price if variation else product.price
            if d["price"] <= 0 or d["price"] >= normal:
                skipped.append(f"{variation or product}: harga diskon {d['price']:,.0f} tidak di bawah normal {normal:,.0f}")
                continue
            PriceCutItem.objects.create(price_cut=cut, product=product, variation=variation, promo_price=d["price"])
            created += 1
        return {"promo": name, "promo_selesai": ends, "promo_item": created, "promo_lewati": skipped}

    def print_report(self, r):
        w = self.stdout.write
        w("")
        w(f"Produk baru         : {r['baru']}")
        w(f"Produk diperbarui   : {r['diperbarui']}")
        w(f"Produk dinonaktifkan: {r['nonaktif']} (tidak ada lagi di file Shopee)")
        w(f"Varian              : {r['varian']} (dihapus karena tidak ada di file: {r['varian_dihapus']})")
        w(f"Varian dengan foto  : {r['foto_varian']}")
        w(f"Kategori            : {len(r['kategori'])} (kategori kosong dihapus: {r['kategori_dihapus']})")
        for name, count in sorted(r["kategori"].items(), key=lambda x: -x[1]):
            w(f"    {count:3}  {name}")
        if "promo" in r:
            ends = r["promo_selesai"].strftime("%d %b %Y %H:%M WIB") if r["promo_selesai"] else "tanpa batas"
            w(f'Promo "{r["promo"]}": {r["promo_item"]} produk/varian, berlaku sampai {ends}')
            for line in r["promo_lewati"][:20]:
                w(self.style.WARNING(f"    dilewati: {line}"))
