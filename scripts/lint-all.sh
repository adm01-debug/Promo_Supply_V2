#!/usr/bin/env bash
# Aggregate lint runner — runs both project lint suites in sequence and
# prints a single summary table at the end.
#
# Pipeline:
#   [1/2] npm run lint -- --max-warnings=0   (general ESLint, zero-warnings)
#   [2/2] npm run lint:date-fns              (date-fns subpath rules)
#
# Both steps always run — a failure in step 1 does NOT short-circuit step 2,
# so a single invocation surfaces every lint issue across both suites. The
# overall exit code is 0 only when BOTH pass; otherwise it's 1.
#
# Usage:
#   bun run lint:all          # run both suites, print summary, exit 0/1
#   bun run lint:all -- -h    # show this help
#
# Exit codes:
#   0  both lint suites passed
#   1  one or more lint suites failed (see summary)
set -uo pipefail

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
fi

# ── ANSI helpers (TTY only) ───────────────────────────────────────────────────
if [ -t 1 ]; then
  C_BOLD=$'\033[1m'; C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'
  C_RED=$'\033[31m'; C_GRAY=$'\033[90m'; C_RESET=$'\033[0m'
else
  C_BOLD=""; C_CYAN=""; C_GREEN=""; C_RED=""; C_GRAY=""; C_RESET=""
fi
RULE="────────────────────────────────────────────────────────────────"

step() {
  printf '\n%s%s%s\n' "$C_CYAN" "$RULE" "$C_RESET"
  printf '%s▶ [%s] %s%s\n' "$C_BOLD" "$1" "$2" "$C_RESET"
  printf '%s%s%s\n' "$C_CYAN" "$RULE" "$C_RESET"
}

START_TS=$(date +%s)

# Step 1 — general ESLint with zero-warnings policy.
step "1/2" "npm run lint -- --max-warnings=0"
S1_START=$(date +%s)
if npm run lint -- --max-warnings=0; then
  S1_STATUS="pass"
else
  S1_STATUS="fail"
fi
S1_ELAPSED=$(( $(date +%s) - S1_START ))

# Step 2 — date-fns-specific lint config. Always runs even if step 1 failed
# so the summary covers both suites in a single invocation.
step "2/2" "npm run lint:date-fns"
S2_START=$(date +%s)
if npm run lint:date-fns; then
  S2_STATUS="pass"
else
  S2_STATUS="fail"
fi
S2_ELAPSED=$(( $(date +%s) - S2_START ))

# ── Summary ───────────────────────────────────────────────────────────────────
TOTAL_ELAPSED=$(( $(date +%s) - START_TS ))
mark() {
  if [ "$1" = "pass" ]; then printf '%s✓ pass%s' "$C_GREEN" "$C_RESET"
  else                       printf '%s✗ fail%s' "$C_RED" "$C_RESET"
  fi
}

printf '\n%s%s%s\n' "$C_BOLD" "$RULE" "$C_RESET"
printf '%slint:all summary%s\n' "$C_BOLD" "$C_RESET"
printf '%s%s%s\n' "$C_BOLD" "$RULE" "$C_RESET"
printf '  [1/2] %-44s %s  %s(%ss)%s\n' "lint (--max-warnings=0)" "$(mark "$S1_STATUS")" "$C_GRAY" "$S1_ELAPSED" "$C_RESET"
printf '  [2/2] %-44s %s  %s(%ss)%s\n' "lint:date-fns" "$(mark "$S2_STATUS")" "$C_GRAY" "$S2_ELAPSED" "$C_RESET"
printf '%s%s%s\n' "$C_BOLD" "$RULE" "$C_RESET"

if [ "$S1_STATUS" = "pass" ] && [ "$S2_STATUS" = "pass" ]; then
  printf '%s%s✓ All lint suites passed in %ss%s\n' "$C_BOLD" "$C_GREEN" "$TOTAL_ELAPSED" "$C_RESET"
  exit 0
else
  failed=()
  [ "$S1_STATUS" = "fail" ] && failed+=("lint")
  [ "$S2_STATUS" = "fail" ] && failed+=("lint:date-fns")
  printf '%s%s✗ %d/%d suite(s) failed: %s  %s(total %ss)%s\n' \
    "$C_BOLD" "$C_RED" "${#failed[@]}" 2 "${failed[*]}" "$C_GRAY" "$TOTAL_ELAPSED" "$C_RESET"
  exit 1
fi
