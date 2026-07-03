#!/usr/bin/env bash
# ============================================================
# QuickPanel360 — PostgreSQL Restore
# QuickAgence
#
# USO: ./scripts/restore/postgres-restore.sh /ruta/al/backup.dump
#
# ADVERTENCIA: Este script SOBREESCRIBE la base de datos existente.
# Úsalo solo cuando sepas exactamente lo que estás haciendo.
# ============================================================

set -euo pipefail

BACKUP_FILE="${1:-}"
POSTGRES_USER="${POSTGRES_USER:-cannaclub}"
POSTGRES_DB="${POSTGRES_DB:-cannaclub_db}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
LOG_PREFIX="[QuickPanel360 Restore]"

# ── Validaciones ─────────────────────────────────────────────
if [[ -z "${BACKUP_FILE}" ]]; then
  echo "${LOG_PREFIX} ERROR: Debes especificar la ruta al archivo de backup."
  echo ""
  echo "  Uso: $0 /ruta/al/backup.dump"
  echo ""
  echo "  Backups disponibles en ./backups/:"
  ls -lh ./backups/*.dump 2>/dev/null || echo "  (ninguno encontrado)"
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "${LOG_PREFIX} ERROR: El archivo '${BACKUP_FILE}' no existe."
  exit 1
fi

# ── Confirmación explícita ───────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ATENCIÓN: RESTORE DE BASE DE DATOS                         ║"
echo "║                                                              ║"
echo "║  Esto SOBREESCRIBIRÁ la base de datos:                      ║"
echo "║    ${POSTGRES_DB} en ${POSTGRES_HOST}:${POSTGRES_PORT}"
printf "║  %-62s║\n" ""
echo "║  Con el backup:                                              ║"
printf "║    %-60s║\n" "$(basename "${BACKUP_FILE}")"
echo "║                                                              ║"
echo "║  Asegúrate de que:                                           ║"
echo "║    1. MAINTENANCE_MODE=true está activado                    ║"
echo "║    2. No hay usuarios activos                                 ║"
echo "║    3. Tienes un backup reciente de la DB actual              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
read -rp "Escribe 'CONFIRMO' en mayúsculas para continuar: " CONFIRM

if [[ "${CONFIRM}" != "CONFIRMO" ]]; then
  echo "${LOG_PREFIX} Restore cancelado."
  exit 0
fi

echo ""
echo "${LOG_PREFIX} Starting restore — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "${LOG_PREFIX} Backup file: ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

# ── Restaurar ────────────────────────────────────────────────
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'postgres\|cannaclub'; then
  CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'postgres|cannaclub_postgres' | head -1)
  echo "${LOG_PREFIX} Using Docker container: ${CONTAINER}"

  # Copiar el dump al contenedor
  docker cp "${BACKUP_FILE}" "${CONTAINER}:/tmp/restore.dump"

  # Terminar conexiones activas y restaurar
  docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-}" "${CONTAINER}" bash -c "
    psql -U ${POSTGRES_USER} -d postgres -c \"
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();
    \" && \
    dropdb -U ${POSTGRES_USER} --if-exists ${POSTGRES_DB} && \
    createdb -U ${POSTGRES_USER} ${POSTGRES_DB} && \
    pg_restore \
      --host=localhost \
      --username=${POSTGRES_USER} \
      --dbname=${POSTGRES_DB} \
      --no-owner \
      --no-acl \
      --verbose \
      /tmp/restore.dump
  "
else
  echo "${LOG_PREFIX} Running pg_restore directly"
  PGPASSWORD="${POSTGRES_PASSWORD:-}" psql \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="postgres" \
    --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();"

  PGPASSWORD="${POSTGRES_PASSWORD:-}" dropdb \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --if-exists "${POSTGRES_DB}"

  PGPASSWORD="${POSTGRES_PASSWORD:-}" createdb \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    "${POSTGRES_DB}"

  PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_restore \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DB}" \
    --no-owner \
    --no-acl \
    --verbose \
    "${BACKUP_FILE}"
fi

echo ""
echo "${LOG_PREFIX} Restore complete — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo "Próximos pasos:"
echo "  1. Ejecuta GET /ready para verificar que la DB responde"
echo "  2. Prueba el login"
echo "  3. Desactiva MAINTENANCE_MODE=false y reinicia la API"
