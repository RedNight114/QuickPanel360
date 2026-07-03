#!/usr/bin/env bash
# ============================================================
# QuickPanel360 — Tag Release
# QuickAgence
#
# Crea el tag de Git para la versión actual del package.json.
# NO hace push automáticamente — confirma antes.
#
# Uso: ./scripts/release/tag-release.sh
# ============================================================

set -euo pipefail

LOG_PREFIX="[QuickPanel360 Tag]"

VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
TAG="v${VERSION}"

echo ""
echo "${LOG_PREFIX} Preparando tag ${TAG}"

# Verificar que es un repo git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "${LOG_PREFIX} ERROR: No es un repositorio git."
  exit 1
fi

# Verificar que el working tree está limpio
DIRTY=$(git status --porcelain | wc -l | tr -d ' ')
if [[ "${DIRTY}" != "0" ]]; then
  echo "${LOG_PREFIX} ERROR: Working tree tiene cambios sin commit."
  echo "       Haz commit de todos los cambios antes de taggear."
  exit 1
fi

# Verificar que el tag no existe ya
if git tag --list "${TAG}" | grep -q "${TAG}"; then
  echo "${LOG_PREFIX} ERROR: El tag ${TAG} ya existe."
  echo "       Incrementa la versión primero con: node scripts/release/bump-version.js"
  exit 1
fi

# Leer CHANGELOG para el mensaje del tag
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT=$(git rev-parse --short HEAD)

echo ""
echo "  Versión:  ${VERSION}"
echo "  Tag:      ${TAG}"
echo "  Branch:   ${BRANCH}"
echo "  Commit:   ${COMMIT}"
echo ""
read -rp "¿Crear tag ${TAG} y hacer push? [s/N] " CONFIRM

if [[ "${CONFIRM}" != "s" && "${CONFIRM}" != "S" ]]; then
  echo "${LOG_PREFIX} Cancelado."
  exit 0
fi

# Crear tag anotado
git tag -a "${TAG}" -m "QuickPanel360 ${TAG}

Release ${VERSION} — QuickAgence
Branch: ${BRANCH}
Commit: ${COMMIT}

Ver CHANGELOG.md para detalles de los cambios."

echo "${LOG_PREFIX} Tag ${TAG} creado localmente."
echo ""
echo "  Para publicar el tag:"
echo "    git push origin ${TAG}"
echo ""
echo "  Para publicar el tag y la rama:"
echo "    git push origin ${BRANCH} && git push origin ${TAG}"
echo ""
echo "  Para deshacer el tag (ANTES de push):"
echo "    git tag -d ${TAG}"
