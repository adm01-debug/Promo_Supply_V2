#!/usr/bin/env bash
# Temporary fixture runner — confirms `import/no-unresolved` and `import/named`
# fire as expected on intentionally broken date-fns / react imports.
#
# Run:    bash eslint-rules/__fixtures__/run-import-validity.sh
# Expect: exit code 0 if all fixtures match the expected rule (or are
#         documented as a known-skip), 1 otherwise.
#
# IMPORTANT — `import/named` on TS files:
#   eslint-plugin-import's `named` rule does NOT type-check TypeScript files
#   by default; it only inspects ES module export syntax. To enforce named
#   exports against TS .d.ts shapes you would need `eslint-plugin-import-x`
#   with `import-x/parsers: { '@typescript-eslint/parser': ['.ts','.tsx'] }`,
#   or rely on `tsc --noEmit` (which does catch this — see typecheck CI job).
#   The `bad-date-fns-named.ts` fixture is therefore expected to be caught by
#   tsc, NOT by ESLint, and is run here only to document that contract.
#
# Cleanup:
#   rm -rf src/__eslint-fixtures__
#   rm eslint-rules/__fixtures__/run-import-validity.sh
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

# Each entry: file:expected-rule:enforced-by (eslint|tsc)
FIXTURES=(
  "src/__eslint-fixtures__/bad-date-fns-unresolved.ts:import/no-unresolved:eslint"
  "src/__eslint-fixtures__/bad-date-fns-named.ts:import/named:tsc"
  "src/__eslint-fixtures__/bad-date-fns-locale.ts:import/no-unresolved:eslint"
)

PASS=0
FAIL=0
echo "▶ Running ESLint import-validity fixtures..."
echo ""

for entry in "${FIXTURES[@]}"; do
  IFS=':' read -r file expected_rule enforced_by <<<"$entry"
  if [ ! -f "$file" ]; then
    echo "  ✗ MISSING fixture: $file"
    FAIL=$((FAIL + 1))
    continue
  fi

  echo "── $file"
  echo "   expected: $expected_rule  (enforced by: $enforced_by)"
  if [ "$enforced_by" = "eslint" ]; then
    output="$(bunx eslint --format stylish "$file" 2>&1 || true)"
    echo "$output" | sed 's/^/    /'
    if echo "$output" | grep -q "$expected_rule"; then
      echo "  ✓ ESLint fired $expected_rule as expected."
      PASS=$((PASS + 1))
    else
      echo "  ✗ ESLint did NOT trigger $expected_rule — rule may be misconfigured."
      FAIL=$((FAIL + 1))
    fi
  else
    # tsc-enforced: run tsc on just this file and look for any error.
    tsc_output="$(bunx tsc --noEmit --strict --moduleResolution bundler --module esnext --target es2020 --jsx react-jsx --esModuleInterop --skipLibCheck "$file" 2>&1 || true)"
    echo "$tsc_output" | sed 's/^/    /'
    if echo "$tsc_output" | grep -qE "error TS(2305|2724|2614|2307):"; then
      echo "  ✓ tsc reported the expected missing-export / unresolved-module error."
      PASS=$((PASS + 1))
    else
      echo "  ✗ tsc did NOT flag the broken import — investigate."
      FAIL=$((FAIL + 1))
    fi
  fi
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Summary: $PASS/${#FIXTURES[@]} fixtures matched their expected gate."
if [ "$FAIL" -gt 0 ]; then
  echo " ✗ $FAIL fixture(s) did not behave as expected."
  exit 1
fi
echo " ✅ All import-validity gates fire as designed."
echo ""
echo " Cleanup when done:"
echo "   rm -rf src/__eslint-fixtures__"
echo "   rm eslint-rules/__fixtures__/run-import-validity.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
