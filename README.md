# Cannaclub POS

POS (punto de venta) multi-tenant para clubes cannábicos, con una capa de plataforma SaaS para administrar a los distintos clubes (tenants), sus planes y módulos.

## Estructura del repo

```
cannaclub-pos/
├── apps/
│   ├── api/    # Backend: NestJS 11 + Prisma 6 + PostgreSQL
│   └── web/    # Frontend: Next.js (App Router) + React Query + Radix UI
├── packages/
│   └── shared/ # Reservado para código compartido entre apps (vacío por ahora)
├── docs/       # Notas de preproducción, drift de Prisma, backups
├── scripts/    # backup-postgres.sh / restore-postgres.sh
├── docker-compose.yml       # Postgres para desarrollo local
└── docker-compose.prod.yml  # Stack de producción (api + web + Caddy)
```

Cada app (`apps/api`, `apps/web`) tiene su propio `package.json`, `node_modules` y lockfile — no es un monorepo con workspaces, así que los comandos de npm se ejecutan dentro de cada carpeta.

## Dominio del negocio

- **Tenants / clubes**: cada club es un tenant aislado, con su propio plan, módulos habilitados y usuarios.
- **Socios (members)**: alta, clases (estándar/preferente/VIP), beneficios y descuentos asociados a su clase.
- **Inventario**: productos por gramos/kg con auditoría de cada cambio, mermas y umbrales de stock.
- **POS**: apertura/cierre de caja, ventas con conversión de peso y tolerancia de báscula configurable.
- **Caja y cuentas por cobrar**: movimientos de caja, sesiones, pagos pendientes de socios.
- **Terceros**: proveedores/colaboradores y pagos a terceros.
- **Plataforma (admin SaaS)**: gestión de tenants, planes, módulos por plan, facturación y soporte (incluye modo de impersonación para soporte).
- **Chat interno cifrado** entre usuarios del mismo tenant (E2E, AES-256-GCM).
- **Auditoría**: registro transaccional de cambios (`oldValue`/`newValue`) en los módulos de negocio.

## Requisitos

- Node.js 20+
- PostgreSQL 16 (o usa el `docker-compose.yml` incluido)

## Levantar el entorno de desarrollo

1. **Base de datos**

   ```sh
   docker compose up -d
   ```

2. **API** (puerto 3000 por defecto)

   ```sh
   cd apps/api
   cp .env.example .env   # ajusta los valores si hace falta
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run start:dev
   ```

3. **Web** (puerto 3001 si usas `next dev -p 3001`, o el que prefieras)

   ```sh
   cd apps/web
   cp .env.example .env.local   # apunta NEXT_PUBLIC_API_URL al puerto de la API
   npm install
   npm run dev
   ```

## Comandos útiles por app

### `apps/api`

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | API en modo watch |
| `npm run build` | Compila a `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Tests unitarios (Jest) |
| `npm run test:e2e` | Tests end-to-end (requiere DB) |
| `npm run prisma:migrate` | Aplica migraciones en desarrollo |
| `npm run prisma:studio` | Explorador visual de la base de datos |

### `apps/web`

| Comando | Qué hace |
|---|---|
| `npm run dev` | Next.js en modo desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run test:smoke` | Smoke tests con Playwright |

## CI

`.github/workflows/ci.yml` corre en cada push/PR: lint + `prisma validate` + build + tests unitarios para `api`, y lint + build para `web`.

## Producción

Ver `docker-compose.prod.yml`, `Caddyfile` y `docs/preproduction.md` (drift de Prisma, backups, observabilidad mínima).
