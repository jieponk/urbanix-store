#!/usr/bin/env bash
# Dijalankan di VPS oleh deploy.sh (jangan dijalankan manual).
set -euo pipefail
BASE=~/urbanix
APP=$BASE/app
ENVF=$BASE/.env
mkdir -p "$BASE/backups"

echo "==> Membuka kode baru"
rm -rf "$APP.new" && mkdir -p "$APP.new"
tar -xzf /tmp/urbanix-app.tgz -C "$APP.new" && rm -f /tmp/urbanix-app.tgz
rm -rf "$APP.old"
[ -d "$APP" ] && mv "$APP" "$APP.old"
mv "$APP.new" "$APP"
chmod +x "$APP"/deploy/*.sh

if [ ! -f "$ENVF" ]; then
  if [ -z "${DOMAIN:-}" ]; then
    echo "Pemasangan pertama: domain wajib diisi. Contoh: ./deploy/deploy.sh urbanix@IP urbanixstore.com"
    exit 1
  fi
  echo "==> Membuat $ENVF (rahasia dibuat otomatis)"
  umask 077
  cat > "$ENVF" <<CONF
DOMAIN=$DOMAIN
SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 24)
DEEPL_API_KEY=
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=False
CONF
fi

# Domain: isi/perbaiki di .env kalau dikirim lewat argumen, lalu pastikan tidak kosong.
if [ -n "${DOMAIN:-}" ]; then
  if grep -q '^DOMAIN=' "$ENVF"; then sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" "$ENVF"; else echo "DOMAIN=$DOMAIN" >> "$ENVF"; fi
fi
DOMAIN=$(grep -E '^DOMAIN=' "$ENVF" | cut -d= -f2- | tr -d '[:space:]"' || true)
if [ -z "$DOMAIN" ]; then
  echo "DOMAIN kosong di $ENVF. Jalankan ulang: ./deploy/deploy.sh urbanix@IP namadomain.com"
  exit 1
fi
echo "==> Domain: $DOMAIN"

if [ -f /tmp/urbanix-secrets ]; then
  KEY=$(grep -E '^DEEPL_API_KEY=' /tmp/urbanix-secrets | cut -d= -f2- || true)
  if [ -n "$KEY" ] && grep -qE '^DEEPL_API_KEY=$' "$ENVF"; then
    sed -i "s|^DEEPL_API_KEY=$|DEEPL_API_KEY=$KEY|" "$ENVF"
    echo "==> Kunci DeepL disalin dari laptop"
  fi
  rm -f /tmp/urbanix-secrets
fi

echo "==> Build & jalankan (storefront butuh ±2–4 menit untuk build)"
cd "$APP/deploy"
# Kunci email (opsional) disiapkan kosong; isi untuk mengaktifkan email pesanan.
for K in EMAIL_HOST EMAIL_PORT EMAIL_HOST_USER EMAIL_HOST_PASSWORD EMAIL_FROM; do
  grep -q "^$K=" "$ENVF" || echo "$K=" >> "$ENVF"
done

docker compose --env-file "$ENVF" -f docker-compose.prod.yml up -d --build --remove-orphans
docker image prune -f >/dev/null

echo "==> Jadwal otomatis: berita tiap 2 jam, backup tiap hari 02:30"
CRON_NEWS="15 */2 * * * cd $APP/deploy && docker compose --env-file $ENVF -f docker-compose.prod.yml exec -T backend python manage.py ambil_berita >> $BASE/cron.log 2>&1"
CRON_BACKUP="30 2 * * * bash $APP/deploy/backup.sh >> $BASE/cron.log 2>&1"
{ crontab -l 2>/dev/null | grep -v '# urbanix' || true; echo "$CRON_NEWS # urbanix"; echo "$CRON_BACKUP # urbanix"; } | crontab -

echo
echo "Selesai. Pantau build:  cd $APP/deploy && docker compose --env-file $ENVF -f docker-compose.prod.yml logs -f storefront"
