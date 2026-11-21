from decimal import Decimal
from unittest import mock

from django.test import TestCase

from store import content_i18n
from store.models import Category, ContentTranslation, Product


class ContentI18nTests(TestCase):
    def setUp(self):
        self.cat = Category.objects.create(name="Kamera Saku", slug="kamera-saku")
        self.p = Product.objects.create(
            name="Kamera saku murah", sku="TST-1", description="Kamera kecil untuk jalan-jalan.",
            price=Decimal("100000"), stock=5, category=self.cat,
        )

    def test_queue_then_translate(self):
        r = self.client.get(f"/api/v1/products/{self.p.pk}/?lang=en")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["name"], "Kamera saku murah")  # belum ada terjemahan → asli
        self.assertTrue(ContentTranslation.objects.filter(source="Kamera saku murah", status="pending").exists())

        def fake(texts, lang="en"):
            return [f"EN:{t}" for t in texts]

        with mock.patch.object(content_i18n, "deepl_translate", side_effect=fake):
            items, _ = content_i18n.translate_pending()
        self.assertGreaterEqual(items, 3)

        data = self.client.get(f"/api/v1/products/{self.p.pk}/?lang=en").json()
        self.assertEqual(data["name"], "EN:Kamera saku murah")
        self.assertEqual(data["description"], "EN:Kamera kecil untuk jalan-jalan.")
        self.assertEqual(data["category_name"], "EN:Kamera Saku")
        # tanpa ?lang tetap Indonesia
        self.assertEqual(self.client.get(f"/api/v1/products/{self.p.pk}/").json()["name"], "Kamera saku murah")

    def test_protect_tokens(self):
        src = "Lihat [[produk:12]] dan `kode` di https://urbanix.id <b>"
        protected = content_i18n._protect(src)
        self.assertIn("<x>[[produk:12]]</x>", protected)
        self.assertIn("&lt;b&gt;", protected)
        self.assertEqual(content_i18n._unprotect(protected), src)

    def test_skip_non_text(self):
        self.assertFalse(content_i18n.worth_translating("https://x.y"))
        self.assertFalse(content_i18n.worth_translating("123"))
        self.assertTrue(content_i18n.worth_translating("Diskon 8%"))
