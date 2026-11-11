# Urbanix Store

Toko online perlengkapan kreator (kamera, lensa, drone, audio, aksesori) milik **PT Koolsnap Multi Retailindo**.
Monorepo berisi **storefront** (Next.js) dan **backend** (Django REST), dengan panel admin sendiri (**Seller Center**).

🌐 **Live:** [urbanix.id](https://urbanix.id)

---

## ✨ Fitur Utama

**Untuk pembeli (storefront)**
- Katalog produk dengan varian/SKU, kategori, dan **pencarian langsung** (saran muncul saat mengetik).
- Keranjang dan **checkout tanpa perlu daftar akun**.
- Dua cara memesan: **WhatsApp** (pesan otomatis terisi detail pesanan) dan **Shopee** (tautan per produk). Pembayaran online via **Midtrans** opsional.
- **Voucher** (diskon & gratis ongkir) dan **promo potong harga** berjadwal.
- **Cek Pesanan**: lacak status + nomor resi, dan **unduh invoice** (cetak / simpan PDF).
- **Inspirasi**: artikel tulisan tim Urbanix (blog, bisa dikomentari) + berita kamera dari berbagai sumber (RSS, diterjemahkan ke Bahasa Indonesia).
- Halaman Tentang Kami, Kontak, Syarat & Ketentuan, dan Kebijakan Privasi (UU PDP).
- SEO lengkap: metadata, `sitemap.xml`, `robots.txt`, RSS, data terstruktur (JSON-LD), dan gambar Open Graph.

**Untuk admin (Seller Center, di `/seller`)**
- Dashboard & laporan penjualan.
- Kelola pesanan (ubah status, isi kurir/resi/ongkir, cetak invoice, hapus pesanan batal).
- Produk & SKU, **mass update lewat Excel**, promo, voucher, dan banner beranda.
- **Artikel** (editor dengan pratinjau) dan **moderasi komentar**.
- Berita (RSS), ulasan, dan pengaturan toko.

---

## 🧱 Struktur Monorepo

```
urbanix-store/
├── apps/
│   ├── backend/      # Django 5.2 + Django REST Framework (API & Seller Center)
│   └── storefront/   # Next.js 14 (App Router) — storefront & halaman /seller
├── deploy/           # Konfigurasi & skrip deploy produksi (VPS + Caddy + Cloudflare)
├── services/         # Layanan eksperimental (TIDAK dipakai di produksi — lihat catatan di bawah)
├── scripts/          # Skrip bantu (dev/test)
└── docker-compose.yml# Stack untuk pengembangan lokal
```

---

## 🛠 Tech Stack

- **Storefront:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Python 3.11+, Django 5.2, Django REST Framework
- **Database:** PostgreSQL
- **Reverse proxy (produksi):** Caddy (HTTPS otomatis)
- **Infrastruktur:** Docker, Docker Compose; produksi di VPS di balik Cloudflare

> Catatan: `redis` tersedia di stack pengembangan untuk kebutuhan ke depan. Saat ini tugas latar
> (ambil berita, kirim email pesanan) berjalan ringan tanpa Celery.

---

## 🚀 Menjalankan Secara Lokal (Docker)

Prasyarat: **Docker** (Docker Desktop / Docker Engine) dan **Git**. Berjalan di Linux, WSL (Ubuntu), dan macOS.

```bash
git clone https://github.com/jieponk/urbanix-store.git
cd urbanix-store

# Jalankan semua layanan (storefront, backend, database)
docker compose up --build
```

Di terminal lain, siapkan database dan akun admin:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

Akses:
- **Storefront:** http://localhost:3000
- **Seller Center:** http://localhost:3000/seller
- **API:** http://localhost:8000/api/v1/
- **Django Admin:** http://localhost:8000/admin/

> Konfigurasi lokal (SECRET_KEY, kredensial DB, kunci Midtrans sandbox) sudah terisi default di
> `docker-compose.yml`, jadi tidak perlu file `.env` untuk mencoba.

---

## 🧪 Menguji

Dengan stack lokal sudah jalan:

```bash
make test            # atau: ./scripts/test.sh
```

`scripts/test.sh` juga menguji layanan eksperimental bila Go/Rust terpasang (kalau tidak, dilewati).

---

## 📦 Deploy ke Produksi

Deploy produksi memakai stack terpisah di folder **`deploy/`** (Docker Compose + Caddy, di VPS,
di balik Cloudflare). Langkah lengkap ada di **[`deploy/README.md`](deploy/README.md)**, termasuk:
setup server, variabel rahasia, migrasi data, email pesanan, dan cadangan otomatis.

Ringkasnya, dari komputer lokal:

```bash
./deploy/deploy.sh urbanix@IP-SERVER namadomain.com
# atau: make deploy SERVER=urbanix@IP-SERVER DOMAIN=namadomain.com
```

---

## 🔒 Keamanan & Transaksi

- **Pencegahan overselling:** transaksi atomic PostgreSQL dengan `select_for_update()` saat memotong stok.
- **Verifikasi pembayaran Midtrans:** webhook diperiksa lewat signature, pencocokan nominal, dan idempotency key.
- **Isolasi peran:** endpoint Seller Center & admin dilindungi; pembeli tidak bisa mengaksesnya.
- **Header keamanan & HTTPS** otomatis dari Caddy di produksi (HSTS, nosniff, dll.).

---

## 🧪 Layanan Eksperimental (`services/`)

Folder `services/go-worker` (pemrosesan CSV katalog) dan `services/rust-tools` (utilitas checksum)
adalah **prototipe mandiri** dan **belum menjadi bagian dari aplikasi yang berjalan di produksi**.
Keduanya bisa diuji terpisah dengan `go test ./...` dan `cargo test`.

---

## 📄 Lisensi

Lihat berkas [`LICENSE`](LICENSE).
