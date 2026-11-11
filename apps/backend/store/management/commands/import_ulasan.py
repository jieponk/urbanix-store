"""
Impor ulasan ASLI pembeli dari file JSON (disalin dari halaman Penilaian Toko Shopee).

    python manage.py import_ulasan            # default: data/shopee/ulasan_shopee.json
    python manage.py import_ulasan --file path/ke/file.json

Aman dijalankan berulang: ulasan yang sama (pembeli + tanggal + produk + varian) tidak digandakan.
Juga mengisi "Rating toko di Shopee" di Pengaturan toko dari nilai shop_rating di file.
"""
import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from store.models import Product, Review, StoreSettings

DEFAULT_FILE = Path(settings.BASE_DIR) / "data" / "shopee" / "ulasan_shopee.json"


class Command(BaseCommand):
    help = "Impor ulasan asli pembeli dari file JSON ke menu Ulasan."

    def add_arguments(self, parser):
        parser.add_argument("--file", default=str(DEFAULT_FILE))

    @transaction.atomic
    def handle(self, *args, **opts):
        path = Path(opts["file"])
        if not path.exists():
            raise CommandError(f"File tidak ditemukan: {path}")
        data = json.loads(path.read_text(encoding="utf-8"))

        products = {p.name.strip().lower(): p for p in Product.objects.all()}
        created = matched = 0
        for item in data.get("reviews", []):
            name = item["product"].strip()
            product = products.get(name.lower())
            matched += bool(product)
            _, is_new = Review.objects.get_or_create(
                source="SHOPEE",
                customer_name=item["user"][:80],
                review_date=date.fromisoformat(item["date"]),
                product_name=name[:255],
                variation_name=item.get("variation", "")[:255],
                defaults={
                    "rating": int(item["rating"]),
                    "text": item.get("comment", ""),
                    "product": product,
                    "is_published": True,
                },
            )
            created += is_new

        if data.get("shop_rating"):
            store = StoreSettings.load()
            store.shopee_rating = Decimal(str(data["shop_rating"]))
            store.save(update_fields=["shopee_rating"])

        total = len(data.get("reviews", []))
        self.stdout.write(
            self.style.SUCCESS(
                f"Selesai: {created} ulasan baru dari {total} di file "
                f"({matched} cocok dengan produk di katalog). Rating toko: {data.get('shop_rating', '-')}"
            )
        )
