#!/bin/bash
# Pasang kunci AI untuk artikel berita lengkap + inti berita + opini di halaman /berita, lalu uji.
# Pakai (dari laptop):  ./deploy/set-ai.sh urbanix@IP-SERVER
#
# Pilihan penyedia:
#   1) Groq   (GRATIS)   kunci dari https://console.groq.com/keys          (diawali gsk_)
#   2) Gemini (GRATIS)   kunci dari https://aistudio.google.com/apikey     (diawali AIza)
#   3) Claude (berbayar) kunci dari https://console.anthropic.com          (diawali sk-ant-)
set -e
SERVER="$1"
if [ -z "$SERVER" ]; then
  echo "Cara pakai: ./deploy/set-ai.sh urbanix@IP-SERVER"
  exit 1
fi

echo "Pilih penyedia AI untuk berita:"
echo "  1) Groq   - gratis, tanpa kartu kredit (console.groq.com)"
echo "  2) Gemini - gratis (aistudio.google.com); di paket gratis, Google boleh memakai data untuk produknya"
echo "  3) Claude - berbayar (console.anthropic.com), tulisan paling rapi"
read -r -p "Ketik 1, 2, atau 3 lalu Enter: " CHOICE
case "$CHOICE" in
  1) PROVIDER=groq;      PATTERN='^gsk_[A-Za-z0-9_-]{20,200}$';      HINT="diawali gsk_ (console.groq.com/keys)" ;;
  2) PROVIDER=gemini;    PATTERN='^AIza[A-Za-z0-9_-]{20,200}$';      HINT="diawali AIza (aistudio.google.com/apikey)" ;;
  3) PROVIDER=anthropic; PATTERN='^sk-ant-[A-Za-z0-9_-]{20,200}$';   HINT="diawali sk-ant- (console.anthropic.com)" ;;
  *) echo "Pilihan tidak dikenal."; exit 1 ;;
esac

echo "Cara tempel di terminal Ubuntu: klik kanan, atau Ctrl+Shift+V. Layar memang tetap kosong."
KEY=""
for TRY in 1 2 3; do
  read -r -s -p "Tempel API key lalu Enter (percobaan $TRY/3): " RAW
  echo
  RAW="${RAW#*=}"
  CAND=$(printf '%s' "$RAW" | LC_ALL=C tr -cd 'A-Za-z0-9_-')
  if [[ "$CAND" =~ $PATTERN ]]; then KEY="$CAND"; echo "OK, terbaca ${#KEY} karakter."; break; fi
  echo "Format kunci tidak dikenali (harus $HINT)."
done
[ -n "$KEY" ] || { echo "Dibatalkan."; exit 1; }

echo "==> Menyimpan kunci di server & menyalakan ulang backend..."
{
  printf 'KEY=%q\nPROVIDER=%q\n' "$KEY" "$PROVIDER"
  cat <<'REMOTE'
set -e
ENVF="$HOME/urbanix/.env"
[ -f "$ENVF" ] || { echo "File $ENVF tidak ada. Jalankan deploy dulu."; exit 1; }
grep -v -E "^(ANTHROPIC_API_KEY|NEWS_AI_PROVIDER|NEWS_AI_API_KEY)=" "$ENVF" > "$ENVF.tmp" || true
if [ "$PROVIDER" = "anthropic" ]; then
  printf 'ANTHROPIC_API_KEY=%s\nNEWS_AI_PROVIDER=anthropic\n' "$KEY" >> "$ENVF.tmp"
else
  printf 'NEWS_AI_PROVIDER=%s\nNEWS_AI_API_KEY=%s\n' "$PROVIDER" "$KEY" >> "$ENVF.tmp"
fi
mv "$ENVF.tmp" "$ENVF"
chmod 600 "$ENVF"

cd "$HOME/urbanix/app/deploy"
DC="docker compose --env-file $ENVF -f docker-compose.prod.yml"
$DC up -d backend </dev/null >/dev/null
sleep 6
echo "==> Menguji kunci (membuat 2 artikel berita)..."
if $DC exec -T backend python manage.py ringkas_berita --maks 2 </dev/null; then
  echo "BERHASIL. Artikel lengkap, inti berita & opini AI akan muncul bertahap (maks. 8 berita per pembaruan, tiap 2 jam)."
else
  echo "GAGAL. Cek kunci di situs penyedia (atau kuota gratis sedang habis, coba lagi nanti)."
  exit 1
fi
REMOTE
} | ssh "$SERVER" 'bash -s'
