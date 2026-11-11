from datetime import datetime, timedelta, timezone as dt_tz
from unittest import mock

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from store import news
from decimal import Decimal

from store.models import Category, NewsArticle, NewsSource, Product

RSS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/"><channel>
<title>PetaPixel</title>
<item>
  <title>Sony Announces the A7 V &amp; a New 24-70mm Lens</title>
  <link>https://petapixel.com/2026/11/08/sony-a7-v/</link>
  <guid>https://petapixel.com/?p=1</guid>
  <media:content url="https://petapixel.com/img/a7v.jpg" medium="image"/>
  <pubDate>Sun, 08 Nov 2026 10:00:00 +0000</pubDate>
  <description><![CDATA[<p>Sony has <b>finally</b> revealed its new full-frame camera with a 33MP sensor and improved autofocus. The post Sony A7 V appeared first on PetaPixel.</p>]]></description>
</item>
<item>
  <title>Older story</title>
  <link>https://petapixel.com/old/</link>
  <pubDate>Sat, 07 Nov 2026 10:00:00 +0000</pubDate>
  <description><![CDATA[<img src="https://petapixel.com/img/old.jpg" /> Short.]]></description>
</item>
<item><title></title><link>https://petapixel.com/no-title/</link></item>
</channel></rss>"""

ATOM = b"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>DPReview</title>
<entry>
  <title>Canon EOS R6 III review</title>
  <link rel="alternate" href="https://www.dpreview.com/reviews/canon-r6-iii"/>
  <id>tag:dpreview.com,2026:1</id>
  <updated>2026-11-08T12:00:00Z</updated>
  <summary>A capable hybrid camera.</summary>
</entry></feed>"""

GOOGLE = b"""<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Fujifilm rilis X-T6 di Indonesia - Kompas.com</title>
<link>https://news.google.com/rss/articles/abc</link><guid>abc</guid>
<pubDate>Sun, 08 Nov 2026 09:00:00 GMT</pubDate>
<description>&lt;a href="x"&gt;Fujifilm rilis X-T6 di Indonesia&lt;/a&gt;</description></item>
</channel></rss>"""


class FeedParsingTests(TestCase):
    def test_rss(self):
        items = news.parse_feed(RSS)
        self.assertEqual(len(items), 2)  # item tanpa judul dilewati
        self.assertEqual(items[0].title, "Sony Announces the A7 V & a New 24-70mm Lens")
        self.assertNotIn("<b>", items[0].summary)
        self.assertNotIn("appeared first", items[0].summary)
        self.assertEqual(items[0].published_at.year, 2026)
        self.assertEqual(items[0].image, "https://petapixel.com/img/a7v.jpg")
        self.assertEqual(items[1].image, "https://petapixel.com/img/old.jpg")

    def test_atom(self):
        [item] = news.parse_feed(ATOM)
        self.assertEqual(item.url, "https://www.dpreview.com/reviews/canon-r6-iii")
        self.assertEqual(item.guid, "tag:dpreview.com,2026:1")

    def test_google_news_strips_outlet_and_summary(self):
        [item] = news.parse_feed(GOOGLE, google_news=True)
        self.assertEqual(item.title, "Fujifilm rilis X-T6 di Indonesia")
        self.assertEqual(item.summary, "")

    def test_shorten(self):
        text = "kata " * 100
        out = news.shorten(text.strip(), 50)
        self.assertTrue(out.endswith("…") and len(out) <= 51)


@mock.patch("store.news.timezone.now", return_value=datetime(2026, 11, 9, tzinfo=dt_tz.utc))
class FetchTests(TestCase):
    def setUp(self):
        self.src = NewsSource.objects.create(name="PetaPixel Test", feed_url="https://example.com/feed", language="en")

    def fake_translate(self, texts, source_lang="EN"):
        return [f"[ID] {t}" for t in texts]

    def test_fetch_translates_and_dedupes(self, _now):
        with mock.patch("store.news.download", return_value=RSS), \
             mock.patch("store.news.translate", side_effect=self.fake_translate):
            self.assertEqual(news.fetch_source(self.src), 2)
            self.assertEqual(news.fetch_source(self.src), 0)  # tidak dobel
        a = NewsArticle.objects.get(guid="https://petapixel.com/?p=1")
        self.assertTrue(a.is_translated)
        self.assertTrue(a.title.startswith("[ID] Sony"))
        self.assertTrue(a.original_title.startswith("Sony"))

    def test_without_key_keeps_original(self, _now):
        with mock.patch("store.news.download", return_value=RSS), mock.patch.dict("os.environ", {"DEEPL_API_KEY": ""}):
            news.fetch_source(self.src)
        a = NewsArticle.objects.get(guid="https://petapixel.com/?p=1")
        self.assertFalse(a.is_translated)
        self.assertEqual(a.title, a.original_title)

    def test_indonesian_source_not_translated(self, _now):
        self.src.language = "id"
        self.src.feed_url = "https://news.google.com/rss/search?q=kamera"
        self.src.save()
        with mock.patch("store.news.download", return_value=GOOGLE), mock.patch("store.news.translate") as tr:
            news.fetch_source(self.src)
        tr.assert_not_called()
        self.assertTrue(NewsArticle.objects.get().is_translated)

    def test_error_is_recorded(self, _now):
        with mock.patch("store.news.download", side_effect=OSError("timeout")):
            self.assertEqual(news.fetch_source(self.src), 0)
        self.src.refresh_from_db()
        self.assertIn("timeout", self.src.last_error)

    def test_old_items_skipped(self, _now):
        _now.return_value = datetime(2027, 6, 1, tzinfo=dt_tz.utc)
        with mock.patch("store.news.download", return_value=RSS):
            self.assertEqual(news.fetch_source(self.src), 0)


class NewsApiTests(TestCase):
    def setUp(self):
        cache.clear()
        NewsSource.objects.all().delete()
        self.api = APIClient()
        self.a = NewsSource.objects.create(name="A", feed_url="https://a.test/feed", last_fetched_at=timezone.now())
        self.b = NewsSource.objects.create(name="B", feed_url="https://b.test/feed", last_fetched_at=timezone.now())
        now = timezone.now()
        for i in range(5):
            NewsArticle.objects.create(source=self.a, guid=f"a{i}", url=f"https://a.test/{i}", original_title=f"A{i}",
                                       title=f"Berita A{i}", published_at=now - timedelta(hours=i), is_translated=True)
        NewsArticle.objects.create(source=self.b, guid="b0", url="https://b.test/0", original_title="B0",
                                   title="Berita B0", published_at=now - timedelta(days=3), is_pinned=True)
        NewsArticle.objects.create(source=self.b, guid="b1", url="https://b.test/1", original_title="B1",
                                   title="Tersembunyi", published_at=now, is_visible=False)

    def test_list_pinned_first_hidden_excluded(self):
        r = self.api.get("/api/v1/news/?limit=4")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["count"], 6)
        self.assertEqual(r.data["pages"], 2)
        self.assertEqual(r.data["results"][0]["title"], "Berita B0")
        self.assertNotIn("Tersembunyi", [x["title"] for x in r.data["results"]])
        self.assertEqual({s["name"] for s in r.data["sources"]}, {"A", "B"})

    def test_filter_and_page(self):
        r = self.api.get(f"/api/v1/news/?source={self.a.id}&limit=2&page=3")
        self.assertEqual([x["title"] for x in r.data["results"]], ["Berita A4"])

    def test_stale_sources_trigger_one_background_refresh(self):
        NewsSource.objects.update(last_fetched_at=None)
        with mock.patch("store.news.threading.Thread") as thread:
            self.api.get("/api/v1/news/")
            self.api.get("/api/v1/news/")
        self.assertEqual(thread.call_count, 1)  # dikunci 10 menit

    def test_fresh_sources_no_refresh(self):
        with mock.patch("store.news.threading.Thread") as thread:
            self.api.get("/api/v1/news/")
        thread.assert_not_called()


class NewsDetailTests(TestCase):
    def setUp(self):
        NewsSource.objects.all().delete()
        self.api = APIClient()
        src = NewsSource.objects.create(name="PetaPixel", feed_url="https://p.test/feed", last_fetched_at=timezone.now())
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.sony = Product.objects.create(category=cat, name="Sony A7 IV Body", slug="sony", sku="S1",
                                           description="-", price=Decimal("30000000"), stock=2)
        Product.objects.create(category=cat, name="Canon R50", slug="canon", sku="C1",
                               description="-", price=Decimal("12000000"), stock=2)
        self.art = NewsArticle.objects.create(
            source=src, guid="x", url="https://p.test/x", original_title="Sony Announces the A7 V",
            title="Sony Umumkan A7 V", summary="Ringkasan", image_url="https://p.test/a.jpg",
            published_at=timezone.now(), is_translated=True)
        NewsArticle.objects.create(source=src, guid="y", url="https://p.test/y", original_title="Other",
                                   title="Lainnya", published_at=timezone.now())

    def test_detail_with_brand_products(self):
        r = self.api.get(f"/api/v1/news/{self.art.id}/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["image_url"], "https://p.test/a.jpg")
        self.assertEqual(r.data["related_brand"], "Sony")
        self.assertEqual([p["name"] for p in r.data["related_products"]], ["Sony A7 IV Body"])
        self.assertEqual([m["title"] for m in r.data["more"]], ["Lainnya"])

    def test_no_brand_falls_back_to_latest(self):
        self.art.original_title = self.art.title = "Tips memotret senja"
        self.art.save()
        r = self.api.get(f"/api/v1/news/{self.art.id}/")
        self.assertEqual(r.data["related_brand"], "")
        self.assertEqual(len(r.data["related_products"]), 2)

    def test_hidden_is_404(self):
        self.art.is_visible = False
        self.art.save()
        self.assertEqual(self.api.get(f"/api/v1/news/{self.art.id}/").status_code, 404)
