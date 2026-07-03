# Preproduccion

## Prisma drift

`prisma migrate dev` detecta drift historico en una migracion antigua aplicada. No usar `migrate reset` contra bases con datos.

Para preproduccion/produccion:

```sh
npx prisma generate
npx prisma migrate deploy
```

Pendiente: preparar un baseline limpio en una base nueva o reconciliar el historial en una ventana controlada.

## Backups

```sh
DATABASE_URL="postgresql://..." BACKUP_DIR=./backups scripts/backup-postgres.sh
DATABASE_URL="postgresql://..." scripts/restore-postgres.sh ./backups/cannaclub-YYYYMMDD-HHMMSS.sql.gz
```

## Observabilidad minima

- Monitorizar `GET /health`.
- Monitorizar `GET /health/db`.
- Alertar con Uptime Kuma si falla.
- Alertar si disco supera 80%.
- Revisar logs Docker con `docker compose -f docker-compose.prod.yml logs`.
