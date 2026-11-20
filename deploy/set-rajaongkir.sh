#!/bin/bash
# Pasang kunci RajaOngkir (ongkir otomatis di checkout) di server, lalu uji.
# Pakai (dari laptop):  ./deploy/set-rajaongkir.sh urbanix@IP-SERVER
# Kunci dari https://collaborator.komerce.id -> RajaOngkir -> API Key ("Shipping Cost").
set -e
SERVER="$1"
if [ -z "$SERVER" ]; then
  echo "Cara pakai: ./deploy/set-rajaongkir.sh urbanix@IP-SERVER"
  exit 1
fi

echo "Cara tempel di terminal Ubuntu: klik kanan, atau Ctrl+Shift+V. Layar memang tetap kosong."
KEY=""
for TRY in 1 2 3; do
  read -r -s -p "Tempel API key RajaOngkir lalu Enter (percobaan $TRY/3): " RAW
  echo
  RAW="${RAW#*RAJAONGKIR_API_KEY=}"
  CAND=$(printf '%s' "$RAW" | LC_ALL=C tr -cd 'A-Za-z0-9_-')
  if [[ "$CAND" =~ ^[A-Za-z0-9_-]{16,128}$ ]]; then KEY="$CAND"; echo "OK, terbaca ${#KEY} karakter."; break; fi
  echo "Format kunci tidak dikenali. Copy ulang dari dashboard Komerce/RajaOngkir."
done
[ -n "$KEY" ] || { echo "Dibatalkan."; exit 1; }

echo "==> Menyimpan kunci di server & menyalakan ulang backend..."
{
  printf 'KEY=%q\n' "$KEY"
  cat <<'REMOTE'
set -e
ENVF="$HOME/urbanix/.env"
[ -f "$ENVF" ] || { echo "File $ENVF tidak ada. Jalankan deploy dulu."; exit 1; }
grep -v "^RAJAONGKIR_API_KEY=" "$ENVF" > "$ENVF.tmp" || true
printf 'RAJAONGKIR_API_KEY=%s\n' "$KEY" >> "$ENVF.tmp"
mv "$ENVF.tmp" "$ENVF"
chmod 600 "$ENVF"

cd "$HOME/urbanix/app/deploy"
DC="docker compose --env-file $ENVF -f docker-compose.prod.yml"
$DC up -d backend </dev/null >/dev/null
sleep 6
echo "==> Menguji kunci (cari tujuan 'pasar baru')..."
if $DC exec -T backend python -c "
import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','urbanix_core.settings'); django.setup()
from store import ongkir
rows = ongkir.search_destination('pasar baru')
print(len(rows), 'tujuan ditemukan, contoh:', rows[0]['label'] if rows else '-')
assert rows
" </dev/null; then
  echo "BERHASIL. Lanjut: Seller Center -> Pengaturan -> Ongkir otomatis -> pilih asal pengiriman (gudang) -> Simpan."
else
  echo "GAGAL. Kunci ditolak RajaOngkir, kuota habis, atau server tidak bisa menghubungi rajaongkir.komerce.id."
  exit 1
fi
REMOTE
} | ssh "$SERVER" 'bash -s'
