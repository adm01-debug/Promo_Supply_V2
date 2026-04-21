#!/usr/bin/env bash
# Quick standalone smoke test for date-fns subpath imports.
# Regenerates src/test/dateFns.smoke.test.ts from current src/ usage,
# verifies every imported subpath exists in node_modules/date-fns,
# then runs only the smoke test (no clean install, no tsc, no report).
#
# Usage: bash scripts/smoke-date-fns.sh
set -euo pipefail

echo "▶ [1/3] Regenerating smoke test from src/ imports..."
node scripts/generate-datefns-smoke-test.mjs

echo "▶ [2/3] Verifying date-fns subpath files exist on disk..."
node scripts/verify-datefns-files.mjs

echo "▶ [3/3] Running smoke test..."
exec npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose
