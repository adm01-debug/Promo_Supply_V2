#!/usr/bin/env bash
# End-to-end date-fns smoke pipeline.
#
# Pipeline (all three steps must pass):
#   [1/3] Generate src/test/dateFns.smoke.test.ts from current src/ imports
#   [2/3] Verify every imported date-fns subpath exists in node_modules
#   [3/3] Run the generated vitest smoke test
#
# Usage:
#   bun run date-fns:smoke              # incremental — skip regen if unchanged
#   bun run date-fns:smoke -- --force   # always regenerate the smoke test
#   bun run date-fns:smoke -- --help    # show this help
#
# Exit codes:
#   0  all steps passed
#   1  generation, verification, or vitest failed (see the failed step above)
set -euo pipefail

REGEN_FLAG="--if-changed"
for arg in "$@"; do
  case "$arg" in
    --force|-f) REGEN_FLAG="" ;;
    --help|-h)
      sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

# ── ANSI helpers (TTY only) ───────────────────────────────────────────────────
if [ -t 1 ]; then
  C_BOLD=$'\033[1m'; C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'
  C_RED=$'\033[31m'; C_GRAY=$'\033[90m'; C_RESET=$'\033[0m'
else
  C_BOLD=""; C_CYAN=""; C_GREEN=""; C_RED=""; C_GRAY=""; C_RESET=""
fi
RULE="────────────────────────────────────────────────────────────────"

START_TS=$(date +%s)
step() {
  local n=$1 label=$2
  printf '\n%s%s%s\n' "$C_CYAN" "$RULE" "$C_RESET"
  printf '%s▶ [%s] %s%s\n' "$C_BOLD" "$n" "$label" "$C_RESET"
  printf '%s%s%s\n' "$C_CYAN" "$RULE" "$C_RESET"
}
fail() {
  local n=$1 label=$2
  printf '\n%s%s✗ [%s] %s failed — see output above.%s\n' "$C_BOLD" "$C_RED" "$n" "$label" "$C_RESET"
  exit 1
}

# ── Step 1: regenerate ────────────────────────────────────────────────────────
if [ -n "$REGEN_FLAG" ]; then
  step "1/3" "Regenerate smoke test from src/ imports (incremental: $REGEN_FLAG)"
else
  step "1/3" "Regenerate smoke test from src/ imports (forced)"
fi
node scripts/generate-datefns-smoke-test.mjs $REGEN_FLAG \
  || fail "1/3" "smoke-test generation"

# ── Step 2: verify subpath files exist ────────────────────────────────────────
step "2/3" "Verify date-fns subpath files exist on disk"
node scripts/verify-datefns-files.mjs \
  || fail "2/3" "subpath verification"

# ── Step 3: vitest ────────────────────────────────────────────────────────────
step "3/3" "Run vitest smoke test (src/test/dateFns.smoke.test.ts)"
npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose \
  || fail "3/3" "vitest smoke test"

# ── Summary ───────────────────────────────────────────────────────────────────
ELAPSED=$(( $(date +%s) - START_TS ))
printf '\n%s%s%s\n' "$C_GREEN" "$RULE" "$C_RESET"
printf '%s%s✓ date-fns smoke pipeline passed in %ss%s\n' "$C_BOLD" "$C_GREEN" "$ELAPSED" "$C_RESET"
printf '%s   generation → verification → vitest — all green%s\n' "$C_GRAY" "$C_RESET"
printf '%s%s%s\n' "$C_GREEN" "$RULE" "$C_RESET"
