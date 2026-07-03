# Release vX.Y.Z — QuickPanel360

**QuickAgence — QuickPanel360**  
**Fecha**: YYYY-MM-DD  
**Responsable**: [nombre]  
**Canal**: stable / beta

---

## Resumen

> Breve descripción de qué incluye esta versión y por qué es importante.

---

## Cambios principales

### Añadido
- ...

### Cambiado
- ...

### Corregido
- ...

### Seguridad
- ...

---

## Migraciones incluidas

| Migración | Tabla(s) afectada(s) | Reversible |
|---|---|---|
| `TIMESTAMP_name` | | Sí / No |

> Si hay migraciones no reversibles → el rollback requiere restaurar backup de DB.

---

## Variables de entorno nuevas o modificadas

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `NUEVA_VAR` | Sí/No | | |

---

## Pasos de deploy

```bash
# 1. Backup
./scripts/backup/postgres-backup.sh

# 2. Maintenance mode (si aplica)
# MAINTENANCE_MODE=true → restart api

# 3. Pull / build
git pull origin main
docker compose -f docker-compose.prod.yml --profile all build

# 4. Migraciones
docker exec <api> npx prisma migrate deploy
docker exec <api> npx prisma generate

# 5. Up
docker compose -f docker-compose.prod.yml --profile all up -d

# 6. Verify
curl https://api.tudominio.com/version
curl https://api.tudominio.com/ready
```

---

## Checklist de verificación

- [ ] `/version` muestra `vX.Y.Z`
- [ ] `/ready` → `database: connected`, `redis: connected`
- [ ] Login OWNER
- [ ] Login SUPERADMIN
- [ ] Dashboard
- [ ] Punto de dispensación
- [ ] Caja
- [ ] Socios
- [ ] Inventario
- [ ] Portal del Socio
- [ ] Chat/WebSocket
- [ ] Notificaciones
- [ ] Mantenimiento desactivado (si estaba activo)

---

## Pruebas realizadas

| Test | Resultado |
|---|---|
| Login | ✅ / ❌ |
| Dashboard | ✅ / ❌ |
| POS | ✅ / ❌ |
| Chat WebSocket | ✅ / ❌ |
| Portal Socio | ✅ / ❌ |

---

## Riesgos

- ...

---

## Rollback

> Si hay problemas, sigue: [docs/deployment/rollback.md](rollback.md)

- Versión anterior: `vX.Y.(Z-1)`
- Backup disponible: Sí — `./backups/quickpanel360_YYYYMMDD_HHMMSS.dump`
- Migraciones reversibles: Sí / No

---

## Notas adicionales

- ...
