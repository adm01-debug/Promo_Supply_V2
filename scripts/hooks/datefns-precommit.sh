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
#   src/y.ts(3,8):  error TS2307: Cannot find module 'date-fns/locale/pt-BR' or its corresponding type declarations.
#   src/z.ts(9,1):  error TS2307: Cannot find module 'date-fns/fp/addDays/index.js' …
#
# Requirements:
#   - Match `date-fns` plus ONE OR MORE `/segment` parts (so `date-fns/locale/pt-BR`,
#     `date-fns/fp/addDays`, and `date-fns/locale/zh-CN/index.js` all match in full).
#   - Allow segment chars: A-Z a-z 0-9 _ - . (covers `pt-BR`, `zh_CN`, `index.js`).
#   - Anchor the START with a non-path char (quote, space, parenthesis, start-of-line)
#     so we never start mid-word — e.g. `my-date-fns/foo` must NOT match `date-fns/foo`.
#   - Stop at the first char that can't appear in a module specifier (quote, space,
#     `)`, `,`, etc.) so trailing punctuation from the tsc message is not captured.
#   - Bare `date-fns` (no subpath) is intentionally NOT reported — those are not
#     subpath-resolution failures and would just add noise.
extract_datefns_imports() {
  local log="$1"
  [ -f "$log" ] || return 0
  # Prefer GNU grep -P for the lookbehind that prevents `foo-date-fns/...` matches.
  if grep -oP '(?<![A-Za-z0-9_./-])date-fns(?:/[A-Za-z0-9_.-]+)+' "$log" 2>/dev/null \
       | sort -u | grep . ; then
    return 0
  fi
  # Portable fallback (BSD/macOS grep without -P): tokenize on anything that
  # can't be in a specifier, then keep tokens matching the date-fns shape exactly.
  tr -c 'A-Za-z0-9_./-' '\n' < "$log" \
    | grep -E '^date-fns(/[A-Za-z0-9_.-]+)+$' \
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

# ── Failure-mode detection ────────────────────────────────────────────────────
# Inspects log output to refine the bucket label across the different formats
# tsc and the smoke-test generator emit. Hard guarantees:
#   1. Always prints a non-empty, descriptive `BUCKET — explanation` string.
#   2. Never returns a placeholder (<...>, TODO, n/a, ellipsis, etc.).
#   3. If no signal matches, returns a known-safe default specific to the step.
#
# A defensive sanitizer at the bottom strips ANSI codes, collapses whitespace,
# and replaces anything resembling a placeholder with the safe default — so a
# malformed upstream message can never poison the summary.

# Echoes a clean failure-mode string for a generator-drift step.
# Recognized signals (in priority order):
#   GEN_MISSING_FILE   — generator script itself missing on disk (ENOENT/MODULE_NOT_FOUND)
#   GEN_NODE_CRASH     — generator threw an uncaught exception (TypeError/Error stack)
#   GEN_DRIFT_DETECTED — generator reported the canonical drift marker
#   GEN_MANIFEST_BAD   — generator complained about manifest/usage JSON shape
#   GEN_DEPS_MISSING   — generator failed because date-fns isn't installed
#   GENERATOR_DRIFT    — safe default
detect_generator_failure_mode() {
  local log="$1" exit_code="$2" raw=""
  [ -f "$log" ] && raw="$(cat "$log" 2>/dev/null || true)"

  local mode=""
  if printf '%s' "$raw" | grep -qE '(MODULE_NOT_FOUND|Cannot find module .*generate-datefns-smoke-test|ENOENT.*generate-datefns-smoke-test)'; then
    mode="GEN_MISSING_FILE — generator script not found on disk (re-run \`bun install\` or restore the file)"
  elif printf '%s' "$raw" | grep -qE '^(TypeError|ReferenceError|SyntaxError|RangeError|Error):'; then
    local first
    first="$(printf '%s' "$raw" | grep -E '^(TypeError|ReferenceError|SyntaxError|RangeError|Error):' | head -n1)"
    mode="GEN_NODE_CRASH — generator threw an uncaught exception (${first})"
  elif printf '%s' "$raw" | grep -qiE '(drift detected|out of sync|smoke (test|file) (is )?stale|manifest .* (mismatch|outdated))'; then
    mode="GENERATOR_DRIFT — smoke test or manifest is out of sync with src/ imports"
  elif printf '%s' "$raw" | grep -qiE '(invalid .*(manifest|usage)|JSON\.parse|unexpected token .* JSON|malformed (manifest|usage))'; then
    mode="GEN_MANIFEST_BAD — generator could not parse public/datefns-usage.json (re-run the generator to regenerate it)"
  elif printf '%s' "$raw" | grep -qE "Cannot find module ['\"]date-fns"; then
    mode="GEN_DEPS_MISSING — date-fns is not installed in node_modules (run \`bun install --frozen-lockfile\`)"
  fi

  if [ -z "$mode" ]; then
    mode="GENERATOR_DRIFT — generator exited ${exit_code} (no recognized signal in log; see tail below)"
  fi
  sanitize_failure_mode "$mode" "GENERATOR_DRIFT — generator exited ${exit_code} (unparsable log)"
}

# Echoes a clean failure-mode string for a smoke-tsc step.
# Recognized signals (in priority order):
#   TSC_MISSING_MODULE — TS2307 against a date-fns subpath
#   TSC_MISSING_EXPORT — TS2305 against a date-fns subpath
#   TSC_TYPE_ERROR     — other TSxxxx errors mentioning date-fns
#   TSC_CONFIG_ERROR   — TS5xxx (project/config errors) or "error TS18003"
#   TSC_NOT_FOUND      — bunx couldn't locate tsc at all
#   TSC_GENERIC_ERROR  — any "error TS" with no date-fns context
#   TSC_MISSING_EXPORT — safe default
detect_tsc_failure_mode() {
  local log="$1" exit_code="$2" raw=""
  [ -f "$log" ] && raw="$(cat "$log" 2>/dev/null || true)"

  local mode=""
  if printf '%s' "$raw" | grep -qE 'error TS2307:.*date-fns'; then
    mode="TSC_MISSING_MODULE — a date-fns subpath import resolves to no file on disk (TS2307)"
  elif printf '%s' "$raw" | grep -qE 'error TS2305:.*date-fns'; then
    mode="TSC_MISSING_EXPORT — a date-fns subpath import is missing the named export (TS2305)"
  elif printf '%s' "$raw" | grep -qE 'error TS[0-9]+:.*date-fns'; then
    local code
    code="$(printf '%s' "$raw" | grep -oE 'error TS[0-9]+' | head -n1)"
    mode="TSC_TYPE_ERROR — date-fns import triggered ${code:-a type error}; see offending import(s) below"
  elif printf '%s' "$raw" | grep -qE 'error TS(18003|5[0-9]{3}|6053)'; then
    mode="TSC_CONFIG_ERROR — tsconfig.smoke.json or its inputs are misconfigured (no source files / bad option)"
  elif printf '%s' "$raw" | grep -qiE '(command not found: ?(bunx|tsc)|bunx: command not found|tsc: not found)'; then
    mode="TSC_NOT_FOUND — bunx or tsc could not be located on PATH (run \`bun install\`)"
  elif printf '%s' "$raw" | grep -qE 'error TS[0-9]+'; then
    mode="TSC_GENERIC_ERROR — tsc reported an error unrelated to date-fns (see tail below)"
  fi

  if [ -z "$mode" ]; then
    mode="TSC_MISSING_EXPORT — tsc exited ${exit_code} with no recognized signal in log (see tail below)"
  fi
  sanitize_failure_mode "$mode" "TSC_MISSING_EXPORT — tsc exited ${exit_code} (unparsable log)"
}

# Sanitizer: strips ANSI escapes, collapses whitespace, and rejects any value
# that's empty, too short, or matches a known placeholder pattern. Anything
# rejected is replaced with the per-step safe default ($2). This is the gate
# that makes the "never empty / never placeholder" guarantee a hard invariant.
sanitize_failure_mode() {
  local raw="$1" fallback="$2"
  local clean
  clean="$(printf '%s' "$raw" | sed -E 's/\x1B\[[0-9;]*[a-zA-Z]//g' | tr -s '[:space:]' ' ')"
  # Trim leading/trailing whitespace.
  clean="$(printf '%s' "$clean" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"

  # Reject empty / too-short / placeholder-ish values.
  local reject=0
  [ -z "$clean" ] && reject=1
  [ ${#clean} -lt 8 ] && reject=1
  printf '%s' "$clean" | grep -qE '<[^>]*>' && reject=1
  printf '%s' "$clean" | grep -qiE '(^|[^A-Za-z])(todo|fixme|placeholder|tbd|n/a|unknown|unspecified)([^A-Za-z]|$)' && reject=1
  printf '%s' "$clean" | grep -qE '^\.{2,}$' && reject=1
  # Must contain at least one letter.
  printf '%s' "$clean" | grep -qE '[A-Za-z]' || reject=1

  if [ "$reject" -ne 0 ]; then
    printf '%s\n' "$fallback"
  else
    printf '%s\n' "$clean"
  fi
}

emit_summary() {
  # $1 step number, $2 step label, $3 mode, $4 log file, $5 fix-hint command,
  # $6 exact command that failed, $7 exit code from that command
  local step="$1" label="$2" mode="$3" log="$4" fix="$5" cmd="$6" code="$7"
  echo ""
  red   "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  red   "✗ date-fns pre-hook FAILED"
  red   "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  printf "  %-18s %s\n" "Failed step:"  "[$step] $label"
  printf "  %-18s %s\n" "Failure mode:" "$mode"
  printf "  %-18s %s\n" "Failed command:" "$cmd"
  printf "  %-18s %s\n" "Exit code:"    "$code"
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
  cyan "  Reproduce locally:"
  printf "    %s\n" "$cmd"
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

# Library mode: when sourced with DATEFNS_HOOK_LIBRARY=1, expose the helper
# functions but skip the live pipeline. Used by the fixture-driven test
# (scripts/__tests__/datefns-hook-fixtures.test.sh) to reuse detect_*/extract_*
# without executing `node` or `bunx`. No effect on real hook invocations.
if [ "${DATEFNS_HOOK_LIBRARY:-}" = "1" ]; then
  return 0 2>/dev/null || exit 0
fi

cd "$ROOT_DIR"

# ── [1/2] Generator drift check ────────────────────────────────────────────────
GEN_CMD="node scripts/generate-datefns-smoke-test.mjs --dry-run"
$GEN_CMD >"$GEN_LOG" 2>&1
GEN_EXIT=$?
if [ "$GEN_EXIT" -ne 0 ]; then
  GEN_MODE="$(detect_generator_failure_mode "$GEN_LOG" "$GEN_EXIT")"
  emit_summary \
    "1/2" \
    "Generator drift check (generate-datefns-smoke-test.mjs --dry-run)" \
    "$GEN_MODE" \
    "$GEN_LOG" \
    "node scripts/generate-datefns-smoke-test.mjs && git add src/test/dateFns.smoke.test.ts public/datefns-usage.json && git commit --amend --no-edit" \
    "$GEN_CMD" \
    "$GEN_EXIT"
  exit 1
fi

# ── [2/2] Smoke tsc check ──────────────────────────────────────────────────────
TSC_CMD="bunx tsc --noEmit -p tsconfig.smoke.json"
$TSC_CMD >"$TSC_LOG" 2>&1
TSC_EXIT=$?
if [ "$TSC_EXIT" -ne 0 ]; then
  # Mode is refined from the actual log content (TS2305 vs TS2307 vs config
  # error vs missing tooling). Sanitizer guarantees a non-empty value.
  TSC_MODE="$(detect_tsc_failure_mode "$TSC_LOG" "$TSC_EXIT")"
  emit_summary \
    "2/2" \
    "Smoke tsc check (tsc --noEmit -p tsconfig.smoke.json)" \
    "$TSC_MODE" \
    "$TSC_LOG" \
    "Inspect the offending import(s) above. Either fix the import path in src/ or run \`rm -rf node_modules && bun install --frozen-lockfile\` if the file is missing on disk." \
    "$TSC_CMD" \
    "$TSC_EXIT"
  exit 1
fi

green "✓ date-fns pre-hook passed (generator in sync + smoke tsc clean)."
exit 0
