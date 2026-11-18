#!/bin/bash
# Pasang kunci AI untuk artikel berita lengkap + inti berita + opini di halaman /berita, lalu uji.
# Pakai (dari laptop):  ./deploy/set-ai.sh urbanix@IP-SERVER
#
# Pilihan penyedia:
#   1) Groq   (GRATIS)   kunci dari https://console.groq.com/keys          (diawali gsk_)
#   2) Gemini (GRATIS)   kunci dari https://aistudio.google.com/apikey     (diawali AIza atau AQ.)
#   3) Claude (berbayar) kunci dari https://console.anthropic.com          (diawali sk-ant-)
#   4) OpenAI (berbayar) kunci dari https://platform.openai.com/api-keys   (diawali sk-)
#   5) GitHub Models (GRATIS) token dari https://github.com/settings/tokens  (izin Models: read)
#   6) NVIDIA NIM (GRATIS)    kunci dari https://build.nvidia.com          (diawali nvapi-)
set -e
SERVER="$1"
if [ -z "$SERVER" ]; then
  echo "Cara pakai: ./deploy/set-ai.sh urbanix@IP-SERVER"
  exit 1
fi

echo "Pasang kunci AI untuk berita. Bisa dijalankan beberapa kali untuk memasang lebih dari satu penyedia:"
echo "Urutan pakai: Groq -> Gemini -> GitHub Models -> NVIDIA -> OpenAI -> Claude (yang kuotanya habis dilewati otomatis)."
echo "  1) Groq   - gratis, tanpa kartu kredit (console.groq.com)"
echo "  2) Gemini - gratis (aistudio.google.com); di paket gratis, Google boleh memakai data untuk produknya"
echo "  3) Claude - berbayar (console.anthropic.com), tulisan paling rapi"
echo "  4) ChatGPT/OpenAI - berbayar dari saldo API (platform.openai.com/api-keys)"
echo "  5) GitHub Models - gratis dengan akun GitHub (token fine-grained, izin Models: read)"
echo "  6) NVIDIA NIM - gratis (build.nvidia.com, kunci diawali nvapi-)"
read -r -p "Ketik 1-6 lalu Enter: " CHOICE
case "$CHOICE" in
  5) PREFIX="";      PROVIDER=github;    PATTERN='^(github_pat_|ghp_)[A-Za-z0-9_]{20,300}$'; HINT="diawali github_pat_ atau ghp_ (github.com/settings/tokens)" ;;
  6) PREFIX=nvapi-;  PROVIDER=nvidia;    PATTERN='^nvapi-[A-Za-z0-9_-]{20,300}$';     HINT="diawali nvapi- (build.nvidia.com)" ;;
  1) PREFIX=gsk_;    PROVIDER=groq;      PATTERN='^gsk_[A-Za-z0-9_-]{20,300}$';      HINT="diawali gsk_ (console.groq.com/keys)" ;;
  2) PREFIX="";      PROVIDER=gemini;    PATTERN='^(AIza|AQ\.)[A-Za-z0-9_.-]{20,300}$'; HINT="diawali AIza atau AQ. (aistudio.google.com/apikey)" ;;
  4) PREFIX=sk-;     PROVIDER=openai;    PATTERN='^sk-[A-Za-z0-9_-]{20,300}$';       HINT="diawali sk- (platform.openai.com/api-keys)" ;;
  3) PREFIX=sk-ant-; PROVIDER=anthropic; PATTERN='^sk-ant-[A-Za-z0-9_-]{20,300}$';   HINT="diawali sk-ant- (console.anthropic.com)" ;;
  *) echo "Pilihan tidak dikenal."; exit 1 ;;
esac

echo "Cara tempel di terminal Ubuntu: klik kanan, atau Ctrl+Shift+V. Layar memang tetap kosong."
KEY=""
for TRY in 1 2 3; do
  read -r -s -p "Tempel API key lalu Enter (percobaan $TRY/3): " RAW
  echo
  RAW="${RAW#*=}"
  # Buang spasi, enter, tanda kutip yang ikut tersalin; simpan karakter kunci yang wajar saja.
  CAND=$(printf '%s' "$RAW" | LC_ALL=C tr -cd 'A-Za-z0-9_.-')
  # Buang huruf sisa yang ikut tertempel di depan kunci (mis. "DCsk-proj-..." -> "sk-proj-...").
  if [ -n "$PREFIX" ] && [[ "$CAND" == *"$PREFIX"* ]] && [[ "$CAND" != "$PREFIX"* ]]; then
    echo "Ada huruf sisa di depan kunci (${CAND%%"$PREFIX"*}); dibuang otomatis."
    CAND="$PREFIX${CAND#*"$PREFIX"}"
  fi
  if [ "$PROVIDER" = "gemini" ] || [ "$PROVIDER" = "github" ]; then
    if [ "$PROVIDER" = "gemini" ]; then PFX="AIza AQ."; else PFX="github_pat_ ghp_"; fi
    for P in $PFX; do
      if [[ "$CAND" == *"$P"* ]] && [[ "$CAND" != "$P"* ]]; then
        echo "Ada huruf sisa di depan kunci (${CAND%%"$P"*}); dibuang otomatis."
        CAND="$P${CAND#*"$P"}"
      fi
    done
  fi
  if [ ${#CAND} -lt 20 ]; then
    echo "Kunci terlalu pendek (${#CAND} karakter). Pastikan sudah tersalin utuh, lalu tempel lagi."
    continue
  fi
  KEY="$CAND"
  if [[ "$CAND" =~ $PATTERN ]]; then
    echo "OK, terbaca ${#KEY} karakter."
  else
    echo "Perhatian: biasanya kunci ini $HINT. Tetap dicoba; hasil tes di bawah yang menentukan."
  fi
  break
done
[ -n "$KEY" ] || { echo "Dibatalkan."; exit 1; }

echo "==> Menyimpan kunci di server & menyalakan ulang backend..."
{
  printf 'KEY=%q\nPROVIDER=%q\n' "$KEY" "$PROVIDER"
  cat <<'REMOTE'
set -e
ENVF="$HOME/urbanix/.env"
[ -f "$ENVF" ] || { echo "File $ENVF tidak ada. Jalankan deploy dulu."; exit 1; }
case "$PROVIDER" in
  groq) VAR=GROQ_API_KEY ;;
  gemini) VAR=GEMINI_API_KEY ;;
  openai) VAR=OPENAI_API_KEY ;;
  github) VAR=GITHUB_MODELS_TOKEN ;;
  nvidia) VAR=NVIDIA_API_KEY ;;
  *) VAR=ANTHROPIC_API_KEY ;;
esac
# Setelan lama (satu penyedia: NEWS_AI_PROVIDER + NEWS_AI_API_KEY) dipindah ke variabel per penyedia.
OLD_P=$(grep -m1 '^NEWS_AI_PROVIDER=' "$ENVF" | cut -d= -f2- || true)
OLD_K=$(grep -m1 '^NEWS_AI_API_KEY=' "$ENVF" | cut -d= -f2- || true)
case "$OLD_P" in groq) OLD_VAR=GROQ_API_KEY ;; gemini) OLD_VAR=GEMINI_API_KEY ;; *) OLD_VAR="" ;; esac
grep -v -E "^(NEWS_AI_PROVIDER|NEWS_AI_API_KEY|$VAR)=" "$ENVF" > "$ENVF.tmp" || true
if [ -n "$OLD_VAR" ] && [ -n "$OLD_K" ] && [ "$OLD_VAR" != "$VAR" ] && ! grep -q "^$OLD_VAR=" "$ENVF.tmp"; then
  printf '%s=%s\n' "$OLD_VAR" "$OLD_K" >> "$ENVF.tmp"
fi
printf '%s=%s\n' "$VAR" "$KEY" >> "$ENVF.tmp"
mv "$ENVF.tmp" "$ENVF"
chmod 600 "$ENVF"

cd "$HOME/urbanix/app/deploy"
DC="docker compose --env-file $ENVF -f docker-compose.prod.yml"
$DC up -d backend </dev/null >/dev/null
sleep 6
echo "==> Kunci AI yang terpasang (urutan pakai Groq -> Gemini -> GitHub -> NVIDIA -> OpenAI -> Claude):"
for V in GROQ_API_KEY GEMINI_API_KEY GITHUB_MODELS_TOKEN NVIDIA_API_KEY OPENAI_API_KEY ANTHROPIC_API_KEY; do grep -q "^$V=." "$ENVF" && echo "   - $V ada"; done
echo "==> Menguji kunci & membuat 2 artikel berita..."
if $DC exec -T backend python manage.py ringkas_berita --maks 2 </dev/null; then
  echo "BERHASIL. Artikel lengkap, inti berita & opini AI akan muncul bertahap (maks. 8 berita per pembaruan, tiap 2 jam)."
else
  echo "GAGAL. Cek kunci di situs penyedia (atau kuota gratis sedang habis, coba lagi nanti)."
  exit 1
fi
REMOTE
} | ssh "$SERVER" 'bash -s'
