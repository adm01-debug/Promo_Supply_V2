#!/usr/bin/env bash
set -euo pipefail

# Cross-platform: macOS, Linux, WSL, and Windows (Git Bash / MSYS / Cygwin).
# Must be invoked through bash (not cmd.exe). On Windows use Git Bash, WSL,
# or `bun run ci:check`.
source "$(dirname "$0")/lib/preflight.sh"
preflight

echo "▶ [1/9] Removing node_modules..."
rm -rf node_modules

echo "▶ [2/9] Evicting any cached date-fns tarballs..."
evict_datefns_cache

echo "▶ [3/9] Installing from frozen lockfile..."
bun install --frozen-lockfile

echo "▶ [4/9] Confirming installed date-fns version matches lockfile..."
INSTALLED="$(node -p "require('./node_modules/date-fns/package.json').version")"
LOCKED="$(resolve_locked_datefns)"
if [ -n "$LOCKED" ] && [ "$INSTALLED" != "$LOCKED" ]; then
  echo "✗ date-fns drift: installed=$INSTALLED, locked=$LOCKED" >&2
  exit 1
fi
echo "✓ date-fns $INSTALLED matches lockfile."

echo "▶ [5/11] Printing install verification report..."
node scripts/install-report.mjs

echo "▶ [6/11] ESLint gate: blocking date-fns barrel imports (--max-warnings=0)..."
bunx eslint . --config eslint.date-fns.config.js --max-warnings=0

echo "▶ [7/11] Verifying date-fns subpath files exist on disk..."
node scripts/verify-datefns-files.mjs

echo "▶ [8/11] Type-checking source with tsc --noEmit..."
bunx tsc --noEmit -p tsconfig.app.json

echo "▶ [9/11] Regenerating date-fns smoke test from src/ usage..."
node scripts/generate-datefns-smoke-test.mjs

echo "▶ [10/11] Type-checking again + running date-fns smoke test..."
bunx tsc --noEmit -p tsconfig.app.json
bunx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose

echo "▶ [11/11] Writing public/dependency-health.json snapshot..."
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
