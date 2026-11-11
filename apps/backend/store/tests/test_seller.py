import io
import shutil
import tempfile
import zipfile
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from store.models import (
    Banner, Category, NewsArticle, NewsSource, Order, OrderItem, PriceCut, PriceCutItem, Product,
    ProductVariation, Review, StoreSettings, Voucher,
)
from store.xlsx_reader import read_sheets

MEDIA = tempfile.mkdtemp()
def _png() -> bytes:
    import io as _io

    from PIL import Image as _Image
    buf = _io.BytesIO()
    _Image.new("RGB", (2, 2), (255, 91, 20)).save(buf, "PNG")
    return buf.getvalue()


PNG = _png()


@override_settings(MEDIA_ROOT=MEDIA)
class SellerTestBase(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_user("admin", password="rahasia123", is_staff=True)
        self.buyer = User.objects.create_user("buyer", password="rahasia123")
        self.api = APIClient()
        r = self.api.post("/api/v1/seller/login/", {"username": "admin", "password": "rahasia123"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.api.credentials(HTTP_AUTHORIZATION=f"Token {r.data['token']}")

        self.cat = Category.objects.create(name="Kamera", slug="kamera")
        self.cat2 = Category.objects.create(name="Lensa", slug="lensa")
        self.cam = Product.objects.create(category=self.cat, name="Sony A7 IV", slug="a7", sku="A7IV",
                                          description="-", price=Decimal("30000000"), stock=4)
        self.lens = Product.objects.create(category=self.cat2, name="Lensa 50mm", slug="l50", sku="L50",
                                           description="-", price=Decimal("2000000"), stock=0)
        self.v1 = ProductVariation.objects.create(product=self.lens, variation_id="v1", name="Sony E", sku="L50-E",
                                                  price=Decimal("2000000"), stock=3)
        self.v2 = ProductVariation.objects.create(product=self.lens, variation_id="v2", name="Canon RF", sku="L50-RF",
                                                  price=Decimal("2100000"), stock=1)
        self.lens.sync_stock_from_variations()

    def make_order(self, status="PENDING", total="30000000", product=None, variation=None, qty=1, days_ago=0):
        order = Order.objects.create(
            order_number=f"URX-T{Order.objects.count() + 1}", customer_name="Budi", customer_phone="081234567890",
            shipping_city="Bandung", shipping_address="Jl. Mawar 1", payment_method="WHATSAPP",
            total_amount=Decimal(total), status=status,
        )
        if days_ago:
            Order.objects.filter(pk=order.pk).update(created_at=timezone.now() - timedelta(days=days_ago))
        product = product or self.cam
        OrderItem.objects.create(order=order, product=product, variation=variation, product_name=product.name,
                                 variation_name=variation.name if variation else "",
                                 sku=(variation.sku if variation else product.sku),
                                 price_snapshot=Decimal(total) / qty, quantity=qty)
        return order


class AuthTests(SellerTestBase):
    def test_wrong_password_and_non_staff(self):
        anon = APIClient()
        self.assertEqual(anon.post("/api/v1/seller/login/", {"username": "admin", "password": "x"}).status_code, 401)
        self.assertEqual(anon.post("/api/v1/seller/login/", {"username": "buyer", "password": "rahasia123"}).status_code, 403)

    def test_endpoints_need_staff_token(self):
        anon = APIClient()
        self.assertIn(anon.get("/api/v1/seller/dashboard/").status_code, (401, 403))
        self.assertEqual(self.api.get("/api/v1/seller/me/").data["username"], "admin")

    def test_logout_revokes_token(self):
        self.api.post("/api/v1/seller/logout/")
        self.assertIn(self.api.get("/api/v1/seller/me/").status_code, (401, 403))


class DashboardOrderTests(SellerTestBase):
    def test_dashboard_summary(self):
        self.make_order(total="30000000")
        self.make_order(total="2000000", product=self.lens, variation=self.v1, status="PROCESSING")
        self.make_order(total="9000000", status="CANCELLED")
        self.make_order(total="5000000", days_ago=60)  # di luar 30 hari
        d = self.api.get("/api/v1/seller/dashboard/?range=30d").data
        self.assertEqual(d["summary"]["revenue"], 32000000)
        self.assertEqual(d["summary"]["orders"], 2)
        self.assertEqual(d["summary"]["cancelled"], 1)
        self.assertEqual(d["need_action"], {"new_orders": 2, "to_ship": 1})
        self.assertEqual(len(d["series"]), 30)
        self.assertEqual(d["top_products"][0]["name"], "Sony A7 IV")
        self.assertEqual(d["catalog"]["no_shopee"], 2)
        self.assertTrue(any(x["sku"] == "L50-RF" for x in d["low_stock"]))

    def test_order_list_filter_and_update(self):
        o = self.make_order()
        self.make_order(status="COMPLETED")
        r = self.api.get("/api/v1/seller/orders/?status=PENDING&q=budi")
        self.assertEqual(r.data["count"], 1)
        r = self.api.patch(f"/api/v1/seller/orders/{o.order_number}/",
                           {"status": "SHIPPED", "payment_status": "PAID", "shipping_courier": "JNE",
                            "tracking_number": "JNE123", "shipping_cost": "25.000"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        o.refresh_from_db()
        self.assertEqual((o.status, o.payment_status, o.tracking_number, o.shipping_cost),
                         ("SHIPPED", "PAID", "JNE123", Decimal("25000")))
        self.assertTrue(r.data["whatsapp_customer"].startswith("https://wa.me/6281234567890"))
        self.assertEqual(self.api.patch(f"/api/v1/seller/orders/{o.order_number}/", {"status": "X"}).status_code, 400)

    def test_deduct_and_restore_stock(self):
        o = self.make_order(product=self.lens, variation=self.v1, qty=2, total="4000000")
        r = self.api.post(f"/api/v1/seller/orders/{o.order_number}/stock/", {"action": "deduct"}, format="json")
        self.assertTrue(r.data["stock_reserved"])
        self.v1.refresh_from_db(); self.lens.refresh_from_db()
        self.assertEqual((self.v1.stock, self.lens.stock), (1, 2))
        self.assertEqual(self.api.post(f"/api/v1/seller/orders/{o.order_number}/stock/", {"action": "deduct"}).status_code, 400)
        # Dibatalkan -> stok kembali otomatis
        self.api.patch(f"/api/v1/seller/orders/{o.order_number}/", {"status": "CANCELLED"}, format="json")
        self.v1.refresh_from_db()
        self.assertEqual(self.v1.stock, 3)

    def test_export_xlsx(self):
        self.make_order()
        r = self.api.get("/api/v1/seller/orders/export/?range=30d")
        self.assertEqual(r.status_code, 200)
        path = tempfile.mktemp(suffix=".xlsx")
        with open(path, "wb") as f:
            f.write(r.content)
        rows = read_sheets(path)["Pesanan"]
        self.assertEqual(rows[0][0], "No. pesanan")
        self.assertEqual(rows[1][9], "Sony A7 IV")


class ProductTests(SellerTestBase):
    def test_list_filters(self):
        r = self.api.get("/api/v1/seller/products/?filter=out_of_stock")
        self.assertEqual(r.data["count"], 0)
        r = self.api.get("/api/v1/seller/products/?q=L50-RF")
        self.assertEqual([p["name"] for p in r.data["results"]], ["Lensa 50mm"])
        self.assertEqual(r.data["results"][0]["variations"], 2)
        self.assertEqual(len(r.data["categories"]), 2)

    def test_edit_product_and_variation(self):
        r = self.api.patch(f"/api/v1/seller/products/{self.cam.id}/",
                           {"price": "29.500.000", "stock": 7, "shopee_url": "https://shopee.co.id/x"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual((r.data["price"], r.data["stock"]), (29500000, 7))
        self.assertEqual(self.api.patch(f"/api/v1/seller/products/{self.lens.id}/", {"stock": 5}, format="json").status_code, 400)
        r = self.api.patch(f"/api/v1/seller/variations/{self.v2.id}/", {"stock": 6, "price": 1990000}, format="json")
        self.assertEqual(r.data["stock"], 9)  # 3 + 6
        self.assertEqual(self.api.patch(f"/api/v1/seller/products/{self.cam.id}/", {"shopee_url": "shopee"}, format="json").status_code, 400)

    def test_bulk_actions(self):
        ids = [self.cam.id, self.lens.id]
        r = self.api.post("/api/v1/seller/products/bulk/", {"ids": ids, "action": "price_percent", "value": 10, "round": 1000}, format="json")
        self.assertEqual(r.data["updated"], 2)
        self.cam.refresh_from_db(); self.v2.refresh_from_db()
        self.assertEqual((self.cam.price, self.v2.price), (Decimal("33000000"), Decimal("2310000")))
        self.api.post("/api/v1/seller/products/bulk/", {"ids": ids, "action": "deactivate"}, format="json")
        self.assertFalse(Product.objects.filter(is_active=True).exists())
        cut = PriceCut.objects.create(name="12.12")
        self.api.post("/api/v1/seller/products/bulk/", {"ids": ids, "action": "add_promo",
                                                        "value": {"price_cut_id": cut.id, "discount_percent": 10}}, format="json")
        self.assertEqual(cut.items.count(), 2)
        self.api.post("/api/v1/seller/products/bulk/", {"ids": [self.cam.id], "action": "set_stock", "value": 9}, format="json")
        self.cam.refresh_from_db()
        self.assertEqual(self.cam.stock, 9)
        self.assertEqual(self.api.post("/api/v1/seller/products/bulk/", {"ids": ids, "action": "price_percent", "value": 0}, format="json").status_code, 400)

    def test_template_import_preview_then_apply(self):
        r = self.api.get("/api/v1/seller/products/template/")
        path = tempfile.mktemp(suffix=".xlsx")
        with open(path, "wb") as f:
            f.write(r.content)
        rows = read_sheets(path)["Produk"]
        self.assertEqual(len(rows), 4)  # header + A7 + 2 varian
        # Ubah lewat CSV (format yang juga diterima)
        csv = ("product_id;variation_id;SKU;Nama produk;Varian;Harga normal;Stok;Link Shopee;Aktif (ya/tidak)\n"
               f"{self.cam.id};;A7IV;Sony A7 IV;;31.000.000;4;https://shopee.co.id/a7;ya\n"
               f"{self.lens.id};{self.v1.id};L50-E;Lensa 50mm;Sony E;2000000;10;;\n"
               f"{self.lens.id};{self.v2.id};L50-RF;Lensa 50mm;Canon RF;-5;1;;\n")
        upload = lambda: SimpleUploadedFile("update.csv", csv.encode(), content_type="text/csv")  # noqa: E731
        r = self.api.post("/api/v1/seller/products/import/", {"file": upload()}, format="multipart")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(r.data["applied"])
        self.assertEqual(len(r.data["changes"]), 2)
        self.assertEqual(r.data["error_count"], 1)
        self.cam.refresh_from_db()
        self.assertEqual(self.cam.price, Decimal("30000000"))  # pratinjau tidak menyimpan
        r = self.api.post("/api/v1/seller/products/import/?apply=1", {"file": upload()}, format="multipart")
        self.cam.refresh_from_db(); self.lens.refresh_from_db()
        self.assertEqual((self.cam.price, self.cam.shopee_url), (Decimal("31000000"), "https://shopee.co.id/a7"))
        self.assertEqual(self.lens.stock, 11)


class ContentTests(SellerTestBase):
    def test_promo_crud_and_items(self):
        r = self.api.post("/api/v1/seller/promos/", {"name": "Promo 12.12", "is_active": True}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        pid = r.data["id"]
        r = self.api.post(f"/api/v1/seller/promos/{pid}/items/", {"items": [
            {"product_id": self.cam.id, "promo_price": 28000000},
            {"product_id": self.lens.id, "variation_id": self.v1.id, "discount_percent": 10},
            {"product_id": self.lens.id, "promo_price": 1000},  # bervarian tanpa pilih varian -> ditolak
            {"product_id": self.cam.id, "promo_price": 99000000},  # di atas harga normal -> ditolak
        ]}, format="json")
        self.assertEqual(r.data["saved"], 2)
        self.assertEqual(len(r.data["errors"]), 2)
        finals = {i["sku"]: i["final_price"] for i in r.data["items"]}
        self.assertEqual(finals, {"A7IV": 28000000, "L50-E": 1800000})
        detail = self.api.get(f"/api/v1/seller/promos/{pid}/").data
        self.assertEqual(detail["status"], "Berjalan")
        self.api.delete(f"/api/v1/seller/promo-items/{detail['items'][0]['id']}/")
        self.assertEqual(PriceCutItem.objects.count(), 1)

    def test_voucher_validation(self):
        r = self.api.post("/api/v1/seller/vouchers/", {"code": "hemat 10", "title": "Hemat", "voucher_type": "PERCENT",
                                                       "value": 150, "for_whatsapp": True}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.api.post("/api/v1/seller/vouchers/", {"code": "hemat 10", "title": "Hemat", "voucher_type": "PERCENT",
                                                       "value": 10, "for_whatsapp": True}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data["code"], "HEMAT10")
        self.assertEqual(self.api.patch(f"/api/v1/seller/vouchers/{r.data['id']}/", {"code": "WAHEMAT5"}, format="json").status_code, 400)

    def test_banner_upload_and_public_list(self):
        r = self.api.post("/api/v1/seller/banners/", {
            "title": "Promo 12.12", "link_url": "/produk?promo=1", "sort_order": 1,
            "image": SimpleUploadedFile("b.png", PNG, content_type="image/png"),
        }, format="multipart")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.data["image"].startswith("/media/banners/"))
        Banner.objects.create(title="Nanti", image="banners/x.png", starts_at=timezone.now() + timedelta(days=3))
        public = APIClient().get("/api/v1/banners/").data
        self.assertEqual([b["title"] for b in public], ["Promo 12.12"])
        bad = self.api.post("/api/v1/seller/banners/", {"title": "x", "image": SimpleUploadedFile("a.exe", b"x")}, format="multipart")
        self.assertEqual(bad.status_code, 400)
        r = self.api.patch(f"/api/v1/seller/banners/{r.data['id']}/", {"is_active": "false"}, format="multipart")
        self.assertFalse(r.data["is_active"])
        self.assertEqual(APIClient().get("/api/v1/banners/").data, [])

    def test_news_reviews_settings(self):
        src = NewsSource.objects.create(name="X", feed_url="https://x.test/feed")
        a = NewsArticle.objects.create(source=src, guid="g", url="https://x.test/1", original_title="T", title="T",
                                       published_at=timezone.now())
        r = self.api.patch(f"/api/v1/seller/news/{a.id}/", {"title": "Judul baru", "is_pinned": True}, format="json")
        self.assertEqual((r.data["title"], r.data["is_pinned"]), ("Judul baru", True))
        self.assertTrue(any(s["name"] == "X" for s in self.api.get("/api/v1/seller/news/").data["sources"]))
        rv = Review.objects.create(customer_name="A***", rating=5, text="Mantap")
        self.api.patch(f"/api/v1/seller/reviews/{rv.id}/", {"is_published": False}, format="json")
        self.assertEqual(self.api.get("/api/v1/seller/reviews/?filter=hidden").data["count"], 1)
        r = self.api.patch("/api/v1/seller/settings/", {"whatsapp_number": "628212990180", "show_whatsapp_popup": False}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(StoreSettings.load().show_whatsapp_popup)
        self.assertEqual(self.api.get("/api/v1/seller/categories/").data[0]["products"], 1)


class ShopeeLinkTests(SellerTestBase):
    def test_link_format_and_bulk_auto(self):
        self.assertEqual(self.cam.shopee_link("1735329821"), f"https://shopee.co.id/product/1735329821/{self.cam.id}/")
        r = self.api.post("/api/v1/seller/products/bulk/", {"ids": [self.cam.id, self.lens.id], "action": "shopee_auto"}, format="json")
        self.assertEqual(r.data["updated"], 2)
        self.lens.refresh_from_db()
        self.assertEqual(self.lens.shopee_url, f"https://shopee.co.id/product/1735329821/{self.lens.id}/")
        self.assertEqual(self.api.get("/api/v1/seller/settings/").data["shopee_shop_id"], "1735329821")


class OrderDeleteTests(SellerTestBase):
    def test_only_cancelled_orders_can_be_deleted(self):
        o = self.make_order(status="COMPLETED")
        url = f"/api/v1/seller/orders/{o.order_number}/"
        self.assertEqual(self.api.delete(url).status_code, 400)
        self.api.patch(url, {"status": "CANCELLED"}, format="json")
        self.assertEqual(self.api.delete(url).status_code, 204)
        self.assertFalse(Order.objects.filter(pk=o.pk).exists())
