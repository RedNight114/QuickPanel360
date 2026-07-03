# QuickPanel360 â€” API

Backend NestJS del POS multi-tenant para clubes cannÃ¡bicos. PostgreSQL vÃ­a Prisma, autenticaciÃ³n JWT, WebSockets (chat) y throttling global.

Ver el README de la raÃ­z del repo para una visiÃ³n general del proyecto y cÃ³mo levantar API + Web juntos.

## Setup

```sh
cp .env.example .env   # ajusta los valores, ver detalle de cada variable en el propio archivo
npm install
npm run prisma:generate
npm run prisma:migrate
```

## Ejecutar

```sh
npm run start:dev     # modo desarrollo (watch)
npm run start         # modo normal
npm run start:prod    # sirve dist/ (tras `npm run build`)
```

## Tests

```sh
npm test           # unitarios (Jest)
npm run test:cov   # con cobertura
npm run test:e2e   # end-to-end (requiere base de datos disponible)
```

## Prisma

```sh
npm run prisma:migrate   # aplica migraciones en desarrollo
npm run prisma:studio    # explorador visual de la base de datos
npm run prisma:seed      # datos de prueba (prisma/seed.ts)
```

## Variables de entorno

Ver `.env.example`. Las crÃ­ticas en producciÃ³n son `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN` y `CHAT_ENCRYPTION_KEY` (si no se define, el chat cae a una clave de desarrollo incluida en el cÃ³digo â€” no usar asÃ­ en producciÃ³n).

## Estructura de mÃ³dulos (`src/`)

Auth, users, tenants, permissions, members (+ descuentos por clase), products, inventory, pos, cash, receivables, third-parties, third-party-payments, platform (admin SaaS: tenants/planes/mÃ³dulos/facturaciÃ³n/soporte), chat (mensajerÃ­a cifrada E2E), audit, security, health, dashboard, settings.

