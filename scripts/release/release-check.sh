#!/usr/bin/env bash
# ============================================================
# QuickPanel360 — Release Check
# QuickAgence
#
# Ejecuta todas las validaciones necesarias antes de un release.
# Uso: ./scripts/release/release-check.sh
# ============================================================

set -euo pipefail

LOG_PREFIX="[QuickPanel360 Release Check]"
ERRORS=0

pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; ERRORS=$((ERRORS + 1)); }
section() { echo ""; echo "${LOG_PREFIX} $1"; }

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  QuickPanel360 — Release Check                          ║"
echo "║  QuickAgence                                             ║"
echo "╚══════════════════════════════════════════════════════════╝"

# ── Versión ───────────────────────────────────────────────────
section "Version"
ROOT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "error")
API_VERSION=$(node -p "require('./apps/api/package.json').version" 2>/dev/null || echo "error")
WEB_VERSION=$(node -p "require('./apps/web/package.json').version" 2>/dev/null || echo "error")

echo "  Root:    ${ROOT_VERSION}"
echo "  API:     ${API_VERSION}"
echo "  Web:     ${WEB_VERSION}"

if [[ "${ROOT_VERSION}" == "${API_VERSION}" && "${ROOT_VERSION}" == "${WEB_VERSION}" ]]; then
  pass "Versiones sincronizadas (${ROOT_VERSION})"
else
  fail "Versiones desincronizadas — ejecuta: node scripts/release/bump-version.js <version>"
fi

# ── Git status ────────────────────────────────────────────────
section "Git"
if git rev-parse --git-dir > /dev/null 2>&1; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  echo "  Branch: ${BRANCH}"

  DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [[ "${DIRTY}" == "0" ]]; then
    pass "Working tree limpio"
  else
    fail "Working tree tiene cambios sin commit (${DIRTY} archivos)"
  fi

  TAG_EXISTS=$(git tag --list "v${ROOT_VERSION}" 2>/dev/null)
  if [[ -z "${TAG_EXISTS}" ]]; then
    pass "Tag v${ROOT_VERSION} no existe todavía (listo para crear)"
  else
    fail "Tag v${ROOT_VERSION} ya existe — incrementa la versión"
  fi
else
  echo "  (no es un repositorio git — omitiendo checks de git)"
fi

# ── Prisma ────────────────────────────────────────────────────
section "Prisma"
cd apps/api
if npx prisma validate --schema=prisma/schema.prisma > /dev/null 2>&1; then
  pass "Schema Prisma válido"
else
  fail "Schema Prisma inválido"
fi

if npx prisma generate > /dev/null 2>&1; then
  pass "Prisma generate OK"
else
  fail "Prisma generate falló"
fi
cd ../..

# ── API ───────────────────────────────────────────────────────
section "API (lint + typecheck + build)"
cd apps/api

if npm run lint -- --max-warnings=0 > /dev/null 2>&1; then
  pass "Lint API OK"
else
  fail "Lint API con warnings o errores"
fi

if npx tsc --noEmit > /dev/null 2>&1; then
  pass "TypeScript API OK"
else
  fail "TypeScript API con errores"
fi

if npm run build > /dev/null 2>&1; then
  pass "Build API OK"
else
  fail "Build API falló"
fi
cd ../..

# ── Web ───────────────────────────────────────────────────────
section "Web (lint + typecheck + build)"
cd apps/web

if npm run lint > /dev/null 2>&1; then
  pass "Lint Web OK"
else
  fail "Lint Web con warnings o errores"
fi

if npx tsc --noEmit > /dev/null 2>&1; then
  pass "TypeScript Web OK"
else
  fail "TypeScript Web con errores"
fi

if NEXT_PUBLIC_API_URL=http://localhost:3000 NEXT_PUBLIC_APP_NAME=QuickPanel360 npm run build > /dev/null 2>&1; then
  pass "Build Web OK"
else
  fail "Build Web falló"
fi
cd ../..

# ── Docker Compose ────────────────────────────────────────────
section "Docker Compose"
if command -v docker > /dev/null 2>&1; then
  if POSTGRES_PASSWORD=test docker compose -f docker-compose.prod.yml config --quiet > /dev/null 2>&1; then
    pass "docker-compose.prod.yml válido"
  else
    fail "docker-compose.prod.yml inválido"
  fi
else
  echo "  (Docker no disponible — omitiendo)"
fi

# ── Resultado ─────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════"
if [[ "${ERRORS}" -eq 0 ]]; then
  echo "  ✅ Release check PASADO — listo para v${ROOT_VERSION}"
  echo ""
  echo "  Siguiente paso:"
  echo "    ./scripts/release/tag-release.sh"
else
  echo "  ❌ Release check FALLIDO — ${ERRORS} error(s) encontrado(s)"
  echo ""
  echo "  Corrige los errores antes de continuar."
  exit 1
fi
echo "══════════════════════════════════════════════════════════"
echo ""
