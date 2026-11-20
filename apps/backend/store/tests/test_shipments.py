from decimal import Decimal
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from store.models import Category, Order, OrderItem, Product, StoreSettings

DEST = "IDNP6IDNC148IDND836IDZ12430"
ORIGIN = "IDNP6IDNC147IDND826IDZ10710"


def ok(body):
    resp = mock.Mock(status_code=200)
    resp.json.return_value = {"success": True, **body}
    return resp


CREATED = {"id": "BS-123", "status": "confirmed", "price": 25000,
           "courier": {"waybill_id": "JNE0001", "company": "jne", "type": "reg"}}


@override_settings(BITESHIP_API_KEY="biteship_test.abc", ORDER_EMAIL_ENABLED=False)
class ShipmentTests(TestCase):
    def setUp(self):
        cache.clear()
        User.objects.create_user("admin", password="rahasia123", is_staff=True)
        self.api = APIClient()
        r = self.api.post("/api/v1/seller/login/", {"username": "admin", "password": "rahasia123"}, format="json")
        self.api.credentials(HTTP_AUTHORIZATION=f"Token {r.data['token']}")
        store = StoreSettings.load()
        store.ongkir_origin_id = ORIGIN
        store.whatsapp_number = "6281234567890"
        store.save()
        cat = Category.objects.create(name="Kamera", slug="kamera")
        cam = Product.objects.create(category=cat, name="Kamera A", slug="a", sku="K-A", description="-",
                                     price=Decimal("1000000"), stock=5, weight_grams=800)
        self.order = Order.objects.create(
            order_number="URX-1", customer_name="Budi", customer_phone="081234567890",
            shipping_address="Jl. Mawar 1", shipping_city="Jakarta Selatan", shipping_postal_code="12430",
            payment_method="MIDTRANS", payment_status="PAID", status="PROCESSING",
            total_amount=Decimal("2000000"), shipping_service="jne:reg", shipping_auto=True,
            shipping_destination_id=DEST, shipping_cost=Decimal("25000"), shipping_courier="JNE",
        )
        OrderItem.objects.create(order=self.order, product=cam, product_name="Kamera A", sku="K-A",
                                 price_snapshot=Decimal("1000000"), quantity=2, weight_grams=800)
        self.url = "/api/v1/seller/orders/URX-1/shipment/"

    def test_create_shipment_sets_waybill(self):
        with mock.patch("store.ongkir.requests.request", return_value=ok(CREATED)) as req:
            r = self.api.post(self.url, {"action": "create", "method": "drop_off"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        args, kwargs = req.call_args
        self.assertEqual((args[0], args[1]), ("POST", "https://api.biteship.com/v1/orders"))
        body = kwargs["json"]
        self.assertEqual((body["courier_company"], body["courier_type"]), ("jne", "reg"))
        self.assertEqual((body["origin_area_id"], body["destination_area_id"]), (ORIGIN, DEST))
        self.assertEqual(body["origin_collection_method"], "drop_off")
        self.assertEqual(body["origin_contact_phone"], "6281234567890")
        self.assertEqual(body["reference_id"], "URX-1")
        self.assertEqual(body["items"][0]["weight"], 800)
        self.order.refresh_from_db()
        self.assertEqual((self.order.shipment_id, self.order.tracking_number, self.order.shipment_status),
                         ("BS-123", "JNE0001", "confirmed"))
        self.assertEqual(r.data["shipment"]["status_label"], "Resi dibuat")
        # Tidak bisa dibuat dua kali
        r = self.api.post(self.url, {"action": "create"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_drop_off_not_supported_message(self):
        resp = mock.Mock(status_code=400)
        resp.json.return_value = {"success": False, "error": "Existing courier cannot provide dropping off service",
                                  "code": 40002031}
        with mock.patch("store.ongkir.requests.request", return_value=resp):
            r = self.api.post(self.url, {"action": "create", "method": "drop_off"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("Dijemput kurir", str(r.data))

    def test_unpaid_or_manual_courier_rejected(self):
        self.order.payment_status = "UNPAID"
        self.order.save()
        with mock.patch("store.ongkir.requests.request") as req:
            r = self.api.post(self.url, {"action": "create"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("Lunas", r.data["error"] if "error" in r.data else str(r.data))
        req.assert_not_called()
        self.order.payment_status = "PAID"
        self.order.shipping_service, self.order.shipping_auto = "gosend_instant", False
        self.order.save()
        r = self.api.post(self.url, {"action": "create"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_webhook_refetches_and_marks_shipped(self):
        with mock.patch("store.ongkir.requests.request", return_value=ok(CREATED)):
            self.api.post(self.url, {"action": "create"}, format="json")
        picked = {**CREATED, "status": "picked"}
        with mock.patch("store.ongkir.requests.request", return_value=ok(picked)) as req:
            # Isi webhook palsu (status delivered) diabaikan: yang dipakai hasil GET dari Biteship
            r = APIClient().post("/api/v1/shipping/biteship-webhook/",
                                 {"event": "order.status", "order_id": "BS-123", "status": "delivered"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(req.call_args.args[:2], ("GET", "https://api.biteship.com/v1/orders/BS-123"))
        self.order.refresh_from_db()
        self.assertEqual((self.order.shipment_status, self.order.status), ("picked", "SHIPPED"))
        # Uji koneksi dari dashboard (tanpa order_id) tetap 200
        self.assertEqual(APIClient().post("/api/v1/shipping/biteship-webhook/", {}, format="json").status_code, 200)

    def test_cancel_before_pickup(self):
        with mock.patch("store.ongkir.requests.request", return_value=ok(CREATED)):
            self.api.post(self.url, {"action": "create"}, format="json")
        with mock.patch("store.ongkir.requests.request", return_value=ok({})) as req:
            r = self.api.post(self.url, {"action": "cancel"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(req.call_args.args[1], "https://api.biteship.com/v1/orders/BS-123/cancel")
        self.order.refresh_from_db()
        self.assertEqual((self.order.shipment_status, self.order.tracking_number), ("cancelled", ""))
        # Setelah dibatalkan boleh buat resi lagi (reference_id baru)
        with mock.patch("store.ongkir.requests.request", return_value=ok({**CREATED, "id": "BS-456"})) as req:
            r = self.api.post(self.url, {"action": "create"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertNotEqual(req.call_args.kwargs["json"]["reference_id"], "URX-1")

    def test_cek_pengiriman_command_updates_open_shipments(self):
        from io import StringIO

        from django.core.management import call_command

        with mock.patch("store.ongkir.requests.request", return_value=ok(CREATED)):
            self.api.post(self.url, {"action": "create"}, format="json")
        with mock.patch("store.ongkir.requests.request", return_value=ok({**CREATED, "status": "dropping_off"})):
            out = StringIO()
            call_command("cek_pengiriman", stdout=out)
        self.order.refresh_from_db()
        self.assertEqual((self.order.shipment_status, self.order.status), ("dropping_off", "SHIPPED"))
        self.assertIn("1 berubah", out.getvalue())


@override_settings(ORDER_EMAIL_ENABLED=False)
class ActivityLogTests(TestCase):
    def setUp(self):
        User.objects.create_user("admin", password="rahasia123", is_staff=True)
        self.api = APIClient()
        r = self.api.post("/api/v1/seller/login/", {"username": "admin", "password": "rahasia123"}, format="json")
        self.api.credentials(HTTP_AUTHORIZATION=f"Token {r.data['token']}")
        for i, st in enumerate(["CANCELLED", "CANCELLED", "PENDING"]):
            Order.objects.create(order_number=f"URX-{i}", customer_name="B", customer_phone="0812",
                                 shipping_address="-", payment_method="WHATSAPP", status=st,
                                 total_amount=Decimal("1000"))

    def test_bulk_delete_cancelled_and_log(self):
        r = self.api.post("/api/v1/seller/orders/hapus-dibatalkan/", {}, format="json")
        self.assertEqual(r.data["deleted"], 2)
        self.assertEqual(list(Order.objects.values_list("order_number", flat=True)), ["URX-2"])
        self.api.patch("/api/v1/seller/orders/URX-2/", {"status": "PROCESSING"}, format="json")
        APIClient().post("/api/v1/seller/login/", {"username": "admin", "password": "salah"}, format="json")
        log = self.api.get("/api/v1/seller/log/").data["results"]
        actions = [row["action"] for row in log]
        self.assertIn("Login gagal", actions)
        self.assertIn("Ubah Pesanan URX-2", actions)
        self.assertIn("Hapus semua pesanan Dibatalkan", actions)
        self.assertIn("Login", actions)
        self.assertTrue(all("rahasia123" not in row["details"] for row in log))
        login_only = self.api.get("/api/v1/seller/log/?kind=login").data["results"]
        self.assertTrue(all(row["action"].startswith("Login") for row in login_only))
