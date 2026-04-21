#!/usr/bin/env bash
set -euo pipefail

echo "▶ [1/4] Removing node_modules..."
rm -rf node_modules

echo "▶ [2/4] Installing from frozen lockfile..."
bun install --frozen-lockfile

echo "▶ [3/4] Verifying date-fns subpath files exist on disk..."
node scripts/verify-datefns-files.mjs

echo "▶ [4/4] Running date-fns smoke test..."
npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose

echo "✅ Smoke check passed: clean install + file verify + date-fns smoke test green."
