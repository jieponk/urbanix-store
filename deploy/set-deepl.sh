#!/bin/bash
# Pasang kunci DeepL (terjemahan berita) di server, uji, lalu terjemahkan berita yang tertunda.
# Pakai (dari laptop):  ./deploy/set-deepl.sh urbanix@IP-SERVER
# Kunci diambil dari deepl.com -> Akun -> API Keys. Kunci diketik saat diminta (tidak tampil di layar).
set -e
SERVER="$1"
if [ -z "$SERVER" ]; then
  echo "Cara pakai: ./deploy/set-deepl.sh urbanix@IP-SERVER"
  exit 1
fi

echo "Cara tempel di terminal Ubuntu: klik kanan, atau Ctrl+Shift+V. Layar memang tetap kosong."
KEY=""
for TRY in 1 2 3; do
  read -r -s -p "Tempel kunci DeepL lalu Enter (percobaan $TRY/3): " RAW
  echo
  # Buang spasi, tanda kutip, atau "DEEPL_API_KEY=" yang ikut tersalin.
  RAW="${RAW#*DEEPL_API_KEY=}"
  CAND=$(printf '%s' "$RAW" | LC_ALL=C tr -cd 'A-Za-z0-9:-')
  if [[ "$CAND" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(:fx)?$ ]]; then
    KEY="$CAND"
    case "$KEY" in *:fx) echo "OK, kunci DeepL API Free terbaca." ;; *) echo "OK, kunci DeepL API Pro terbaca." ;; esac
    break
  fi
  echo "Format kunci tidak dikenali. Kunci DeepL bentuknya: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx"
done
[ -n "$KEY" ] || { echo "Dibatalkan. Jalankan perintahnya lagi kalau sudah siap."; exit 1; }

echo "==> Menyimpan kunci di server & menyalakan ulang backend..."
{
  printf 'KEY=%q\n' "$KEY"
  cat <<'REMOTE'
set -e
ENVF="$HOME/urbanix/.env"
[ -f "$ENVF" ] || { echo "File $ENVF tidak ada. Jalankan deploy dulu."; exit 1; }
grep -v "^DEEPL_API_KEY=" "$ENVF" > "$ENVF.tmp" || true
printf 'DEEPL_API_KEY=%s\n' "$KEY" >> "$ENVF.tmp"
mv "$ENVF.tmp" "$ENVF"
chmod 600 "$ENVF"

cd "$HOME/urbanix/app/deploy"
DC="docker compose --env-file $ENVF -f docker-compose.prod.yml"
$DC up -d backend </dev/null >/dev/null
sleep 6
echo "==> Menguji kunci & menerjemahkan berita yang tertunda (bisa 1-2 menit)..."
if $DC exec -T backend python manage.py cek_deepl --terjemahkan </dev/null; then
  echo "BERHASIL. Berita di urbanix.id/berita sekarang berbahasa Indonesia."
else
  echo "GAGAL. Lihat pesan di atas."
  exit 1
fi
REMOTE
} | ssh "$SERVER" 'bash -s'
