#!/bin/sh
set -e
python manage.py migrate --noinput
python manage.py collectstatic --noinput >/dev/null
# Ubah gambar upload lama (JPG/PNG/GIF) jadi WebP. Kalau semua sudah WebP, langsung selesai.
python manage.py konversi_webp || echo "konversi_webp gagal, dilewati"
exec gunicorn urbanix_core.wsgi:application \
  --bind 0.0.0.0:8000 --workers 3 --threads 2 --timeout 60 \
  --access-logfile - --error-logfile -
