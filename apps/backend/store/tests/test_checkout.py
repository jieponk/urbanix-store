from decimal import Decimal
from unittest import mock
from urllib.parse import unquote

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from store import checkout_service as svc
from store.models import Category, Order, Product, StoreSettings

SERVER_KEY = "SB-Mid-server-TESTKEY"


def signed(order_id, status_code, gross, **extra):
    with override_settings(MIDTRANS_SERVER_KEY=SERVER_KEY):
        sig = svc.midtrans_signature(order_id, status_code, gross)
    return {
        "order_id": order_id,
        "status_code": status_code,
        "gross_amount": gross,
        "signature_key": sig,
        **extra,
    }


@override_settings(MIDTRANS_SERVER_KEY=SERVER_KEY, FRONTEND_URL="http://toko.test")
class CheckoutTests(TestCase):
    def setUp(self):
        cache.clear()  # reset throttle
        self.api = APIClient()
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.cam = Product.objects.create(
            category=cat, name="Kamera A", slug="kamera-a", sku="K-A",
            description="-", price=Decimal("1000000"), discount_price=Decimal("900000"),
            stock=5, shopee_url="https://shopee.co.id/kamera-a",
        )
        self.mic = Product.objects.create(
            category=cat, name="Mic B", slug="mic-b", sku="M-B",
            description="-", price=Decimal("250000"), stock=2,
        )
        store = StoreSettings.load()
        store.whatsapp_number = "6281234567890"
        store.shopee_store_url = "https://shopee.co.id/urbanix"
        store.save()

    def body(self, method, **over):
        data = {
            "payment_method": method,
            "items": [
                {"product_id": self.cam.id, "quantity": 2},
                {"product_id": self.mic.id, "quantity": 1},
            ],
            "customer": {"name": "Budi", "phone": "0812-3456-7890", "email": "budi@contoh.id"},
            "shipping": {"address": "Jl. Mawar 1", "city": "Bandung",
                         "province": "Jawa Barat", "postal_code": "40111"},
            "notes": "Tolong bubble wrap",
            "idempotency_key": f"key-{method}",
        }
        data.update(over)
        return data

    # ---------------------------------------------------------- quote & settings
    def test_quote_uses_database_prices(self):
        r = self.api.post("/api/v1/checkout/quote/", {"items": [
            {"product_id": self.cam.id, "quantity": 2}]}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(Decimal(r.data["subtotal"]), Decimal("1800000"))
        self.assertEqual(r.data["items"][0]["shopee_url"], "https://shopee.co.id/kamera-a")
        self.assertEqual(r.data["methods"], {"midtrans": True, "whatsapp": True, "shopee": True})

    def test_quote_rejects_inactive_product(self):
        self.mic.is_active = False
        self.mic.save()
        r = self.api.post("/api/v1/checkout/quote/", {"items": [
            {"product_id": self.mic.id, "quantity": 1}]}, format="json")
        self.assertEqual(r.status_code, 400)

    @override_settings(MIDTRANS_SERVER_KEY="SB-Mid-server-demo")
    def test_midtrans_disabled_without_real_key(self):
        r = self.api.get("/api/v1/store-settings/")
        self.assertFalse(r.data["methods"]["midtrans"])
        r = self.api.post("/api/v1/checkout/", self.body("MIDTRANS"), format="json")
        self.assertEqual(r.status_code, 400)

    def test_whatsapp_disabled_without_number(self):
        store = StoreSettings.load()
        store.whatsapp_number = ""
        store.save()
        r = self.api.post("/api/v1/checkout/", self.body("WHATSAPP"), format="json")
        self.assertEqual(r.status_code, 400)

    # ---------------------------------------------------------- WhatsApp
    def test_whatsapp_order_saved_stock_unchanged(self):
        r = self.api.post("/api/v1/checkout/", self.body("WHATSAPP"), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        order = Order.objects.get(order_number=r.data["order_number"])
        self.assertIsNone(order.user)
        self.assertEqual(order.total_amount, Decimal("2050000"))
        self.assertEqual(order.customer_phone, "081234567890")
        self.assertFalse(order.stock_reserved)
        self.cam.refresh_from_db()
        self.assertEqual(self.cam.stock, 5)
        text = unquote(r.data["whatsapp_url"])
        self.assertTrue(r.data["whatsapp_url"].startswith("https://wa.me/6281234567890?text="))
        for part in [order.order_number, "Kamera A x2", "Rp1.800.000", "Budi",
                     "Jl. Mawar 1, Bandung", "Tolong bubble wrap", "ongkir"]:
            self.assertIn(part, text)

    def test_customer_required_except_shopee(self):
        body = self.body("WHATSAPP")
        del body["customer"]
        r = self.api.post("/api/v1/checkout/", body, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("customer", r.data)

    def test_invalid_phone(self):
        body = self.body("WHATSAPP", customer={"name": "Budi", "phone": "12345"})
        r = self.api.post("/api/v1/checkout/", body, format="json")
        self.assertEqual(r.status_code, 400)

    def test_idempotent_double_submit(self):
        a = self.api.post("/api/v1/checkout/", self.body("WHATSAPP"), format="json")
        b = self.api.post("/api/v1/checkout/", self.body("WHATSAPP"), format="json")
        self.assertEqual(a.data["order_number"], b.data["order_number"])
        self.assertEqual(Order.objects.count(), 1)

    # ---------------------------------------------------------- Shopee
    def test_shopee_returns_links_without_order(self):
        r = self.api.post("/api/v1/checkout/", {
            "payment_method": "SHOPEE",
            "items": [{"product_id": self.cam.id, "quantity": 1},
                      {"product_id": self.mic.id, "quantity": 1}],
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        urls = [l["url"] for l in r.data["shopee_links"]]
        self.assertEqual(urls, ["https://shopee.co.id/kamera-a", "https://shopee.co.id/urbanix"])
        self.assertEqual(Order.objects.count(), 0)

    # ---------------------------------------------------------- Midtrans
    def _midtrans_order(self):
        fake = mock.Mock(status_code=201)
        fake.json.return_value = {"token": "tok-1", "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/tok-1"}
        with mock.patch("store.checkout_service.requests.post", return_value=fake) as post:
            r = self.api.post("/api/v1/checkout/", self.body("MIDTRANS"), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["transaction_details"]["gross_amount"], 2050000)
        self.assertEqual(
            sum(i["price"] * i["quantity"] for i in payload["item_details"]), 2050000
        )
        self.assertEqual(payload["callbacks"]["finish"], f"http://toko.test/pesanan/{r.data['order_number']}")
        return Order.objects.get(order_number=r.data["order_number"]), r

    def test_midtrans_reserves_stock_and_returns_redirect(self):
        order, r = self._midtrans_order()
        self.assertIn("snap/v2/vtweb", r.data["payment_url"])
        self.assertTrue(order.stock_reserved)
        self.cam.refresh_from_db(); self.mic.refresh_from_db()
        self.assertEqual((self.cam.stock, self.mic.stock), (3, 1))

    def test_midtrans_api_failure_restores_stock(self):
        with mock.patch("store.checkout_service.requests.post", side_effect=OSError("down")):
            r = self.api.post("/api/v1/checkout/", self.body("MIDTRANS"), format="json")
        self.assertEqual(r.status_code, 400)
        self.cam.refresh_from_db()
        self.assertEqual(self.cam.stock, 5)
        self.assertEqual(Order.objects.get().status, "CANCELLED")

    def test_midtrans_insufficient_stock(self):
        body = self.body("MIDTRANS", items=[{"product_id": self.mic.id, "quantity": 3}])
        r = self.api.post("/api/v1/checkout/", body, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("tidak mencukupi", r.data["error"])
        self.mic.refresh_from_db()
        self.assertEqual(self.mic.stock, 2)

    # ---------------------------------------------------------- webhook
    def test_webhook_rejects_missing_or_bad_signature(self):
        order, _ = self._midtrans_order()
        r = self.api.post("/api/v1/payments/midtrans-webhook/", {
            "order_id": order.order_number, "status_code": "200",
            "gross_amount": "2050000.00", "transaction_status": "settlement"}, format="json")
        self.assertEqual(r.status_code, 403)
        bad = signed(order.order_number, "200", "2050000.00", transaction_status="settlement")
        bad["signature_key"] = "0" * 128
        r = self.api.post("/api/v1/payments/midtrans-webhook/", bad, format="json")
        self.assertEqual(r.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "UNPAID")

    def test_webhook_rejects_amount_mismatch(self):
        order, _ = self._midtrans_order()
        r = self.api.post("/api/v1/payments/midtrans-webhook/",
                          signed(order.order_number, "200", "1.00", transaction_status="settlement"),
                          format="json")
        self.assertEqual(r.status_code, 400)

    def test_webhook_settlement_marks_paid(self):
        order, _ = self._midtrans_order()
        r = self.api.post("/api/v1/payments/midtrans-webhook/",
                          signed(order.order_number, "200", "2050000.00", transaction_status="settlement"),
                          format="json")
        self.assertEqual(r.status_code, 200)
        order.refresh_from_db()
        self.assertEqual((order.payment_status, order.status), ("PAID", "PROCESSING"))
        self.cam.refresh_from_db()
        self.assertEqual(self.cam.stock, 3)  # stok tetap terpotong

    def test_webhook_expire_restores_stock_once(self):
        order, _ = self._midtrans_order()
        payload = signed(order.order_number, "407", "2050000.00", transaction_status="expire")
        for _ in range(2):  # Midtrans bisa mengirim notifikasi berulang
            r = self.api.post("/api/v1/payments/midtrans-webhook/", payload, format="json")
            self.assertEqual(r.status_code, 200)
        order.refresh_from_db()
        self.assertEqual((order.payment_status, order.status), ("EXPIRED", "CANCELLED"))
        self.cam.refresh_from_db(); self.mic.refresh_from_db()
        self.assertEqual((self.cam.stock, self.mic.stock), (5, 2))

    def test_late_expire_after_paid_is_ignored(self):
        order, _ = self._midtrans_order()
        self.api.post("/api/v1/payments/midtrans-webhook/",
                      signed(order.order_number, "200", "2050000.00", transaction_status="settlement"),
                      format="json")
        self.api.post("/api/v1/payments/midtrans-webhook/",
                      signed(order.order_number, "407", "2050000.00", transaction_status="expire"),
                      format="json")
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "PAID")
        self.cam.refresh_from_db()
        self.assertEqual(self.cam.stock, 3)

    # ---------------------------------------------------------- halaman pesanan
    def test_order_detail_hides_private_data(self):
        r = self.api.post("/api/v1/checkout/", self.body("WHATSAPP"), format="json")
        d = self.api.get(f"/api/v1/checkout/orders/{r.data['order_number']}/")
        self.assertEqual(d.status_code, 200)
        self.assertEqual(len(d.data["items"]), 2)
        self.assertTrue(d.data["whatsapp_url"])
        flat = str(d.data)
        self.assertNotIn("Jl. Mawar", flat.replace("%20", " ").split("wa.me")[0])
        self.assertNotIn("customer_phone", d.data)
        self.assertEqual(self.api.get("/api/v1/checkout/orders/URX-TIDAK-ADA/").status_code, 404)

    # ---------------------------------------------------------- keamanan API produk
    def test_product_api_is_read_only(self):
        r = self.api.delete(f"/api/v1/products/{self.cam.id}/")
        self.assertEqual(r.status_code, 405)
        self.assertTrue(Product.objects.filter(id=self.cam.id).exists())

    def test_checkout_throttled(self):
        codes = [
            self.api.post("/api/v1/checkout/", self.body("WHATSAPP", idempotency_key=f"t{i}"),
                          format="json").status_code
            for i in range(11)
        ]
        self.assertEqual(codes[-1], 429)
