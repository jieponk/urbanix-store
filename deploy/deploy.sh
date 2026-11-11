#!/usr/bin/env bash
# Kirim kode dari laptop ke VPS lalu build & jalankan.
#   Pertama kali : ./deploy/deploy.sh urbanix@IP-SERVER namadomain.com
#   Update       : ./deploy/deploy.sh urbanix@IP-SERVER
set -euo pipefail
TARGET=${1:?Contoh: ./deploy/deploy.sh urbanix@103.x.x.x urbanixstore.com}
DOMAIN=${2:-}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "==> Membungkus kode"
tar -C "$ROOT" -czf "$TMP/app.tgz" \
  --exclude=node_modules --exclude=.next --exclude=venv --exclude=__pycache__ --exclude=.git \
  --exclude=apps/backend/db.sqlite3 --exclude=apps/backend/.env --exclude=apps/backend/media \
  --exclude='*.tgz' --exclude=urbanix-data.json --exclude='.env.local' .

grep -E '^DEEPL_API_KEY=.+' "$ROOT/apps/backend/.env" > "$TMP/secrets" 2>/dev/null || : > "$TMP/secrets"
chmod 600 "$TMP/secrets"

echo "==> Mengirim ke $TARGET"
scp -q "$TMP/app.tgz" "$TARGET:/tmp/urbanix-app.tgz"
scp -q "$TMP/secrets" "$TARGET:/tmp/urbanix-secrets"
ssh "$TARGET" "chmod 600 /tmp/urbanix-secrets; DOMAIN='$DOMAIN' bash -s" < "$ROOT/deploy/remote-update.sh"
