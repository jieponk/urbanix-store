from datetime import timedelta
from unittest import mock

from django.test import TestCase
from django.utils import timezone

from store import news_ai
from store.models import NewsArticle, NewsSource

HTML = """<html><head><script>var x=1</script></head><body><nav>Menu</nav>
<article><h1>Judul</h1><p>Hollyland announced the LARK M3, a wireless microphone system for multi-person shoots.</p>
<p>Subscribe to our newsletter</p><h2>Features</h2>
<p>It supports multiple transmitters and receivers at the same time with AI noise cancellation.</p></article></body></html>"""


class NewsAiTests(TestCase):
    def setUp(self):
        self.src = NewsSource.objects.create(name="Tes", feed_url="https://contoh.test/feed")
        self.art = NewsArticle.objects.create(
            source=self.src, guid="g1", url="https://contoh.test/a", original_title="Hollyland LARK M3",
            original_summary="Hollyland launched the LARK M3 wireless mic for creators and podcasters worldwide.",
            title="Hollyland LARK M3", published_at=timezone.now() - timedelta(hours=1),
        )

    def test_extract_text_drops_noise(self):
        text = news_ai.extract_text(HTML)
        self.assertIn("LARK M3, a wireless microphone", text)
        self.assertIn("## Features", text)
        self.assertNotIn("Subscribe", text)
        self.assertNotIn("var x", text)

    def test_parse_reply(self):
        r = news_ai.parse_reply('teks {"lewati": false, "poin": ["A satu.", "B dua."], "kesimpulan": "Inti.", "opini": "Menurut kami oke."}')
        self.assertEqual(r["points"], ["A satu.", "B dua."])
        self.assertTrue(news_ai.parse_reply('{"lewati": true}')["skip"])
        self.assertIsNone(news_ai.parse_reply("bukan json"))

    @mock.patch.dict("os.environ", {"ANTHROPIC_API_KEY": "kunci-tes"})
    @mock.patch("store.news_ai.fetch_article_text", return_value=news_ai.extract_text(HTML))
    @mock.patch("store.news_ai._call_claude", return_value='{"lewati": false, "poin": ["Satu.", "Dua.", "Tiga."], "kesimpulan": "Inti berita.", "opini": "Menurut kami menarik."}')
    def test_process_article_saves_ai_but_not_body_without_permission(self, *_):
        self.assertEqual(news_ai.process_pending(5), 1)
        self.art.refresh_from_db()
        self.assertEqual(self.art.ai_status, "done")
        self.assertEqual(self.art.ai_points, ["Satu.", "Dua.", "Tiga."])
        self.assertEqual(self.art.body, "")  # sumber tidak berizin: teks penuh tidak disimpan

        res = self.client.get(f"/api/v1/news/{self.art.pk}/").json()
        self.assertEqual(res["ai"]["conclusion"], "Inti berita.")
        self.assertEqual(res["body"], "")

    @mock.patch.dict("os.environ", {"ANTHROPIC_API_KEY": ""})
    @mock.patch("store.news_ai.fetch_article_text", return_value="Teks penuh siaran pers yang boleh ditampilkan.")
    def test_full_text_saved_for_allowed_source_without_ai_key(self, _):
        self.src.full_text_allowed = True
        self.src.save()
        news_ai.process_pending(5)
        self.art.refresh_from_db()
        self.assertEqual(self.art.body, "Teks penuh siaran pers yang boleh ditampilkan.")
        self.assertEqual(self.art.ai_status, "pending")
        res = self.client.get(f"/api/v1/news/{self.art.pk}/").json()
        self.assertIsNone(res["ai"])
        self.assertIn("siaran pers", res["body"])
