import shutil
import tempfile
from datetime import timedelta
from decimal import Decimal
from io import BytesIO
from unittest import mock

from django.contrib.auth.models import User
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from store.models import Category, Order, OrderItem, Product, ReturnRequest, StoreSettings

MEDIA = tempfile.mkdtemp()


def jpg():
    buf = BytesIO()
    Image.new("RGB", (40, 40), "red").save(buf, "JPEG")
    return SimpleUploadedFile("resi.jpg", buf.getvalue(), content_type="image/jpeg")


@override_settings(MEDIA_ROOT=MEDIA, ORDER_EMAIL_ENABLED=True, ORDER_EMAIL_SYNC=True,
                   EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class OrderFlowTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        User.objects.create_user("admin", password="rahasia123", is_staff=True)
        self.admin = APIClient()
        r = self.admin.post("/api/v1/seller/login/", {"username": "admin", "password": "rahasia123"}, format="json")
        self.admin.credentials(HTTP_AUTHORIZATION=f"Token {r.data['token']}")
        store = StoreSettings.load()
        store.notify_email = "admin@urbanix.id"
        store.whatsapp_number = "6281234567890"
        store.save()
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.cam = Product.objects.create(category=cat, name="Kamera A", slug="a", sku="K-A", description="-",
                                          price=Decimal("1000000"), stock=5)
        self.order = Order.objects.create(
            order_number="URX-1", customer_name="Budi", customer_phone="081234567890", customer_email="b@x.id",
            shipping_address="Jl. Mawar", payment_method="WHATSAPP", status="PENDING",
            total_amount=Decimal("2000000"))
        self.item = OrderItem.objects.create(order=self.order, product=self.cam, product_name="Kamera A", sku="K-A",
                                             price_snapshot=Decimal("1000000"), quantity=2)
        mail.outbox.clear()

    def test_mark_paid_deducts_stock_and_emails(self):
        r = self.admin.patch("/api/v1/seller/orders/URX-1/", {"payment_status": "PAID"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.cam.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(self.cam.stock, 3)
        self.assertTrue(self.order.stock_reserved and self.order.paid_at)
        subjects = [m.subject for m in mail.outbox]
        self.assertTrue(any("Pembayaran diterima" in s for s in subjects))
        self.assertTrue(any("[Urbanix] LUNAS URX-1" in s for s in subjects))
        # Ditandai lunas lagi tidak memotong stok dua kali
        self.admin.patch("/api/v1/seller/orders/URX-1/", {"payment_status": "UNPAID"}, format="json")
        self.admin.patch("/api/v1/seller/orders/URX-1/", {"payment_status": "PAID"}, format="json")
        self.cam.refresh_from_db()
        self.assertEqual(self.cam.stock, 3)

    def test_auto_cancel_unpaid_whatsapp(self):
        Order.objects.filter(pk=self.order.pk).update(created_at=timezone.now() - timedelta(hours=25))
        from io import StringIO

        call_command("kirim_pengingat", stdout=StringIO())
        self.order.refresh_from_db()
        self.assertEqual((self.order.status, self.order.payment_status), ("CANCELLED", "EXPIRED"))

    def _complete(self, hours_ago=1):
        Order.objects.filter(pk=self.order.pk).update(
            status="COMPLETED", payment_status="PAID", delivered_at=timezone.now() - timedelta(hours=hours_ago))

    def _submit(self, **extra):
        data = {"phone": "0812-3456-7890", "reason": "DEFECT", "resolution": "REFUND",
                "description": "Lensa tidak bisa fokus sejak pertama dinyalakan.", "waybill_photo": jpg(),
                "video_via_whatsapp": "true"}
        data.update(extra)
        return APIClient().post("/api/v1/retur/URX-1/", data, format="multipart")

    def test_return_flow(self):
        self.assertFalse(APIClient().get("/api/v1/retur/URX-1/").data["eligibility"]["can_request"])
        self._complete()
        self.assertTrue(APIClient().get("/api/v1/retur/URX-1/").data["eligibility"]["can_request"])
        self.assertEqual(self._submit(phone="0899999999").status_code, 403)
        self.assertEqual(self._submit(description="rusak").status_code, 400)
        r = self._submit()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.data["whatsapp_url"].startswith("https://wa.me/6281234567890"))
        self.assertTrue(any("Pengajuan retur URX-1" in m.subject for m in mail.outbox))
        ret = ReturnRequest.objects.get()
        self.assertTrue(ret.waybill_photo.name.endswith(".webp"))
        # Admin: setujui → pembeli isi resi balik → diterima → dana kembali
        url = f"/api/v1/seller/pengembalian/{ret.pk}/"
        self.assertEqual(self.admin.post(url, {"action": "approve"}, format="json").data["status"], "APPROVED")
        r = APIClient().post("/api/v1/retur/URX-1/", {"phone": "081234567890", "action": "ship_back",
                                                      "courier": "JNE", "tracking_number": "JNE123456"}, format="json")
        self.assertEqual(r.data["return"]["status"], "RETURN_SHIPPED")
        self.admin.post(url, {"action": "received"}, format="json")
        r = self.admin.post(url, {"action": "refund", "refund_amount": "3000000"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.admin.post(url, {"action": "refund", "refund_amount": "2000000", "refund_method": "Transfer BCA"},
                            format="json")
        self.assertEqual(r.data["status"], "REFUNDED")
        self.assertEqual([h["status"] for h in r.data["history"]],
                         ["REQUESTED", "APPROVED", "RETURN_SHIPPED", "RECEIVED", "REFUNDED"])
        self.assertTrue(any("Dana dikembalikan" in m.subject for m in mail.outbox))
        lst = self.admin.get("/api/v1/seller/pengembalian/").data
        self.assertEqual(lst["counts"], {"REFUNDED": 1})
        # Pesanan publik memuat ringkasan retur
        pub = APIClient().get("/api/v1/checkout/orders/URX-1/").data
        self.assertEqual(pub["return"]["status"], "REFUNDED")

    def test_return_window_and_video_limit(self):
        self._complete(hours_ago=50)
        self.assertEqual(self._submit().status_code, 400)
        self._complete(hours_ago=1)
        store = StoreSettings.load()
        store.return_video_max_mb = 1
        store.save()
        big = SimpleUploadedFile("unbox.mp4", b"0" * (1024 * 1024 + 10), content_type="video/mp4")
        r = self._submit(unboxing_video=big, video_via_whatsapp="false")
        self.assertEqual(r.status_code, 400)
        self.assertIn("WhatsApp", r.data["error"])
        r = self._submit(video_via_whatsapp="false")
        self.assertEqual(r.status_code, 400)
        small = SimpleUploadedFile("unbox.mp4", b"0" * 1000, content_type="video/mp4")
        r = self._submit(unboxing_video=small, video_via_whatsapp="false")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(ReturnRequest.objects.get().unboxing_video.name.endswith(".mp4"))
