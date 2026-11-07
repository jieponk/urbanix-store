"""Uji import_shopee memakai file Shopee asli di data/shopee/."""
from decimal import Decimal
from io import StringIO
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase
from unittest import skipUnless

from store.models import Category, PriceCut, Product, ProductVariation
from store.pricing import price_info

FOLDER = Path(settings.BASE_DIR) / "data" / "shopee"


@skipUnless(any(FOLDER.glob("*.xlsx")), "file Shopee tidak ada")
class ImportShopeeTests(TestCase):
    def run_import(self, *args):
        out = StringIO()
        call_command("import_shopee", *args, stdout=out)
        return out.getvalue()

    def test_dry_run_saves_nothing(self):
        out = self.run_import("--coba")
        self.assertIn("tidak ada yang disimpan", out)
        self.assertEqual(Product.objects.count(), 0)

    def test_full_import(self):
        self.run_import()
        self.assertEqual(Product.objects.filter(is_active=True).count(), 213)
        self.assertEqual(ProductVariation.objects.count(), 667)
        self.assertEqual(Category.objects.count(), 14)
        self.assertFalse(Category.objects.filter(name__in=["", "Uncategorized"]).exists())

        sony = Product.objects.get(pk=28344318989)
        self.assertEqual(sony.stock, sum(v.stock for v in sony.variations.all()))
        self.assertEqual(sony.category.name, "Kamera")
        camera_only = sony.variations.get(variation_id="320612977619")
        self.assertEqual(price_info(sony, camera_only).final, Decimal("18345000"))

        cut = PriceCut.objects.get(name="Diskon November")
        self.assertEqual(cut.items.count(), 354)
        self.assertEqual((cut.ends_at.month, cut.ends_at.day), (11, 30))

        self.assertTrue(ProductVariation.objects.exclude(image_url="").exists())
        full_gallery = sum(1 for p in Product.objects.all() if len(p.images) == 8)
        self.assertGreater(full_gallery, 50)  # banyak produk punya 9 foto (1 sampul + 8)

    def test_reimport_is_idempotent_and_deactivates_missing(self):
        self.run_import()
        cat = Category.objects.first()
        Product.objects.create(category=cat, name="Lama", slug="lama", sku="LAMA",
                               description="-", price=1, stock=1)
        self.run_import()
        self.assertFalse(Product.objects.get(sku="LAMA").is_active)
        self.assertEqual(ProductVariation.objects.count(), 667)
        self.assertEqual(PriceCut.objects.get(name="Diskon November").items.count(), 354)

    def test_old_seed_refuses(self):
        from django.core.management.base import CommandError
        with self.assertRaises(CommandError):
            call_command("seed_shopee", stdout=StringIO())
