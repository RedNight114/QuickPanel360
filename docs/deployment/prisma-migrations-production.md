# Migraciones Prisma en producción — QuickPanel360

**QuickAgence — QuickPanel360**

---

## Reglas absolutas

| ✅ Hacer | ❌ Nunca hacer |
|---|---|
| `prisma migrate deploy` | `prisma migrate reset` |
| `prisma generate` | `db push` en producción |
| Backup antes de migrar | Borrar migraciones aplicadas |
| Maintenance mode si la migración es crítica | Editar migraciones ya aplicadas |
| Revisar el SQL de la migración antes | Crear migración directamente en prod |

---

## Flujo estándar de migración

### 1. Desarrollo

```bash
# Modificar schema.prisma
# Crear migración en local:
cd apps/api
npx prisma migrate dev --name describe_your_change
# → crea apps/api/prisma/migrations/TIMESTAMP_describe_your_change/migration.sql
```

### 2. Revisión

```bash
# Revisar el SQL generado
cat apps/api/prisma/migrations/*/migration.sql | tail -50

# Verificar que el schema es válido
npx prisma validate

# Commit la migración junto con el schema
git add prisma/migrations/ prisma/schema.prisma
git commit -m "feat: add <description> migration"
```

### 3. Deploy en producción

```bash
# ANTES: hacer backup
./scripts/backup/postgres-backup.sh

# ANTES: activar maintenance mode si la migración afecta tablas críticas
# (PosSession, Sale, Member, ChatMessage — cualquier tabla con writes frecuentes)

# Aplicar migraciones (NO reset, NO dev):
docker exec <api-container> npx prisma migrate deploy

# Regenerar cliente Prisma
docker exec <api-container> npx prisma generate

# Levantar nueva versión de la API
docker compose -f docker-compose.prod.yml restart api

# Verificar
curl https://api.tudominio.com/ready
```

---

## Cómo manejar migraciones problemáticas

### Migración lenta (tabla grande)

Si una migración añade un índice o modifica una columna en una tabla con
millones de filas, puede bloquear la DB durante minutos.

Estrategia:
1. Activar maintenance mode
2. Ejecutar `migrate deploy`
3. Monitorizar con `pg_stat_activity`
4. Desactivar maintenance mode cuando termine

```sql
-- Ver queries activos durante la migración
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
```

### Migración que elimina columnas

Prisma no genera automáticamente `DROP COLUMN` a menos que sea explícito.
Si ves `DROP COLUMN` en el SQL de una migración:

1. Haz backup
2. Verifica que la columna no la usa el código en producción
3. Si es crítico, activa maintenance mode durante la migración

### Schema drift (DB y código desincronizados)

Si `prisma migrate deploy` dice que hay drift:

```bash
# Ver el estado de las migraciones
docker exec <api-container> npx prisma migrate status

# Si hay tablas creadas fuera de Prisma:
docker exec <api-container> npx prisma migrate resolve --applied "migration_name"
```

---

## Verificar migraciones aplicadas

```bash
# Desde el contenedor
docker exec <api-container> npx prisma migrate status

# Directamente en PostgreSQL
docker exec <postgres-container> psql -U cannaclub -d cannaclub_db \
  -c "SELECT migration_name, applied_at FROM _prisma_migrations ORDER BY applied_at DESC LIMIT 10;"
```

---

## Convenciones de nombre

```
TIMESTAMP_add_<tabla>_<campo>
TIMESTAMP_create_<tabla>
TIMESTAMP_add_index_<tabla>_<campos>
TIMESTAMP_rename_<campo>
```

Ejemplos:
- `20260703120000_add_member_notes`
- `20260703130000_create_platform_maintenance`
- `20260703140000_add_index_sale_tenantid_createdat`
