from datetime import timedelta

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from store.emails import review_candidates, send_review_requests
from store.models import Order, ProductReview
from store.reviews_api import display_name, review_token

from .test_seller import PNG, SellerTestBase


class ProductReviewTests(SellerTestBase):
    def test_flow_review_summary_and_seller(self):
        order = self.make_order(status="PENDING")
        token = review_token(order)
        pub = APIClient()
        url = f"/api/v1/order-reviews/{token}/"

        self.assertEqual(pub.get("/api/v1/order-reviews/URX-T1:palsu/").status_code, 404)
        data = pub.get(url).data
        self.assertFalse(data["can_review"])
        self.assertEqual(data["customer_name"], "Budi")
        r = pub.post(url, {"product_id": self.cam.id, "rating": 5}, format="json")
        self.assertEqual(r.status_code, 400)  # belum dikirim

        Order.objects.filter(pk=order.pk).update(status="COMPLETED")
        photo = SimpleUploadedFile("a.png", PNG, content_type="image/png")
        r = pub.post(url, {"product_id": self.cam.id, "rating": 5, "body": "Mantap, original!", "photo": photo},
                     format="multipart")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(r.data["review"]["photo_url"].endswith(".webp"))
        # tidak bisa dua kali / produk lain / bintang aneh
        self.assertEqual(pub.post(url, {"product_id": self.cam.id, "rating": 4}, format="json").status_code, 400)
        self.assertEqual(pub.post(url, {"product_id": self.lens.id, "rating": 4}, format="json").status_code, 400)
        self.assertEqual(pub.post(url, {"product_id": self.cam.id, "rating": 9}, format="json").status_code, 400)
        self.assertIsNotNone(pub.get(url).data["items"][0]["review"])

        lst = pub.get(f"/api/v1/products/{self.cam.id}/reviews/").data
        self.assertEqual(lst["summary"]["count"], 1)
        self.assertEqual(lst["summary"]["average"], 5.0)
        self.assertEqual(lst["results"][0]["body"], "Mantap, original!")

        rid = lst["results"][0]["id"]
        self.api.patch(f"/api/v1/seller/product-reviews/{rid}/", {"staff_reply": "Terima kasih kak!"}, format="json")
        self.assertEqual(pub.get(f"/api/v1/products/{self.cam.id}/reviews/").data["results"][0]["staff_reply"],
                         "Terima kasih kak!")
        self.api.patch(f"/api/v1/seller/product-reviews/{rid}/", {"is_visible": False}, format="json")
        self.assertEqual(pub.get(f"/api/v1/products/{self.cam.id}/reviews/").data["summary"]["count"], 0)
        self.assertEqual(self.api.get("/api/v1/seller/product-reviews/?status=hidden").data["count"], 1)

        detail = pub.get(f"/api/v1/checkout/orders/{order.order_number}/").data
        self.assertIn(f"/ulasan/{token}", detail["review_url"])

    def test_display_name(self):
        self.assertEqual(display_name("rani susanti putri"), "Rani P.")
        self.assertEqual(display_name(""), "Pembeli")

    @override_settings(ORDER_EMAIL_ENABLED=True, ORDER_EMAIL_SYNC=True)
    def test_review_email_once(self):
        order = self.make_order(status="COMPLETED")
        Order.objects.filter(pk=order.pk).update(customer_email="budi@example.com",
                                                 updated_at=timezone.now() - timedelta(days=2))
        fresh = self.make_order(status="COMPLETED")
        Order.objects.filter(pk=fresh.pk).update(customer_email="x@example.com")  # baru selesai: belum
        self.assertEqual(list(review_candidates().values_list("pk", flat=True)), [order.pk])
        self.assertEqual(send_review_requests(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/ulasan/", mail.outbox[0].body)
        self.assertEqual(send_review_requests(), 0)
        self.assertEqual(ProductReview.objects.count(), 0)
