# Control de versiones y releases — QuickPanel360

**QuickAgence — QuickPanel360**

---

## Estrategia de ramas

```
main          → producción estable. Solo código revisado y testeado.
develop       → integración. PRs mergeados aquí antes de ir a main.
feature/*     → nuevas funcionalidades (rama base: develop).
fix/*         → correcciones menores (rama base: develop).
hotfix/*      → correcciones urgentes de producción (rama base: main).
release/*     → preparación de una versión antes de mergear a main.
```

### Flujo normal (feature)

```
develop → feature/mi-feature → PR → develop → PR → main → tag v0.2.0
```

### Flujo hotfix (bug crítico en producción)

```
main → hotfix/fix-login → PR → main → tag v0.1.1
                              → cherry-pick → develop
```

> El proyecto actualmente opera solo con `main`. Cuando el equipo crezca,
> añade `develop` y sigue este flujo. No fuerces la migración si trabajas solo.

---

## Versionado semántico (SemVer)

`MAJOR.MINOR.PATCH`

| Tipo | Cuándo | Ejemplo |
|------|--------|---------|
| `PATCH` | Bugfix sin cambio funcional | `0.1.0 → 0.1.1` |
| `MINOR` | Funcionalidad nueva compatible | `0.1.0 → 0.2.0` |
| `MAJOR` | Cambio incompatible o arquitectural | `0.9.0 → 1.0.0` |

**Regla**: `1.0.0` = primera versión comercial estable con cliente real.

---

## Cómo crear un release

### 1. Bump de versión

```bash
# Opciones: patch | minor | major | número exacto
node scripts/release/bump-version.js minor
# → actualiza package.json raíz + apps/api + apps/web
```

### 2. Actualizar CHANGELOG.md

```markdown
## [0.2.0] — YYYY-MM-DD
### Añadido
- ...
### Corregido
- ...
```

### 3. Release check completo

```bash
./scripts/release/release-check.sh
```

Ejecuta: lint + typecheck + build API + build Web + Prisma validate + Docker Compose validate.

### 4. Commit y tag

```bash
git add -A
git commit -m "chore: release v0.2.0"
./scripts/release/tag-release.sh
# → te pide confirmación antes de hacer push
```

### 5. Push

```bash
git push origin main
git push origin v0.2.0
```

---

## Verificar versión desplegada

```bash
# Desde fuera del servidor
curl https://api.tudominio.com/version
# → {"app":"QuickPanel360","version":"0.2.0","environment":"production","commitSha":"abc12345",...}

curl https://api.tudominio.com/health
# → {"status":"ok","version":"0.2.0",...}

curl https://api.tudominio.com/ready
# → {"status":"ready","version":"0.2.0","database":"connected","redis":"connected","maintenance":false,...}
```

También visible en **Platform Admin → Configuración → Sistema**.

---

## Variables de entorno de build/versión

| Variable | Dónde | Para qué |
|---|---|---|
| `APP_VERSION` | API | Versión en `/version` y `/health` |
| `GIT_SHA` / `GIT_COMMIT_SHA` | API | Commit SHA en `/version` |
| `BUILD_DATE` | API | Fecha de build en `/version` |
| `APP_ENV` | API | Entorno (production/staging) |
| `RELEASE_CHANNEL` | API | `stable` / `beta` |
| `NEXT_PUBLIC_APP_VERSION` | Web | Versión visible en footer/UI |
| `NEXT_PUBLIC_GIT_SHA` | Web | Commit SHA en UI |
| `NEXT_PUBLIC_BUILD_DATE` | Web | Fecha de build en UI |
| `NEXT_PUBLIC_APP_ENV` | Web | Entorno en UI |

### Cómo inyectarlas en Docker Compose

En `docker-compose.prod.yml`, el servicio `api` ya acepta `APP_VERSION`, `GIT_SHA` y `BUILD_DATE` como `args` del build. En CI/CD:

```yaml
# GitHub Actions / Coolify / Dokploy
APP_VERSION: ${{ github.ref_name }}          # v0.2.0
GIT_SHA: ${{ github.sha }}                   # abc123def456...
BUILD_DATE: ${{ steps.date.outputs.date }}   # 2026-07-03T10:00:00Z
```

---

## Docker tags recomendados

```
quickpanel360-api:0.2.0      → versión fija para producción
quickpanel360-api:latest     → staging / última versión
quickpanel360-web:0.2.0
quickpanel360-web:latest
```

**Regla**: en producción, usar siempre tag fijo (`0.2.0`), no `latest`.
`latest` puede cambiar sin aviso y romper rollbacks.

---

## Entornos

| Entorno | Uso | NODE_ENV | Logs | Datos |
|---|---|---|---|---|
| `development` | Local | `development` | Verbose | Fake/seed |
| `staging` | Pre-producción | `production` | Normal | Anonimizados |
| `production` | Clientes reales | `production` | Sin secretos | Reales |

Archivos de entorno:
- `apps/api/.env.example` — desarrollo
- `apps/api/.env.staging.example` — staging
- `apps/api/.env.production.example` — producción
