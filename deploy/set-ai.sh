#!/bin/bash
# Pasang kunci Claude (inti berita + opini AI di halaman berita) di server, lalu uji.
# Pakai (dari laptop):  ./deploy/set-ai.sh urbanix@IP-SERVER
# Kunci dari console.anthropic.com -> API Keys -> Create Key (isi kredit dulu di Billing).
set -e
SERVER="$1"
if [ -z "$SERVER" ]; then
  echo "Cara pakai: ./deploy/set-ai.sh urbanix@IP-SERVER"
  exit 1
fi

echo "Cara tempel di terminal Ubuntu: klik kanan, atau Ctrl+Shift+V. Layar memang tetap kosong."
KEY=""
for TRY in 1 2 3; do
  read -r -s -p "Tempel API key Claude (diawali sk-ant-) lalu Enter (percobaan $TRY/3): " RAW
  echo
  RAW="${RAW#*ANTHROPIC_API_KEY=}"
  CAND=$(printf '%s' "$RAW" | LC_ALL=C tr -cd 'A-Za-z0-9_-')
  if [[ "$CAND" =~ ^sk-ant-[A-Za-z0-9_-]{20,200}$ ]]; then KEY="$CAND"; echo "OK, terbaca ${#KEY} karakter."; break; fi
  echo "Format kunci tidak dikenali (harus diawali sk-ant-). Copy ulang dari console.anthropic.com."
done
[ -n "$KEY" ] || { echo "Dibatalkan."; exit 1; }

echo "==> Menyimpan kunci di server & menyalakan ulang backend..."
{
  printf 'KEY=%q\n' "$KEY"
  cat <<'REMOTE'
set -e
ENVF="$HOME/urbanix/.env"
[ -f "$ENVF" ] || { echo "File $ENVF tidak ada. Jalankan deploy dulu."; exit 1; }
grep -v "^ANTHROPIC_API_KEY=" "$ENVF" > "$ENVF.tmp" || true
printf 'ANTHROPIC_API_KEY=%s\n' "$KEY" >> "$ENVF.tmp"
mv "$ENVF.tmp" "$ENVF"
chmod 600 "$ENVF"

cd "$HOME/urbanix/app/deploy"
DC="docker compose --env-file $ENVF -f docker-compose.prod.yml"
$DC up -d backend </dev/null >/dev/null
sleep 6
echo "==> Menguji kunci..."
if $DC exec -T backend python manage.py ringkas_berita --maks 3 </dev/null; then
  echo "BERHASIL. Inti berita & opini AI akan muncul di halaman berita (maks. 8 berita baru per pembaruan)."
else
  echo "GAGAL. Cek kunci & saldo kredit di console.anthropic.com."
  exit 1
fi
REMOTE
} | ssh "$SERVER" 'bash -s'
