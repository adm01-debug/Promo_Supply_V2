#!/usr/bin/env bash
# Pre-commit / pre-push guard for date-fns integrity.
#
# Pipeline:
#   [1/2] Regenerate the date-fns smoke test (--dry-run drift gate).
#         Failure mode: GENERATOR_DRIFT — manifest or smoke file out of sync.
#   [2/2] Type-check the smoke file with tsconfig.smoke.json.
#         Failure mode: TSC_MISSING_EXPORT — typically a date-fns subpath
#         that doesn't exist on disk or doesn't export what we import.
#
# On failure: prints a clear summary block naming the failing step + the
# exact date-fns import path(s) responsible, plus the concrete next command.
# On success: silent except for a one-line OK.
#
# Designed to be invoked by Husky (.husky/pre-push) or any other hook runner.
# Cross-platform: macOS, Linux, WSL, Windows Git Bash. Pure bash + node.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
# Prefer .git/hook-logs (gitignored by default), fall back to node_modules/.cache
# when .git isn't a directory (e.g. worktrees, sandboxes, bare clones).
if [ -d "$ROOT_DIR/.git" ]; then
  LOG_DIR="$ROOT_DIR/.git/hook-logs"
else
  LOG_DIR="$ROOT_DIR/node_modules/.cache/datefns-hook"
fi
mkdir -p "$LOG_DIR" 2>/dev/null || LOG_DIR="$(mktemp -d)"
GEN_LOG="$LOG_DIR/datefns-generator.log"
TSC_LOG="$LOG_DIR/datefns-tsc-smoke.log"

cyan()  { printf "\033[36m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
gray()  { printf "\033[90m%s\033[0m\n" "$*"; }

# Extract the offending date-fns import path(s) from a tsc log.
# tsc messages look like:
#   src/x.ts(12,23): error TS2305: Module '"date-fns/foo"' has no exported member 'bar'.
#   src/y.ts(3,8):  error TS2307: Cannot find module 'date-fns/locale/zh-CN' or its corresponding type declarations.
extract_datefns_imports() {
  local log="$1"
  [ -f "$log" ] || return 0
  grep -oE "(date-fns(/locale)?(/[A-Za-z0-9_-]+)+)" "$log" \
    | sort -u
}

# Extract the offending source files (with line:col) referencing date-fns.
extract_offending_files() {
  local log="$1"
  [ -f "$log" ] || return 0
  grep -E "error TS[0-9]+:.*date-fns" "$log" \
    | grep -oE "^[^:]+\([0-9]+,[0-9]+\)" \
    | sort -u
}

print_failure_summary() {
  local step="$1"
  local label="$2"
  local log="$3"

  echo ""
  red   "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  red   "✗ date-fns hook FAILED"
  red   "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  printf "  %-20s %s\n" "Failed step:"   "[$step] $label"
  printf "  %-20s %s\n" "Failure mode:"  "$3_MODE_PLACEHOLDER" >/dev/null  # noop, mode set below per caller
}

emit_summary() {
  # $1 step number, $2 step label, $3 mode, $4 log file, $5 fix-hint command
  local step="$1" label="$2" mode="$3" log="$4" fix="$5"
  echo ""
  red   "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  red   "✗ date-fns pre-hook FAILED"
  red   "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  printf "  %-18s %s\n" "Failed step:"  "[$step] $label"
  printf "  %-18s %s\n" "Failure mode:" "$mode"
  printf "  %-18s %s\n" "Log file:"     "${log#$ROOT_DIR/}"

  local imports
  imports="$(extract_datefns_imports "$log" || true)"
  if [ -n "$imports" ]; then
    echo ""
    cyan "  Offending date-fns import path(s):"
    while IFS= read -r imp; do
      printf "    • %s\n" "$imp"
    done <<<"$imports"
  fi

  local files
  files="$(extract_offending_files "$log" || true)"
  if [ -n "$files" ]; then
    echo ""
    cyan "  Offending source location(s):"
    while IFS= read -r f; do
      printf "    • %s\n" "$f"
    done <<<"$files"
  fi

  echo ""
  cyan "  Fix:"
  printf "    %s\n" "$fix"
  echo ""
  gray "  Tail of log (last 20 lines):"
  if [ -f "$log" ]; then
    tail -n 20 "$log" | sed 's/^/    /'
  else
    echo "    (no log file)"
  fi
  red "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

cd "$ROOT_DIR"

# ── [1/2] Generator drift check ────────────────────────────────────────────────
node scripts/generate-datefns-smoke-test.mjs --dry-run >"$GEN_LOG" 2>&1
GEN_EXIT=$?
if [ "$GEN_EXIT" -ne 0 ]; then
  emit_summary \
    "1/2" \
    "Generator drift check (generate-datefns-smoke-test.mjs --dry-run)" \
    "GENERATOR_DRIFT — smoke test or manifest is out of sync with src/ imports" \
    "$GEN_LOG" \
    "node scripts/generate-datefns-smoke-test.mjs && git add src/test/dateFns.smoke.test.ts public/datefns-usage.json && git commit --amend --no-edit"
  exit 1
fi

# ── [2/2] Smoke tsc check ──────────────────────────────────────────────────────
bunx tsc --noEmit -p tsconfig.smoke.json >"$TSC_LOG" 2>&1
TSC_EXIT=$?
if [ "$TSC_EXIT" -ne 0 ]; then
  # Distinguish "missing export" (TS2305) from "missing module" (TS2307); both
  # are bucketed under TSC_MISSING_EXPORT for the user — the offending import
  # printout makes the actual cause obvious.
  emit_summary \
    "2/2" \
    "Smoke tsc check (tsc --noEmit -p tsconfig.smoke.json)" \
    "TSC_MISSING_EXPORT — a date-fns subpath import is missing or wrong" \
    "$TSC_LOG" \
    "Inspect the offending import(s) above. Either fix the import path in src/ or run \`rm -rf node_modules && bun install --frozen-lockfile\` if the file is missing on disk."
  exit 1
fi

green "✓ date-fns pre-hook passed (generator in sync + smoke tsc clean)."
exit 0
