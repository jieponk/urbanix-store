from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.test import TestCase

from store.models import Category, Product
from store.product_fix import detect_brand, fix_warranty_brand, looks_english

EN = "\n".join([
    "This Amaran Light Dome is a circular softbox designed to work with Bowens-mount lights, offering broad and diffused light.",
    "Key Feature",
    "- Hexadecagon softbox with a quick release rod mechanism for the fastest setup in the studio and on location.",
    "- Includes front diffuser cloth and grid for your portrait and product shots, and it is easy to carry.",
])


class ProductFixTests(TestCase):
    def setUp(self):
        cat = Category.objects.create(name="Lighting", slug="lighting")
        self.p = Product.objects.create(
            name="URBANIX - Amaran Light Dome 60 90 Softbox", slug="amaran-dome", sku="AD1", category=cat, price=1, stock=1,
            description="Garansi Resmi\nProduk 100% original & bergaransi resmi Plaud\nGaransi resmi DJI dan TAM",
        )

    def test_detect_and_fix_brand(self):
        self.assertEqual(detect_brand(self.p.name), "Amaran")
        fixed = fix_warranty_brand(self.p.description, self.p.name)
        self.assertIn("bergaransi resmi Amaran", fixed)
        self.assertIn("Garansi resmi Amaran", fixed)  # DJI juga merek lain → diganti
        # merek yang sama / bukan merek tidak diubah
        self.assertEqual(fix_warranty_brand("garansi resmi Amaran 1 tahun", self.p.name), "garansi resmi Amaran 1 tahun")
        self.assertEqual(fix_warranty_brand("garansi resmi PT Denka", self.p.name), "garansi resmi PT Denka")

    def test_command_report_then_save(self):
        out = StringIO()
        call_command("perbaiki_deskripsi", stdout=out)
        self.assertIn("Merek salah di kalimat garansi: 1 produk", out.getvalue())
        self.p.refresh_from_db()
        self.assertIn("Plaud", self.p.description)  # laporan saja, belum berubah
        call_command("perbaiki_deskripsi", "--simpan", stdout=StringIO())
        self.p.refresh_from_db()
        self.assertNotIn("Plaud", self.p.description)

    def test_translate_keeps_original_and_can_restore(self):
        self.p.description = EN
        self.p.save()
        self.assertTrue(looks_english(EN))
        hasil = "\n".join([
            "Amaran Light Dome ini adalah softbox bundar untuk lampu ber-mount Bowens, memberi cahaya lebar dan lembut.",
            "Key Feature",
            "- Softbox 16 sisi dengan mekanisme batang quick release untuk pemasangan tercepat di studio maupun lokasi.",
            "- Termasuk kain diffuser depan dan grid untuk foto potret dan produk, serta mudah dibawa.",
        ])
        with mock.patch("store.news_ai.chain", return_value=["groq"]), \
                mock.patch("store.news_ai.delay_seconds", return_value=0), \
                mock.patch("store.news_ai._call_ai", return_value=hasil):
            call_command("perbaiki_deskripsi", "--terjemahkan", "--simpan", stdout=StringIO())
        self.p.refresh_from_db()
        self.assertEqual(self.p.description, hasil)
        self.assertEqual(self.p.description_original, EN)
        call_command("perbaiki_deskripsi", "--pulihkan", "--simpan", stdout=StringIO())
        self.p.refresh_from_db()
        self.assertEqual(self.p.description, EN)

    def test_broken_translation_is_rejected(self):
        self.p.description = EN
        self.p.save()
        out = StringIO()
        with mock.patch("store.news_ai.chain", return_value=["groq"]), \
                mock.patch("store.news_ai.delay_seconds", return_value=0), \
                mock.patch("store.news_ai._call_ai", return_value="Maaf."):
            call_command("perbaiki_deskripsi", "--terjemahkan", "--simpan", stdout=out)
        self.p.refresh_from_db()
        self.assertEqual(self.p.description, EN)
        self.assertIn("[gagal]", out.getvalue())
