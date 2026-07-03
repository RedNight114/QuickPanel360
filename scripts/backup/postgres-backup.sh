#!/usr/bin/env bash
# ============================================================
# QuickPanel360 — PostgreSQL Backup
# QuickAgence
#
# Uso: ./scripts/backup/postgres-backup.sh
#
# Variables de entorno (o lee del .env.production):
#   POSTGRES_USER     (default: cannaclub)
#   POSTGRES_DB       (default: cannaclub_db)
#   POSTGRES_HOST     (default: postgres — nombre del contenedor)
#   POSTGRES_PORT     (default: 5432)
#   BACKUP_DIR        (default: ./backups)
#   BACKUP_RETENTION_DAYS  (default: 30)
#
# El backup se guarda en formato pg_dump custom (-Fc),
# comprimido, con nombre: quickpanel360_YYYYMMDD_HHMMSS.dump
# ============================================================

set -euo pipefail

POSTGRES_USER="${POSTGRES_USER:-cannaclub}"
POSTGRES_DB="${POSTGRES_DB:-cannaclub_db}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/quickpanel360_${TIMESTAMP}.dump"
LOG_PREFIX="[QuickPanel360 Backup]"

echo "${LOG_PREFIX} Starting PostgreSQL backup — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "${LOG_PREFIX} Database: ${POSTGRES_DB} on ${POSTGRES_HOST}:${POSTGRES_PORT}"

# Crear directorio de backups si no existe
mkdir -p "${BACKUP_DIR}"

# Ejecutar pg_dump desde dentro del contenedor postgres (si estamos en Docker Compose)
# o directamente si PGPASSWORD está disponible
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'postgres\|cannaclub'; then
  CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'postgres|cannaclub_postgres' | head -1)
  echo "${LOG_PREFIX} Using Docker container: ${CONTAINER}"
  docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-}" "${CONTAINER}" \
    pg_dump \
      --host="${POSTGRES_HOST}" \
      --port="${POSTGRES_PORT}" \
      --username="${POSTGRES_USER}" \
      --dbname="${POSTGRES_DB}" \
      --format=custom \
      --compress=9 \
      --no-password \
    > "${BACKUP_FILE}"
else
  echo "${LOG_PREFIX} Running pg_dump directly"
  PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DB}" \
    --format=custom \
    --compress=9 \
    > "${BACKUP_FILE}"
fi

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "${LOG_PREFIX} Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Verificar integridad del backup
echo "${LOG_PREFIX} Verifying backup integrity..."
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'postgres\|cannaclub'; then
  CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'postgres|cannaclub_postgres' | head -1)
  docker exec "${CONTAINER}" pg_restore --list /dev/null < "${BACKUP_FILE}" > /dev/null 2>&1 \
    && echo "${LOG_PREFIX} Integrity check: OK" \
    || echo "${LOG_PREFIX} WARNING: Integrity check failed — backup may be corrupted"
else
  pg_restore --list "${BACKUP_FILE}" > /dev/null 2>&1 \
    && echo "${LOG_PREFIX} Integrity check: OK" \
    || echo "${LOG_PREFIX} WARNING: Integrity check failed — backup may be corrupted"
fi

# Eliminar backups más antiguos que RETENTION_DAYS
echo "${LOG_PREFIX} Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "quickpanel360_*.dump" -mtime "+${RETENTION_DAYS}" -delete
REMAINING=$(find "${BACKUP_DIR}" -name "quickpanel360_*.dump" | wc -l)
echo "${LOG_PREFIX} Remaining backups: ${REMAINING}"

echo "${LOG_PREFIX} Backup complete — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo "IMPORTANTE: Copia este backup a almacenamiento externo (S3/R2/sftp)."
echo "Un backup solo en el mismo VPS NO es un backup seguro."
echo ""
echo "  Ejemplo con rclone:"
echo "  rclone copy ${BACKUP_FILE} r2:quickpanel360-backups/"
