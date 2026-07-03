# Escalar QuickPanel360: 1 VPS → 2 VPS

**QuickAgence — QuickPanel360**

Esta guía explica cómo mover PostgreSQL y Redis a un segundo VPS (VPS2) sin
cambiar código. Solo se modifican variables de entorno y configuración Docker.

---

## Arquitectura objetivo

```
VPS1 — Aplicación               VPS2 — Datos
─────────────────────           ─────────────────────
api (NestJS)                    postgres:5432
web (Next.js)                   redis:6379
caddy (Nginx/proxy)
```

**Comunicación**: VPS1 → VPS2 por red privada (IP privada del proveedor).
PostgreSQL y Redis NO están expuestos a internet.

---

## Prerrequisitos

- [ ] Acceso SSH a ambos VPS
- [ ] Red privada entre VPS1 y VPS2 (Hetzner/DO/Vultr la ofrecen por defecto)
- [ ] Docker y Docker Compose instalados en ambos VPS
- [ ] Backup reciente de la base de datos (¡NO omitir!)
- [ ] Tiempo estimado: 30–60 minutos de mantenimiento

---

## Paso 1 — Activar modo mantenimiento

En VPS1, editar `apps/api/.env.production`:

```bash
MAINTENANCE_MODE=true
MAINTENANCE_MESSAGE=Realizando mejoras en la infraestructura. Volvemos en breve.
MAINTENANCE_ESTIMATED_END=2025-01-15T10:00:00Z
```

Reiniciar la API para aplicar:

```bash
docker compose -f docker-compose.prod.yml --profile all restart api
```

Verificar:

```bash
curl https://api.tudominio.com/health
# {"status":"ok","service":"quickpanel360-api",...}

curl https://api.tudominio.com/ready
# {"status":"ready","database":"connected","redis":"connected","maintenance":true,...}

curl https://api.tudominio.com/auth/login -X POST -H 'Content-Type: application/json' \
  -d '{"email":"x@x.com","password":"x"}'
# {"statusCode":503,"message":"QuickPanel360 está en mantenimiento temporal.","maintenance":true}
```

---

## Paso 2 — Hacer backup de PostgreSQL

```bash
# En VPS1
./scripts/backup/postgres-backup.sh

# El backup se guarda en ./backups/quickpanel360_YYYYMMDD_HHMMSS.dump
# Copia a un lugar seguro (local, S3, R2):
scp ./backups/quickpanel360_*.dump user@vps2:/tmp/
```

---

## Paso 3 — Preparar VPS2

### Instalar Docker en VPS2

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

### Copiar docker-compose y env al VPS2

```bash
# Desde tu máquina local o VPS1
scp docker-compose.prod.yml user@vps2:~/quickpanel360/
```

O crear solo el compose de datos en VPS2:

```yaml
# ~/quickpanel360/docker-compose.prod.yml en VPS2
# (o usar el mismo con --profile data)
```

### Variables de entorno en VPS2

Crear `~/quickpanel360/.env.data` en VPS2:

```bash
POSTGRES_USER=cannaclub
POSTGRES_PASSWORD=TU_PASSWORD_SEGURA
POSTGRES_DB=cannaclub_db
REDIS_MAX_MEMORY=512mb
```

---

## Paso 4 — Iniciar servicios de datos en VPS2

```bash
# En VPS2
cd ~/quickpanel360
docker compose -f docker-compose.prod.yml --profile data up -d

# Verificar que están corriendo
docker compose -f docker-compose.prod.yml ps
```

---

## Paso 5 — Restaurar la base de datos en VPS2

```bash
# En VPS2, con el dump copiado en /tmp/
POSTGRES_HOST=localhost \
POSTGRES_USER=cannaclub \
POSTGRES_PASSWORD=TU_PASSWORD \
POSTGRES_DB=cannaclub_db \
./scripts/restore/postgres-restore.sh /tmp/quickpanel360_YYYYMMDD_HHMMSS.dump
```

Verificar la restauración:

```bash
docker exec $(docker ps -qf name=postgres) \
  psql -U cannaclub -d cannaclub_db -c "\dt" | head -20
```

---

## Paso 6 — Configurar firewall en VPS2

**Solo permitir acceso desde VPS1 a puertos de datos:**

```bash
# En VPS2 — usando ufw
ufw default deny incoming
ufw allow ssh
ufw allow from VPS1_PRIVATE_IP to any port 5432   # PostgreSQL solo desde VPS1
ufw allow from VPS1_PRIVATE_IP to any port 6379   # Redis solo desde VPS1
ufw enable

# Verificar
ufw status verbose
```

> ⚠️ Reemplaza `VPS1_PRIVATE_IP` con la IP privada real de VPS1.

---

## Paso 7 — Actualizar DATABASE_URL y REDIS_URL en VPS1

En VPS1, editar `apps/api/.env.production`:

```bash
# Antes (VPS único):
DATABASE_URL=postgresql://cannaclub:PASS@postgres:5432/cannaclub_db?schema=public&connection_limit=50&pool_timeout=10
REDIS_URL=redis://redis:6379

# Después (2 VPS — usar IP privada de VPS2):
DATABASE_URL=postgresql://cannaclub:PASS@10.0.0.2:5432/cannaclub_db?schema=public&connection_limit=50&pool_timeout=10
REDIS_URL=redis://10.0.0.2:6379
```

> Obtén la IP privada de VPS2 en el panel de tu proveedor (Hetzner: red privada, DO: private networking).

---

## Paso 8 — Reiniciar servicios de aplicación en VPS1 (solo perfil app)

```bash
# En VPS1 — parar todos los servicios
docker compose -f docker-compose.prod.yml --profile all down

# Arrancar solo los servicios de aplicación (sin postgres ni redis)
docker compose -f docker-compose.prod.yml --profile app up -d
```

---

## Paso 9 — Verificar que todo funciona

```bash
# Health básico
curl https://api.tudominio.com/health

# Readiness (debe mostrar database:connected y redis:connected)
curl https://api.tudominio.com/ready

# Versión
curl https://api.tudominio.com/version
```

---

## Paso 10 — Desactivar modo mantenimiento

En VPS1, editar `apps/api/.env.production`:

```bash
MAINTENANCE_MODE=false
MAINTENANCE_MESSAGE=
MAINTENANCE_ESTIMATED_END=
```

Reiniciar la API:

```bash
docker compose -f docker-compose.prod.yml --profile app restart api
```

Verificar que el login funciona:

```bash
curl https://api.tudominio.com/auth/login -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@tuclub.com","password":"contraseña"}'
# Debe devolver accessToken
```

---

## Paso 11 — Limpieza (después de verificar 24–48h)

Solo cuando estés seguro de que todo funciona en VPS2:

```bash
# En VPS1 — parar postgres y redis del VPS único
docker compose -f docker-compose.prod.yml stop postgres redis
docker compose -f docker-compose.prod.yml rm postgres redis

# Opcionalmente, borrar los volúmenes locales de datos
# (SOLO si tienes confirmado que VPS2 está funcionando bien)
docker volume rm quickpanel360_postgres_data
docker volume rm quickpanel360_redis_data
```

> **No borres los volúmenes en VPS1 hasta tener al menos 48h de operación estable en VPS2.**

---

## Checklist completo

### Antes de empezar
- [ ] Backup de PostgreSQL hecho y copiado a lugar seguro
- [ ] VPS2 preparado con Docker instalado
- [ ] Red privada entre VPS1 y VPS2 configurada
- [ ] IPs privadas anotadas

### Durante la migración
- [ ] `MAINTENANCE_MODE=true` activado
- [ ] Usuarios notificados (si aplica)
- [ ] PostgreSQL restaurado en VPS2 y verificado
- [ ] Redis arrancado en VPS2
- [ ] Firewall VPS2 configurado (solo VPS1 puede acceder a 5432 y 6379)
- [ ] `DATABASE_URL` actualizada en VPS1 con IP privada de VPS2
- [ ] `REDIS_URL` actualizada en VPS1 con IP privada de VPS2
- [ ] Servicios de aplicación reiniciados en VPS1 con perfil `app`

### Verificación post-migración
- [ ] `GET /health` responde `ok`
- [ ] `GET /ready` muestra `database:connected` y `redis:connected`
- [ ] Login funciona
- [ ] Chat en tiempo real funciona (WebSocket → Redis adapter)
- [ ] Colas BullMQ funcionan (notificaciones, etc.)
- [ ] `MAINTENANCE_MODE=false` desactivado

### Limpieza (después de 24–48h estables)
- [ ] Volúmenes de postgres y redis en VPS1 eliminados
- [ ] Documentación interna actualizada con la nueva arquitectura

---

## Variables de entorno resumidas

| Variable | VPS único | 2 VPS |
|---|---|---|
| `DATABASE_URL` | `...@postgres:5432/...` | `...@PRIVATE_IP_VPS2:5432/...` |
| `REDIS_URL` | `redis://redis:6379` | `redis://PRIVATE_IP_VPS2:6379` |
| `MAINTENANCE_MODE` | `false` | `true` durante migración |

**No se necesitan cambios de código.** Solo variables de entorno.

---

## Soporte

- Documentación: `docs/deployment/`
- Scripts: `scripts/backup/`, `scripts/restore/`
- Health API: `GET /health`, `GET /ready`, `GET /version`
