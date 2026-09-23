#!/bin/sh
set -eu

cd /opt/telmax
umask 077

if [ ! -s .neon-url.tmp ]; then
  echo "Neon connection file is missing" >&2
  exit 1
fi

if docker volume inspect telmax_telmax_postgres_data >/dev/null 2>&1; then
  echo "TelMax PostgreSQL volume already exists; refusing to overwrite it" >&2
  exit 1
fi

mkdir -p backups
chmod 700 backups

docker run --rm \
  -v /opt/telmax:/work \
  postgres:17-alpine \
  sh -c 'pg_dump "$(cat /work/.neon-url.tmp)" --format=custom --no-owner --no-acl --file=/work/backups/neon-pre-vps.dump'

test -s backups/neon-pre-vps.dump
chmod 600 backups/neon-pre-vps.dump

postgres_password="$(openssl rand -hex 32)"
cat > .env.production <<EOF
TELMAX_DOMAIN=telmax.uz
NEXT_PUBLIC_APP_URL=https://telmax.uz
LOW_STOCK_THRESHOLD=2
POSTGRES_DB=telmax
POSTGRES_USER=telmax
POSTGRES_PASSWORD=${postgres_password}
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_AUTH_MAX_AGE_SECONDS=3600
TELMAX_OWNER_TELEGRAM_ID=
R2_ACCOUNT_ID=
R2_BUCKET_NAME=telmax-images
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_URL=
EOF
chmod 600 .env.production

docker compose -p telmax --env-file .env.production up -d postgres

attempt=0
until docker compose -p telmax --env-file .env.production exec -T postgres \
  pg_isready -U telmax -d telmax >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "VPS PostgreSQL did not become ready" >&2
    exit 1
  fi
  sleep 2
done

docker compose -p telmax --env-file .env.production exec -T postgres \
  pg_restore --exit-on-error --no-owner --no-acl -U telmax -d telmax \
  < backups/neon-pre-vps.dump

docker compose -p telmax --env-file .env.production exec -T postgres \
  psql -U telmax -d telmax -Atc \
  "select schemaname || '.' || relname || '=' || n_live_tup from pg_stat_user_tables order by schemaname, relname;"

rm -f .neon-url.tmp
touch .migration_complete
chmod 600 .migration_complete
echo "NEON_TO_VPS_MIGRATION_COMPLETE"
