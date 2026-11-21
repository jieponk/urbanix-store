from datetime import timedelta
from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from store import checkout_service as svc
from store.models import Category, Order, PriceCut, PriceCutItem, Product, ProductVariation, StoreSettings
from store.shipping import package_info, weight_text


class PackageInfoTests(TestCase):
    def setUp(self):
        cat = Category.objects.create(name="Audio", slug="audio-mic")
        self.p = Product.objects.create(
            category=cat, name="Mic", slug="mic", sku="MIC", description="-", price=Decimal("100000"),
            weight_grams=500, length_cm=20, width_cm=15, height_cm=10,
        )

    def test_volume_weight_wins_when_bigger(self):
        info = package_info(self.p)
        self.assertEqual(info["volume_weight_grams"], 500)  # 20*15*10/6000 = 0.5 kg
        self.assertEqual(info["ship_weight_grams"], 500)
        self.p.length_cm = 40
        info = package_info(self.p)
        self.assertEqual(info["volume_weight_grams"], 1000)
        self.assertEqual(info["ship_weight_grams"], 1000)

    def test_variation_overrides_and_inherits(self):
        v = ProductVariation(product=self.p, variation_id="v1", name="Bundle", price=Decimal("1"), weight_grams=2000)
        info = package_info(self.p, v)
        self.assertEqual(info["weight_grams"], 2000)
        self.assertEqual(info["length_cm"], 20)  # ikut produk
        self.assertEqual(info["ship_weight_grams"], 2000)

    def test_empty(self):
        self.p.weight_grams = self.p.length_cm = None
        self.assertIsNone(package_info(self.p)["ship_weight_grams"])

    def test_weight_text(self):
        self.assertEqual(weight_text(350), "350 g")
        self.assertEqual(weight_text(1200), "1,2 kg")
        self.assertEqual(weight_text(2000), "2 kg")


@override_settings(FRONTEND_URL="http://toko.test")
class FlashSaleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.api = APIClient()
        cat = Category.objects.create(name="Action Cam", slug="action-cam")
        self.cam = Product.objects.create(
            category=cat, name="Action Cam X", slug="x", sku="X", description="-",
            price=Decimal("1000000"), stock=10, weight_grams=400, length_cm=10, width_cm=10, height_cm=10,
        )
        self.cut = PriceCut.objects.create(
            name="Flash 12.12", is_flash_sale=True, ends_at=timezone.now() + timedelta(hours=3)
        )
        self.item = PriceCutItem.objects.create(price_cut=self.cut, product=self.cam, discount_percent=Decimal("20"), quota=2)
        store = StoreSettings.load()
        store.whatsapp_number = "6281234567890"
        store.save()

    def order(self, qty, key):
        return self.api.post("/api/v1/checkout/", {
            "payment_method": "WHATSAPP",
            "items": [{"product_id": self.cam.id, "quantity": qty}],
            "customer": {"name": "Budi", "phone": "081234567890"},
            "shipping": {"address": "Jl. Mawar 1 No. 2", "city": "Bandung", "service": "jne_reg"},
            "idempotency_key": key,
        }, format="json")

    def test_product_api_has_flash_and_package(self):
        r = self.api.get(f"/api/v1/products/{self.cam.id}/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["flash"]["quota"], 2)
        self.assertEqual(r.data["flash"]["left"], 2)
        self.assertEqual(r.data["package"]["ship_weight_grams"], 400)
        self.assertEqual(Decimal(r.data["final_price"]), Decimal("800000"))

    def test_quota_used_then_price_returns_to_normal(self):
        r = self.order(2, "a")
        self.assertEqual(r.status_code, 201, r.content)
        order = Order.objects.get()
        self.assertEqual(order.total_amount, Decimal("1600000"))
        self.assertEqual(order.total_weight_grams, 800)
        item = order.items.get()
        self.assertEqual(item.flash_item_id, self.item.id)
        self.assertIn("Perkiraan berat kirim: 800 g", svc.whatsapp_message(order))

        r = self.api.get(f"/api/v1/products/{self.cam.id}/")
        self.assertEqual(Decimal(r.data["final_price"]), Decimal("1000000"))  # kuota habis
        self.assertIsNone(r.data["flash"])

        # Pesanan dibatalkan -> kuota kembali
        order.status = "CANCELLED"
        order.save()
        r = self.api.get(f"/api/v1/products/{self.cam.id}/")
        self.assertEqual(r.data["flash"]["left"], 2)

    def test_order_over_quota_rejected(self):
        r = self.order(3, "b")
        self.assertEqual(r.status_code, 400)
        self.assertIn("tinggal 2", str(r.content.decode()))
        self.assertEqual(Order.objects.count(), 0)

    def test_quote_reports_weight_and_left(self):
        r = self.api.post("/api/v1/checkout/quote/", {"items": [{"product_id": self.cam.id, "quantity": 1}]}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["total_weight_grams"], 400)
        self.assertTrue(r.data["weight_complete"])
        self.assertEqual(r.data["items"][0]["flash_left"], 2)
