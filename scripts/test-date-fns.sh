#!/usr/bin/env bash
# Quick local verification of the date-fns import surface.
# Same invocation as step 5 of ci-smoke.sh and step 8 of ci-check.sh,
# so local result == CI result for this specific test.
#
# Usage:
#   bash scripts/test-date-fns.sh
set -euo pipefail
exec npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose
