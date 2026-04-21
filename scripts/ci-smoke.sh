#!/usr/bin/env bash
set -euo pipefail

echo "▶ [1/3] Removing node_modules..."
rm -rf node_modules

echo "▶ [2/3] Installing from frozen lockfile..."
bun install --frozen-lockfile

echo "▶ [3/3] Running date-fns smoke test..."
npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose

echo "✅ Smoke check passed: clean install + date-fns smoke test green."
