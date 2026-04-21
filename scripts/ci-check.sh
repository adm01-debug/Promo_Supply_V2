#!/usr/bin/env bash
set -euo pipefail

echo "▶ [1/8] Removing node_modules..."
rm -rf node_modules

echo "▶ [2/8] Installing from frozen lockfile..."
bun install --frozen-lockfile

echo "▶ [3/8] Verifying date-fns subpath files exist on disk..."
node scripts/verify-datefns-files.mjs

echo "▶ [4/8] Type-checking source with tsc --noEmit..."
npx tsc --noEmit -p tsconfig.app.json

echo "▶ [5/8] Regenerating date-fns smoke test from src/ usage..."
node scripts/generate-datefns-smoke-test.mjs

echo "▶ [6/8] Type-checking again (includes regenerated smoke test)..."
npx tsc --noEmit -p tsconfig.app.json

echo "▶ [7/8] Running date-fns smoke test..."
npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose

echo "▶ [8/8] Writing public/dependency-health.json snapshot..."
NOW="$(date -u +%FT%TZ)"
SPEC="$(node -p "require('./package.json').dependencies['date-fns'] || require('./package.json').devDependencies['date-fns'] || ''")"
INSTALLED="$(node -p "require('./node_modules/date-fns/package.json').version")"
LOCKED="$(grep -A1 '"date-fns"' bun.lock 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"
EXACT="$(node -p "/^[0-9]/.test(require('./package.json').dependencies['date-fns'] || '') ? 'true' : 'false'")"

mkdir -p public
cat > public/dependency-health.json <<JSON
{
  "generatedAt": "${NOW}",
  "dateFns": {
    "spec": "${SPEC}",
    "installed": "${INSTALLED}",
    "locked": "${LOCKED}",
    "exactPinned": ${EXACT}
  },
  "lockfileDrift": {
    "detected": false,
    "lastCheckedAt": "${NOW}",
    "source": "bun install --frozen-lockfile"
  }
}
JSON

echo "✅ CI check passed: clean install + file verify + type-check green."
