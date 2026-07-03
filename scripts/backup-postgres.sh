#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/cannaclub-$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

pg_dump "$DATABASE_URL" | gzip > "$FILE"
find "$BACKUP_DIR" -name "cannaclub-*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -delete

echo "Backup created: $FILE"
