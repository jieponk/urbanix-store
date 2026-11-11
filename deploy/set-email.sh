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
if ! [[ "$EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[a-z]+$ ]]; then
  echo "Alamat email tidak valid: $EMAIL"
  exit 1
fi

echo "Akun Gmail : $EMAIL"
echo "Cara tempel di terminal Ubuntu: klik kanan, atau Ctrl+Shift+V. Layar memang tetap kosong."
PASS=""
for TRY in 1 2 3; do
  read -r -s -p "Tempel App Password lalu Enter (percobaan $TRY/3): " RAW
  echo
  # Buang semua yang bukan huruf (spasi biasa, spasi khusus hasil copy dari Google, dll.)
  PASS=$(printf '%s' "$RAW" | LC_ALL=C tr -cd 'A-Za-z')
  if [ ${#PASS} -eq 16 ]; then
    echo "OK, terbaca 16 huruf."
    break
  fi
  echo "Terbaca ${#PASS} huruf, seharusnya 16. Copy ulang dari halaman Google lalu tempel lagi."
  PASS=""
done
[ -n "$PASS" ] || { echo "Dibatalkan. Jalankan perintahnya lagi kalau sudah siap."; exit 1; }

echo "==> Menyimpan pengaturan email di server & menyalakan ulang backend..."
# Isi variabel lalu skrip dikirim sebagai SATU aliran ke server (password tidak muncul di layar/riwayat).
{
  printf 'EMAIL=%q\nPASS=%q\n' "$EMAIL" "$PASS"
  cat <<'REMOTE'
set -e
ENVF="$HOME/urbanix/.env"
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

cd "$HOME/urbanix/app/deploy"
DC="docker compose --env-file $ENVF -f docker-compose.prod.yml"
$DC up -d backend </dev/null >/dev/null
sleep 6
echo "==> Mengirim email uji ke $EMAIL ..."
if OUT=$($DC exec -T backend python manage.py sendtestemail "$EMAIL" </dev/null 2>&1); then
  echo "BERHASIL. Cek kotak masuk (atau folder Spam) $EMAIL."
else
  echo "GAGAL mengirim. Pesan dari server:"
  echo "$OUT" | tail -2
  case "$OUT" in
    *535*|*Username\ and\ Password*) echo "=> App Password ditolak Google. Buat App Password baru lalu ulangi." ;;
    *530*) echo "=> Google minta login. Pastikan Verifikasi 2 Langkah aktif & App Password benar." ;;
    *timed\ out*|*unreachable*|*refused*) echo "=> Server tidak bisa terhubung ke smtp.gmail.com:587." ;;
  esac
  exit 1
fi
REMOTE
} | ssh "$SERVER" 'bash -s'
