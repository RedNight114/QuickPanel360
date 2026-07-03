# Rollback — QuickPanel360

**QuickAgence — QuickPanel360**

Este documento explica cómo volver a una versión anterior de forma segura.

---

## Regla fundamental

> **Nunca hagas rollback de código si la DB tiene cambios incompatibles
> con la versión anterior — primero evalúa si la migración es reversible.**

---

## Caso A — Rollback sin migración de DB

El caso más sencillo: el deploy tiene un bug pero no hay migraciones nuevas,
o las migraciones son aditivas (añaden columnas sin eliminar nada).

### Pasos

```bash
# 1. Identificar versión anterior
git tag --list | sort -V | tail -5
# → v0.1.0, v0.2.0, ...

# 2. Activar maintenance mode
# En .env.production: MAINTENANCE_MODE=true
docker compose -f docker-compose.prod.yml restart api

# 3. Volver al commit/tag anterior (opción Docker Compose)
git checkout v0.1.0
docker compose -f docker-compose.prod.yml --profile all build
docker compose -f docker-compose.prod.yml --profile all up -d

# 4. Verificar
curl https://api.tudominio.com/version
# → version: 0.1.0

curl https://api.tudominio.com/ready
# → status: ready

# 5. Desactivar maintenance mode
# En .env.production: MAINTENANCE_MODE=false
docker compose -f docker-compose.prod.yml restart api
```

### Con Coolify / Dokploy

1. Ir al panel de deploy.
2. Seleccionar el deployment anterior (o el tag `v0.1.0`).
3. Trigger redeploy.
4. Verificar `/version` y `/ready`.

---

## Caso B — Rollback con migración destructiva o incompatible

Si la versión nueva incluye migraciones que eliminan columnas, renombran tablas,
o cambian el esquema de forma incompatible con la versión anterior,
el rollback requiere restaurar también la base de datos.

### Pasos

```bash
# 1. Activar maintenance mode INMEDIATAMENTE
# En .env.production: MAINTENANCE_MODE=true
docker compose -f docker-compose.prod.yml restart api

# 2. Restaurar backup de la DB
# (el backup fue creado ANTES del deploy — ver checklist)
./scripts/restore/postgres-restore.sh ./backups/quickpanel360_YYYYMMDD_HHMMSS.dump

# 3. Volver al código anterior
git checkout v0.1.0
docker compose -f docker-compose.prod.yml --profile all build
docker compose -f docker-compose.prod.yml --profile all up -d

# 4. Verificar
curl https://api.tudominio.com/version    # → 0.1.0
curl https://api.tudominio.com/ready      # → database: connected

# 5. Probar módulos críticos (ver checklist de deploy)

# 6. Desactivar maintenance mode
# En .env.production: MAINTENANCE_MODE=false
docker compose -f docker-compose.prod.yml restart api
```

---

## Cómo evaluar si una migración es reversible

Una migración es **segura para rollback** si:
- Solo añade columnas con valores por defecto
- Solo añade índices
- Solo crea tablas nuevas

Una migración **NO es reversible** si:
- Elimina columnas
- Renombra columnas o tablas
- Cambia tipos de datos de forma incompatible
- Aplica constraints que datos existentes no cumplen

Para ver qué migraciones se han aplicado:

```sql
SELECT migration_name, applied_at
FROM _prisma_migrations
ORDER BY applied_at DESC;
```

---

## Checklist de rollback

| Campo | Valor |
|---|---|
| Fecha del incidente | |
| Versión en producción (fallida) | |
| Versión anterior (objetivo rollback) | |
| Backup disponible | Sí / No — fecha: |
| Migraciones aplicadas en versión fallida | |
| Las migraciones son reversibles | Sí / No |
| Plan: rollback solo código / código + DB | |
| Responsable | |
| Mantenimiento activado en | |
| Mantenimiento desactivado en | |
| Tiempo total de indisponibilidad | |

### Verificaciones post-rollback
- [ ] `/version` muestra la versión correcta
- [ ] `/ready` muestra `database: connected`, `redis: connected`
- [ ] Login OWNER funciona
- [ ] Login SUPERADMIN funciona
- [ ] Dashboard carga
- [ ] Punto de dispensación funciona
- [ ] Chat funciona
- [ ] No hay errores en logs / Sentry
