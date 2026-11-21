from decimal import Decimal
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from store.models import Category, Order, OrderItem, Product


@override_settings(ORDER_EMAIL_ENABLED=False, BITESHIP_API_KEY="biteship_test.abc")
class CancelRequestTests(TestCase):
    def setUp(self):
        cache.clear()
        User.objects.create_user("admin", password="rahasia123", is_staff=True)
        self.admin = APIClient()
        r = self.admin.post("/api/v1/seller/login/", {"username": "admin", "password": "rahasia123"}, format="json")
        self.admin.credentials(HTTP_AUTHORIZATION=f"Token {r.data['token']}")
        self.api = APIClient()
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.cam = Product.objects.create(category=cat, name="Kamera A", slug="a", sku="K-A", description="-",
                                          price=Decimal("1000000"), stock=2)
        self.order = Order.objects.create(
            order_number="URX-B1", customer_name="Budi", customer_phone="081234567890", shipping_address="Jl. Mawar 1",
            payment_method="MIDTRANS", payment_status="PAID", status="PROCESSING", total_amount=Decimal("1000000"),
            shipping_cost=Decimal("20000"), stock_reserved=True,
        )
        OrderItem.objects.create(order=self.order, product=self.cam, product_name="Kamera A", sku="K-A",
                                 price_snapshot=Decimal("1000000"), quantity=1)
        self.url = "/api/v1/batal/URX-B1/"

    def request_cancel(self, **extra):
        body = {"phone": "0812-3456-7890", "reason": "CHANGE_MIND", **extra}
        return self.api.post(self.url, body, format="json")

    def test_full_flow_approve_and_refund(self):
        self.assertTrue(self.api.get(self.url).data["eligibility"]["can_request"])
        r = self.request_cancel()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data["cancel"]["status"], "REQUESTED")
        # Pesanan publik menampilkan status pembatalan
        pub = self.api.get("/api/v1/checkout/orders/URX-B1/").data
        self.assertEqual(pub["cancel"]["status"], "REQUESTED")

        seller = "/api/v1/seller/orders/URX-B1/pembatalan/"
        r = self.admin.post(seller, {"action": "approve"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.order.refresh_from_db(); self.cam.refresh_from_db()
        self.assertEqual(self.order.status, "CANCELLED")
        self.assertEqual(self.cam.stock, 3)  # stok kembali

        r = self.admin.post(seller, {"action": "refund", "refund_amount": "2000000", "refund_method": "Transfer BCA"}, format="json")
        self.assertEqual(r.status_code, 400)  # melebihi tagihan
        r = self.admin.post(seller, {"action": "refund", "refund_amount": "1020000", "refund_method": "Refund Midtrans"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, "REFUNDED")
        self.assertEqual(self.order.cancel_request.status, "REFUNDED")

    def test_wrong_phone_and_shipped_rejected(self):
        self.assertEqual(self.request_cancel(phone="0899999999").status_code, 403)
        Order.objects.filter(pk=self.order.pk).update(shipment_status="picked")
        r = self.request_cancel()
        self.assertEqual(r.status_code, 400)
        self.assertIn("sudah dikirim", r.data["error"])

    def test_unpaid_not_eligible(self):
        Order.objects.filter(pk=self.order.pk).update(payment_status="UNPAID")
        self.assertFalse(self.api.get(self.url).data["eligibility"]["can_request"])

    def test_reject_needs_reason(self):
        self.request_cancel()
        seller = "/api/v1/seller/orders/URX-B1/pembatalan/"
        self.assertEqual(self.admin.post(seller, {"action": "reject", "admin_note": "no"}, format="json").status_code, 400)
        r = self.admin.post(seller, {"action": "reject", "admin_note": "Paket sudah dikemas dan siap dijemput kurir."}, format="json")
        self.assertEqual(r.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PROCESSING")

    def test_approve_cancels_biteship_waybill(self):
        Order.objects.filter(pk=self.order.pk).update(shipment_id="BS-9", shipment_status="confirmed", tracking_number="JNE1")
        self.request_cancel()
        ok = mock.Mock(status_code=200)
        ok.json.return_value = {"success": True}
        with mock.patch("store.ongkir.requests.request", return_value=ok) as req:
            r = self.admin.post("/api/v1/seller/orders/URX-B1/pembatalan/", {"action": "approve"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertIn("orders/BS-9/cancel", req.call_args[0][1])
        self.order.refresh_from_db()
        self.assertEqual((self.order.shipment_status, self.order.status), ("cancelled", "CANCELLED"))

    def test_withdraw(self):
        self.request_cancel()
        r = self.api.post(self.url, {"phone": "081234567890", "action": "withdraw"}, format="json")
        self.assertEqual(r.data["cancel"]["status"], "WITHDRAWN")
        self.assertTrue(self.api.get(self.url).data["eligibility"]["can_request"])
