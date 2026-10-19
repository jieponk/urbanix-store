# URBANIX STORE — Polyglot E-Commerce Platform

URBANIX STORE adalah platform e-commerce enterprise modern beraksitektur Monorepo Polyglot yang dirancang untuk performa tinggi, keandalan transaksi, dan keamanan tingkat tinggi.

## 🛠 Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend Core**: Python 3.11, Django 5, Django REST Framework, Celery
- **Database & Caching**: PostgreSQL 15, Redis
- **Worker Services**:
  - **Go Worker (`go-worker`)**: Pemrosesan impor katalog produk / CSV secara asinkron berkecepatan tinggi.
  - **Rust Tools (`rust-tools`)**: Utilitas verifikasi checksum audit log & performa enkripsi data intensif.
- **DevOps & Infrastructure**: Docker, Docker Compose, GitHub Actions, PowerShell & Bash Scripts.

---

## 🚀 Panduan Memulai (Windows / PowerShell)

### Prasyarat
- Docker Desktop (aktif)
- Node.js v18+ & Python 3.11+ (opsional untuk dev lokal tanpa Docker)
- Git

### Langkah Quickstart dengan Docker Compose
1. **Clone & Setup Environment**
   ```powershell
   git clone https://github.com/urbanix/urbanix-store.git
   cd urbanix-store
   Copy-Item .env.example .env
   ```
2. **Jalankan Aplikasi**
   ```powershell
   .\scripts\dev.ps1
   ```
   *Atau menggunakan Docker Compose secara langsung:*
   ```powershell
   docker-compose up --build -d
   ```
3. **Jalankan Migrasi & Buat Admin**
   ```powershell
   docker-compose exec backend python manage.py migrate
   docker-compose exec backend python manage.py createsuperuser
   ```
4. **Akses Aplikasi**
   - **Storefront (Next.js)**: http://localhost:3000
   - **Backend REST API**: http://localhost:8000/api/v1/
   - **Django Admin**: http://localhost:8000/admin/
   - **OpenAPI Docs**: http://localhost:8000/api/docs/

---

## 🧪 Menguji Sistem (Testing)

Jalankan pengujian terintegrasi untuk seluruh layanan:
```powershell
.\scripts	est.ps1
```
Atau uji backend Python Django secara spesifik:
```powershell
docker-compose exec backend pytest
```

---

## 🔒 Fitur Keamanan & Transaksi
- **Pencegahan Overselling**: Menggunakan `select_for_update()` dengan database transaction atomic pada PostgreSQL.
- **Verifikasi Midtrans**: Pembayaran terverifikasi via Webhook SHA-512 signature, nominal matching, dan idempotency key check.
- **Isolasi Peran**: Pengguna umum dibatasi dari endpoint manajemen inventaris & audit log.
