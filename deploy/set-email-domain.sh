#!/bin/bash
# Kirim email pesanan dari alamat domain sendiri (mis. pesanan@urbanix.id) lewat Resend.
# Syarat: domain urbanix.id sudah berstatus "Verified" di resend.com dan API key sudah dibuat.
# Pakai (dari laptop):  ./deploy/set-email-domain.sh urbanix@IP-SERVER [pesanan@urbanix.id]
# API key diketik saat diminta (tidak tampil di layar & tidak tersimpan di riwayat terminal).
set -e
SERVER="$1"
FROM="${2:-pesanan@urbanix.id}"
REPLY="urbanixstore26@gmail.com"   # balasan pembeli masuk ke sini
TEST_TO="urbanixstore26@gmail.com"
if [ -z "$SERVER" ]; then
  echo "Cara pakai: ./deploy/set-email-domain.sh urbanix@IP-SERVER [pesanan@urbanix.id]"
  exit 1
fi

echo "Pengirim     : Urbanix Store <$FROM>"
echo "Balasan ke   : $REPLY"
echo "Cara tempel di terminal Ubuntu: klik kanan, atau Ctrl+Shift+V. Layar memang tetap kosong."
KEY=""
for TRY in 1 2 3; do
  read -r -s -p "Tempel API key Resend (diawali re_) lalu Enter (percobaan $TRY/3): " RAW
  echo
  KEY=$(printf '%s' "$RAW" | LC_ALL=C tr -cd 'A-Za-z0-9_-')
  if [[ "$KEY" == re_* ]] && [ ${#KEY} -ge 20 ]; then echo "OK."; break; fi
  echo "Itu bukan API key Resend (harus diawali re_). Copy ulang dari resend.com > API Keys."
  KEY=""
done
[ -n "$KEY" ] || { echo "Dibatalkan."; exit 1; }

echo "==> Menyimpan pengaturan email di server & menyalakan ulang backend..."
{
  printf 'FROM=%q\nREPLY=%q\nKEY=%q\nTEST_TO=%q\n' "$FROM" "$REPLY" "$KEY" "$TEST_TO"
  cat <<'REMOTE'
set -e
ENVF="$HOME/urbanix/.env"
[ -f "$ENVF" ] || { echo "File $ENVF tidak ada. Jalankan deploy dulu."; exit 1; }
set_kv() {
  grep -v "^$1=" "$ENVF" > "$ENVF.tmp" || true
  printf '%s=%s\n' "$1" "$2" >> "$ENVF.tmp"
  mv "$ENVF.tmp" "$ENVF"
}
set_kv EMAIL_HOST smtp.resend.com
set_kv EMAIL_PORT 587
set_kv EMAIL_HOST_USER resend
set_kv EMAIL_HOST_PASSWORD "$KEY"
set_kv EMAIL_FROM "Urbanix Store <$FROM>"
set_kv EMAIL_REPLY_TO "$REPLY"
chmod 600 "$ENVF"

cd "$HOME/urbanix/app/deploy"
DC="docker compose --env-file $ENVF -f docker-compose.prod.yml"
$DC up -d backend </dev/null >/dev/null
sleep 6
echo "==> Mengirim email uji ke $TEST_TO ..."
if OUT=$($DC exec -T backend python manage.py sendtestemail "$TEST_TO" </dev/null 2>&1); then
  echo "BERHASIL. Cek kotak masuk $TEST_TO (pengirim: $FROM)."
else
  echo "GAGAL mengirim. Pesan dari server:"
  echo "$OUT" | tail -2
  case "$OUT" in
    *535*|*nvalid*) echo "=> API key ditolak. Buat API key baru di resend.com lalu ulangi." ;;
    *450*|*not\ verified*|*domain*) echo "=> Domain belum Verified di Resend. Tunggu status DNS hijau lalu ulangi." ;;
  esac
  exit 1
fi
REMOTE
} | ssh "$SERVER" 'bash -s'
