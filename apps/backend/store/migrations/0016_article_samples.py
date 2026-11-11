"""Kategori awal + 2 artikel contoh (boleh diedit/dihapus dari Seller Center)."""
from datetime import timedelta

from django.db import migrations
from django.utils import timezone

CATEGORIES = [
    ("Tips & Tutorial", "tips-tutorial"),
    ("Panduan Beli", "panduan-beli"),
    ("Review", "review"),
    ("Promo & Event", "promo-event"),
]

WELCOME = """Halo, kreator! Selamat datang di **Inspirasi Urbanix**, ruang baca baru di urbanix.id.

Di sini tim Urbanix akan berbagi tulisan seputar dunia foto dan video: dari tips memotret, panduan memilih gear, sampai cerita di balik produk yang kami jual.

## Apa saja yang bisa kamu baca?

- **Tips & Tutorial**: trik praktis supaya hasil foto dan videomu makin keren.
- **Panduan Beli**: bantu kamu memilih kamera, lensa, atau aksesori yang pas dengan kebutuhan dan budget.
- **Review**: pengalaman kami mencoba produk secara langsung.
- **Promo & Event**: info promo dan kegiatan terbaru dari Urbanix.

Di bawah artikel Urbanix kamu juga tetap bisa membaca **Berita Kamera** terbaru dari berbagai sumber.

> Punya topik yang ingin dibahas? Tulis di kolom komentar di bawah, siapa tahu jadi artikel berikutnya.

## Ngobrol bareng kami

Setiap artikel bisa kamu komentari. Komentar akan tampil setelah dicek admin, supaya kolom komentar tetap bersih dari spam.

Selamat membaca, dan *Capture Your Style!*
"""

STYLE_TEST = """Artikel ini dipakai untuk **mengetes tampilan** semua format tulisan. Hapus atau jadikan draf setelah selesai dicek.

## Judul bagian (H2)

Paragraf biasa. Teks bisa **tebal**, *miring*, ~~dicoret~~, ==disorot==, atau `kode pendek`. Link ke [halaman produk](/produk) dan link ke [situs luar](https://www.dpreview.com) juga bisa.

### Sub-judul (H3)

Paragraf kedua untuk melihat jarak antar paragraf. Tulisan panjang harus tetap nyaman dibaca di HP maupun laptop, dengan lebar baris yang tidak terlalu panjang.

## Daftar

Daftar berpoin:

- Kamera mirrorless
- Lensa fix 50mm
- Mikrofon wireless

Daftar bernomor:

1. Atur mode ke Aperture Priority
2. Pilih bukaan f/1.8 untuk background blur
3. Fokus ke mata subjek

## Kutipan

> Kamera terbaik adalah kamera yang ada di tanganmu saat momen itu terjadi.

## Kotak info

> [!TIP]
> Pakai aturan *rule of thirds*: taruh subjek di sepertiga bingkai, bukan di tengah.

> [!INFO]
> Semua harga di Urbanix sudah termasuk PPN.

> [!WARNING]
> Jangan ganti lensa di tempat berdebu, sensor kamera bisa kotor.

## Gambar

![Contoh gambar di dalam artikel](/brand/og-image.png "Keterangan gambar tampil di sini")

## Tabel

| Bukaan | Efek background | Cocok untuk |
| --- | --- | --- |
| f/1.8 | Sangat blur | Potret |
| f/5.6 | Sedikit blur | Street |
| f/11 | Tajam semua | Landscape |

## Kode

Kode pendek di dalam kalimat: `ISO 100`. Blok kode dengan warna sintaks:

```js
// Hitung harga setelah diskon
const harga = 12500000;
const diskon = 0.05;
console.log("Total:", harga * (1 - diskon));
```

```bash
# Contoh perintah terminal
git pull && ./deploy/deploy.sh urbanix@IP
```

## Garis pemisah

Di bawah ini garis pemisah.

---

## Kartu produk

Kartu produk disisipkan dengan menulis `[[produk:ID]]` di baris sendiri. Contoh:

{product_embed}

## Video YouTube

Video disisipkan dengan `[[youtube:ID-VIDEO]]`, misalnya `[[youtube:dQw4w9WgXcQ]]`.

Selesai. Kalau semua bagian di atas tampil rapi, berarti gaya artikel sudah siap dipakai.
"""


def forwards(apps, schema_editor):
    Category = apps.get_model("store", "ArticleCategory")
    Article = apps.get_model("store", "Article")
    Product = apps.get_model("store", "Product")

    cats = {}
    for i, (name, slug) in enumerate(CATEGORIES):
        cats[slug], _ = Category.objects.get_or_create(slug=slug, defaults={"name": name, "sort_order": i})

    now = timezone.now()
    if not Article.objects.filter(slug="selamat-datang-di-inspirasi-urbanix").exists():
        Article.objects.create(
            title="Selamat Datang di Inspirasi Urbanix",
            slug="selamat-datang-di-inspirasi-urbanix",
            excerpt="Ruang baca baru di urbanix.id: tips, panduan beli, review gear, dan info promo untuk para kreator.",
            body=WELCOME,
            category=cats["promo-event"],
            tags="urbanix, inspirasi, kreator",
            status="PUBLISHED",
            is_pinned=True,
            published_at=now,
        )

    if not Article.objects.filter(slug="tes-tampilan-artikel").exists():
        product = Product.objects.filter(is_active=True).exclude(image_url="").order_by("id").first()
        embed = f"[[produk:{product.id}]]" if product else "(Belum ada produk aktif untuk dicontohkan.)"
        article = Article.objects.create(
            title="Tes Tampilan Artikel: Semua Format Tulisan",
            slug="tes-tampilan-artikel",
            excerpt="Artikel uji untuk melihat tampilan judul, daftar, kutipan, kotak info, tabel, kode, gambar, dan kartu produk.",
            body=STYLE_TEST.replace("{product_embed}", embed),
            category=cats["tips-tutorial"],
            tags="tes, panduan menulis",
            status="PUBLISHED",
            published_at=now - timedelta(minutes=1),
        )
        if product:
            article.related_products.add(product)


class Migration(migrations.Migration):
    dependencies = [("store", "0015_articles")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
