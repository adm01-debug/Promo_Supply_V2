#!/usr/bin/env bash
# Aggregate lint runner — runs both project lint suites in sequence and
# prints a single summary table at the end.
#
# Pipeline:
#   [1/2] npm run lint -- --max-warnings=0   (general ESLint, zero-warnings)
#   [2/2] npm run lint:date-fns              (date-fns subpath rules)
#
# Default mode (LINT_FAIL_FAST=1, the default): the runner is fail-fast
# at the SUITE level — if step 1 fails, step 2 is SKIPPED and the script
# exits 1 immediately. CI gets faster red-build feedback (no point
# burning runner minutes on suite #2 when suite #1 already blocks merge).
#
# Legacy mode (LINT_FAIL_FAST=0): both steps always run even on
# step-1 failure, so a single invocation surfaces every lint issue
# across both suites in one go. Useful for big refactors where you
# want the full picture in one shot.
#
# In both modes the overall exit code is 0 only when BOTH suites pass.
#
# Usage:
#   bun run lint:all                       # fail-fast (default)
#   LINT_FAIL_FAST=0 bun run lint:all      # always run both suites
#   bun run lint:all -- -h                 # show this help
#
# Exit codes:
#   0  both lint suites passed
#   1  one or more lint suites failed (see summary)
set -uo pipefail

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
fi

# Fail-fast is ON by default. Set LINT_FAIL_FAST=0 to opt back into the
# legacy "always run both suites" behavior.
LINT_FAIL_FAST="${LINT_FAIL_FAST:-1}"

# ── ANSI helpers (TTY only) ───────────────────────────────────────────────────
if [ -t 1 ]; then
  C_BOLD=$'\033[1m'; C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'
  C_RED=$'\033[31m'; C_GRAY=$'\033[90m'; C_YELLOW=$'\033[33m'; C_RESET=$'\033[0m'
else
  C_BOLD=""; C_CYAN=""; C_GREEN=""; C_RED=""; C_GRAY=""; C_YELLOW=""; C_RESET=""
fi
RULE="────────────────────────────────────────────────────────────────"

step() {
  printf '\n%s%s%s\n' "$C_CYAN" "$RULE" "$C_RESET"
  printf '%s▶ [%s] %s%s\n' "$C_BOLD" "$1" "$2" "$C_RESET"
  printf '%s%s%s\n' "$C_CYAN" "$RULE" "$C_RESET"
}

START_TS=$(date +%s)

# Banner so it's never ambiguous which mode you're in (especially in CI logs).
if [ "$LINT_FAIL_FAST" = "1" ]; then
  printf '%slint:all mode:%s %sfail-fast%s %s(set LINT_FAIL_FAST=0 to run all suites on failure)%s\n' \
    "$C_BOLD" "$C_RESET" "$C_YELLOW" "$C_RESET" "$C_GRAY" "$C_RESET"
else
  printf '%slint:all mode:%s %sall-suites%s %s(LINT_FAIL_FAST=0 — every suite will run)%s\n' \
    "$C_BOLD" "$C_RESET" "$C_CYAN" "$C_RESET" "$C_GRAY" "$C_RESET"
fi

# Step 1 — general ESLint with zero-warnings policy.
step "1/2" "npm run lint -- --max-warnings=0"
S1_START=$(date +%s)
if npm run lint -- --max-warnings=0; then
  S1_STATUS="pass"
else
  S1_STATUS="fail"
fi
S1_ELAPSED=$(( $(date +%s) - S1_START ))

# Step 2 — date-fns-specific lint config.
# In fail-fast mode, skip step 2 entirely if step 1 failed.
S2_STATUS="skipped"
S2_ELAPSED=0
if [ "$LINT_FAIL_FAST" = "1" ] && [ "$S1_STATUS" = "fail" ]; then
  step "2/2" "npm run lint:date-fns  ${C_YELLOW}(SKIPPED — fail-fast tripped on step 1)${C_RESET}"
  printf '%s  Skipped because LINT_FAIL_FAST=1 and step 1 failed.%s\n' "$C_GRAY" "$C_RESET"
  printf '%s  Re-run with %sLINT_FAIL_FAST=0 bun run lint:all%s%s to see issues from both suites.%s\n' \
    "$C_GRAY" "$C_BOLD" "$C_RESET$C_GRAY" "$C_GRAY" "$C_RESET"
else
  step "2/2" "npm run lint:date-fns"
  S2_START=$(date +%s)
  if npm run lint:date-fns; then
    S2_STATUS="pass"
  else
    S2_STATUS="fail"
  fi
  S2_ELAPSED=$(( $(date +%s) - S2_START ))
fi

# ── Summary ───────────────────────────────────────────────────────────────────
TOTAL_ELAPSED=$(( $(date +%s) - START_TS ))
mark() {
  case "$1" in
    pass)    printf '%s✓ pass%s'    "$C_GREEN"  "$C_RESET" ;;
    fail)    printf '%s✗ fail%s'    "$C_RED"    "$C_RESET" ;;
    skipped) printf '%s⊘ skipped%s' "$C_YELLOW" "$C_RESET" ;;
  esac
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
  if [ ${#failed[@]} -eq 0 ]; then
    # Defensive: shouldn't reach here, but cover the case.
    failed+=("unknown")
  fi
  printf '%s%s✗ %d suite(s) failed: %s  %s(total %ss)%s\n' \
    "$C_BOLD" "$C_RED" "${#failed[@]}" "${failed[*]}" "$C_GRAY" "$TOTAL_ELAPSED" "$C_RESET"
  if [ "$S2_STATUS" = "skipped" ]; then
    printf '%s  Note: lint:date-fns was skipped due to fail-fast. Re-run with %sLINT_FAIL_FAST=0%s%s for the full picture.%s\n' \
      "$C_GRAY" "$C_BOLD" "$C_RESET$C_GRAY" "$C_GRAY" "$C_RESET"
  fi
  exit 1
fi
