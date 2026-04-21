#!/usr/bin/env bash
set -euo pipefail

# Cross-platform: macOS, Linux, WSL, and Windows (Git Bash / MSYS / Cygwin).
# Must be invoked through bash (not cmd.exe). On Windows use Git Bash, WSL,
# or `bun run ci:smoke`.
source "$(dirname "$0")/lib/preflight.sh"
preflight

echo "▶ [1/5] Removing node_modules..."
rm -rf node_modules

echo "▶ [2/5] Evicting any cached date-fns tarballs..."
evict_datefns_cache

echo "▶ [3/5] Installing from frozen lockfile..."
bun install --frozen-lockfile

echo "▶ [4/5] Confirming installed date-fns version matches lockfile..."
INSTALLED="$(node -p "require('./node_modules/date-fns/package.json').version")"
LOCKED="$(resolve_locked_datefns)"
if [ -n "$LOCKED" ] && [ "$INSTALLED" != "$LOCKED" ]; then
  echo "✗ date-fns drift: installed=$INSTALLED, locked=$LOCKED" >&2
  exit 1
fi
echo "✓ date-fns $INSTALLED matches lockfile."

echo "▶ [5/7] Printing install verification report..."
node scripts/install-report.mjs

echo "▶ [6/7] ESLint gate: blocking date-fns barrel imports (--max-warnings=0)..."
bunx eslint . --config eslint.date-fns.config.js --max-warnings=0

echo "▶ [7/7] Verifying date-fns subpath files + running smoke test..."
node scripts/verify-datefns-files.mjs
echo "▶ Verifying date-fns smoke test is in sync..."
node scripts/generate-datefns-smoke-test.mjs --dry-run
echo "▶ Validating smoke test imports against tsconfig.smoke.json..."
bunx tsc --noEmit -p tsconfig.smoke.json
bunx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose

echo "✅ Smoke check passed: clean install + cache evict + version match + file verify + smoke test green."
