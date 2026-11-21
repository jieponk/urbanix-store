#!/bin/bash
# Pasang kunci GIPHY (tombol GIF di komentar artikel) di server, lalu uji.
# Pakai (dari laptop):  ./deploy/set-giphy.sh urbanix@IP-SERVER
# Kunci dari developers.giphy.com -> Dashboard -> Create an API Key (pilih "API").
set -e
SERVER="$1"
if [ -z "$SERVER" ]; then
  echo "Cara pakai: ./deploy/set-giphy.sh urbanix@IP-SERVER"
  exit 1
fi

echo "Cara tempel di terminal Ubuntu: klik kanan, atau Ctrl+Shift+V. Layar memang tetap kosong."
KEY=""
for TRY in 1 2 3; do
  read -r -s -p "Tempel API key GIPHY lalu Enter (percobaan $TRY/3): " RAW
  echo
  RAW="${RAW#*GIPHY_API_KEY=}"
  CAND=$(printf '%s' "$RAW" | LC_ALL=C tr -cd 'A-Za-z0-9')
  if [[ "$CAND" =~ ^[A-Za-z0-9]{20,64}$ ]]; then KEY="$CAND"; echo "OK, terbaca ${#KEY} karakter."; break; fi
  echo "Format kunci tidak dikenali (biasanya 32 huruf/angka). Copy ulang dari dashboard GIPHY."
done
[ -n "$KEY" ] || { echo "Dibatalkan."; exit 1; }

echo "==> Menyimpan kunci di server & menyalakan ulang backend..."
{
  printf 'KEY=%q\n' "$KEY"
  cat <<'REMOTE'
set -e
ENVF="$HOME/urbanix/.env"
[ -f "$ENVF" ] || { echo "File $ENVF tidak ada. Jalankan deploy dulu."; exit 1; }
grep -v "^GIPHY_API_KEY=" "$ENVF" > "$ENVF.tmp" || true
printf 'GIPHY_API_KEY=%s\n' "$KEY" >> "$ENVF.tmp"
mv "$ENVF.tmp" "$ENVF"
chmod 600 "$ENVF"

cd "$HOME/urbanix/app/deploy"
DC="docker compose --env-file $ENVF -f docker-compose.prod.yml"
$DC up -d backend </dev/null >/dev/null
sleep 6
echo "==> Menguji kunci..."
if $DC exec -T backend python -c "
import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','urbanix_core.settings'); django.setup()
from store.articles_api import _giphy
print(len(_giphy('trending', {'limit': 5})), 'GIF diterima')
" </dev/null; then
  echo "BERHASIL. Tombol GIF sekarang muncul di kolom komentar artikel."
else
  echo "GAGAL. Kunci ditolak GIPHY, atau server tidak bisa menghubungi api.giphy.com."
  exit 1
fi
REMOTE
} | ssh "$SERVER" 'bash -s'
