from decimal import Decimal
from urllib.parse import unquote

from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from store.models import Category, Order, PriceCut, PriceCutItem, Product, Review, StoreSettings


class WhatsappDiscountTests(TestCase):
    def setUp(self):
        cache.clear()
        self.api = APIClient()
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.cam = Product.objects.create(category=cat, name="Kamera", slug="k", sku="K",
                                          description="-", price=Decimal("1000000"), stock=5)
        self.mic = Product.objects.create(category=cat, name="Mic", slug="m", sku="M",
                                          description="-", price=Decimal("200000"), stock=5)
        cut = PriceCut.objects.create(name="Diskon November")
        PriceCutItem.objects.create(price_cut=cut, product=self.cam, promo_price=Decimal("800000"))
        s = StoreSettings.load(); s.whatsapp_number = "6281"; s.save()  # default diskon 5%

    def checkout(self, method="WHATSAPP"):
        return self.api.post("/api/v1/checkout/", {
            "payment_method": method,
            "items": [{"product_id": self.cam.id, "quantity": 1}, {"product_id": self.mic.id, "quantity": 2}],
            "customer": {"name": "Budi", "phone": "081234567890"},
            "shipping": {"address": "Jl. Mawar 1 RT 2", "city": "Bandung"},
        }, format="json")

    def test_default_5_percent_not_on_promo_items(self):
        q = self.api.post("/api/v1/checkout/quote/", {"items": [
            {"product_id": self.cam.id, "quantity": 1}, {"product_id": self.mic.id, "quantity": 2}]},
            format="json").data
        self.assertEqual((q["whatsapp_discount"]["percent"], q["whatsapp_discount"]["amount"]), ("5", "20000"))
        r = self.checkout()
        self.assertEqual(r.status_code, 201, r.content)
        order = Order.objects.get()
        # 800.000 (promo, tanpa diskon WA) + 400.000 - 5% x 400.000
        self.assertEqual((order.total_amount, order.discount_amount), (Decimal("1180000"), Decimal("20000")))
        text = unquote(r.data["whatsapp_url"])
        for part in ["Subtotal: Rp1.200.000", "Diskon pesan via WhatsApp 5%: -Rp20.000", "Total: Rp1.180.000"]:
            self.assertIn(part, text)
        d = self.api.get(f"/api/v1/checkout/orders/{order.order_number}/").data
        self.assertEqual(d["discount_amount"], "20000.00")

    def test_stack_on_promo_when_enabled(self):
        s = StoreSettings.load(); s.whatsapp_discount_on_promo = True; s.save()
        self.checkout()
        self.assertEqual(Order.objects.get().discount_amount, Decimal("60000"))

    def test_zero_percent_disables(self):
        s = StoreSettings.load(); s.whatsapp_discount_percent = 0; s.save()
        self.checkout()
        self.assertEqual(Order.objects.get().discount_amount, 0)
        self.assertFalse(self.api.get("/api/v1/store-settings/").data["show_whatsapp_popup"])

    def test_settings_expose_popup(self):
        d = self.api.get("/api/v1/store-settings/").data
        self.assertTrue(d["show_whatsapp_popup"])
        self.assertEqual(d["whatsapp_discount_percent"], "5")
        self.assertIn("shopee.co.id", d["shopee_reviews_url"])


class ReviewTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.p = Product.objects.create(category=cat, name="Kamera", slug="k", sku="K",
                                        description="-", price=1, stock=1)

    def test_list_masks_names_and_hides_unpublished(self):
        Review.objects.create(customer_name="budiman", rating=5, text="Mantap", product=self.p)
        Review.objects.create(customer_name="sari", rating=4, text="Ok", is_published=False)
        data = self.api.get("/api/v1/reviews/").data
        self.assertEqual(len(data), 1)
        self.assertEqual((data[0]["name"], data[0]["product_name"]), ("b***n", "Kamera"))
        self.assertEqual(len(self.api.get(f"/api/v1/reviews/?product={self.p.id + 1}").data), 0)
        self.assertEqual(self.api.get("/api/v1/store-settings/").data["review_count"], 1)
