from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from store.models import Article, Category, Product


class ProductExtrasTests(TestCase):
    def setUp(self):
        cache.clear()
        cam = Category.objects.create(name="Action Cam", slug="action-cam")
        acc = Category.objects.create(name="Aksesori Kamera", slug="aksesori")
        mem = Category.objects.create(name="Memory & Gadget", slug="memory")
        self.pocket = Product.objects.create(name="DJI Osmo Pocket 4 Pocket Camera", slug="p4", sku="P4", category=cam, price=8000000, stock=3)
        self.filter = Product.objects.create(name="Freewell ND Filter Osmo Pocket 4", slug="f", sku="F", category=acc, price=900000, stock=5)
        self.sd = Product.objects.create(name="SanDisk Extreme microSD 128GB Memory Card", slug="sd", sku="SD", category=mem, price=300000, stock=9)
        self.habis = Product.objects.create(name="DJI Osmo Pocket 4 Battery Handle", slug="bh", sku="BH", category=acc, price=1000000, stock=0)
        self.lain = Product.objects.create(name="Sony A7 IV Body", slug="a7", sku="A7", category=cam, price=30000000, stock=1)
        art = Article.objects.create(title="Pocket 3 vs Pocket 4", slug="p3-vs-p4", body="Bahas [[produk:%d]]" % self.pocket.id,
                                     status="PUBLISHED", published_at=timezone.now(), author_name="Tim Urbanix")
        Article.objects.create(title="Tips lain", slug="lain", body="x", status="PUBLISHED", published_at=timezone.now(), author_name="Tim")
        self.art = art

    def test_accessories_and_articles(self):
        res = APIClient().get(f"/api/v1/products/{self.pocket.id}/lengkapi/").json()
        ids = [p["id"] for p in res["accessories"]]
        self.assertEqual(ids[0], self.filter.id)  # cocok nama + kategori aksesori
        self.assertIn(self.sd.id, ids)  # kartu memori = pelengkap umum
        self.assertNotIn(self.habis.id, ids)  # stok habis tidak ditawarkan
        self.assertNotIn(self.lain.id, ids)  # kategori sama (kamera lain) bukan pelengkap
        self.assertEqual([a["slug"] for a in res["articles"]], ["p3-vs-p4"])
