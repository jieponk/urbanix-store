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
DEST = "IDNP6IDNC148IDND836IDZ12430"
ORIGIN = "IDNP6IDNC147IDND826IDZ10710"


def fake_response(body, status=200):
    resp = mock.Mock(status_code=status)
    resp.json.return_value = body
    return resp


@override_settings(BITESHIP_API_KEY="biteship_test.abc")
class OngkirClientTests(TestCase):
    def setUp(self):
        cache.clear()
        store = StoreSettings.load()
        store.ongkir_origin_id = ORIGIN
        store.ongkir_couriers = "jne:sicepat"
        store.save()
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.cam = Product.objects.create(category=cat, name="Kamera A", slug="a", sku="K-A", description="-",
                                          price=Decimal("1000000"), stock=5, weight_grams=800)

    def lines(self):
        return svc.build_lines([{"product_id": self.cam.id, "quantity": 2}])

    def test_rates_parsed_sorted_and_sent_with_key(self):
        body = {"success": True, "pricing": [
            {"courier_name": "JNE", "courier_code": "jne", "courier_service_name": "Yakin Esok Sampai",
             "courier_service_code": "yes", "price": 38000, "shipment_duration_range": "1", "shipment_duration_unit": "days"},
            {"courier_name": "SiCepat", "courier_code": "sicepat", "courier_service_name": "Reguler",
             "courier_service_code": "reg", "price": 15000, "shipment_duration_range": "2 - 3", "shipment_duration_unit": "days"},
            {"courier_name": "JNE", "courier_code": "jne", "courier_service_code": "bad", "price": 0},
        ]}
        with mock.patch("store.ongkir.requests.request", return_value=fake_response(body)) as req:
            rows = ongkir.rates(DEST, self.lines())
        self.assertEqual([r["code"] for r in rows], ["sicepat:reg", "jne:yes"])
        self.assertEqual((rows[0]["etd"], rows[0]["service"]), ("2-3", "Reguler"))
        args, kwargs = req.call_args
        self.assertEqual(args[0], "POST")
        self.assertEqual(kwargs["headers"]["Authorization"], "biteship_test.abc")
        payload = kwargs["json"]
        self.assertEqual((payload["origin_area_id"], payload["destination_area_id"], payload["couriers"]),
                         (ORIGIN, DEST, "jne,sicepat"))
        self.assertEqual(payload["items"], [{"name": "Kamera A", "value": 1000000, "weight": 800, "quantity": 2}])
        # Hasil disimpan di cache: panggilan kedua tidak ditagih lagi
        with mock.patch("store.ongkir.requests.request") as req2:
            ongkir.rates(DEST, self.lines())
        req2.assert_not_called()

    def test_destination_search_endpoint(self):
        body = {"success": True, "areas": [{
            "id": DEST, "name": "Kebayoran Lama, Jakarta Selatan, DKI Jakarta. 12430",
            "administrative_division_level_1_name": "DKI Jakarta",
            "administrative_division_level_2_name": "Jakarta Selatan",
            "administrative_division_level_3_name": "Kebayoran Lama", "postal_code": 12430}]}
        with mock.patch("store.ongkir.requests.request", return_value=fake_response(body)) as req:
            r = APIClient().get("/api/v1/ongkir/tujuan/?q=12430")
        self.assertEqual(r.status_code, 200)
        row = r.data["results"][0]
        self.assertEqual((row["id"], row["district"], row["zip_code"]), (DEST, "Kebayoran Lama", "12430"))
        self.assertEqual(req.call_args.kwargs["params"], {"countries": "ID", "input": "12430", "type": "single"})
        self.assertEqual(APIClient().get("/api/v1/ongkir/tujuan/?q=ke").data["results"], [])

    def test_errors_become_friendly(self):
        with mock.patch("store.ongkir.requests.request", return_value=fake_response({"success": False}, 401)):
            with self.assertRaises(ongkir.OngkirError):
                ongkir.rates(DEST, self.lines())

    def test_bad_destination_rejected_without_calling_api(self):
        with mock.patch("store.ongkir.requests.request") as req:
            with self.assertRaises(ongkir.OngkirError):
                ongkir.rates("../../x", self.lines())
        req.assert_not_called()

    @override_settings(BITESHIP_API_KEY="")
    def test_not_configured_without_key(self):
        self.assertFalse(ongkir.is_configured())


@override_settings(MIDTRANS_SERVER_KEY=KEY, BITESHIP_API_KEY="biteship_test.abc", FRONTEND_URL="http://toko.test")
class OngkirCheckoutTests(TestCase):
    RATE = {"code": "jne:reg", "courier": "jne", "courier_name": "JNE", "service": "Reguler",
            "description": "Layanan reguler", "cost": 25000, "etd": "2-3"}

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

    def body(self, method, service="jne:reg", codes=None):
        return {
            "payment_method": method,
            "items": [{"product_id": self.cam.id, "quantity": 2}],
            "voucher_codes": codes or [],
            "customer": {"name": "Budi", "phone": "081234567890"},
            "shipping": {"address": "Jl. Mawar 1", "city": "Jakarta Selatan", "service": service, "destination_id": DEST},
        }

    def midtrans(self, **kw):
        fake = mock.Mock(status_code=201)
        fake.json.return_value = {"token": "t", "redirect_url": "https://app.sandbox.midtrans.com/x"}
        with mock.patch("store.checkout_service.requests.post", return_value=fake) as post:
            r = self.api.post("/api/v1/checkout/", self.body("MIDTRANS", **kw), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return Order.objects.get(order_number=r.data["order_number"]), post.call_args.kwargs["json"]

    def test_rates_endpoint(self):
        r = self.api.post("/api/v1/ongkir/", {"items": [{"product_id": self.cam.id, "quantity": 2}],
                                              "destination_id": DEST}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["weight_grams"], 1600)
        self.assertEqual(r.data["options"][0]["code"], "jne:reg")
        self.assertEqual(self.rates_mock.call_args.args[0], DEST)

    def test_midtrans_includes_shipping_in_total(self):
        order, payload = self.midtrans()
        self.assertTrue(order.shipping_auto)
        self.assertEqual((order.shipping_cost, order.shipping_courier, order.shipping_destination_id),
                         (Decimal("25000"), "JNE", DEST))
        self.assertEqual(order.billed_amount, Decimal("2025000"))
        self.assertEqual(payload["transaction_details"]["gross_amount"], 2025000)
        self.assertEqual(sum(i["price"] * i["quantity"] for i in payload["item_details"]), 2025000)
        ongkir_line = next(i for i in payload["item_details"] if i["id"] == "ONGKIR")
        self.assertEqual(ongkir_line["name"], "Ongkir JNE REG")
        self.assertEqual((payload["custom_field1"], payload["custom_field2"]), ("Urbanix Store", "JNE REG"))
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
        r = self.api.post("/api/v1/checkout/", self.body("MIDTRANS", service="jne_reg"), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("kurir", r.data["error"])

    def test_unknown_or_changed_rate_rejected(self):
        r = self.api.post("/api/v1/checkout/", self.body("WHATSAPP", service="jne:yes"), format="json")
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

    @override_settings(BITESHIP_API_KEY="")
    def test_midtrans_hidden_without_ongkir(self):
        self.assertFalse(svc.available_methods()["midtrans"])
