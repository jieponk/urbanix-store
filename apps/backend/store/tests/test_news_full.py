from datetime import timedelta
from unittest import mock

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from store import news_ai
from store.models import ArticleComment, NewsArticle, NewsSource

ARTICLE = "\n\n".join(
    ["Hollyland resmi memperkenalkan mikrofon nirkabel baru untuk kreator yang butuh suara jernih tanpa ribet." * 2,
     "## Fitur utama",
     "Mikrofon ini membawa peredam bising dua tingkat, jangkauan sinyal jauh, dan baterai yang lebih awet." * 2]
)


class NewsFullArticleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.src = NewsSource.objects.create(name="Tes", feed_url="https://contoh.test/feed", last_fetched_at=timezone.now())
        self.news = NewsArticle.objects.create(
            source=self.src, guid="g1", url="https://contoh.test/a", original_title="Hollyland LARK M3",
            original_summary="Hollyland launched the LARK M3 wireless mic for creators and podcasters worldwide.",
            title="Hollyland LARK M3", published_at=timezone.now() - timedelta(hours=1),
        )
        self.client = APIClient()

    def test_parse_reply_keeps_article(self):
        import json
        r = news_ai.parse_reply(json.dumps({"lewati": False, "artikel": ARTICLE, "poin": ["A satu.", "B dua."],
                                            "kesimpulan": "Inti.", "opini": "Menurut kami oke."}))
        self.assertIn("## Fitur utama", r["body"])
        self.assertEqual(r["body"].count("\n\n"), 2)
        short = news_ai.parse_reply('{"artikel": "pendek", "poin": ["A.", "B."], "kesimpulan": "Inti."}')
        self.assertEqual(short["body"], "")

    def test_process_saves_ai_body(self):
        import json
        reply = json.dumps({"lewati": False, "artikel": ARTICLE, "poin": ["A satu.", "B dua."], "kesimpulan": "Inti.", "opini": "Oke."})
        with mock.patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-ant-test"}), \
                mock.patch("store.news_ai.fetch_article_text", return_value="Isi sumber " * 30), \
                mock.patch("store.news_ai._call_claude", return_value=reply):
            self.assertEqual(news_ai.process_article(self.news), "done")
        self.news.refresh_from_db()
        self.assertTrue(self.news.ai_body.startswith("Hollyland resmi"))
        res = self.client.get(f"/api/v1/news/{self.news.id}/").json()
        self.assertEqual(res["ai"]["article"], self.news.ai_body)

    def test_skipped_news_hidden(self):
        NewsArticle.objects.filter(pk=self.news.pk).update(ai_status="skip")
        self.assertEqual(self.client.get("/api/v1/news/").json()["count"], 0)
        self.assertEqual(self.client.get(f"/api/v1/news/{self.news.id}/").status_code, 404)

    def test_news_comments_and_reactions(self):
        url = f"/api/v1/news/{self.news.id}/comments/"
        res = self.client.post(url, {"name": "Budi", "body": "Mantap, kapan masuk Urbanix?"}, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        cid = res.json()["comment"]["id"]
        reply = self.client.post(url, {"name": "Sari", "body": "Ikut nunggu!", "parent": cid}, format="json")
        self.assertEqual(reply.status_code, 201)
        react = self.client.post(f"/api/v1/article-comments/{cid}/react/", {"visitor": "v" * 32, "emoji": "🔥"}, format="json")
        self.assertEqual(react.status_code, 200, react.content)
        data = self.client.get(url).json()
        self.assertEqual(len(data["comments"]), 1)
        self.assertEqual(len(data["comments"][0]["replies"]), 1)
        detail = self.client.get(f"/api/v1/news/{self.news.id}/").json()
        self.assertEqual(len(detail["comments"]), 1)
        c = ArticleComment.objects.get(pk=cid)
        self.assertIsNone(c.article_id)
        self.assertEqual(c.target_url, f"/berita/{self.news.id}")
        listing = self.client.get("/api/v1/news/").json()["results"][0]
        self.assertEqual(listing["comment_count"], 2)
