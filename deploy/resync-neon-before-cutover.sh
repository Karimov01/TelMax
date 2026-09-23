#!/usr/bin/env sh
set -eu

cd /opt/telmax
umask 077

if [ ! -s .neon-url.tmp ]; then
  echo "Neon connection file is missing" >&2
  exit 1
fi

if docker compose -p telmax --env-file .env.production ps --status running telmax 2>/dev/null | grep -q telmax; then
  echo "TelMax application is running; refusing to overwrite its database" >&2
  exit 1
fi

mkdir -p backups
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump_file="backups/neon-final-${stamp}.dump"

docker run --rm \
  -v /opt/telmax:/work \
  postgres:17-alpine \
  sh -c 'pg_dump "$(cat /work/.neon-url.tmp)" --format=custom --no-owner --no-acl --file=/work/'"$dump_file"

test -s "$dump_file"
chmod 600 "$dump_file"

docker compose -p telmax --env-file .env.production exec -T postgres \
  pg_restore --clean --if-exists --exit-on-error --no-owner --no-acl \
  -U telmax -d telmax < "$dump_file"

docker compose -p telmax --env-file .env.production exec -T postgres \
  psql -U telmax -d telmax -Atc \
  "select schemaname || '.' || relname || '=' || n_live_tup from pg_stat_user_tables order by schemaname, relname;"

rm -f .neon-url.tmp
echo "FINAL_NEON_SYNC_COMPLETE:${dump_file}"
