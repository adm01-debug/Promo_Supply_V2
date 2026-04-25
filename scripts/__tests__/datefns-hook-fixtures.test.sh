#!/usr/bin/env bash
# Fixture-driven test for the failure-mode detector and date-fns import
# extractor in scripts/hooks/datefns-precommit.sh.
#
# For each *.expected.json under scripts/__tests__/fixtures/datefns-hook/, this
# driver:
#   1. Sources the hook in library mode (DATEFNS_HOOK_LIBRARY=1) so the helper
#      functions are available without executing the live pipeline.
#   2. Runs detect_generator_failure_mode OR detect_tsc_failure_mode against
#      the fixture log, depending on `step`.
#   3. Asserts the bucket prefix matches `failureModeBucket`.
#   4. Asserts every substring in `failureModeContains` is present.
#   5. Re-runs the same sanitizer guarantees (non-empty, ≥8 chars, no
#      placeholders) on the detector output.
#   6. Runs extract_datefns_imports and asserts every entry in `imports` is
#      present in the result (subset semantics).
#
# Run directly:    bash scripts/__tests__/datefns-hook-fixtures.test.sh
# Run via npm:     bun run test:hook:datefns:fixtures
# Run a subset:    bash scripts/__tests__/datefns-hook-fixtures.test.sh tsc-*
#
# Exit 0 = all fixtures passed, 1 = any assertion failed.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOOK_SRC="$REPO_ROOT/scripts/hooks/datefns-precommit.sh"
FIXTURE_DIR="$REPO_ROOT/scripts/__tests__/fixtures/datefns-hook"

if [ ! -f "$HOOK_SRC" ]; then
  echo "FATAL: hook script not found at $HOOK_SRC" >&2
  exit 1
fi
if [ ! -d "$FIXTURE_DIR" ]; then
  echo "FATAL: fixture dir not found at $FIXTURE_DIR" >&2
  exit 1
fi

# Source the hook as a library — exposes detect_*/extract_*/sanitize_* without
# executing the live pipeline. Must happen at top level (not inside a function)
# so the functions land in the current shell's scope.
# shellcheck disable=SC1090
DATEFNS_HOOK_LIBRARY=1 source "$HOOK_SRC"

# Sanity check: did sourcing actually expose the helpers?
for fn in detect_generator_failure_mode detect_tsc_failure_mode \
          extract_datefns_imports sanitize_failure_mode; do
  if ! declare -F "$fn" >/dev/null; then
    echo "FATAL: helper function '$fn' not defined after sourcing the hook" >&2
    echo "       (library mode may be broken — check DATEFNS_HOOK_LIBRARY guard)" >&2
    exit 1
  fi
done

PASS=0
FAIL=0
FAILED_NAMES=()

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
gray()  { printf "\033[90m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }

# Tiny JSON value extractor — handles the flat schema we control. Avoids a
# `jq` dependency so this runs in lean CI containers.
#   json_string <file> <key>            → unquoted string value
#   json_number <file> <key>            → numeric value
#   json_string_array <file> <key>      → newline-separated unquoted strings
json_string() {
  python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get(sys.argv[2], ''))" "$1" "$2"
}
json_number() {
  python3 -c "import json,sys; v=json.load(open(sys.argv[1])).get(sys.argv[2]); print(v if v is not None else '')" "$1" "$2"
}
json_string_array() {
  python3 -c "import json,sys
v=json.load(open(sys.argv[1])).get(sys.argv[2], [])
print('\n'.join(v))" "$1" "$2"
}

write_actual_snapshot() {
  local out="$1" step="$2" exit_code="$3" bucket="$4" mode_output="$5" imports_file="$6"
  python3 - "$out" "$step" "$exit_code" "$bucket" "$mode_output" "$imports_file" <<'PY'
import json, sys
out, step, exit_code, bucket, mode_output, imports_file = sys.argv[1:]
with open(imports_file, encoding="utf-8") as f:
    imports = [line.rstrip("\n") for line in f if line.rstrip("\n")]
payload = {
    "step": step,
    "exitCode": int(exit_code) if str(exit_code).isdigit() else exit_code,
    "failureModeBucket": bucket,
    "failureModeActual": mode_output,
    "imports": imports,
}
with open(out, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)
    f.write("\n")
PY
}

emit_snapshot_diff() {
  local expected_json="$1" actual_json="$2"
  red "    ✗ snapshot diff (expected JSON ↔ actual detector output):"
  diff -u --label "expected:${expected_json#$REPO_ROOT/}" --label "actual:detector-output" \
    "$expected_json" "$actual_json" || true
}

assert_contains() {
  local name="$1" haystack="$2" needle="$3"
  if printf '%s' "$haystack" | grep -qF -- "$needle"; then
    green "    ✓ $name"
    PASS=$((PASS + 1))
  else
    red "    ✗ $name — expected to contain: $needle"
    red "        actual: $haystack"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$name")
  fi
}

# Re-apply the same sanitizer rules the hook enforces, as a defense-in-depth
# check that the detector output would survive emit_summary's invariant gate.
assert_failure_mode_clean() {
  local name="$1" value="$2"
  local len=${#value}
  local ok=1
  [ -z "$value" ] && ok=0
  [ "$len" -lt 8 ] && ok=0
  printf '%s' "$value" | grep -qE '<[^>]*>' && ok=0
  printf '%s' "$value" | grep -qiE '(^|[^A-Za-z])(todo|fixme|placeholder|tbd|n/a|unknown|unspecified)([^A-Za-z]|$)' && ok=0
  printf '%s' "$value" | grep -qE '^\.{2,}$' && ok=0
  printf '%s' "$value" | grep -qE '[A-Za-z]' || ok=0
  if [ "$ok" -eq 1 ]; then
    green "    ✓ $name"
    PASS=$((PASS + 1))
  else
    red "    ✗ $name — sanitizer would reject: '$value'"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$name")
  fi
}

run_fixture() {
  local expected_json="$1"
  local base="${expected_json%.expected.json}"
  local fixture_name; fixture_name="$(basename "$base")"
  local log_file="${base}.log"

  bold "▶ $fixture_name"
  if [ ! -f "$log_file" ]; then
    red "    ✗ missing companion log: ${log_file#$REPO_ROOT/}"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$fixture_name (missing log)")
    return
  fi

  local step exit_code expected_bucket
  step="$(json_string "$expected_json" step)"
  exit_code="$(json_number "$expected_json" exitCode)"
  expected_bucket="$(json_string "$expected_json" failureModeBucket)"

  local mode_output
  case "$step" in
    generator) mode_output="$(detect_generator_failure_mode "$log_file" "$exit_code")" ;;
    tsc)       mode_output="$(detect_tsc_failure_mode "$log_file" "$exit_code")" ;;
    *)
      red "    ✗ unknown step '$step' in $expected_json"
      FAIL=$((FAIL + 1))
      FAILED_NAMES+=("$fixture_name (bad step)")
      return
      ;;
  esac

  gray "    detector → $mode_output"
  local fixture_failed_before
  fixture_failed_before="$FAIL"

  # Assertion 1: bucket prefix matches.
  local actual_bucket
  actual_bucket="$(printf '%s' "$mode_output" | awk '{print $1}')"
  if [ "$actual_bucket" = "$expected_bucket" ]; then
    green "    ✓ bucket = $expected_bucket"
    PASS=$((PASS + 1))
  else
    red "    ✗ bucket mismatch: expected '$expected_bucket', got '$actual_bucket'"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$fixture_name (bucket)")
  fi

  # Assertion 2: every required substring is present.
  while IFS= read -r needle; do
    [ -z "$needle" ] && continue
    assert_contains "contains '$needle'" "$mode_output" "$needle"
  done < <(json_string_array "$expected_json" failureModeContains)

  # Assertion 3: sanitizer would accept this output.
  assert_failure_mode_clean "passes sanitizer guarantees" "$mode_output"

  # Assertion 4: every expected import is extracted from the log.
  local extracted
  extracted="$(extract_datefns_imports "$log_file" 2>/dev/null || true)"
  local actual_json imports_tmp
  imports_tmp="$(mktemp)"
  printf '%s\n' "$extracted" | sed '/^$/d' > "$imports_tmp"
  actual_json="$(mktemp)"
  write_actual_snapshot "$actual_json" "$step" "$exit_code" "$actual_bucket" "$mode_output" "$imports_tmp"
  rm -f "$imports_tmp"

  while IFS= read -r want; do
    [ -z "$want" ] && continue
    if printf '%s\n' "$extracted" | grep -qx -- "$want"; then
      green "    ✓ extractor found '$want'"
      PASS=$((PASS + 1))
    else
      red "    ✗ extractor missed '$want'"
      red "        extractor output: $(printf '%s' "$extracted" | tr '\n' ' ')"
      FAIL=$((FAIL + 1))
      FAILED_NAMES+=("$fixture_name (import: $want)")
    fi
  done < <(json_string_array "$expected_json" imports)

  if [ "$FAIL" -ne "$fixture_failed_before" ]; then
    emit_snapshot_diff "$expected_json" "$actual_json"
  fi
  rm -f "$actual_json"
}

# ── main ────────────────────────────────────────────────────────────────────
filter="${1:-*}"
shopt -s nullglob
fixtures=( "$FIXTURE_DIR"/${filter}.expected.json )
shopt -u nullglob

if [ "${#fixtures[@]}" -eq 0 ]; then
  red "No fixtures matched filter '$filter' in ${FIXTURE_DIR#$REPO_ROOT/}"
  exit 1
fi

bold "datefns-precommit.sh — fixture-driven detector tests"
gray "  hook under test: ${HOOK_SRC#$REPO_ROOT/}"
gray "  fixture dir:     ${FIXTURE_DIR#$REPO_ROOT/}"
gray "  fixtures:        ${#fixtures[@]}"
echo ""

for fx in "${fixtures[@]}"; do
  run_fixture "$fx"
  echo ""
done

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
green "✓ All $PASS assertions passed across ${#fixtures[@]} fixture(s)."
exit 0
