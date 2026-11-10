#!/usr/bin/env bash
# Di VPS (dipanggil export-data.sh). MENGGANTI seluruh data di server dengan data dari laptop.
set -euo pipefail
cd ~/urbanix/app/deploy
DC="docker compose --env-file $HOME/urbanix/.env -f docker-compose.prod.yml"

echo "==> Backup data server sebelum diganti"
bash ~/urbanix/app/deploy/backup.sh || true

echo "==> Memasang data"
$DC cp /tmp/urbanix-data.json backend:/tmp/data.json
$DC exec -T backend python manage.py flush --no-input
$DC exec -T backend python manage.py loaddata /tmp/data.json
$DC exec -T backend python manage.py shell -c "
from django.apps import apps
from django.core.management.color import no_style
from django.db import connection
with connection.cursor() as c:
    for sql in connection.ops.sequence_reset_sql(no_style(), apps.get_models()):
        c.execute(sql)
print('Nomor urut database dirapikan.')
"
$DC cp /tmp/urbanix-media.tgz backend:/tmp/media.tgz
$DC exec -T backend sh -c "tar -xzf /tmp/media.tgz -C /srv 2>/dev/null || true; rm -f /tmp/media.tgz /tmp/data.json"
rm -f /tmp/urbanix-data.json /tmp/urbanix-media.tgz
echo "Selesai: data laptop sudah terpasang di server."
