#!/usr/bin/env bash
set -euo pipefail

echo "▶ [1/9] Removing node_modules..."
rm -rf node_modules

echo "▶ [2/9] Evicting any cached date-fns tarballs..."
rm -rf "${BUN_INSTALL:-$HOME/.bun}/install/cache/date-fns"* 2>/dev/null || true
rm -rf "$HOME"/.npm/_cacache/content-v2/**/date-fns-* 2>/dev/null || true

echo "▶ [3/9] Installing from frozen lockfile..."
bun install --frozen-lockfile

echo "▶ [4/9] Confirming installed date-fns version matches lockfile..."
INSTALLED="$(node -p "require('./node_modules/date-fns/package.json').version")"
LOCKED="$(grep -A1 '"date-fns"' bun.lock 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"
if [ -n "$LOCKED" ] && [ "$INSTALLED" != "$LOCKED" ]; then
  echo "✗ date-fns drift: installed=$INSTALLED, locked=$LOCKED" >&2
  exit 1
fi
echo "✓ date-fns $INSTALLED matches lockfile."

echo "▶ [5/10] Printing install verification report..."
node scripts/install-report.mjs

echo "▶ [6/10] Verifying date-fns subpath files exist on disk..."
node scripts/verify-datefns-files.mjs

echo "▶ [7/10] Type-checking source with tsc --noEmit..."
npx tsc --noEmit -p tsconfig.app.json

echo "▶ [8/10] Regenerating date-fns smoke test from src/ usage..."
node scripts/generate-datefns-smoke-test.mjs

echo "▶ [9/10] Type-checking again + running date-fns smoke test..."
npx tsc --noEmit -p tsconfig.app.json
npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose

echo "▶ [10/10] Writing public/dependency-health.json snapshot..."
NOW="$(date -u +%FT%TZ)"
SPEC="$(node -p "require('./package.json').dependencies['date-fns'] || require('./package.json').devDependencies['date-fns'] || ''")"
LOCKED_SNAPSHOT="$LOCKED"
EXACT="$(node -p "/^[0-9]/.test(require('./package.json').dependencies['date-fns'] || '') ? 'true' : 'false'")"

mkdir -p public
cat > public/dependency-health.json <<JSON
{
  "generatedAt": "${NOW}",
  "dateFns": {
    "spec": "${SPEC}",
    "installed": "${INSTALLED}",
    "locked": "${LOCKED_SNAPSHOT}",
    "exactPinned": ${EXACT}
  },
  "lockfileDrift": {
    "detected": false,
    "lastCheckedAt": "${NOW}",
    "source": "bun install --frozen-lockfile"
  }
}
JSON

echo "✅ CI check passed: clean install + cache evict + version match + file verify + type-check green."
