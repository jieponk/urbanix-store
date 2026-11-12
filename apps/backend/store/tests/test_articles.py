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
        # komentar wajar langsung tampil
        r = pub.post(f"/api/v1/articles/{slug}/comments/", {"name": "Rani", "body": "Mantap, ditunggu reviewnya!"},
                     format="json")
        self.assertEqual(r.status_code, 201)
        self.assertFalse(r.data["held"])
        self.assertEqual(pub.get(f"/api/v1/articles/{slug}/").data["comments"][0]["name"], "Rani")
        # berisi link / kata kasar -> ditahan untuk dicek admin
        r = pub.post(f"/api/v1/articles/{slug}/comments/", {"name": "Joko", "body": "cek https://a.com"}, format="json")
        self.assertTrue(r.data["held"])
        r = pub.post(f"/api/v1/articles/{slug}/comments/", {"name": "Budi", "body": "dasar goblok"}, format="json")
        self.assertTrue(r.data["held"])
        self.assertEqual(len(pub.get(f"/api/v1/articles/{slug}/comments/").data["comments"]), 1)

        c = ArticleComment.objects.get(name="Rani")
        lst = self.api.get("/api/v1/seller/article-comments/?status=pending")
        self.assertEqual(lst.data["pending"], 2)
        self.api.post(f"/api/v1/seller/article-comments/{c.id}/", {"body": "Terima kasih!"}, format="json")
        comments = pub.get(f"/api/v1/articles/{slug}/").data["comments"]
        self.assertTrue(comments[0]["replies"][0]["is_staff_reply"])

    def test_reply_reaction_and_gif(self):
        pub = APIClient()
        slug = "selamat-datang-di-inspirasi-urbanix"
        top = pub.post(f"/api/v1/articles/{slug}/comments/", {"name": "Rani", "body": "Halo"}, format="json").data["comment"]
        r1 = pub.post(f"/api/v1/articles/{slug}/comments/", {"name": "Dimas", "body": "@Rani setuju", "parent": top["id"]},
                      format="json").data["comment"]
        # balas sebuah balasan -> tetap menempel ke komentar utama (1 tingkat)
        pub.post(f"/api/v1/articles/{slug}/comments/", {"name": "Sari", "body": "aku juga", "parent": r1["id"]}, format="json")
        data = pub.get(f"/api/v1/articles/{slug}/comments/").data["comments"]
        self.assertEqual([r["name"] for r in data[0]["replies"]], ["Dimas", "Sari"])

        v1, v2 = "a" * 20, "b" * 20
        url = f"/api/v1/article-comments/{top['id']}/react/"
        pub.post(url, {"visitor": v1, "emoji": "❤️"}, format="json")
        r = pub.post(url, {"visitor": v2, "emoji": "😂"}, format="json")
        self.assertEqual(r.data["reactions"], {"❤️": 1, "😂": 1})
        r = pub.post(url, {"visitor": v1, "emoji": "😂"}, format="json")  # ganti reaksi
        self.assertEqual(r.data["reactions"], {"😂": 2})
        r = pub.post(url, {"visitor": v1, "emoji": "😂"}, format="json")  # tekan lagi = hapus
        self.assertEqual((r.data["reactions"], r.data["my_reaction"]), ({"😂": 1}, ""))
        self.assertEqual(pub.post(url, {"visitor": v1, "emoji": "💩"}, format="json").status_code, 400)
        self.assertEqual(pub.post(url, {"visitor": "x", "emoji": "❤️"}, format="json").status_code, 400)
        mine = pub.get(f"/api/v1/articles/{slug}/comments/?visitor={v2}").data["comments"][0]["my_reaction"]
        self.assertEqual(mine, "😂")

        ok = pub.post(f"/api/v1/articles/{slug}/comments/",
                      {"name": "Gif", "body": "", "gif_url": "https://media2.giphy.com/media/abc123/200w.gif"}, format="json")
        self.assertEqual(ok.status_code, 201, ok.data)
        bad = pub.post(f"/api/v1/articles/{slug}/comments/",
                       {"name": "Gif", "body": "x", "gif_url": "https://evil.com/a.gif"}, format="json")
        self.assertEqual(bad.status_code, 400)
        # admin: sematkan, beri reaksi, balas dengan GIF
        adm = f"/api/v1/seller/article-comments/{top['id']}/"
        self.api.patch(adm, {"is_pinned": True, "reaction": "🔥"}, format="json")
        r = self.api.post(adm, {"body": "", "gif_url": "https://media1.giphy.com/media/xyz/200w.gif"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        first = pub.get(f"/api/v1/articles/{slug}/comments/").data["comments"][0]
        self.assertTrue(first["is_pinned"])
        self.assertEqual(first["staff_reaction"], "🔥")
        self.assertEqual(first["replies"][-1]["gif_url"], "https://media1.giphy.com/media/xyz/200w.gif")
        self.assertEqual(self.api.patch(f"/api/v1/seller/article-comments/{r1['id']}/", {"is_pinned": True},
                                        format="json").status_code, 400)
        with self.settings(GIPHY_API_KEY=""):
            self.assertEqual(pub.get("/api/v1/gifs/?q=kucing").status_code, 503)

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
        cache.clear()
        for _ in range(5):
            pub.post(f"/api/v1/articles/{slug}/comments/", {"name": "Rani", "body": "halo"}, format="json")
        r = pub.post(f"/api/v1/articles/{slug}/comments/", {"name": "Rani", "body": "halo"}, format="json")
        self.assertEqual(r.status_code, 429)

    def test_public_cannot_use_seller_api(self):
        self.assertEqual(APIClient().get("/api/v1/seller/articles/").status_code, 401)
        art = Article.objects.first()
        self.assertEqual(APIClient().delete(f"/api/v1/seller/articles/{art.id}/").status_code, 401)
