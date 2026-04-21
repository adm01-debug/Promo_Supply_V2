#!/usr/bin/env bash
# Temporary fixture runner — confirms `import/no-unresolved` and `import/named`
# fire as expected on intentionally broken date-fns imports.
#
# Run:    bash eslint-rules/__fixtures__/run-import-validity.sh
# Expect: exit code 0 (all 3 fixtures failed ESLint as designed).
# If any fixture passes ESLint, the rule is misconfigured — exit 1.
#
# Cleanup: delete the .ts fixture files when you're done validating.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

FIXTURES=(
  "eslint-rules/__fixtures__/bad-date-fns-unresolved.ts:import/no-unresolved"
  "eslint-rules/__fixtures__/bad-date-fns-named.ts:import/named"
  "eslint-rules/__fixtures__/bad-date-fns-locale.ts:import/no-unresolved"
)

PASS=0
FAIL=0
echo "▶ Running ESLint import-validity fixtures (expecting each to FAIL)..."
echo ""

for entry in "${FIXTURES[@]}"; do
  file="${entry%%:*}"
  expected_rule="${entry##*:}"
  if [ ! -f "$file" ]; then
    echo "  ✗ MISSING fixture: $file"
    FAIL=$((FAIL + 1))
    continue
  fi

  echo "── $file (expecting $expected_rule) ──"
  output="$(bunx eslint --no-eslintrc=false --format stylish "$file" 2>&1 || true)"
  exit_code=$?
  echo "$output" | sed 's/^/    /'

  if echo "$output" | grep -q "$expected_rule"; then
    echo "  ✓ Fixture failed as expected (rule $expected_rule fired)."
    PASS=$((PASS + 1))
  else
    echo "  ✗ Fixture did NOT trigger $expected_rule — rule may be misconfigured."
    FAIL=$((FAIL + 1))
  fi
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Summary: $PASS/${#FIXTURES[@]} fixtures triggered the expected rule."
if [ "$FAIL" -gt 0 ]; then
  echo " ✗ $FAIL fixture(s) did not behave as expected."
  exit 1
fi
echo " ✅ All import-validity rules fire as designed."
echo ""
echo " Cleanup: rm eslint-rules/__fixtures__/bad-date-fns-{unresolved,named,locale}.ts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
