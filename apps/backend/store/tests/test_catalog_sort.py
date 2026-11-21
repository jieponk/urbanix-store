from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from store.models import Category, Order, OrderItem, Product


class ProductSoldCountTests(TestCase):
    """sold_count/review_count di daftar produk dipakai urutan "Terlaris" di katalog."""

    def setUp(self):
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.a = Product.objects.create(name="Kamera A", slug="kamera-a", sku="A1", category=cat, price=1000000, stock=5)
        self.b = Product.objects.create(name="Kamera B", slug="kamera-b", sku="B1", category=cat, price=2000000, stock=5)

    def _order(self, product, qty, status="PENDING", n=[0]):
        n[0] += 1
        order = Order.objects.create(
            order_number=f"URX-S-{n[0]}", customer_name="Budi", customer_phone="08123456789",
            shipping_address="Jl. Mawar", shipping_city="Bandung", payment_method="WHATSAPP",
            total_amount=100000, status=status,
        )
        OrderItem.objects.create(order=order, product=product, product_name=product.name,
                                 price_snapshot=Decimal(100000), quantity=qty)

    def test_sold_count_excludes_cancelled(self):
        self._order(self.a, 2)
        self._order(self.a, 3)
        self._order(self.a, 10, status="CANCELLED")
        self._order(self.b, 1)
        res = APIClient().get("/api/v1/products/")
        self.assertEqual(res.status_code, 200)
        rows = res.json()
        rows = rows.get("results", rows) if isinstance(rows, dict) else rows
        by_id = {r["id"]: r for r in rows}
        self.assertEqual(by_id[self.a.id]["sold_count"], 5)
        self.assertEqual(by_id[self.b.id]["sold_count"], 1)
        self.assertEqual(by_id[self.a.id]["review_count"], 0)
