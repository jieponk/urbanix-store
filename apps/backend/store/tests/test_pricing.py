from datetime import timedelta
from decimal import Decimal

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from store.models import Category, PriceCut, PriceCutItem, Product, ProductVariation, StoreSettings


class PriceCutTests(TestCase):
    def setUp(self):
        cache.clear()
        self.api = APIClient()
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.sony = Product.objects.create(
            category=cat, name="Sony", slug="sony", sku="SON", description="-",
            price=Decimal("20999000"), stock=9, images=["https://x/2.jpg", "https://x/3.jpg"],
        )
        self.v1 = ProductVariation.objects.create(product=self.sony, variation_id="v1", name="Body",
                                                  sku="SON-B", price=Decimal("20999000"), stock=2)
        self.v2 = ProductVariation.objects.create(product=self.sony, variation_id="v2", name="+ SD",
                                                  sku="SON-SD", price=Decimal("24999000"), stock=7,
                                                  image_url="https://x/sd.jpg")
        self.mic = Product.objects.create(category=cat, name="Mic", slug="mic", sku="MIC",
                                          description="-", price=Decimal("1000000"), stock=5)
        s = StoreSettings.load(); s.whatsapp_number = "6281"; s.save()

    def product(self, p):
        return self.api.get(f"/api/v1/products/{p.id}/").data

    def test_no_promo(self):
        d = self.product(self.sony)
        self.assertEqual(d["discount_percent"], 0)
        self.assertEqual(Decimal(d["final_price"]), Decimal("20999000"))
        self.assertEqual(d["images"], ["https://x/2.jpg", "https://x/3.jpg"])
        self.assertEqual(d["variations"][1]["image_url"], "https://x/sd.jpg")

    def test_variation_promo_price(self):
        cut = PriceCut.objects.create(name="11.11")
        PriceCutItem.objects.create(price_cut=cut, product=self.sony, variation=self.v2,
                                    promo_price=Decimal("19999000"))
        d = self.product(self.sony)
        v2 = next(v for v in d["variations"] if v["variation_id"] == "v2")
        self.assertEqual((Decimal(v2["final_price"]), v2["discount_percent"]), (Decimal("19999000"), 20))
        # headline produk = varian termurah setelah promo
        self.assertEqual(Decimal(d["final_price"]), Decimal("19999000"))
        self.assertEqual(Decimal(d["price"]), Decimal("24999000"))
        self.assertEqual((d["discount_percent"], d["promo_name"]), (20, "11.11"))

    def test_percent_promo_all_variants(self):
        cut = PriceCut.objects.create(name="Diskon 10%")
        PriceCutItem.objects.create(price_cut=cut, product=self.sony, discount_percent=Decimal("10"))
        d = self.product(self.sony)
        self.assertEqual([Decimal(v["final_price"]) for v in d["variations"]],
                         [Decimal("18899100"), Decimal("22499100")])

    def test_expired_and_inactive_promo_ignored(self):
        now = timezone.now()
        old = PriceCut.objects.create(name="Lama", starts_at=now - timedelta(days=3), ends_at=now - timedelta(days=1))
        off = PriceCut.objects.create(name="Mati", is_active=False)
        future = PriceCut.objects.create(name="Nanti", starts_at=now + timedelta(days=1))
        for c in (old, off, future):
            PriceCutItem.objects.create(price_cut=c, product=self.mic, promo_price=Decimal("500000"))
        self.assertEqual(self.product(self.mic)["discount_percent"], 0)

    def test_lowest_promo_wins(self):
        a = PriceCut.objects.create(name="A"); b = PriceCut.objects.create(name="B")
        PriceCutItem.objects.create(price_cut=a, product=self.mic, promo_price=Decimal("900000"))
        PriceCutItem.objects.create(price_cut=b, product=self.mic, discount_percent=Decimal("25"))
        d = self.product(self.mic)
        self.assertEqual((Decimal(d["final_price"]), d["promo_name"]), (Decimal("750000"), "B"))

    def test_checkout_uses_promo_price(self):
        cut = PriceCut.objects.create(name="11.11")
        PriceCutItem.objects.create(price_cut=cut, product=self.sony, variation=self.v2,
                                    promo_price=Decimal("19999000"))
        r = self.api.post("/api/v1/checkout/", {
            "payment_method": "WHATSAPP",
            "items": [{"product_id": self.sony.id, "variation_id": "v2", "quantity": 2}],
            "customer": {"name": "Budi", "phone": "081234567890"},
            "shipping": {"address": "Jl. Mawar 1 RT 2", "city": "Bandung"},
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        from store.models import Order
        self.assertEqual(Order.objects.get().total_amount, Decimal("39998000"))

    def test_validation(self):
        cut = PriceCut.objects.create(name="X")
        cases = [
            dict(product=self.mic),  # tidak diisi apa pun
            dict(product=self.mic, promo_price=Decimal("1"), discount_percent=Decimal("5")),
            dict(product=self.mic, promo_price=Decimal("1000000")),  # tidak lebih murah
            dict(product=self.sony, promo_price=Decimal("100")),  # produk bervarian, harga tetap
            dict(product=self.mic, variation=self.v1, promo_price=Decimal("100")),  # varian produk lain
            dict(product=self.mic, discount_percent=Decimal("100")),
        ]
        for kw in cases:
            with self.assertRaises(ValidationError, msg=str(kw)):
                PriceCutItem(price_cut=cut, **kw).full_clean()
        PriceCutItem(price_cut=cut, product=self.mic, promo_price=Decimal("900000")).full_clean()
