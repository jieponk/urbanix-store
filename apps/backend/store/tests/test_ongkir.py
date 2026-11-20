from decimal import Decimal
from unittest import mock
from urllib.parse import unquote

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from store import checkout_service as svc
from store import ongkir
from store.models import Category, Order, Product, StoreSettings, Voucher
from store.tests.ongkir_stub import enable_ongkir

KEY = "SB-Mid-server-TESTKEY"


def fake_response(data, status=200):
    resp = mock.Mock(status_code=status)
    resp.json.return_value = {"meta": {"code": status, "status": "success" if status == 200 else "error"}, "data": data}
    return resp


@override_settings(RAJAONGKIR_API_KEY="ro-test")
class OngkirClientTests(TestCase):
    def setUp(self):
        cache.clear()
        store = StoreSettings.load()
        store.rajaongkir_origin_id = 31555
        store.rajaongkir_couriers = "jne:sicepat"
        store.save()

    def test_rates_parsed_sorted_and_sent_with_key(self):
        data = [
            {"name": "JNE", "code": "jne", "service": "YES", "description": "Yakin", "cost": 38000, "etd": "1 day"},
            {"name": "SiCepat", "code": "sicepat", "service": "REG", "description": "Reguler", "cost": 15000, "etd": "2-3 day"},
            {"name": "JNE", "code": "jne", "service": "BAD", "cost": 0, "etd": ""},
        ]
        with mock.patch("store.ongkir.requests.request", return_value=fake_response(data)) as req:
            rows = ongkir.rates(17, 1200)
        self.assertEqual([r["code"] for r in rows], ["sicepat:REG", "jne:YES"])
        self.assertEqual(rows[0]["etd"], "2-3")
        args, kwargs = req.call_args
        self.assertEqual(args[0], "POST")
        self.assertEqual(kwargs["headers"]["key"], "ro-test")
        self.assertEqual(kwargs["data"]["courier"], "jne:sicepat")
        self.assertEqual(kwargs["data"]["origin"], 31555)
        # Hasil disimpan di cache: panggilan kedua tidak ke API
        with mock.patch("store.ongkir.requests.request") as req2:
            ongkir.rates(17, 1200)
        req2.assert_not_called()

    def test_destination_search_endpoint(self):
        data = [{"id": 17, "label": "KEMAYORAN, KEMAYORAN, JAKARTA PUSAT, DKI JAKARTA, 10620",
                 "subdistrict_name": "KEMAYORAN", "district_name": "KEMAYORAN", "city_name": "JAKARTA PUSAT",
                 "province_name": "DKI JAKARTA", "zip_code": "10620"}]
        with mock.patch("store.ongkir.requests.request", return_value=fake_response(data)):
            r = APIClient().get("/api/v1/ongkir/tujuan/?q=kemayoran")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["results"][0]["id"], 17)
        self.assertEqual(r.data["results"][0]["zip_code"], "10620")
        self.assertEqual(APIClient().get("/api/v1/ongkir/tujuan/?q=ke").data["results"], [])

    def test_errors_become_friendly(self):
        with mock.patch("store.ongkir.requests.request", return_value=fake_response([], status=401)):
            with self.assertRaises(ongkir.OngkirError):
                ongkir.rates(17, 1000)

    @override_settings(RAJAONGKIR_API_KEY="")
    def test_not_configured_without_key(self):
        self.assertFalse(ongkir.is_configured())


@override_settings(MIDTRANS_SERVER_KEY=KEY, RAJAONGKIR_API_KEY="ro-test", FRONTEND_URL="http://toko.test")
class OngkirCheckoutTests(TestCase):
    RATE = {"code": "jne:REG", "courier": "jne", "courier_name": "JNE", "service": "REG",
            "description": "Reguler", "cost": 25000, "etd": "2-3"}

    def setUp(self):
        cache.clear()
        self.api = APIClient()
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.cam = Product.objects.create(category=cat, name="Kamera A", slug="a", sku="K-A", description="-",
                                          price=Decimal("1000000"), stock=5, weight_grams=800)
        store = StoreSettings.load()
        store.whatsapp_number = "6281234567890"
        store.save()
        enable_ongkir(self, self.RATE)

    def body(self, method, service="jne:REG", codes=None):
        return {
            "payment_method": method,
            "items": [{"product_id": self.cam.id, "quantity": 2}],
            "voucher_codes": codes or [],
            "customer": {"name": "Budi", "phone": "081234567890"},
            "shipping": {"address": "Jl. Mawar 1", "city": "Jakarta Pusat", "service": service, "destination_id": 17},
        }

    def midtrans(self, **kw):
        fake = mock.Mock(status_code=201)
        fake.json.return_value = {"token": "t", "redirect_url": "https://app.sandbox.midtrans.com/x"}
        with mock.patch("store.checkout_service.requests.post", return_value=fake) as post:
            r = self.api.post("/api/v1/checkout/", self.body("MIDTRANS", **kw), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return Order.objects.get(order_number=r.data["order_number"]), post.call_args.kwargs["json"]

    def test_rates_endpoint_uses_cart_weight(self):
        r = self.api.post("/api/v1/ongkir/", {"items": [{"product_id": self.cam.id, "quantity": 2}],
                                              "destination_id": 17}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["weight_grams"], 1600)
        self.assertEqual(self.rates_mock.call_args.args[:2], (17, 1600))

    def test_midtrans_includes_shipping_in_total(self):
        order, payload = self.midtrans()
        self.assertTrue(order.shipping_auto)
        self.assertEqual((order.shipping_cost, order.shipping_courier, order.shipping_etd), (Decimal("25000"), "JNE", "2-3"))
        self.assertEqual(order.billed_amount, Decimal("2025000"))
        self.assertEqual(payload["transaction_details"]["gross_amount"], 2025000)
        self.assertEqual(sum(i["price"] * i["quantity"] for i in payload["item_details"]), 2025000)
        self.assertIn("ONGKIR", [i["id"] for i in payload["item_details"]])
        # Webhook mencocokkan dengan total + ongkir
        from store.tests.test_checkout import signed

        r = self.api.post("/api/v1/payments/midtrans-webhook/",
                          signed(order.order_number, "200", "2025000.00", transaction_status="settlement"), format="json")
        self.assertEqual(r.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "PAID")
        d = self.api.get(f"/api/v1/checkout/orders/{order.order_number}/").data
        self.assertEqual((d["billed_amount"], d["shipping_service"]), ("2025000.00", "JNE REG"))

    def test_free_shipping_voucher_cut_from_midtrans(self):
        Voucher.objects.create(code="ONG20", title="Gratis ongkir", voucher_type="FREE_SHIPPING", value=20000,
                               for_whatsapp=True, for_midtrans=True)
        order, payload = self.midtrans(codes=["ONG20"])
        self.assertEqual(order.billed_amount, Decimal("2005000"))
        self.assertEqual(payload["transaction_details"]["gross_amount"], 2005000)
        self.assertEqual(sum(i["price"] * i["quantity"] for i in payload["item_details"]), 2005000)

    def test_midtrans_requires_auto_courier(self):
        body = self.body("MIDTRANS", service="jne_reg")
        r = self.api.post("/api/v1/checkout/", body, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("kurir", r.data["error"])

    def test_unknown_or_changed_rate_rejected(self):
        r = self.api.post("/api/v1/checkout/", self.body("WHATSAPP", service="jne:YES"), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("berubah", r.data["error"])
        self.assertEqual(Order.objects.count(), 0)

    def test_whatsapp_auto_rate_message_has_final_total(self):
        r = self.api.post("/api/v1/checkout/", self.body("WHATSAPP"), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        text = unquote(r.data["whatsapp_url"])
        self.assertIn("Ongkir JNE REG: Rp25.000", text)
        self.assertIn("Total: Rp2.025.000 (sudah termasuk PPN & ongkir)", text)
        self.assertNotIn("mohon info ongkir", text)

    def test_whatsapp_manual_instant_courier_still_allowed(self):
        r = self.api.post("/api/v1/checkout/", self.body("WHATSAPP", service="gosend_instant"), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        order = Order.objects.get()
        self.assertFalse(order.shipping_auto)
        self.assertIsNone(order.shipping_cost)

    @override_settings(RAJAONGKIR_API_KEY="")
    def test_midtrans_hidden_without_ongkir(self):
        self.assertFalse(svc.available_methods()["midtrans"])
