#!/usr/bin/env sh
set -eu

TARGET_FILE="${1:-.env.production}"
SECRETS_FILE="${2:-.deployment-secrets.tmp}"

if [ ! -f "$TARGET_FILE" ] || [ ! -f "$SECRETS_FILE" ]; then
  echo "Environment or secrets file is missing" >&2
  exit 1
fi

TMP_FILE="${TARGET_FILE}.tmp"
cp "$TARGET_FILE" "$TMP_FILE"

while IFS='=' read -r key value; do
  [ -n "$key" ] || continue
  case "$key" in
    \#*) continue ;;
  esac

  awk -v key="$key" 'index($0, key "=") != 1 { print }' "$TMP_FILE" > "${TMP_FILE}.next"
  mv "${TMP_FILE}.next" "$TMP_FILE"
  printf '%s=%s\n' "$key" "$value" >> "$TMP_FILE"
done < "$SECRETS_FILE"

chmod 600 "$TMP_FILE"
mv "$TMP_FILE" "$TARGET_FILE"
rm -f "$SECRETS_FILE"

echo "Deployment secrets applied"
