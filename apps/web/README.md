# QuickPanel360 â€” Web

Frontend en Next.js (App Router) del POS multi-tenant para clubes cannÃ¡bicos. Consume la API en `apps/api` vÃ­a `NEXT_PUBLIC_API_URL`.

Stack: Next.js 15, React 19, React Query (TanStack), React Hook Form + Zod, Radix UI / shadcn, Tailwind CSS, Socket.io-client (chat en tiempo real), Playwright (smoke tests).

## Rutas principales (`src/app`)

- `login`, `access/[token]` â€” autenticaciÃ³n y enlaces de acceso de un solo uso.
- `dashboard` â€” resumen general.
- `pos` â€” punto de venta.
- `inventory`, `products` â€” inventario y catÃ¡logo de productos.
- `members` â€” gestiÃ³n de socios.
- `cash`, `receivables`, `third-party-payments` â€” caja, cuentas por cobrar y pagos a terceros.
- `chat` â€” mensajerÃ­a interna cifrada.
- `audit` â€” historial de auditorÃ­a.
- `security`, `emergency-locked` â€” seguridad y bloqueo de emergencia.
- `settings`, `users` â€” configuraciÃ³n del tenant y usuarios.
- `platform/*` (`tenants`, `plans`, `modules`, `support`, `emergencies`, `audit`) â€” panel de administraciÃ³n de la plataforma SaaS (multi-tenant).

## Desarrollo

```sh
cp .env.example .env.local   # ajusta NEXT_PUBLIC_API_URL si tu API no corre en :3000
npm install
npm run dev
```

## Comandos

| Comando | QuÃ© hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producciÃ³n |
| `npm run start` | Sirve el build de producciÃ³n |
| `npm run lint` | ESLint |
| `npm run test:smoke` | Smoke tests end-to-end con Playwright (requiere la API y la web corriendo) |

## Variables de entorno

Ver `.env.example`. La principal es `NEXT_PUBLIC_API_URL`, que debe apuntar a la URL de `apps/api`.

