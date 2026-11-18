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


class FreeProviderTests(TestCase):
    """Penyedia gratis (Groq/Gemini) lewat format OpenAI-compatible."""

    def setUp(self):
        news_ai._resting.clear()
        self.src = NewsSource.objects.create(name="Tes", feed_url="https://contoh.test/feed2", last_fetched_at=timezone.now())
        for i in range(3):
            NewsArticle.objects.create(
                source=self.src, guid=f"f{i}", url=f"https://contoh.test/f{i}", original_title=f"Berita {i}",
                original_summary="x", title=f"Berita {i}", published_at=timezone.now() - timedelta(hours=i + 1),
            )

    def _resp(self, payload):
        import io
        import json

        class R(io.BytesIO):
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        return R(json.dumps(payload).encode())

    @mock.patch.dict("os.environ", {"NEWS_AI_PROVIDER": "groq", "NEWS_AI_API_KEY": "gsk_test", "NEWS_AI_DELAY": "0"})
    def test_groq_request_and_parse(self):
        import json
        reply = json.dumps({"lewati": False, "artikel": ARTICLE, "poin": ["A.", "B."], "kesimpulan": "Inti.", "opini": "Oke."})
        seen = {}

        def fake_urlopen(req, timeout=0):
            seen["url"] = req.full_url
            seen["auth"] = req.get_header("Authorization")
            seen["body"] = json.loads(req.data)
            return self._resp({"choices": [{"message": {"content": reply}}]})

        with mock.patch("store.news_ai.fetch_article_text", return_value="Isi sumber " * 30), \
                mock.patch("store.news_ai.urllib.request.urlopen", side_effect=fake_urlopen):
            self.assertEqual(news_ai.process_pending(1), 1)
        self.assertIn("api.groq.com", seen["url"])
        self.assertEqual(seen["auth"], "Bearer gsk_test")
        self.assertEqual(seen["body"]["model"], "openai/gpt-oss-120b")
        self.assertEqual(NewsArticle.objects.filter(ai_status="done").count(), 1)

    @mock.patch.dict("os.environ", {"NEWS_AI_PROVIDER": "gemini", "NEWS_AI_API_KEY": "AIza_test", "NEWS_AI_DELAY": "0"})
    def test_quota_exhausted_stops_run(self):
        import urllib.error
        err = urllib.error.HTTPError("https://x", 429, "Too Many Requests", {}, None)
        with mock.patch("store.news_ai.fetch_article_text", return_value="Isi sumber " * 30), \
                mock.patch("store.news_ai.urllib.request.urlopen", side_effect=err) as call:
            self.assertEqual(news_ai.process_pending(3), 0)
        self.assertEqual(call.call_count, 1)  # berhenti setelah kuota habis, tidak menembak terus
        self.assertEqual(NewsArticle.objects.filter(ai_status="pending").count(), 3)  # dicoba lagi nanti


class BacklogTests(TestCase):
    @mock.patch.dict("os.environ", {"NEWS_AI_PROVIDER": "gemini", "NEWS_AI_API_KEY": "AQ.test", "NEWS_AI_DELAY": "0"})
    def test_google_news_bulk_skipped_and_limit_counts_ai_calls(self):
        news_ai._resting.clear()
        import json
        src = NewsSource.objects.create(name="Campur", feed_url="https://contoh.test/feed3", last_fetched_at=timezone.now())
        now = timezone.now()
        for i in range(10):  # berita Google News terbaru (tanpa isi)
            NewsArticle.objects.create(source=src, guid=f"gn{i}", url=f"https://news.google.com/rss/articles/{i}",
                                       original_title=f"HP {i}", title=f"HP {i}", published_at=now - timedelta(minutes=i))
        real = NewsArticle.objects.create(source=src, guid="real", url="https://contoh.test/kamera", original_title="Kamera baru",
                                          title="Kamera baru", published_at=now - timedelta(days=1))
        reply = json.dumps({"lewati": False, "artikel": ARTICLE, "poin": ["A.", "B."], "kesimpulan": "Inti.", "opini": "Oke."})
        with mock.patch("store.news_ai.fetch_article_text", return_value="Isi sumber " * 30), \
                mock.patch("store.news_ai._call_ai", return_value=reply) as call:
            self.assertEqual(news_ai.process_pending(1), 1)
        self.assertEqual(call.call_count, 1)
        self.assertEqual(NewsArticle.objects.filter(ai_status="skip").count(), 10)
        real.refresh_from_db()
        self.assertEqual(real.ai_status, "done")


class FallbackTests(TestCase):
    def setUp(self):
        news_ai._resting.clear()
        src = NewsSource.objects.create(name="Tes", feed_url="https://contoh.test/feed4", last_fetched_at=timezone.now())
        self.news = NewsArticle.objects.create(source=src, guid="fb", url="https://contoh.test/fb", original_title="Kamera",
                                               title="Kamera", published_at=timezone.now())

    def tearDown(self):
        news_ai._resting.clear()

    @mock.patch.dict("os.environ", {"GROQ_API_KEY": "gsk_x", "GEMINI_API_KEY": "AQ.x", "NEWS_AI_DELAY": "0",
                                    "NEWS_AI_PROVIDER": "", "NEWS_AI_API_KEY": ""})
    def test_groq_quota_falls_back_to_gemini(self):
        import json
        import urllib.error
        self.assertEqual(news_ai.chain(), ["groq", "gemini"])
        reply = json.dumps({"lewati": False, "artikel": ARTICLE, "poin": ["A.", "B."], "kesimpulan": "Inti.", "opini": "Oke."})
        used = []

        def fake(prompt, name):
            used.append(name)
            if name == "groq":
                raise urllib.error.HTTPError("https://x", 429, "Too Many", {}, None)
            return reply

        with mock.patch("store.news_ai.fetch_article_text", return_value="Isi sumber " * 30), \
                mock.patch("store.news_ai._call_openai_compatible", side_effect=fake):
            self.assertEqual(news_ai.process_pending(1), 1)
        self.assertEqual(used, ["groq", "gemini"])
        self.assertEqual(news_ai.provider(), "gemini")  # Groq istirahat 30 menit

    @mock.patch.dict("os.environ", {"NEWS_AI_PROVIDER": "gemini", "NEWS_AI_API_KEY": "AQ.lama", "GROQ_API_KEY": "",
                                    "GEMINI_API_KEY": ""})
    def test_old_single_provider_setting_still_works(self):
        self.assertEqual(news_ai.chain(), ["gemini"])
        self.assertEqual(news_ai._key_for("gemini"), "AQ.lama")


class FetchFailTests(TestCase):
    @mock.patch.dict("os.environ", {"GEMINI_API_KEY": "AQ.x", "NEWS_AI_DELAY": "0", "NEWS_AI_PROVIDER": "", "NEWS_AI_API_KEY": "",
                                    "GROQ_API_KEY": ""})
    def test_unreadable_source_stays_visible(self):
        news_ai._resting.clear()
        src = NewsSource.objects.create(name="DIY", feed_url="https://contoh.test/feed5", last_fetched_at=timezone.now())
        n = NewsArticle.objects.create(source=src, guid="ff", url="https://contoh.test/hera", original_title="Hera",
                                       original_summary="Pendek.", title="Hera", published_at=timezone.now())
        with mock.patch("store.news_ai.fetch_article_text", return_value=""), \
                mock.patch("store.news_ai._call_ai") as call:
            self.assertEqual(news_ai.process_article(n), "failed")
        call.assert_not_called()
        self.assertEqual(APIClient().get("/api/v1/news/").json()["count"], 1)  # tidak disembunyikan
        self.assertIn('"user-agent"', open(news_ai.__file__).read())


class OpenAiProviderTests(TestCase):
    @mock.patch.dict("os.environ", {"OPENAI_API_KEY": "sk-proj-test", "GROQ_API_KEY": "gsk_x", "GEMINI_API_KEY": "",
                                    "NEWS_AI_PROVIDER": "", "NEWS_AI_API_KEY": "", "ANTHROPIC_API_KEY": ""})
    def test_openai_is_after_free_providers_and_uses_new_param(self):
        import io
        import json
        news_ai._resting.clear()
        self.assertEqual(news_ai.chain(), ["groq", "openai"])
        seen = {}

        class R(io.BytesIO):
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        def fake(req, timeout=0):
            seen["url"] = req.full_url
            seen["body"] = json.loads(req.data)
            return R(json.dumps({"choices": [{"message": {"content": '{"ok": true}'}}]}).encode())

        with mock.patch("store.news_ai.urllib.request.urlopen", side_effect=fake):
            news_ai._call_openai_compatible("tes", "openai")
        self.assertEqual(seen["url"], "https://api.openai.com/v1/chat/completions")
        self.assertEqual(seen["body"]["model"], "gpt-4.1-mini")
        self.assertIn("max_completion_tokens", seen["body"])
        self.assertNotIn("reasoning_effort", seen["body"])


class SitemapFilterTests(TestCase):
    def test_artikel_filter_only_returns_news_with_article(self):
        src = NewsSource.objects.create(name="S", feed_url="https://contoh.test/feed6", last_fetched_at=timezone.now())
        NewsArticle.objects.create(source=src, guid="a1", url="https://contoh.test/1", original_title="A", title="A",
                                   published_at=timezone.now(), ai_status="done", ai_body="Isi artikel " * 50)
        NewsArticle.objects.create(source=src, guid="a2", url="https://contoh.test/2", original_title="B", title="B",
                                   published_at=timezone.now())
        c = APIClient()
        self.assertEqual(c.get("/api/v1/news/").json()["count"], 2)
        only = c.get("/api/v1/news/?artikel=1").json()
        self.assertEqual(only["count"], 1)
        self.assertEqual(only["results"][0]["title"], "A")
        self.assertIn("updated_at", only["results"][0])
