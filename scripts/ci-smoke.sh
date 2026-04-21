#!/usr/bin/env bash
set -euo pipefail

echo "▶ [1/5] Removing node_modules..."
rm -rf node_modules

echo "▶ [2/5] Evicting any cached date-fns tarballs..."
rm -rf "${BUN_INSTALL:-$HOME/.bun}/install/cache/date-fns"* 2>/dev/null || true
rm -rf "$HOME"/.npm/_cacache/content-v2/**/date-fns-* 2>/dev/null || true

echo "▶ [3/5] Installing from frozen lockfile..."
bun install --frozen-lockfile

echo "▶ [4/5] Confirming installed date-fns version matches lockfile..."
INSTALLED="$(node -p "require('./node_modules/date-fns/package.json').version")"
LOCKED="$(grep -A1 '"date-fns"' bun.lock 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"
if [ -n "$LOCKED" ] && [ "$INSTALLED" != "$LOCKED" ]; then
  echo "✗ date-fns drift: installed=$INSTALLED, locked=$LOCKED" >&2
  exit 1
fi
echo "✓ date-fns $INSTALLED matches lockfile."

echo "▶ [5/6] Printing install verification report..."
node scripts/install-report.mjs

echo "▶ [6/6] Verifying date-fns subpath files + running smoke test..."
node scripts/verify-datefns-files.mjs
npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose

echo "✅ Smoke check passed: clean install + cache evict + version match + file verify + smoke test green."
