#!/bin/bash
# Pasang kunci Midtrans (bayar di web) di server, lalu uji.
# Pakai (dari laptop):  ./deploy/set-midtrans.sh urbanix@IP-SERVER
# Kunci dari dashboard.midtrans.com -> Settings -> Access Keys (Server Key & Client Key).
# Sandbox (uji coba) kuncinya diawali "SB-Mid-", Production diawali "Mid-".
set -e
SERVER="$1"
if [ -z "$SERVER" ]; then
  echo "Cara pakai: ./deploy/set-midtrans.sh urbanix@IP-SERVER"
  exit 1
fi

echo "Cara tempel di terminal Ubuntu: klik kanan, atau Ctrl+Shift+V. Layar memang tetap kosong."
read_key() { # $1 = label, $2 = pola awalan (server|client)
  local raw cand
  for TRY in 1 2 3; do
    read -r -s -p "Tempel $1 lalu Enter (percobaan $TRY/3): " raw
    echo >&2
    raw="${raw#*=}"
    cand=$(printf '%s' "$raw" | LC_ALL=C tr -cd 'A-Za-z0-9_-')
    if [[ "$cand" =~ ^(SB-)?Mid-$2-[A-Za-z0-9_-]{8,}$ ]]; then printf '%s' "$cand"; return 0; fi
    echo "Format tidak dikenali (harus diawali Mid-$2- atau SB-Mid-$2-)." >&2
  done
  return 1
}
SKEY=$(read_key "Server Key" server) || { echo "Dibatalkan."; exit 1; }
CKEY=$(read_key "Client Key" client) || { echo "Dibatalkan."; exit 1; }
if [[ "$SKEY" == SB-* ]]; then PROD=False; MODE="SANDBOX (uji coba, uang tidak sungguhan)"; else PROD=True; MODE="PRODUCTION (pembayaran sungguhan)"; fi
case "$SKEY$CKEY" in
  SB-*SB-*|Mid-*Mid-*) ;;
  *) echo "Server Key dan Client Key harus dari mode yang sama (keduanya Sandbox atau keduanya Production)."; exit 1 ;;
esac
echo "Mode: $MODE"

echo "==> Menyimpan kunci di server & menyalakan ulang backend..."
{
  printf 'SKEY=%q\nCKEY=%q\nPROD=%q\n' "$SKEY" "$CKEY" "$PROD"
  cat <<'REMOTE'
set -e
ENVF="$HOME/urbanix/.env"
[ -f "$ENVF" ] || { echo "File $ENVF tidak ada. Jalankan deploy dulu."; exit 1; }
grep -v -e "^MIDTRANS_SERVER_KEY=" -e "^MIDTRANS_CLIENT_KEY=" -e "^MIDTRANS_IS_PRODUCTION=" "$ENVF" > "$ENVF.tmp" || true
printf 'MIDTRANS_SERVER_KEY=%s\nMIDTRANS_CLIENT_KEY=%s\nMIDTRANS_IS_PRODUCTION=%s\n' "$SKEY" "$CKEY" "$PROD" >> "$ENVF.tmp"
mv "$ENVF.tmp" "$ENVF"
chmod 600 "$ENVF"

cd "$HOME/urbanix/app/deploy"
DC="docker compose --env-file $ENVF -f docker-compose.prod.yml"
$DC up -d backend </dev/null >/dev/null
sleep 6
echo "==> Menguji kunci..."
if $DC exec -T backend python -c "
import django, os, base64, requests; os.environ.setdefault('DJANGO_SETTINGS_MODULE','urbanix_core.settings'); django.setup()
from django.conf import settings
base = 'https://api.midtrans.com' if settings.MIDTRANS_IS_PRODUCTION else 'https://api.sandbox.midtrans.com'
auth = base64.b64encode((settings.MIDTRANS_SERVER_KEY + ':').encode()).decode()
r = requests.get(base + '/v2/cek-kunci-urbanix/status', headers={'Authorization': 'Basic ' + auth, 'Accept': 'application/json'}, timeout=15)
code = str(r.json().get('status_code'))
print('Jawaban Midtrans:', code, r.json().get('status_message'))
assert code == '404', 'kunci ditolak'
" </dev/null; then
  echo "BERHASIL. Kunci diterima Midtrans."
  echo "Lanjut di dashboard Midtrans -> Settings -> Payment -> Notification URL, isi:"
  echo "  https://urbanix.id/api/v1/payments/midtrans-webhook/"
  echo "Metode 'Bayar di web' muncul di checkout setelah ongkir otomatis (RajaOngkir) juga aktif."
else
  echo "GAGAL. Kunci ditolak Midtrans (cek mode Sandbox/Production) atau server tidak bisa menghubungi Midtrans."
  exit 1
fi
REMOTE
} | ssh "$SERVER" 'bash -s'
