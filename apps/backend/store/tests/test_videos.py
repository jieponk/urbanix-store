import shutil
import tempfile

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from store.models import Category, Product, ShopVideo

MEDIA = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=MEDIA)
class ShopVideoTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()
        User.objects.create_user("admin", password="rahasia123", is_staff=True)
        self.api = APIClient()
        r = self.api.post("/api/v1/seller/login/", {"username": "admin", "password": "rahasia123"}, format="json")
        self.api.credentials(HTTP_AUTHORIZATION=f"Token {r.data['token']}")
        c = Category.objects.create(name="Kamera", slug="kamera")
        self.p = [Product.objects.create(name=f"Kamera {i}", slug=f"k{i}", sku=f"S{i}", category=c, price=1_000_000, stock=1) for i in range(4)]

    def test_link_youtube_with_products_public(self):
        r = self.api.post("/api/v1/seller/videos/", {"title": "Unboxing", "video_url": "https://youtube.com/shorts/abcDEF12345",
                                                      "product_ids": [self.p[0].id, self.p[1].id]}, format="multipart")
        self.assertEqual(r.status_code, 201, r.content)
        data = APIClient().get("/api/v1/videos/").json()
        self.assertEqual(data[0]["kind"], "youtube")
        self.assertIn("/embed/abcDEF12345", data[0]["src"])
        self.assertTrue(data[0]["poster"].startswith("https://i.ytimg.com/"))
        self.assertEqual([p["id"] for p in data[0]["products"]], [self.p[0].id, self.p[1].id])

    def test_tiktok_and_instagram_links(self):
        v = ShopVideo(title="a", video_url="https://www.tiktok.com/@urbanix/video/7311111111111111111")
        self.assertEqual(v.source()["src"], "https://www.tiktok.com/embed/v2/7311111111111111111")
        v.video_url = "https://www.instagram.com/reel/C1abcDEF/?igsh=x"
        self.assertEqual(v.source()["src"], "https://www.instagram.com/reel/C1abcDEF/embed")

    def test_upload_file_and_validation(self):
        mp4 = SimpleUploadedFile("tes.mp4", b"\x00\x00\x00\x18ftypmp42" + b"0" * 100, content_type="video/mp4")
        r = self.api.post("/api/v1/seller/videos/", {"title": "Tes", "video_file": mp4}, format="multipart")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data["kind"], "file")
        self.assertTrue(r.data["src"].endswith(".mp4"))
        bad = SimpleUploadedFile("tes.exe", b"x", content_type="application/octet-stream")
        r = self.api.post("/api/v1/seller/videos/", {"title": "Tes", "video_file": bad}, format="multipart")
        self.assertEqual(r.status_code, 400)
        r = self.api.post("/api/v1/seller/videos/", {"title": "Kosong"}, format="multipart")
        self.assertEqual(r.status_code, 400)
        r = self.api.post("/api/v1/seller/videos/", {"title": "x", "video_url": "https://youtu.be/abcDEF12345",
                                                      "product_ids": [p.id for p in self.p]}, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_hidden_video_not_public_and_delete(self):
        r = self.api.post("/api/v1/seller/videos/", {"title": "Rahasia", "video_url": "https://youtu.be/abcDEF12345", "is_active": "false"}, format="multipart")
        self.assertEqual(APIClient().get("/api/v1/videos/").json(), [])
        self.assertEqual(self.api.delete(f"/api/v1/seller/videos/{r.data['id']}/").status_code, 204)
