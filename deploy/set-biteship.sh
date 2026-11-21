#!/bin/bash
# Pasang kunci Biteship (ongkir otomatis di checkout) di server, lalu uji.
# Pakai (dari laptop):  ./deploy/set-biteship.sh urbanix@IP-SERVER
# Kunci dari dashboard.biteship.com -> Integrasi -> API Keys. Live diawali "biteship_live.", uji coba "biteship_test.".
set -e
SERVER="$1"
if [ -z "$SERVER" ]; then
  echo "Cara pakai: ./deploy/set-biteship.sh urbanix@IP-SERVER"
  exit 1
fi

echo "Cara tempel di terminal Ubuntu: klik kanan, atau Ctrl+Shift+V. Layar memang tetap kosong."
KEY=""
for TRY in 1 2 3; do
  read -r -s -p "Tempel API key Biteship lalu Enter (percobaan $TRY/3): " RAW
  echo
  RAW="${RAW#*BITESHIP_API_KEY=}"
  CAND=$(printf '%s' "$RAW" | LC_ALL=C tr -cd 'A-Za-z0-9._-')
  if [[ "$CAND" =~ ^biteship_(live|test)\.[A-Za-z0-9._-]{16,}$ ]]; then KEY="$CAND"; echo "OK, terbaca ${#KEY} karakter."; break; fi
  echo "Format kunci tidak dikenali (harus diawali biteship_live. atau biteship_test.). Copy ulang dari dashboard Biteship."
done
[ -n "$KEY" ] || { echo "Dibatalkan."; exit 1; }

echo "==> Menyimpan kunci di server & menyalakan ulang backend..."
{
  printf 'KEY=%q\n' "$KEY"
  cat <<'REMOTE'
set -e
ENVF="$HOME/urbanix/.env"
[ -f "$ENVF" ] || { echo "File $ENVF tidak ada. Jalankan deploy dulu."; exit 1; }
grep -v -e "^BITESHIP_API_KEY=" -e "^RAJAONGKIR_API_KEY=" "$ENVF" > "$ENVF.tmp" || true
printf 'BITESHIP_API_KEY=%s\n' "$KEY" >> "$ENVF.tmp"
mv "$ENVF.tmp" "$ENVF"
chmod 600 "$ENVF"

cd "$HOME/urbanix/app/deploy"
DC="docker compose --env-file $ENVF -f docker-compose.prod.yml"
$DC up -d backend </dev/null >/dev/null
sleep 6
echo "==> Menguji kunci (cari area 'sawah besar')..."
if $DC exec -T backend python -c "
import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','urbanix_core.settings'); django.setup()
from store import ongkir
rows = ongkir.search_destination('sawah besar')
print(len(rows), 'tujuan ditemukan, contoh:', rows[0]['label'] if rows else '-')
assert rows
" </dev/null; then
  echo "BERHASIL. Lanjut: Seller Center -> Pengaturan -> Ongkir otomatis -> pilih asal pengiriman (gudang) -> Simpan."
  echo "Catatan: Biteship menagih per cek ongkir (Rp2-5/request). Pastikan saldo Biteship terisi."
  echo "Status resi dicek otomatis tiap jam (cron cek_pengiriman). Webhook Biteship tidak perlu diubah."
else
  echo "GAGAL. Kunci ditolak Biteship, saldo habis, atau server tidak bisa menghubungi api.biteship.com."
  exit 1
fi
REMOTE
} | ssh "$SERVER" 'bash -s'
