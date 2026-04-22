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
  # has something to surface, then exit 1.
  cat > "$sandbox/scripts/generate-datefns-smoke-test.mjs" <<'JS'
#!/usr/bin/env node
process.stderr.write(
  "src/test/dateFns.smoke.test.ts(7,8): error TS2307: " +
  "Cannot find module 'date-fns/locale/pt-BR' or its corresponding type declarations.\n"
);
process.exit(1);
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
exit 1
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
  assert_contains       "lists offending date-fns import"     "$out" "date-fns/fake-subpath"
  assert_not_matches    "no literal '<placeholder>' tokens"   "$out" '<[A-Za-z0-9_ -]+>'

  rm -rf "$sandbox"
}

bold "datefns-precommit.sh — failure-summary tests"
gray "  hook under test: ${HOOK_SRC#$REPO_ROOT/}"
echo ""

run_scenario_generator_drift
echo ""
run_scenario_tsc_failure
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
