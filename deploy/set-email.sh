#!/bin/bash
# Aktifkan email pesanan (Gmail) di server, tanpa mengedit file manual.
# Pakai (dari laptop):  ./deploy/set-email.sh urbanix@IP-SERVER email@gmail.com
# App Password diketik saat diminta (tidak tampil di layar & tidak tersimpan di riwayat terminal).
set -e
SERVER="$1"
EMAIL="${2:-urbanixstore26@gmail.com}"
if [ -z "$SERVER" ]; then
  echo "Cara pakai: ./deploy/set-email.sh urbanix@IP-SERVER [email@gmail.com]"
  exit 1
fi

echo "Akun Gmail : $EMAIL"
read -r -s -p "Tempel App Password (16 huruf, tidak akan terlihat), lalu Enter: " PASS
echo
PASS="${PASS// /}"
if ! [[ "$PASS" =~ ^[a-zA-Z]{16}$ ]]; then
  echo "App Password harus 16 huruf (spasi boleh). Coba lagi."
  exit 1
fi

echo "==> Menyimpan pengaturan email di server & menyalakan ulang backend..."
printf '%s\n%s\n' "$EMAIL" "$PASS" | ssh "$SERVER" 'bash -s' <<'REMOTE'
set -e
read -r EMAIL
read -r PASS
ENVF=~/urbanix/.env
[ -f "$ENVF" ] || { echo "File $ENVF tidak ada. Jalankan deploy dulu."; exit 1; }
set_kv() {
  grep -v "^$1=" "$ENVF" > "$ENVF.tmp" || true
  printf '%s=%s\n' "$1" "$2" >> "$ENVF.tmp"
  mv "$ENVF.tmp" "$ENVF"
}
set_kv EMAIL_HOST smtp.gmail.com
set_kv EMAIL_PORT 587
set_kv EMAIL_HOST_USER "$EMAIL"
set_kv EMAIL_HOST_PASSWORD "$PASS"
set_kv EMAIL_FROM "Urbanix Store <$EMAIL>"
chmod 600 "$ENVF"

cd ~/urbanix/app/deploy
docker compose --env-file "$ENVF" -f docker-compose.prod.yml up -d backend >/dev/null
sleep 5
echo "==> Mengirim email uji ke $EMAIL ..."
if docker compose --env-file "$ENVF" -f docker-compose.prod.yml exec -T backend python manage.py sendtestemail "$EMAIL"; then
  echo "BERHASIL. Cek kotak masuk (atau Spam) $EMAIL."
else
  echo "GAGAL mengirim. Biasanya App Password salah atau Verifikasi 2 Langkah belum aktif."
  exit 1
fi
REMOTE
