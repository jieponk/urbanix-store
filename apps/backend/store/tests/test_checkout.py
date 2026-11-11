from decimal import Decimal
from unittest import mock
from urllib.parse import unquote

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from store import checkout_service as svc
from store.models import Category, Order, Product, ProductVariation, StoreSettings

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
        for part in [order.order_number, "Kamera A", "2 x Rp900.000", "Rp1.800.000", "Budi",
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
        masked = d.data["customer_phone_masked"]
        self.assertIn("*", masked)
        self.assertIsNone(d.data["shipping_cost"])
        self.assertEqual(self.api.get("/api/v1/checkout/orders/URX-TIDAK-ADA/").status_code, 404)

    # ---------------------------------------------------------- email pesanan
    def test_order_email_sent_when_configured(self):
        from django.core import mail
        from django.test import override_settings
        with override_settings(ORDER_EMAIL_ENABLED=True, ORDER_EMAIL_SYNC=True,
                               EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"):
            r = self.api.post("/api/v1/checkout/", self.body("WHATSAPP"), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(len(mail.outbox), 1)
        msg = mail.outbox[0]
        self.assertEqual(msg.to, ["budi@contoh.id"])
        self.assertIn(r.data["order_number"], msg.subject)
        self.assertIn(f"/pesanan/{r.data['order_number']}/invoice", msg.body)

    def test_order_email_skipped_without_smtp_or_email(self):
        from django.core import mail
        r = self.api.post("/api/v1/checkout/", self.body("WHATSAPP"), format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(len(mail.outbox), 0)

    def test_whatsapp_message_has_status_link(self):
        r = self.api.post("/api/v1/checkout/", self.body("WHATSAPP"), format="json")
        self.assertIn("Cek%20status", r.data["whatsapp_url"].replace("+", "%20"))

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


@override_settings(MIDTRANS_SERVER_KEY=SERVER_KEY, FRONTEND_URL="http://toko.test")
class VariationCheckoutTests(TestCase):
    def setUp(self):
        cache.clear()
        self.api = APIClient()
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.sony = Product.objects.create(
            category=cat, name="Sony RX100 VII", slug="sony", sku="SON-INDUK",
            description="-", price=Decimal("20999000"), stock=7,
        )
        self.cam_only = ProductVariation.objects.create(
            product=self.sony, variation_id="v1", name="Camera Only",
            sku="SON-BLK", price=Decimal("20999000"), stock=2,
        )
        self.sd64 = ProductVariation.objects.create(
            product=self.sony, variation_id="v2", name="+ SDXC 64GB",
            sku="SON-BLK-64", price=Decimal("24999000"), stock=7,
        )
        # Satu varian tanpa nama = produk biasa
        self.dji = Product.objects.create(
            category=cat, name="DJI Osmo", slug="dji", sku="DJI-1",
            description="-", price=Decimal("1499000"), stock=3,
        )
        ProductVariation.objects.create(
            product=self.dji, variation_id="d1", name="", sku="", price=Decimal("1499000"), stock=3,
        )
        store = StoreSettings.load()
        store.whatsapp_number = "6281234567890"
        store.save()

    def order(self, method, items):
        return self.api.post("/api/v1/checkout/", {
            "payment_method": method, "items": items,
            "customer": {"name": "Budi", "phone": "081234567890"},
            "shipping": {"address": "Jl. Mawar 1 RT 02", "city": "Bandung"},
        }, format="json")

    def test_variant_required_for_multi_variant_product(self):
        r = self.api.post("/api/v1/checkout/quote/", {"items": [
            {"product_id": self.sony.id, "quantity": 1}]}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("Pilih varian", r.data["error"])

    def test_quote_uses_variant_price_stock_sku(self):
        r = self.api.post("/api/v1/checkout/quote/", {"items": [
            {"product_id": self.sony.id, "variation_id": "v2", "quantity": 2}]}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        item = r.data["items"][0]
        self.assertEqual(Decimal(item["unit_price"]), Decimal("24999000"))
        self.assertEqual((item["sku"], item["variation_name"], item["stock"]),
                         ("SON-BLK-64", "+ SDXC 64GB", 7))

    def test_variant_of_other_product_rejected(self):
        r = self.api.post("/api/v1/checkout/quote/", {"items": [
            {"product_id": self.dji.id, "variation_id": "v2", "quantity": 1}]}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_variant_stock_checked_not_parent(self):
        # Stok induk 7, tapi varian "Camera Only" hanya 2
        r = self.order("WHATSAPP", [{"product_id": self.sony.id, "variation_id": "v1", "quantity": 3}])
        self.assertEqual(r.status_code, 400)
        self.assertIn("Camera Only", r.data["error"])

    def test_single_unnamed_variation_buyable_without_choice(self):
        r = self.order("WHATSAPP", [{"product_id": self.dji.id, "quantity": 1}])
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(Order.objects.get().items.get().sku, "DJI-1")

    def test_whatsapp_message_has_variant_sku(self):
        r = self.order("WHATSAPP", [
            {"product_id": self.sony.id, "variation_id": "v1", "quantity": 1},
            {"product_id": self.sony.id, "variation_id": "v2", "quantity": 1},
        ])
        self.assertEqual(r.status_code, 201, r.content)
        text = unquote(r.data["whatsapp_url"])
        for part in ["Varian: Camera Only", "SKU: SON-BLK", "Varian: + SDXC 64GB",
                     "SKU: SON-BLK-64", "Rp45.998.000"]:
            self.assertIn(part, text)
        self.assertNotIn("SON-INDUK", text)
        order = Order.objects.get()
        self.assertEqual(order.total_amount, Decimal("45998000"))
        d = self.api.get(f"/api/v1/checkout/orders/{order.order_number}/")
        self.assertEqual({i["sku"] for i in d.data["items"]}, {"SON-BLK", "SON-BLK-64"})

    def test_midtrans_reserves_variant_stock_and_syncs_parent(self):
        fake = mock.Mock(status_code=201)
        fake.json.return_value = {"token": "t", "redirect_url": "https://app.sandbox.midtrans.com/x"}
        with mock.patch("store.checkout_service.requests.post", return_value=fake) as post:
            r = self.order("MIDTRANS", [{"product_id": self.sony.id, "variation_id": "v2", "quantity": 3}])
        self.assertEqual(r.status_code, 201, r.content)
        item = post.call_args.kwargs["json"]["item_details"][0]
        self.assertEqual(item["id"], "SON-BLK-64")
        self.assertLessEqual(len(item["name"]), 50)
        self.sd64.refresh_from_db(); self.sony.refresh_from_db(); self.cam_only.refresh_from_db()
        self.assertEqual((self.sd64.stock, self.cam_only.stock, self.sony.stock), (4, 2, 6))

        order = Order.objects.get()
        payload = signed(order.order_number, "407", "74997000.00", transaction_status="expire")
        self.assertEqual(self.api.post("/api/v1/payments/midtrans-webhook/", payload,
                                       format="json").status_code, 200)
        self.sd64.refresh_from_db(); self.sony.refresh_from_db()
        self.assertEqual((self.sd64.stock, self.sony.stock), (7, 9))

    def test_isi_stok_command(self):
        from django.core.management import call_command
        Product.objects.create(category=self.sony.category, name="Tanpa varian", slug="x",
                               sku="X", description="-", price=1, stock=0)
        call_command("isi_stok", jumlah=5, stdout=__import__("io").StringIO())
        self.assertEqual(set(ProductVariation.objects.values_list("stock", flat=True)), {5})
        self.sony.refresh_from_db()
        self.assertEqual(self.sony.stock, 10)  # 2 varian x 5
        self.assertEqual(Product.objects.get(sku="X").stock, 5)

    def test_isi_stok_only_empty(self):
        from django.core.management import call_command
        self.cam_only.stock = 0
        self.cam_only.save()
        call_command("isi_stok", jumlah=4, hanya_kosong=True, stdout=__import__("io").StringIO())
        self.cam_only.refresh_from_db(); self.sd64.refresh_from_db()
        self.assertEqual((self.cam_only.stock, self.sd64.stock), (4, 7))
