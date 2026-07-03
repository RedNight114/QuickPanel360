# Changelog — QuickPanel360

Todos los cambios notables de QuickPanel360 se documentan en este archivo.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versionado según [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

> Cambios en desarrollo que aún no tienen versión asignada.

---

## [0.1.0] — 2026-07-03

Primera versión interna completa de QuickPanel360.
Incluye el núcleo del SaaS multitenant para clubes, listo para despliegue en VPS.

### Añadido

#### Plataforma SaaS
- Sistema multitenant completo con aislamiento por `tenantId`
- Platform Admin para gestión de empresas, planes, módulos, facturación y soporte
- Sistema de módulos con control granular por plan (Starter / Pro) y por tenant
- Planes y suscripciones con fechas de expiración y renovación
- Leads y onboarding de nuevos clubs
- Facturación interna con facturas, cobros y colecciones
- Cuentas de clubs con saldo y historial de actividad
- Emergencias por club con bloqueo de acceso

#### Panel de club
- Dashboard con resumen de actividad, métricas y accesos rápidos
- Punto de dispensación (POS) con sesiones, control de stock y ventas
- Caja con apertura/cierre de sesión, movimientos y cuadre
- Socios: registro, búsqueda, estados, clases, créditos y acceso QR
- Inventario de productos con categorías, umbrales y ajustes
- Dispensaciones (ventas) con historial y sumarios por socio
- Analítica con gráficos de actividad, ingresos y top socios
- Centro de avisos (notificaciones internas)
- Chat interno entre usuarios del club (E2E cifrado)
- Seguridad: roles, permisos, auditoría de accesos
- Ajustes del club: branding, colores, acceso del portal del socio, categorías

#### Portal del Socio
- Acceso por QR / código de acceso independiente del panel
- Vista de saldo de créditos e historial de dispensaciones
- Recompensas y gamificación básica

#### Infraestructura
- NestJS 10 + Prisma 5 + PostgreSQL 16
- Redis 7 para caché, colas (BullMQ) y WebSocket adapter
- Socket.io con Redis adapter para escalado multi-instancia
- Docker Compose para desarrollo y producción
- Caddy como reverse proxy con TLS automático
- Modo mantenimiento global por variable de entorno
- Healthchecks (`/health`, `/ready`, `/version`)
- Graceful shutdown (SIGTERM / SIGINT)
- Sentry opcional para monitoreo de errores
- Variables de entorno separadas por entorno (dev / staging / prod)
- Scripts de backup y restore de PostgreSQL
- Documentación de escalado 1 VPS → 2 VPS

#### Seguridad
- JWT con expiración configurable
- Chat cifrado con rotación de claves
- Permisos granulares por rol
- Rate limiting con mensajes en español
- Headers de seguridad (Helmet + Caddy)
- Validación de payload con whitelist estricta
- Logs sin secretos en producción

### Cambiado

- Marca visible actualizada de "Cannaclub POS" a "QuickPanel360 by QuickAgence"
- Terminología visible: Dispensación, Colaborador, Socio, Créditos/CR, Aportación

### Pendiente para 0.2.0

- Integración con Cloudflare R2 para almacenamiento de archivos
- Staging environment completo
- GitHub Actions con deploy automatizado a VPS
- PgBouncer para pools de conexión en producción
- Tests E2E completos
