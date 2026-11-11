"""Perbarui artikel 'Tes Tampilan Artikel' agar memuat SEMUA format tulisan (versi 2)."""
from django.db import migrations

BODY = """Artikel ini dipakai untuk **mengetes tampilan semua format tulisan**. Setiap bagian menampilkan hasilnya, lengkap dengan cara menulisnya di editor. Jadikan draf atau hapus setelah selesai dicek.

# Judul besar (H1)

Ditulis dengan `# Judul besar`. Dipakai untuk membuka bagian yang sangat besar, misalnya bab dalam panduan panjang.

## Judul bagian (H2)

Ditulis dengan `## Judul bagian`. Ini judul yang paling sering dipakai dan otomatis masuk **Daftar isi**.

### Sub-judul (H3)

Ditulis dengan `### Sub-judul`. Untuk membagi isi di dalam satu bagian.

#### Judul kecil (H4)

Ditulis dengan `#### Judul kecil`. Cocok untuk label kecil di atas sebuah paragraf.

## Format teks

Teks bisa **tebal**, *miring*, ~~dicoret~~, ==disorot==, atau berupa `kode pendek`. Spoiler disembunyikan seperti ini: ||harga spesial hanya untuk member||, ketuk untuk membuka.

Tombol keyboard: tekan ++Ctrl+C++ untuk menyalin, lalu ++Ctrl+V++ untuk menempel. Label kecil: [[label:Baru]] [[label:Best Seller]] [[label:Promo]].

Rating produk: [[rating:4.5]]

Link ke [halaman produk](/produk) dan link ke [situs luar](https://www.dpreview.com) (ada tanda panah kecil).

## Daftar

Daftar berpoin, termasuk sub-poin:

- Kamera mirrorless
  - Full frame
  - APS-C
- Lensa fix 50mm
- Mikrofon wireless

Daftar bernomor:

1. Atur mode ke Aperture Priority
2. Pilih bukaan f/1.8 untuk background blur
3. Fokus ke mata subjek

Checklist persiapan pemotretan:

- [x] Baterai sudah dicas penuh
- [x] Kartu memori dikosongkan
- [ ] Bawa lensa cadangan
- [ ] Cek ramalan cuaca

## Kutipan

Kutipan biasa dengan nama sumber:

> Kamera terbaik adalah kamera yang ada di tanganmu saat momen itu terjadi.
> — Chase Jarvis

Kutipan besar untuk menonjolkan satu kalimat:

> [!QUOTE]
> Cahaya adalah bahan baku fotografi. Pelajari cahaya, maka fotomu akan berubah.
> — Tim Urbanix

## Kotak info

> [!TIP]
> Pakai aturan *rule of thirds*: taruh subjek di sepertiga bingkai, bukan di tengah.

> [!INFO]
> Semua harga di Urbanix sudah termasuk PPN.

> [!NOTE] Catatan penulis
> Judul kotak bisa diganti sendiri, seperti kotak ini.

> [!SUCCESS]
> Pesananmu sudah dikirim! Cek resi di menu Cek Pesanan.

> [!WARNING]
> Jangan ganti lensa di tempat berdebu, sensor kamera bisa kotor.

> [!DANGER]
> Jangan pernah transfer ke rekening selain atas nama PT Koolsnap Multi Retailindo.

## Spoiler & FAQ (buka-tutup)

:::spoiler Spoiler: hasil akhir editan foto
Foto dibuat dengan lensa 50mm f/1.8, ISO 200, dan sedikit color grading hangat.
:::

:::faq Apakah produk di Urbanix bergaransi?
Ya, produk bergaransi sesuai ketentuan resmi masing-masing merek.
:::

:::faq Berapa lama pengiriman ke luar Jawa?
Tergantung kurir dan kota tujuan, biasanya 2–5 hari kerja.
:::

## Kelebihan & kekurangan

:::banding
:::kelebihan
- Autofokus cepat dan akurat
- Baterai awet seharian
- Bodi ringan
:::
:::kekurangan
- Belum tahan cuaca
- Hanya satu slot kartu
:::
:::

## Langkah-langkah

:::langkah Cara membersihkan sensor kamera
1. Matikan kamera dan lepas lensa.
2. Pakai blower untuk meniup debu, jangan ditiup pakai mulut.
3. Kalau masih ada noda, gunakan sensor swab sekali pakai.
4. Pasang kembali lensa dan cek hasilnya dengan memotret langit polos.
:::

## Kotak bebas

:::kotak Spesifikasi singkat
**Sensor:** 24 MP full frame · **Video:** 4K 60fps · **Berat:** 650 g
:::

## Tombol

[[tombol:Lihat produk promo|/produk?promo=1]] [[tombol-garis:Chat admin|/kontak]]

## Gambar

![Contoh gambar di dalam artikel](/brand/og-image.png "Keterangan gambar tampil di bawah foto")

Galeri beberapa foto sekaligus:

:::galeri
![Sampul Inspirasi](/inspirasi/default-cover.webp "Foto 1")
![Logo Urbanix](/brand/og-image.png "Foto 2")
![Sampul Inspirasi](/inspirasi/default-cover.webp "Foto 3")
:::

## Tabel

| Bukaan | Efek background | Cocok untuk |
| --- | :---: | ---: |
| f/1.8 | Sangat blur | Potret |
| f/5.6 | Sedikit blur | Street |
| f/11 | Tajam semua | Landscape |

## Kode

Blok kode dengan nama file dan warna sintaks (ada tombol salin):

```js harga.js
// Hitung harga setelah diskon
const harga = 12500000;
const diskon = 0.05;
function total(h, d) {
  return h * (1 - d);
}
console.log("Total:", total(harga, diskon));
```

```bash
# Contoh perintah terminal
git pull && ./deploy/deploy.sh urbanix@IP
```

```css
.tombol {
  color: #ff5b14;
  border-radius: 12px;
}
```

## Garis pemisah

Di bawah ini garis pemisah.

---

## Kartu produk

Kartu produk disisipkan dengan `[[produk:ID]]` di baris sendiri:

{product_embed}

## Video YouTube

Video disisipkan dengan `[[youtube:ID-VIDEO]]` di baris sendiri, atau lewat tombol **▶ Video** di editor.

Selesai. Kalau semua bagian di atas tampil rapi, berarti gaya artikel sudah siap dipakai.
"""


def forwards(apps, schema_editor):
    Article = apps.get_model("store", "Article")
    Product = apps.get_model("store", "Product")
    article = Article.objects.filter(slug="tes-tampilan-artikel").first()
    if not article:
        return
    product = article.related_products.first() or (
        Product.objects.filter(is_active=True).exclude(image_url="").order_by("id").first()
    )
    embed = f"[[produk:{product.id}]]" if product else "(Belum ada produk aktif untuk dicontohkan.)"
    article.body = BODY.replace("{product_embed}", embed)
    article.excerpt = "Artikel uji: semua judul, format teks, daftar, kutipan, kotak info, spoiler, tombol, galeri, tabel, kode, dan kartu produk."
    article.tags = "tes, panduan menulis, format artikel"
    article.save(update_fields=["body", "excerpt", "tags"])


class Migration(migrations.Migration):
    dependencies = [("store", "0016_article_samples")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
