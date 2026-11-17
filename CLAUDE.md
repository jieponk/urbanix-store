# Urbanix Store — panduan untuk Claude Code

Toko online kamera/foto/video **https://urbanix.id** (PT Koolsnap Multi Retailindo). Pemilik proyek berbahasa Indonesia santai: jawab dalam Bahasa Indonesia, praktis, pisahkan fakta/perkiraan/saran, tanya bila data kurang.

## Struktur
- `apps/backend` — Django 5.2 + DRF (app `store`), PostgreSQL di produksi, SQLite lokal. API di `/api/v1/`.
- `apps/storefront` — Next.js 14 (App Router, TypeScript, Tailwind). Proxy API browser → backend lewat `src/app/api/*` + `src/lib/backend.ts`.
- `deploy/` — Docker Compose produksi (postgres, backend Gunicorn, storefront, Caddy), skrip deploy/backup/set-*.sh.
- Branch kerja: **`layout-baru`**.

## Perintah
- Backend tes: `cd apps/backend && source venv/bin/activate && python manage.py test store`
- Migrasi: `python manage.py makemigrations store -n <nama_singkat>` lalu `migrate`
- Storefront: `cd apps/storefront && npm run dev` / cek produksi: `npm run build` (jalankan sebelum push kalau mengubah TSX)
- Deploy (dari laptop, setelah push): `./deploy/deploy.sh urbanix@139.190.99.177` — build dulu lalu tukar container (±3–5 menit).
- Log server: `ssh urbanix@139.190.99.177 'cd ~/urbanix/app/deploy && docker compose --env-file ~/urbanix/.env -f docker-compose.prod.yml logs --tail 100 backend'`

## Aturan penting
- **Jangan** membaca, menampilkan, atau meng-commit isi `~/urbanix/.env` di server maupun kunci/API key apa pun. `.env.example` tanpa nilai rahasia.
- **Selalu minta konfirmasi** sebelum perintah yang mengubah server produksi (deploy, restart, migrasi, hapus data).
- Commit hanya bila diminta; jalankan tes backend (dan `npm run build` bila menyentuh storefront) sebelum push.
- **Dua bahasa (ID/EN)**: teks UI ditulis Bahasa Indonesia lalu dibungkus `t('...')` (server: `const t = getT()` dari `@/lib/lang-server`; browser: `const t = useT()` dari `@/components/LangProvider`) dan terjemahan Inggrisnya ditambahkan di kamus `src/lib/i18n.ts`. Pilihan bahasa disimpan di cookie `urbanix-lang`. Isi database (produk, kategori, artikel, voucher) diterjemahkan backend lewat DeepL (`store/content_i18n.py`, perintah `terjemahkan_konten`, tiap 3 jam). Pesan WhatsApp ke admin, invoice, S&K/Privasi, dan Seller Center tetap Bahasa Indonesia.
- Teks UI dalam Bahasa Indonesia, gaya rapi (bukan "polosan"), mendukung mode terang & gelap (warna lewat variabel: `ink`, `mist`, `surface`, `slate-*`, `brand-*`, `cobalt-*`, `sun-*`). Palet "Charcoal merah": merah `#E30220` (`sale-600`/`sun-400`), merah tua `#BE0000`, charcoal `#252024`, abu `#DDDDDD`, putih keabuan `#F3F4F6`; teks merah kecil di panel gelap pakai `sun-300`. Hindari ikon merah di atas kotak hitam (terkesan seram); pakai shade yang ada di `tailwind.config.js` saja.
- Gambar unggahan otomatis jadi WebP (`store/images.py`).
- SEO/Google: data terstruktur harus jujur. **Jangan** pasang rating/ulasan palsu atau salinan ulasan Shopee sebagai `aggregateRating`; bintang hanya dari model `ProductReview` (pembeli terverifikasi).
- Kebijakan toko (S&K, Merchant Center): proses 2 hari kerja, retur hanya barang rusak/salah/kurang (video unboxing ≤2×24 jam), ditinjau 1×24 jam, refund 7 hari kerja; ongkir di Merchant Center tarif tetap Rp20.000, kirim 1–7 hari. Nilai ada di `src/lib/siteConfig.ts` (`legal`) — ubah bersamaan dengan S&K & Merchant Center.
- Logo merek/kurir: pakai file resmi di `public/brands/` & `public/couriers/`, jangan menggambar ulang logo bermerek.

## Fitur utama (ringkas)
Katalog + varian, promo/voucher, checkout WhatsApp/Shopee (Midtrans nonaktif), pilihan pengiriman, cek pesanan & invoice, email otomatis (cron `kirim_pengingat`: pengingat bayar, paket dikirim, minta ulasan), ulasan produk terverifikasi (`/ulasan/<token>`), Inspirasi (artikel + berita RSS, komentar ala IG dengan emoji Noto & GIF GIPHY), Seller Center `/seller`, feed Google Merchant `/feeds/google-merchant.xml`, Google Customer Reviews, backup harian ke Google Drive (rclone).
