# Checklist de deploy a producción — QuickPanel360

**QuickAgence — QuickPanel360**

Usa este checklist en cada deploy. Marca cada punto antes de continuar.

---

## Antes del deploy

### Código y versión
- [ ] Branch es `main` (o la rama de release correcta)
- [ ] `git status` está limpio (no hay cambios sin commit)
- [ ] Tag de versión existe: `git tag --list | grep v`
- [ ] CHANGELOG.md está actualizado con los cambios de esta versión
- [ ] `./scripts/release/release-check.sh` ha pasado sin errores

### Base de datos
- [ ] Revisadas las migraciones nuevas en `apps/api/prisma/migrations/`
- [ ] Backup de PostgreSQL realizado: `./scripts/backup/postgres-backup.sh`
- [ ] Backup copiado a almacenamiento externo (S3/R2/sftp)
- [ ] Si la migración afecta tablas críticas → activar maintenance mode

### Entorno
- [ ] `.env.production` tiene todos los valores correctos
- [ ] `JWT_SECRET` no es el valor por defecto
- [ ] `CHAT_ENCRYPTION_KEY` está configurado
- [ ] `CORS_ORIGIN` apunta al dominio correcto
- [ ] `DATABASE_URL` apunta a la DB correcta
- [ ] `REDIS_URL` apunta a Redis correcto
- [ ] `SENTRY_DSN` configurado (si aplica)
- [ ] Espacio en disco suficiente: `df -h`

---

## Durante el deploy

### Mantenimiento (si la migración es crítica)
```bash
# Activar
MAINTENANCE_MODE=true en .env.production
docker compose -f docker-compose.prod.yml restart api

# Verificar
curl https://api.tudominio.com/ready
# → maintenance: true
```

### Pull y build
```bash
git pull origin main

# Opción A — Docker Compose
docker compose -f docker-compose.prod.yml --profile all build
docker compose -f docker-compose.prod.yml --profile all up -d

# Opción B — Coolify / Dokploy
# Trigger redeploy desde el panel
```

### Migraciones Prisma
```bash
# Ejecutar DENTRO del contenedor api, o con acceso a DATABASE_URL
docker exec <api-container> npx prisma migrate deploy
docker exec <api-container> npx prisma generate
```

> Ver: [prisma-migrations-production.md](prisma-migrations-production.md)

### Verificar logs
```bash
docker compose -f docker-compose.prod.yml logs -f api --tail=50
# Buscar: "Application listening on port"
# Buscar: errores de conexión DB o Redis
```

---

## Después del deploy

### Health checks
- [ ] `curl https://api.tudominio.com/health` → `status: ok`
- [ ] `curl https://api.tudominio.com/ready` → `status: ready`, `database: connected`, `redis: connected`
- [ ] `curl https://api.tudominio.com/version` → versión correcta (`0.2.0`)

### Login
- [ ] Login OWNER funciona
- [ ] Login SUPERADMIN funciona
- [ ] Login Socio (Portal) funciona

### Módulos críticos
- [ ] Dashboard carga sin errores
- [ ] Punto de dispensación — crear sesión y dispensar
- [ ] Caja — abrir y cerrar sesión
- [ ] Socios — buscar y ver perfil
- [ ] Inventario — listar productos
- [ ] Portal del Socio — acceder con código QR
- [ ] Chat — enviar y recibir mensaje en tiempo real
- [ ] Notificaciones — llegan al panel
- [ ] Workers (BullMQ) — revisar colas en logs

### Errores
- [ ] Sentry no muestra nuevos errores críticos (si está configurado)
- [ ] Logs de Docker sin errores 5xx inesperados

### Desactivar mantenimiento (si estaba activo)
```bash
MAINTENANCE_MODE=false en .env.production
docker compose -f docker-compose.prod.yml restart api
```

---

## Información del deploy (registrar)

| Campo | Valor |
|---|---|
| Fecha | |
| Versión anterior | |
| Versión nueva | |
| Responsable | |
| Migraciones aplicadas | Sí / No |
| Backup realizado | Sí / No |
| Incidencias durante deploy | |
| Tiempo de mantenimiento | |
