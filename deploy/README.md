# Deploy Urbanix Store ke VPS

Susunan di server (semua lewat Docker):

```
Pembeli → Cloudflare (DNS, gratis) → VPS
            Caddy (HTTPS otomatis)
              ├─ /admin, /static, /media → Django (Gunicorn)
              └─ semua halaman lain      → Next.js (toko + Seller Center)
            PostgreSQL (database)
            Jadwal: berita tiap 2 jam, backup harian 02:30
```

Semua perintah di bawah dijalankan di **terminal Ubuntu (WSL) laptop**, kecuali yang ditandai *di VPS*.
Ganti `IP-SERVER` dan `namadomain.com` dengan milikmu.

## 1. Domain → Cloudflare

1. Daftar di dash.cloudflare.com (paket **Free**), klik **Add a domain**, masukkan domain.
2. Cloudflare memberi **2 nameserver**. Di panel registrar (DomaiNesia/Rumahweb), ganti nameserver domain ke 2 nameserver itu.
3. Tunggu status domain di Cloudflare **Active** (beberapa menit sampai 24 jam).
4. Menu **DNS → Records**, tambahkan:
   - Type `A`, Name `@`, IPv4 `IP-SERVER`, Proxy **DNS only** (awan abu-abu)
   - Type `A`, Name `www`, IPv4 `IP-SERVER`, Proxy **DNS only**

## 2. Siapkan VPS (sekali saja)

```bash
cd ~/urbanix-store && git pull
scp deploy/server-setup.sh urbanix@IP-SERVER:~
ssh urbanix@IP-SERVER
bash server-setup.sh        # di VPS; minta password console untuk sudo
exit                        # keluar lalu login lagi supaya izin Docker aktif
```

## 3. Pasang website

```bash
cd ~/urbanix-store
./deploy/deploy.sh urbanix@IP-SERVER namadomain.com
```

Pertama kali butuh ±5–10 menit (download & build). Kunci DeepL dari `apps/backend/.env` laptop ikut disalin.
Pantau build tampilan toko:

```bash
ssh urbanix@IP-SERVER
cd ~/urbanix/app/deploy && docker compose --env-file ~/urbanix/.env -f docker-compose.prod.yml logs -f storefront
```

Selesai kalau muncul `Ready` / `started server on 0.0.0.0:3000` (Ctrl+C untuk keluar dari log).

## 4. Pindahkan data dari laptop

```bash
cd ~/urbanix-store
./deploy/export-data.sh urbanix@IP-SERVER
```

Produk, varian, promo, voucher, ulasan, berita, pesanan, pengaturan, akun admin, dan gambar banner dipindah.
**Data di server diganti** dengan data laptop (server dibackup dulu otomatis).

## 5. Cek & aktifkan Cloudflare

1. Buka `https://namadomain.com`, `https://namadomain.com/seller`, `https://namadomain.com/admin`.
2. Kalau semua jalan: di Cloudflare ubah kedua record DNS menjadi **Proxied** (awan oranye),
   lalu **SSL/TLS → Overview → Full (strict)**.

## Update website setelah ada perubahan

```bash
cd ~/urbanix-store && git pull
./deploy/deploy.sh urbanix@IP-SERVER
```

Tampilan toko di-build ulang (±2–4 menit; selama itu halaman bisa menampilkan error 502 sebentar).

## Perintah berguna (di VPS)

```bash
cd ~/urbanix/app/deploy
alias dc='docker compose --env-file ~/urbanix/.env -f docker-compose.prod.yml'
dc ps                                            # status layanan
dc logs -f backend                               # log backend
dc exec backend python manage.py createsuperuser # tambah admin
dc exec backend python manage.py ambil_berita --semua
bash ~/urbanix/app/deploy/backup.sh              # backup manual
ls ~/urbanix/backups                             # hasil backup (disimpan 14 hari)
nano ~/urbanix/.env                              # rahasia & kunci (DeepL, Midtrans); lalu jalankan deploy.sh lagi
```

`~/urbanix/.env` berisi kunci rahasia: jangan dibagikan & jangan masuk GitHub.
