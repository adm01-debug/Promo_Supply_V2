#!/usr/bin/env bash
# Shell test for scripts/hooks/datefns-precommit.sh
#
# Asserts that when the hook fails, the emitted summary block contains a real
# "Failure mode:" line — i.e., a non-empty failure-mode description with no
# placeholder text like <...>, TODO, FIXME, PLACEHOLDER, or "tbd".
#
# Two scenarios are exercised:
#   [1/2] Generator drift (step 1/2 of the hook) — stubbed generator exits 1
#         with a fake tsc-style log mentioning a date-fns subpath.
#   [2/2] Smoke tsc failure (step 2/2 of the hook) — stubbed tsc exits 1 with
#         a TS2307 error against an invented date-fns subpath.
#
# Run directly:    bash scripts/__tests__/datefns-precommit-summary.test.sh
# Run via vitest:  not applicable — this is a pure bash test.
#
# Exit 0 = all assertions passed, 1 = any assertion failed.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOOK_SRC="$REPO_ROOT/scripts/hooks/datefns-precommit.sh"

if [ ! -f "$HOOK_SRC" ]; then
  echo "FATAL: hook script not found at $HOOK_SRC" >&2
  exit 1
fi

PASS=0
FAIL=0
FAILED_NAMES=()

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
gray()  { printf "\033[90m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }

# assert_contains <name> <output> <needle>
assert_contains() {
  local name="$1" out="$2" needle="$3"
  if printf '%s' "$out" | grep -qF -- "$needle"; then
    green "  ✓ $name"
    PASS=$((PASS + 1))
  else
    red "  ✗ $name — expected to contain: $needle"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$name")
  fi
}

# assert_not_matches <name> <output> <regex>
assert_not_matches() {
  local name="$1" out="$2" regex="$3"
  if printf '%s' "$out" | grep -qE -- "$regex"; then
    local hit
    hit="$(printf '%s' "$out" | grep -E -- "$regex" | head -n1)"
    red "  ✗ $name — should NOT match /$regex/  (offending line: $hit)"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$name")
  else
    green "  ✓ $name"
    PASS=$((PASS + 1))
  fi
}

# assert_failure_mode_real <name> <output>
# Verifies the "Failure mode:" line exists, is non-empty, and contains no
# placeholder tokens like <...>, TODO, FIXME, PLACEHOLDER, tbd, n/a.
assert_failure_mode_real() {
  local name="$1" out="$2"
  # Strip ANSI color codes before parsing.
  local stripped
  stripped="$(printf '%s' "$out" | sed -E 's/\x1B\[[0-9;]*[a-zA-Z]//g')"

  local line
  line="$(printf '%s' "$stripped" | grep -E '^[[:space:]]*Failure mode:' | head -n1 || true)"

  if [ -z "$line" ]; then
    red "  ✗ $name — no 'Failure mode:' line found in summary"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$name")
    return
  fi

  # Extract the value after "Failure mode:".
  local value
  value="$(printf '%s' "$line" | sed -E 's/^[[:space:]]*Failure mode:[[:space:]]*//')"
  # Trim trailing whitespace.
  value="$(printf '%s' "$value" | sed -E 's/[[:space:]]+$//')"

  if [ -z "$value" ]; then
    red "  ✗ $name — 'Failure mode:' line is empty"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$name")
    return
  fi

  # Reject placeholder patterns.
  # - <anything> angle-bracket placeholders
  # - TODO / FIXME / PLACEHOLDER / TBD / N/A (case-insensitive, whole word)
  # - bare ellipsis "..."
  if printf '%s' "$value" | grep -qE '<[^>]*>'; then
    red "  ✗ $name — 'Failure mode:' contains angle-bracket placeholder: $value"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$name")
    return
  fi
  if printf '%s' "$value" | grep -qiE '(^|[^A-Za-z])(todo|fixme|placeholder|tbd|n/a)([^A-Za-z]|$)'; then
    red "  ✗ $name — 'Failure mode:' contains placeholder token: $value"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$name")
    return
  fi
  if printf '%s' "$value" | grep -qE '^\.{2,}$'; then
    red "  ✗ $name — 'Failure mode:' is just an ellipsis: $value"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$name")
    return
  fi

  # Sanity floor: at least 8 chars and contain at least one letter.
  local len=${#value}
  if [ "$len" -lt 8 ] || ! printf '%s' "$value" | grep -qE '[A-Za-z]'; then
    red "  ✗ $name — 'Failure mode:' too short or non-descriptive: $value"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$name")
    return
  fi

  green "  ✓ $name — Failure mode: $value"
  PASS=$((PASS + 1))
}

# ── Build a sandbox repo that mimics the layout the hook expects ─────────────
build_sandbox() {
  local sandbox="$1"
  mkdir -p "$sandbox/scripts/hooks"
  mkdir -p "$sandbox/scripts/lib"
  # Copy the real hook so any change to the hook is exercised here.
  cp "$HOOK_SRC" "$sandbox/scripts/hooks/datefns-precommit.sh"
  chmod +x "$sandbox/scripts/hooks/datefns-precommit.sh"
}

# ── Scenario 1: force generator drift (step 1/2) ─────────────────────────────
run_scenario_generator_drift() {
  local sandbox; sandbox="$(mktemp -d)"
  build_sandbox "$sandbox"

  # Stub the generator: print a fake tsc-style error mentioning a date-fns
  # subpath so the summary's "Offending date-fns import path(s)" section also
  # has something to surface, then exit with a distinctive non-1 code (42) so
  # the "Exit code:" assertion proves the value is propagated, not hardcoded.
  cat > "$sandbox/scripts/generate-datefns-smoke-test.mjs" <<'JS'
#!/usr/bin/env node
process.stderr.write(
  "src/test/dateFns.smoke.test.ts(7,8): error TS2307: " +
  "Cannot find module 'date-fns/locale/pt-BR' or its corresponding type declarations.\n"
);
process.exit(42);
JS

  # Run hook; capture combined output regardless of exit code.
  local out exit_code
  out="$(bash "$sandbox/scripts/hooks/datefns-precommit.sh" 2>&1 || true)"
  exit_code=$?

  bold "[scenario 1/2] generator drift (step 1/2 of hook)"
  assert_contains       "exits with non-zero status"          "$out" "date-fns pre-hook FAILED"
  assert_contains       "names the failed step (1/2)"         "$out" "Failed step:"
  assert_contains       "labels step 1/2 in summary"          "$out" "[1/2]"
  assert_failure_mode_real "Failure mode is real (no placeholders)" "$out"
  assert_contains       "shows Failed command line"           "$out" "Failed command:"
  assert_contains       "Failed command names the generator"  "$out" "node scripts/generate-datefns-smoke-test.mjs --dry-run"
  assert_contains       "shows Exit code line"                "$out" "Exit code:"
  assert_contains       "Exit code matches stub (42)"         "$out" "42"
  assert_contains       "shows Reproduce locally section"     "$out" "Reproduce locally:"
  assert_contains       "lists offending date-fns import"     "$out" "date-fns/locale/pt-BR"
  assert_not_matches    "no literal '<placeholder>' tokens"   "$out" '<[A-Za-z0-9_ -]+>'

  rm -rf "$sandbox"
}

# ── Scenario 2: force smoke tsc failure (step 2/2) ───────────────────────────
run_scenario_tsc_failure() {
  local sandbox; sandbox="$(mktemp -d)"
  build_sandbox "$sandbox"

  # Generator stub: succeed silently so the hook proceeds to step 2.
  cat > "$sandbox/scripts/generate-datefns-smoke-test.mjs" <<'JS'
#!/usr/bin/env node
process.exit(0);
JS

  # Stub `bunx` on PATH to emit a TS2307 against a fake date-fns subpath and
  # exit 1. The hook calls `bunx tsc --noEmit -p tsconfig.smoke.json`.
  local bin_dir="$sandbox/.bin-stubs"
  mkdir -p "$bin_dir"
  cat > "$bin_dir/bunx" <<'SH'
#!/usr/bin/env bash
echo "src/test/dateFns.smoke.test.ts(3,8): error TS2307: Cannot find module 'date-fns/fake-subpath' or its corresponding type declarations." >&2
exit 7
SH
  chmod +x "$bin_dir/bunx"

  local out exit_code
  out="$(PATH="$bin_dir:$PATH" bash "$sandbox/scripts/hooks/datefns-precommit.sh" 2>&1 || true)"
  exit_code=$?

  bold "[scenario 2/2] smoke tsc failure (step 2/2 of hook)"
  assert_contains       "exits with non-zero status"          "$out" "date-fns pre-hook FAILED"
  assert_contains       "names the failed step (2/2)"         "$out" "Failed step:"
  assert_contains       "labels step 2/2 in summary"          "$out" "[2/2]"
  assert_failure_mode_real "Failure mode is real (no placeholders)" "$out"
  assert_contains       "shows Failed command line"           "$out" "Failed command:"
  assert_contains       "Failed command names tsc invocation" "$out" "bunx tsc --noEmit -p tsconfig.smoke.json"
  assert_contains       "shows Exit code line"                "$out" "Exit code:"
  assert_contains       "Exit code matches stub (7)"          "$out" "Exit code:"
  assert_contains       "Exit code value is 7"                "$out" " 7"
  assert_contains       "shows Reproduce locally section"     "$out" "Reproduce locally:"
  assert_contains       "lists offending date-fns import"     "$out" "date-fns/fake-subpath"
  assert_not_matches    "no literal '<placeholder>' tokens"   "$out" '<[A-Za-z0-9_ -]+>'

  rm -rf "$sandbox"
}

# ── Helper: run hook with custom generator stdout/exit + bunx stdout/exit ────
# Args:
#   $1 scenario name (for log)
#   $2 generator-script body (will be wrapped in a shebang script)
#   $3 generator exit code
#   $4 bunx body (or empty to skip stub — uses real bunx)
#   $5 bunx exit code (ignored if $4 empty)
# Echoes the captured combined stdout+stderr from the hook.
run_hook_with_stubs() {
  local name="$1" gen_body="$2" gen_exit="$3" bunx_body="$4" bunx_exit="$5"
  local sandbox; sandbox="$(mktemp -d)"
  build_sandbox "$sandbox"
  {
    echo "#!/usr/bin/env node"
    printf '%s\n' "$gen_body"
    echo "process.exit(${gen_exit});"
  } > "$sandbox/scripts/generate-datefns-smoke-test.mjs"

  local PATH_OVERRIDE="$PATH"
  if [ -n "$bunx_body" ]; then
    local bin_dir="$sandbox/.bin-stubs"
    mkdir -p "$bin_dir"
    {
      echo "#!/usr/bin/env bash"
      printf '%s\n' "$bunx_body"
      echo "exit ${bunx_exit}"
    } > "$bin_dir/bunx"
    chmod +x "$bin_dir/bunx"
    PATH_OVERRIDE="$bin_dir:$PATH"
  fi

  local out
  out="$(PATH="$PATH_OVERRIDE" bash "$sandbox/scripts/hooks/datefns-precommit.sh" 2>&1 || true)"
  rm -rf "$sandbox"
  printf '%s' "$out"
}

# ── Scenario 3: generator emits TS2305 (missing export) — should bucket as
#                TSC-style signal but the GENERATOR detector should still fall
#                through to the safe default since this isn't a generator
#                signal. Verifies the safe-default branch never goes empty. ──
run_scenario_generator_unparsable() {
  bold "[scenario 3] generator log has no recognized signal (safe-default branch)"
  local out
  out="$(run_hook_with_stubs \
    "gen-unparsable" \
    'process.stdout.write("nothing here that the detector recognizes\\n");' \
    99 "" "")"
  assert_contains       "still fails"                              "$out" "date-fns pre-hook FAILED"
  assert_failure_mode_real "Failure mode is real (safe default)"   "$out"
  assert_contains       "uses GENERATOR_DRIFT default bucket"      "$out" "GENERATOR_DRIFT"
  assert_contains       "mentions exit code in default mode"       "$out" "exited 99"
  assert_contains       "Exit code line shows 99"                  "$out" "99"
}

# ── Scenario 4: generator throws an uncaught exception ──────────────────────
run_scenario_generator_node_crash() {
  bold "[scenario 4] generator throws TypeError (GEN_NODE_CRASH bucket)"
  local out
  out="$(run_hook_with_stubs \
    "gen-crash" \
    'process.stderr.write("TypeError: Cannot read properties of undefined (reading \\"foo\\")\\n");' \
    1 "" "")"
  assert_failure_mode_real "Failure mode is real"                   "$out"
  assert_contains          "uses GEN_NODE_CRASH bucket"             "$out" "GEN_NODE_CRASH"
  assert_contains          "names the exception type"               "$out" "TypeError"
}

# ── Scenario 5: tsc emits TS2305 (missing export, not module) ──────────────
run_scenario_tsc_missing_export() {
  bold "[scenario 5] tsc TS2305 → TSC_MISSING_EXPORT bucket"
  local out
  out="$(run_hook_with_stubs \
    "tsc-2305" \
    'process.exit(0);' 0 \
    "echo \"src/foo.ts(1,1): error TS2305: Module '\\\"date-fns/format\\\"' has no exported member 'unknownExport'.\" >&2" \
    2)"
  assert_failure_mode_real "Failure mode is real"                   "$out"
  assert_contains          "uses TSC_MISSING_EXPORT bucket"         "$out" "TSC_MISSING_EXPORT"
  assert_contains          "mentions TS2305"                        "$out" "TS2305"
}

# ── Scenario 6: tsc emits a config error (TS5xxx) ──────────────────────────
run_scenario_tsc_config_error() {
  bold "[scenario 6] tsc TS5xxx → TSC_CONFIG_ERROR bucket"
  local out
  out="$(run_hook_with_stubs \
    "tsc-config" \
    'process.exit(0);' 0 \
    "echo \"error TS5083: Cannot read file 'tsconfig.smoke.json'.\" >&2" \
    1)"
  assert_failure_mode_real "Failure mode is real"                   "$out"
  assert_contains          "uses TSC_CONFIG_ERROR bucket"           "$out" "TSC_CONFIG_ERROR"
}

# ── Scenario 7: tsc fails with no recognizable signal at all ───────────────
run_scenario_tsc_unparsable() {
  bold "[scenario 7] tsc log has no recognized signal (safe-default branch)"
  local out
  out="$(run_hook_with_stubs \
    "tsc-unparsable" \
    'process.exit(0);' 0 \
    "echo \"some completely unrelated message\" >&2" \
    13)"
  assert_failure_mode_real "Failure mode is real (safe default)"    "$out"
  assert_contains          "uses TSC_MISSING_EXPORT default bucket" "$out" "TSC_MISSING_EXPORT"
  assert_contains          "mentions exit code in default mode"     "$out" "exited 13"
}

bold "datefns-precommit.sh — failure-summary tests"
gray "  hook under test: ${HOOK_SRC#$REPO_ROOT/}"
echo ""

run_scenario_generator_drift
echo ""
run_scenario_tsc_failure
echo ""
run_scenario_generator_unparsable
echo ""
run_scenario_generator_node_crash
echo ""
run_scenario_tsc_missing_export
echo ""
run_scenario_tsc_config_error
echo ""
run_scenario_tsc_unparsable
echo ""

bold "── summary ──"
printf "  passed: %d\n" "$PASS"
printf "  failed: %d\n" "$FAIL"
if [ "$FAIL" -ne 0 ]; then
  red "✗ Some assertions failed:"
  for n in "${FAILED_NAMES[@]}"; do
    printf "    • %s\n" "$n"
  done
  exit 1
fi
green "✓ All assertions passed."
exit 0
