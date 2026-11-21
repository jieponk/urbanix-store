from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.test import TestCase, override_settings
from django.utils import timezone

from store.models import Category, Order, OrderItem, Product
from store.order_events import cancel_unpaid_web


@override_settings(MIDTRANS_SERVER_KEY="Mid-server-real", ORDER_EMAIL_ENABLED=False)
class WebUnpaidCancelTests(TestCase):
    def setUp(self):
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.cam = Product.objects.create(category=cat, name="Kamera A", slug="a", sku="K-A", description="-",
                                          price=Decimal("1000000"), stock=3)

    def order(self, number, hours_ago):
        o = Order.objects.create(
            order_number=number, customer_name="Budi", customer_phone="081234567890", shipping_address="Jl. Mawar 1",
            payment_method="MIDTRANS", payment_status="UNPAID", status="PENDING", total_amount=Decimal("1000000"),
            stock_reserved=True,
        )
        Order.objects.filter(pk=o.pk).update(created_at=timezone.now() - timedelta(hours=hours_ago))
        OrderItem.objects.create(order=o, product=self.cam, product_name="Kamera A", sku="K-A",
                                 price_snapshot=Decimal("1000000"), quantity=1)
        return o

    def run_with(self, status):
        with mock.patch("store.checkout_service.midtrans_status", return_value=status):
            return cancel_unpaid_web()

    def test_no_transaction_cancels_and_releases_stock(self):
        o = self.order("URX-OLD", 30)
        result = self.run_with({"status_code": "404", "status_message": "Transaction doesn't exist."})
        self.assertEqual(result["cancelled"], ["URX-OLD"])
        o.refresh_from_db()
        self.assertEqual((o.status, o.payment_status), ("CANCELLED", "EXPIRED"))
        self.cam.refresh_from_db()
        self.assertEqual(self.cam.stock, 4)  # stok dikembalikan

    def test_recent_or_pending_untouched(self):
        recent = self.order("URX-NEW", 2)
        pending = self.order("URX-PEND", 30)
        result = self.run_with({"status_code": "201", "transaction_status": "pending"})
        self.assertEqual(result, {"cancelled": [], "paid": []})
        for o in (recent, pending):
            o.refresh_from_db()
            self.assertEqual(o.status, "PENDING")

    def test_missed_settlement_marks_paid(self):
        o = self.order("URX-PAID", 30)
        result = self.run_with({"status_code": "200", "transaction_status": "settlement", "gross_amount": "1000000.00"})
        self.assertEqual(result["paid"], ["URX-PAID"])
        o.refresh_from_db()
        self.assertEqual((o.status, o.payment_status), ("PROCESSING", "PAID"))
        self.assertIsNotNone(o.paid_at)

    def test_amount_mismatch_skipped(self):
        o = self.order("URX-AMT", 30)
        self.run_with({"status_code": "200", "transaction_status": "settlement", "gross_amount": "5000.00"})
        o.refresh_from_db()
        self.assertEqual(o.payment_status, "UNPAID")

    def test_midtrans_unreachable_skipped(self):
        o = self.order("URX-DOWN", 30)
        self.run_with(None)
        o.refresh_from_db()
        self.assertEqual(o.status, "PENDING")
