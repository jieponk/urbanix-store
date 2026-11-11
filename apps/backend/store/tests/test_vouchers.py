from datetime import timedelta
from decimal import Decimal
from unittest import mock
from urllib.parse import unquote

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from store.models import Category, Order, PriceCut, PriceCutItem, Product, StoreSettings, Voucher


@override_settings(MIDTRANS_SERVER_KEY="SB-Mid-server-TESTKEY")
class VoucherTests(TestCase):
    def setUp(self):
        cache.clear()
        self.api = APIClient()
        cat = Category.objects.create(name="Kamera", slug="kamera")
        self.cam = Product.objects.create(category=cat, name="Kamera", slug="k", sku="K",
                                          description="-", price=Decimal("3000000"), stock=5)
        self.mic = Product.objects.create(category=cat, name="Mic", slug="m", sku="M",
                                          description="-", price=Decimal("400000"), stock=5)
        s = StoreSettings.load(); s.whatsapp_number = "6281"; s.save()

    def items(self, cam=1, mic=0):
        out = []
        if cam:
            out.append({"product_id": self.cam.id, "quantity": cam})
        if mic:
            out.append({"product_id": self.mic.id, "quantity": mic})
        return out

    def quote(self, codes, method="WHATSAPP", cam=1, mic=0, phone=""):
        r = self.api.post("/api/v1/checkout/quote/", {
            "items": self.items(cam, mic), "voucher_codes": codes, "payment_method": method, "phone": phone,
        }, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        return r.data

    def order(self, codes, method="WHATSAPP", cam=1, mic=0, phone="081234567890"):
        return self.api.post("/api/v1/checkout/", {
            "payment_method": method, "items": self.items(cam, mic), "voucher_codes": codes,
            "customer": {"name": "Budi", "phone": phone},
            "shipping": {"address": "Jl. Mawar 1 RT 2", "city": "Bandung"},
        }, format="json")

    # ------------------------------------------------------------ voucher bawaan (migrasi)
    def test_default_vouchers_created_by_migration(self):
        wa = Voucher.objects.get(code="WAHEMAT5")
        self.assertEqual((wa.value, wa.min_purchase, wa.max_discount), (Decimal("5"), 1000000, 500000))
        self.assertTrue(wa.for_whatsapp and not wa.for_midtrans and not wa.exclude_promo and wa.show_in_popup)
        ong = Voucher.objects.get(code="ONGKIR40")
        self.assertEqual((ong.voucher_type, ong.value, ong.min_purchase), ("FREE_SHIPPING", Decimal("40000"), 0))
        self.assertEqual(StoreSettings.load().voucher_combo_min_purchase, 0)
        codes = [v["code"] for v in self.api.get("/api/v1/vouchers/").data]
        self.assertEqual(codes, ["WAHEMAT5", "ONGKIR40"])
        st = self.api.get("/api/v1/store-settings/").data
        self.assertTrue(st["show_whatsapp_popup"])
        self.assertEqual((st["whatsapp_discount_percent"], st["popup_voucher"]["code"]), ("5", "WAHEMAT5"))

    # ------------------------------------------------------------ diskon persen
    def test_wa_voucher_discount(self):
        q = self.quote(["wahemat5"])  # huruf kecil tetap diterima
        self.assertEqual(q["vouchers"]["discount_amount"], "150000")
        self.assertEqual(q["total"], "2850000.00")
        self.assertEqual(q["tax_note"], "Harga sudah termasuk PPN.")

    def test_wa_voucher_rejected_for_midtrans(self):
        q = self.quote(["WAHEMAT5"], method="MIDTRANS")
        self.assertEqual(q["vouchers"]["discount_amount"], "0")
        self.assertIn("WhatsApp", q["vouchers"]["rejected"][0]["message"])

    def test_min_purchase(self):
        q = self.quote(["WAHEMAT5"], cam=0, mic=2)  # Rp800.000
        self.assertIn("Min. belanja Rp1.000.000", q["vouchers"]["rejected"][0]["message"])
        self.assertIn("kurang Rp200.000", q["vouchers"]["rejected"][0]["message"])

    def test_max_discount_cap(self):
        q = self.quote(["WAHEMAT5"], cam=4)  # 5% x 12 jt = 600rb -> maks 500rb
        self.assertEqual(q["vouchers"]["discount_amount"], "500000")

    def test_promo_items_included_by_default(self):
        cut = PriceCut.objects.create(name="Diskon November")
        PriceCutItem.objects.create(price_cut=cut, product=self.cam, promo_price=Decimal("2700000"))
        q = self.quote(["WAHEMAT5"], cam=1, mic=1)  # 2,7 jt + 400rb = 3,1 jt -> 5% = 155rb
        self.assertEqual(q["vouchers"]["discount_amount"], "155000")

    def test_free_shipping_without_min_purchase(self):
        q = self.quote(["ONGKIR40", "WAHEMAT5"], cam=0, mic=1)  # Rp400.000
        self.assertEqual(q["vouchers"]["shipping_discount_max"], "40000")
        self.assertEqual([a["code"] for a in q["vouchers"]["applied"]], ["ONGKIR40"])  # WA 5% tetap min 1 jt

    def test_promo_items_excluded(self):
        Voucher.objects.filter(code="WAHEMAT5").update(exclude_promo=True)
        cut = PriceCut.objects.create(name="Diskon November")
        PriceCutItem.objects.create(price_cut=cut, product=self.cam, promo_price=Decimal("2700000"))
        q = self.quote(["WAHEMAT5"], cam=1, mic=1)  # subtotal 3,1 jt; dasar diskon hanya mic 400rb
        self.assertEqual(q["vouchers"]["discount_amount"], "20000")
        only_promo = self.quote(["WAHEMAT5"], cam=1)
        self.assertIn("promo", only_promo["vouchers"]["rejected"][0]["message"])

    # ------------------------------------------------------------ gratis ongkir & gabung
    def test_free_shipping_does_not_reduce_goods_total(self):
        q = self.quote(["ONGKIR40"])
        self.assertEqual((q["vouchers"]["discount_amount"], q["vouchers"]["shipping_discount_max"]), ("0", "40000"))
        self.assertEqual(q["total"], "3000000.00")

    def test_combine_requires_min_purchase(self):
        s = StoreSettings.load(); s.voucher_combo_min_purchase = 5000000; s.save()
        q = self.quote(["WAHEMAT5", "ONGKIR40"])  # 3 jt < 5 jt
        self.assertEqual([a["code"] for a in q["vouchers"]["applied"]], ["WAHEMAT5"])
        self.assertIn("Gabung 2 voucher", q["vouchers"]["rejected"][0]["message"])
        q = self.quote(["WAHEMAT5", "ONGKIR40"], cam=2)  # 6 jt
        self.assertEqual(len(q["vouchers"]["applied"]), 2)

    def test_only_one_discount_voucher(self):
        Voucher.objects.create(code="HEMAT50", title="Potongan 50rb", voucher_type="FIXED", value=50000)
        q = self.quote(["WAHEMAT5", "HEMAT50"])
        self.assertEqual(len(q["vouchers"]["applied"]), 1)
        self.assertIn("Hanya 1 voucher diskon", q["vouchers"]["rejected"][0]["message"])

    def test_not_combinable(self):
        Voucher.objects.filter(code="ONGKIR40").update(can_combine=False)
        q = self.quote(["WAHEMAT5", "ONGKIR40"], cam=2)
        self.assertIn("Tidak bisa digabung", q["vouchers"]["rejected"][0]["message"])

    # ------------------------------------------------------------ periode, kuota, kode salah
    def test_unknown_expired_inactive(self):
        Voucher.objects.create(code="LAMA", title="x", value=5, ends_at=timezone.now() - timedelta(days=1))
        Voucher.objects.create(code="MATI", title="x", value=5, is_active=False)
        q = self.quote(["NGASAL", "LAMA"])
        msgs = [r["message"] for r in q["vouchers"]["rejected"]]
        self.assertIn("Kode voucher tidak ditemukan.", msgs)
        self.assertIn("Voucher belum berlaku atau sudah berakhir.", msgs)
        self.assertEqual(self.quote(["MATI"])["vouchers"]["rejected"][0]["message"], "Kode voucher tidak ditemukan.")

    def test_per_customer_limit_by_phone(self):
        Voucher.objects.filter(code="WAHEMAT5").update(per_customer_limit=1)
        self.assertEqual(self.order(["WAHEMAT5"], phone="0812-3456-7890").status_code, 201)
        r = self.order(["WAHEMAT5"], phone="+62 812 3456 7890")  # nomor sama, format beda
        self.assertEqual(r.status_code, 400)
        self.assertIn("sudah pernah", r.data["error"])
        self.assertEqual(self.order(["WAHEMAT5"], phone="081299998888").status_code, 201)

    def test_total_quota(self):
        Voucher.objects.filter(code="WAHEMAT5").update(usage_limit=1)
        self.assertEqual(self.order(["WAHEMAT5"]).status_code, 201)
        self.assertIn("Kuota", self.order(["WAHEMAT5"], phone="081299998888").data["error"])

    def test_cancelled_order_frees_quota(self):
        Voucher.objects.filter(code="WAHEMAT5").update(usage_limit=1)
        self.order(["WAHEMAT5"])
        Order.objects.update(status="CANCELLED")
        self.assertEqual(self.order(["WAHEMAT5"], phone="081299998888").status_code, 201)

    # ------------------------------------------------------------ pesanan
    def test_order_stores_vouchers_and_wa_message(self):
        r = self.order(["WAHEMAT5", "ONGKIR40"], cam=1, mic=0)
        self.assertEqual(r.status_code, 201, r.content)
        o = Order.objects.get()
        self.assertEqual((o.total_amount, o.discount_amount, o.voucher_codes, o.shipping_discount_max),
                         (Decimal("2850000"), Decimal("150000"), "WAHEMAT5,ONGKIR40", Decimal("40000")))
        text = unquote(r.data["whatsapp_url"])
        for part in ["Subtotal: Rp3.000.000", "Voucher WAHEMAT5: -Rp150.000", "Voucher ONGKIR40: potongan ongkir s/d Rp40.000",
                     "Total: Rp2.850.000 (sudah termasuk PPN", "potong ongkir s/d Rp40.000"]:
            self.assertIn(part, text)
        d = self.api.get(f"/api/v1/checkout/orders/{o.order_number}/").data
        self.assertEqual((d["voucher_codes"], d["shipping_discount_max"]), ("WAHEMAT5,ONGKIR40", "40000.00"))

    def test_checkout_rejects_invalid_voucher(self):
        r = self.order(["NGASAL"])
        self.assertEqual(r.status_code, 400)
        self.assertIn("NGASAL", r.data["error"])
        self.assertEqual(Order.objects.count(), 0)

    def test_midtrans_total_matches_items_with_voucher(self):
        Voucher.objects.create(code="WEB100", title="Potongan 100rb", voucher_type="FIXED", value=100000,
                               for_whatsapp=False, for_midtrans=True)
        fake = mock.Mock(status_code=201)
        fake.json.return_value = {"token": "t", "redirect_url": "https://app.sandbox.midtrans.com/x"}
        with mock.patch("store.checkout_service.requests.post", return_value=fake) as post:
            r = self.order(["WEB100"], method="MIDTRANS")
        self.assertEqual(r.status_code, 201, r.content)
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["transaction_details"]["gross_amount"], 2900000)
        self.assertEqual(sum(i["price"] * i["quantity"] for i in payload["item_details"]), 2900000)

    def test_shopee_rejects_vouchers_in_quote(self):
        q = self.quote(["WAHEMAT5"], method="SHOPEE")
        self.assertIn("Shopee", q["vouchers"]["rejected"][0]["message"])
