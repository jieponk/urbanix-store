#!/bin/bash
# Diagnosa koneksi server ke GIPHY (tanpa menampilkan API key).
# Pakai (dari laptop):  ./deploy/cek-giphy.sh urbanix@IP-SERVER
SERVER="${1:?Cara pakai: ./deploy/cek-giphy.sh urbanix@IP-SERVER}"
ssh "$SERVER" 'bash -s' <<'REMOTE'
ENVF="$HOME/urbanix/.env"
KEY=$(grep "^GIPHY_API_KEY=" "$ENVF" | cut -d= -f2-)
echo "Key terpasang : $([ -n "$KEY" ] && echo "ya (${#KEY} karakter)" || echo TIDAK)"
for V in 4 6; do
  R=$(curl -$V -s -m 10 -o /dev/null -w "%{http_code} dalam %{time_total}s" "https://api.giphy.com/v1/gifs/trending?limit=1&api_key=$KEY" 2>&1)
  echo "IPv$V          : ${R:-gagal terhubung}"
done
echo "--- log backend terakhir tentang GIPHY ---"
cd "$HOME/urbanix/app/deploy"
docker compose --env-file "$ENVF" -f docker-compose.prod.yml logs backend --tail 300 2>/dev/null | grep -i giphy | tail -5
REMOTE
