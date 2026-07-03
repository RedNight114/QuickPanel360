#!/usr/bin/env sh
set -eu

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: scripts/restore-postgres.sh /backups/cannaclub-YYYYMMDD-HHMMSS.sql.gz" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

gzip -dc "$BACKUP_FILE" | psql "$DATABASE_URL"
echo "Restore completed from: $BACKUP_FILE"
