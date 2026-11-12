#!/bin/bash
# Sekali saja: hubungkan backup harian server ke Google Drive.
# Pakai (dari laptop):  ./deploy/set-backup-drive.sh urbanix@IP-SERVER
# Izin yang diminta hanya "file yang dibuat aplikasi ini" (drive.file): rclone TIDAK bisa melihat file lain di Drive.
set -e
SERVER="${1:?Cara pakai: ./deploy/set-backup-drive.sh urbanix@IP-SERVER}"

if ! command -v rclone >/dev/null; then
  echo "rclone belum terpasang di laptop. Pasang dulu dengan perintah ini, lalu jalankan skrip ini lagi:"
  echo "  sudo -v && curl https://rclone.org/install.sh | sudo bash"
  exit 1
fi

echo "==> Browser akan terbuka. Login dengan akun Google tempat backup disimpan (mis. urbanixstore26@gmail.com) lalu klik Izinkan."
echo "    Kalau browser tidak terbuka sendiri, buka link http://127.0.0.1:53682/... yang muncul di bawah ini."
OUT=$(rclone authorize "drive" '{"scope":"drive.file"}' 2>&1 | tee /dev/stderr)
TOKEN=$(printf '%s\n' "$OUT" | sed -n '/--->/,/<---/p' | sed '1d;$d' | tr -d '\n')
[ -n "$TOKEN" ] || TOKEN=$(printf '%s\n' "$OUT" | grep -o '{"access_token".*}' | head -1)
if [ -z "$TOKEN" ]; then
  echo "Gagal mendapat izin Google Drive. Pesan rclone:"; printf '%s\n' "$OUT" | tail -5; exit 1
fi
echo "OK, izin Google Drive didapat."

echo "==> Memasang di server & menguji (bisa 1-3 menit)..."
{
  printf 'TOKEN=%q\n' "$TOKEN"
  cat <<'REMOTE'
set -e
if ! command -v rclone >/dev/null; then
  echo "Memasang rclone di server..."
  curl -fsSL https://rclone.org/install.sh | sudo bash >/dev/null
fi
rclone config delete gdrive >/dev/null 2>&1 || true
rclone config create gdrive drive scope=drive.file token="$TOKEN" --non-interactive >/dev/null
chmod 600 "$(rclone config file | tail -1)"
rclone mkdir gdrive:urbanix-backup
echo "==> Menjalankan backup pertama..."
bash "$HOME/urbanix/app/deploy/backup.sh"
echo "==> Isi folder urbanix-backup di Google Drive:"
rclone ls gdrive:urbanix-backup | tail -5
REMOTE
} | ssh "$SERVER" 'bash -s'
echo
echo "SELESAI. Mulai sekarang backup tiap hari 02.30 otomatis tersalin ke Google Drive (folder urbanix-backup, disimpan 15 hari)."
