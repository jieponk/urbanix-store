from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from store.models import Article, ArticleCategory, ArticleComment
from store.tests.test_seller import PNG, SellerTestBase


class ArticleTests(SellerTestBase):
    def test_sample_posts_from_migration(self):
        self.assertEqual(ArticleCategory.objects.count(), 4)
        r = APIClient().get("/api/v1/articles/")
        self.assertEqual(r.status_code, 200)
        slugs = [a["slug"] for a in r.data["results"]]
        self.assertEqual(slugs[0], "selamat-datang-di-inspirasi-urbanix")  # disematkan tampil pertama
        self.assertIn("tes-tampilan-artikel", slugs)
        self.assertEqual(r.data["results"][0]["tags"], ["urbanix", "inspirasi", "kreator"])
        by_label = APIClient().get("/api/v1/articles/?label=kreator").data["results"]
        self.assertEqual([a["slug"] for a in by_label], ["selamat-datang-di-inspirasi-urbanix"])

    def test_create_publish_and_read(self):
        r = self.api.post("/api/v1/seller/articles/", {
            "title": "Tips Foto Produk", "body": f"Halo **dunia**\n\n[[produk:{self.cam.id}]]",
            "status": "PUBLISHED", "related_products": [self.cam.id],
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data["slug"], "tips-foto-produk")
        # judul sama -> slug unik
        r2 = self.api.post("/api/v1/seller/articles/", {"title": "Tips Foto Produk"}, format="json")
        self.assertEqual(r2.data["slug"], "tips-foto-produk-2")
        self.assertEqual(r2.data["status"], "DRAFT")

        pub = APIClient()
        d = pub.get("/api/v1/articles/tips-foto-produk/")
        self.assertEqual(d.status_code, 200)
        self.assertIn(str(self.cam.id), d.data["products"])
        self.assertEqual(d.data["related_products"][0]["id"], self.cam.id)
        self.assertEqual(pub.get("/api/v1/articles/tips-foto-produk-2/").status_code, 404)  # draf tidak publik

    def test_cover_upload_and_body_image(self):
        r = self.api.post("/api/v1/seller/articles/", {
            "title": "Dengan sampul", "cover": SimpleUploadedFile("a.png", PNG, content_type="image/png"),
        }, format="multipart")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.data["cover"].startswith("/media/articles/"))
        img = self.api.post("/api/v1/seller/articles/image/",
                            {"image": SimpleUploadedFile("b.png", PNG, content_type="image/png")}, format="multipart")
        self.assertEqual(img.status_code, 201)
        self.assertIn("/media/articles/body/", img.data["url"])

    def test_comment_moderation_flow(self):
        pub = APIClient()
        slug = "selamat-datang-di-inspirasi-urbanix"
        r = pub.post(f"/api/v1/articles/{slug}/comments/", {"name": "Rani", "body": "Mantap, ditunggu reviewnya!"},
                     format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(pub.get(f"/api/v1/articles/{slug}/").data["comments"], [])  # belum disetujui

        c = ArticleComment.objects.get(name="Rani")
        lst = self.api.get("/api/v1/seller/article-comments/?status=pending")
        self.assertEqual(lst.data["pending"], 1)
        self.api.patch(f"/api/v1/seller/article-comments/{c.id}/", {"is_approved": True}, format="json")
        self.api.post(f"/api/v1/seller/article-comments/{c.id}/", {"body": "Terima kasih!"}, format="json")
        comments = pub.get(f"/api/v1/articles/{slug}/").data["comments"]
        self.assertEqual(comments[0]["name"], "Rani")
        self.assertTrue(comments[0]["replies"][0]["is_staff_reply"])

    def test_comment_spam_guards(self):
        pub = APIClient()
        slug = "tes-tampilan-artikel"
        # honeypot: diterima tapi tidak disimpan
        pub.post(f"/api/v1/articles/{slug}/comments/", {"name": "Bot", "body": "spam", "website": "x"}, format="json")
        self.assertFalse(ArticleComment.objects.filter(name="Bot").exists())
        r = pub.post(f"/api/v1/articles/{slug}/comments/",
                     {"name": "Spam", "body": "cek https://a.com dan https://b.com"}, format="json")
        self.assertEqual(r.status_code, 400)
        cache.clear()
        for _ in range(5):
            pub.post(f"/api/v1/articles/{slug}/comments/", {"name": "Rani", "body": "halo"}, format="json")
        r = pub.post(f"/api/v1/articles/{slug}/comments/", {"name": "Rani", "body": "halo"}, format="json")
        self.assertEqual(r.status_code, 429)

    def test_public_cannot_use_seller_api(self):
        self.assertEqual(APIClient().get("/api/v1/seller/articles/").status_code, 401)
        art = Article.objects.first()
        self.assertEqual(APIClient().delete(f"/api/v1/seller/articles/{art.id}/").status_code, 401)
