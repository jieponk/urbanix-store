import datetime as dt
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from store.models import Category, PriceCut, PriceCutItem, Product, ProductVariation
from store.pricing import price_info


class GajianSaleTests(TestCase):
    def setUp(self):
        c = Category.objects.create(name="Kamera", slug="kamera")
        self.disc = Product.objects.create(name="Kamera Diskon", slug="a", sku="A", category=c, price=10_000_000,
                                           discount_price=9_500_000, stock=3)
        self.plain = Product.objects.create(name="Kamera Normal", slug="b", sku="B", category=c, price=5_000_000, stock=3)
        self.var = Product.objects.create(name="Lensa", slug="c", sku="C", category=c, price=2_000_000, stock=4)
        self.v1 = ProductVariation.objects.create(product=self.var, name="Hitam", variation_id=1, price=2_000_000, stock=2)
        self.v2 = ProductVariation.objects.create(product=self.var, name="Putih", variation_id=2, price=2_000_000, stock=2)
        old = PriceCut.objects.create(name="Promo lama")
        PriceCutItem.objects.create(price_cut=old, product=self.var, variation=self.v1, discount_percent=Decimal("10"))

    def run_cmd(self, *args):
        out = StringIO()
        call_command("buat_gajian_sale", "--mulai", "2026-11-25", "--selesai", "2026-11-28", *args, stdout=out)
        return out.getvalue()

    def test_preview_does_not_save(self):
        out = self.run_cmd()
        self.assertIn("2 produk/varian ikut", out)
        self.assertFalse(PriceCut.objects.filter(name__startswith="Gajian").exists())

    def test_saves_one_percent_below_existing_promo_only_for_discounted(self):
        self.run_cmd("--simpan")
        cut = PriceCut.objects.get(name="Gajian Sale 25–28 Nov")
        prices = {(i.product_id, i.variation_id): i.promo_price for i in cut.items.all()}
        self.assertEqual(prices, {(self.disc.id, None): Decimal("9405000"), (self.var.id, self.v1.id): Decimal("1782000")})
        # dijalankan ulang → tidak dobel, dasar tetap harga promo lama (bukan harga Gajian Sale)
        self.run_cmd("--simpan")
        self.assertEqual(PriceCut.objects.filter(name__startswith="Gajian").count(), 1)
        self.assertEqual(cut.items.count(), 2)
        self.assertEqual(cut.items.get(product=self.disc).promo_price, Decimal("9405000"))

    def test_price_applies_during_window(self):
        self.run_cmd("--simpan")
        from django.utils import timezone
        from unittest import mock
        during = dt.datetime(2026, 11, 26, 12, tzinfo=dt.timezone.utc)
        with mock.patch.object(timezone, "now", return_value=during):
            self.assertEqual(price_info(Product.objects.get(pk=self.disc.pk)).final, Decimal("9405000"))
            self.assertEqual(price_info(Product.objects.get(pk=self.plain.pk)).final, Decimal("5000000"))
