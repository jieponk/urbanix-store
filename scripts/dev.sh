#!/bin/bash
# Jalankan stack pengembangan lokal. Konfigurasi default sudah ada di docker-compose.yml (tanpa .env).
set -e
cd "$(dirname "$0")/.."

if ! command -v docker &> /dev/null; then
  echo "[ERROR] Docker belum terpasang atau belum masuk PATH."
  exit 1
fi

echo "[INFO] Menjalankan storefront, backend, dan database..."
echo "       Storefront: http://localhost:3000   API: http://localhost:8000/api/v1/"
docker compose up --build
