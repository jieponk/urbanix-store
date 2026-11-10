#!/usr/bin/env bash
# Di LAPTOP: bungkus data toko (produk, varian, promo, voucher, ulasan, berita, pesanan, akun admin)
# + gambar banner, lalu kirim & pasang ke VPS.
#   ./deploy/export-data.sh urbanix@IP-SERVER
set -euo pipefail
TARGET=${1:?Contoh: ./deploy/export-data.sh urbanix@103.x.x.x}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT/apps/backend"
set +u; source venv/bin/activate; set -u

echo "==> Ekspor data dari database laptop"
python manage.py dumpdata --natural-foreign \
  -e contenttypes -e auth.permission -e admin.logentry -e sessions -e authtoken \
  --indent 0 -o /tmp/urbanix-data.json
tar -czf /tmp/urbanix-media.tgz -C "$ROOT/apps/backend" media 2>/dev/null || tar -czf /tmp/urbanix-media.tgz -T /dev/null

echo "==> Kirim ke VPS"
scp -q /tmp/urbanix-data.json /tmp/urbanix-media.tgz "$TARGET:/tmp/"
ssh "$TARGET" "bash ~/urbanix/app/deploy/import-data.sh"
rm -f /tmp/urbanix-data.json /tmp/urbanix-media.tgz
