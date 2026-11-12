#!/usr/bin/env bash
# Backup harian database + gambar upload ke ~/urbanix/backups (disimpan 14 hari).
set -euo pipefail
cd ~/urbanix/app/deploy
DC="docker compose --env-file $HOME/urbanix/.env -f docker-compose.prod.yml"
OUT=~/urbanix/backups
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$OUT"
$DC exec -T db pg_dump -U urbanix urbanix | gzip > "$OUT/db-$STAMP.sql.gz"
$DC exec -T backend tar -czf - -C /srv media > "$OUT/media-$STAMP.tgz" 2>/dev/null || true
find "$OUT" -type f -mtime +14 -delete
echo "$(date '+%F %T') backup OK: db-$STAMP.sql.gz"

# Salinan ke Google Drive (aktif setelah ./deploy/set-backup-drive.sh dijalankan sekali).
if command -v rclone >/dev/null && rclone listremotes 2>/dev/null | grep -q '^gdrive:$'; then
  if rclone copy "$OUT" gdrive:urbanix-backup --max-age 25h --transfers 2 --retries 3; then
    rclone delete gdrive:urbanix-backup --min-age 15d >/dev/null 2>&1 || true
    echo "$(date '+%F %T') salinan Google Drive OK"
  else
    echo "$(date '+%F %T') PERINGATAN: gagal menyalin ke Google Drive"
  fi
fi
