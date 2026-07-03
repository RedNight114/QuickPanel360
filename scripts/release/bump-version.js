#!/usr/bin/env node
// ============================================================
// QuickPanel360 — Bump Version
// QuickAgence
//
// Actualiza la versión en todos los package.json del monorepo
// de forma sincronizada.
//
// Uso:
//   node scripts/release/bump-version.js 0.2.0
//   node scripts/release/bump-version.js patch    (0.1.0 → 0.1.1)
//   node scripts/release/bump-version.js minor    (0.1.0 → 0.2.0)
//   node scripts/release/bump-version.js major    (0.1.0 → 1.0.0)
// ============================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PACKAGE_FILES = [
  path.join(ROOT, 'package.json'),
  path.join(ROOT, 'apps', 'api', 'package.json'),
  path.join(ROOT, 'apps', 'web', 'package.json'),
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function parseSemver(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function bumpVersion(current, bump) {
  const [major, minor, patch] = parseSemver(current);
  switch (bump) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default:
      // If it's a valid semver string, use it directly
      parseSemver(bump); // throws if invalid
      return bump;
  }
}

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/release/bump-version.js <version|patch|minor|major>');
  process.exit(1);
}

const rootPkg = readJson(PACKAGE_FILES[0]);
const currentVersion = rootPkg.version;
const newVersion = bumpVersion(currentVersion, arg);

console.log(`\nQuickPanel360 — Bump Version`);
console.log(`  ${currentVersion} → ${newVersion}\n`);

for (const file of PACKAGE_FILES) {
  const pkg = readJson(file);
  pkg.version = newVersion;
  writeJson(file, pkg);
  console.log(`  ✓ Updated ${path.relative(ROOT, file)}`);
}

console.log(`\nVersión actualizada a ${newVersion}.`);
console.log(`\nPróximos pasos:`);
console.log(`  1. Actualiza CHANGELOG.md con los cambios de esta versión`);
console.log(`  2. Haz commit: git add -A && git commit -m "chore: release v${newVersion}"`);
console.log(`  3. Tagea: ./scripts/release/tag-release.sh`);
