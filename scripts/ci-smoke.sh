#!/usr/bin/env bash
set -euo pipefail

# Cross-platform: macOS, Linux, WSL, and Windows (Git Bash / MSYS / Cygwin).
# Must be invoked through bash (not cmd.exe). On Windows use Git Bash, WSL,
# or `bun run ci:smoke`.
source "$(dirname "$0")/lib/preflight.sh"
preflight

# ci-logs/ is generated for CI artifact upload. Safe to delete locally.
LOG_DIR="ci-logs"
mkdir -p "$LOG_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# Summary state — populated as steps run; printed by trap on EXIT.
# ─────────────────────────────────────────────────────────────────────────────
DATEFNS_INSTALLED=""
DATEFNS_LOCKED=""
DATEFNS_VERSION_OK=0
ESLINT_RAN=0
ESLINT_OK=0
SMOKE_TSC_RAN=0
SMOKE_TSC_EXIT=0
SMOKE_VITEST_RAN=0
SMOKE_VITEST_EXIT=0
SMOKE_VITEST_DURATION=0
SCRIPT_START=$SECONDS

print_summary() {
  local overall_exit=$?
  local rule="────────────────────────────────────────────────────────────"
  local total_duration=$((SECONDS - SCRIPT_START))

  # date-fns line
  local datefns_line
  if [ -n "$DATEFNS_INSTALLED" ] && [ -n "$DATEFNS_LOCKED" ]; then
    if [ "$DATEFNS_VERSION_OK" -eq 1 ]; then
      datefns_line="$DATEFNS_INSTALLED (matches lockfile ✓)"
    else
      datefns_line="installed=$DATEFNS_INSTALLED locked=$DATEFNS_LOCKED ✗"
    fi
  else
    datefns_line="not verified ✗"
  fi

  # eslint line
  local eslint_line
  if [ "$ESLINT_RAN" -eq 0 ]; then
    eslint_line="not run"
  elif [ "$ESLINT_OK" -eq 1 ]; then
    eslint_line="passed ✓"
  else
    eslint_line="✗ FAIL"
  fi

  # tsc line
  local tsc_line
  if [ "$SMOKE_TSC_RAN" -eq 0 ]; then
    tsc_line="not run"
  elif [ "$SMOKE_TSC_EXIT" -eq 0 ]; then
    tsc_line="passed ✓        (tsconfig.smoke.json)"
  else
    tsc_line="✗ FAIL          (tsconfig.smoke.json)"
  fi

  # vitest line — try to parse JSON for pass/fail counts.
  local vitest_line
  if [ "$SMOKE_TSC_RAN" -eq 1 ] && [ "$SMOKE_TSC_EXIT" -ne 0 ]; then
    vitest_line="skipped (tsc failed)"
  elif [ "$SMOKE_VITEST_RAN" -eq 0 ]; then
    vitest_line="not run"
  else
    local parsed
    parsed=$(node -e '
      try {
        const fs = require("fs");
        const p = process.argv[1];
        if (!fs.existsSync(p)) { process.stdout.write(""); process.exit(0); }
        const j = JSON.parse(fs.readFileSync(p, "utf8"));
        const passed = j.numPassedTests ?? 0;
        const failed = j.numFailedTests ?? 0;
        let firstFail = "";
        if (failed > 0 && Array.isArray(j.testResults)) {
          outer: for (const f of j.testResults) {
            for (const a of (f.assertionResults || [])) {
              if (a.status === "failed") { firstFail = a.fullName || a.title || ""; break outer; }
            }
          }
        }
        process.stdout.write(JSON.stringify({ passed, failed, firstFail }));
      } catch (e) { process.stdout.write(""); }
    ' "$LOG_DIR/vitest-smoke.json" 2>/dev/null || echo "")

    if [ -n "$parsed" ]; then
      local passed failed first_fail
      passed=$(echo "$parsed" | node -e 'let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s).passed))}catch(_){process.stdout.write("?")}})')
      failed=$(echo "$parsed" | node -e 'let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s).failed))}catch(_){process.stdout.write("?")}})')
      first_fail=$(echo "$parsed" | node -e 'let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).firstFail||"")}catch(_){process.stdout.write("")}})')
      if [ "$SMOKE_VITEST_EXIT" -eq 0 ]; then
        vitest_line="${passed} passed / ${failed} failed in ${SMOKE_VITEST_DURATION}s ✓"
      else
        vitest_line="${passed} passed / ${failed} failed in ${SMOKE_VITEST_DURATION}s ✗"
        if [ -n "$first_fail" ]; then
          vitest_line="$vitest_line
                        first failure: $first_fail"
        fi
      fi
    else
      if [ "$SMOKE_VITEST_EXIT" -eq 0 ]; then
        vitest_line="passed in ${SMOKE_VITEST_DURATION}s ✓"
      else
        vitest_line="✗ FAIL in ${SMOKE_VITEST_DURATION}s"
      fi
    fi
  fi

  # Result line
  local result_line
  if [ "$overall_exit" -eq 0 ]; then
    result_line="✅ PASS"
  else
    result_line="❌ FAIL"
    if [ "$SMOKE_VITEST_RAN" -eq 1 ] && [ "$SMOKE_VITEST_EXIT" -ne 0 ]; then
      result_line="$result_line — see $LOG_DIR/vitest-smoke.log"
    elif [ "$SMOKE_TSC_RAN" -eq 1 ] && [ "$SMOKE_TSC_EXIT" -ne 0 ]; then
      result_line="$result_line — see $LOG_DIR/tsc-smoke.log"
    fi
  fi

  echo ""
  echo "$rule"
  echo "  ci-smoke.sh summary"
  echo "$rule"
  printf "  date-fns version    : %s\n" "$datefns_line"
  printf "  ESLint date-fns gate: %s\n" "$eslint_line"
  printf "  Smoke tsc           : %s\n" "$tsc_line"
  printf "  Smoke vitest        : %s\n" "$vitest_line"
  printf "  Logs                : %s/tsc-smoke.log\n" "$LOG_DIR"
  printf "                        %s/vitest-smoke.log\n" "$LOG_DIR"
  printf "                        %s/vitest-smoke.json\n" "$LOG_DIR"
  printf "                        %s/datefns-smoke-health.json\n" "$LOG_DIR"
  printf "  Total duration      : %ss\n" "$total_duration"
  printf "  Result              : %s\n" "$result_line"
  echo "$rule"

  # Tail relevant log on failure to keep failure context near the bottom.
  if [ "$SMOKE_VITEST_RAN" -eq 1 ] && [ "$SMOKE_VITEST_EXIT" -ne 0 ] && [ -f "$LOG_DIR/vitest-smoke.log" ]; then
    echo ""
    echo "── last 40 lines of $LOG_DIR/vitest-smoke.log ──"
    tail -n 40 "$LOG_DIR/vitest-smoke.log" || true
  elif [ "$SMOKE_TSC_RAN" -eq 1 ] && [ "$SMOKE_TSC_EXIT" -ne 0 ] && [ -f "$LOG_DIR/tsc-smoke.log" ]; then
    echo ""
    echo "── last 30 lines of $LOG_DIR/tsc-smoke.log ──"
    tail -n 30 "$LOG_DIR/tsc-smoke.log" || true
  fi
}
trap print_summary EXIT

echo "▶ [1/5] Removing node_modules..."
rm -rf node_modules

echo "▶ [2/5] Evicting any cached date-fns tarballs..."
evict_datefns_cache

echo "▶ [3/5] Installing from frozen lockfile..."
bun install --frozen-lockfile

echo "▶ [4/5] Confirming installed date-fns version matches lockfile..."
DATEFNS_INSTALLED="$(node -p "require('./node_modules/date-fns/package.json').version")"
DATEFNS_LOCKED="$(resolve_locked_datefns)"
if [ -n "$DATEFNS_LOCKED" ] && [ "$DATEFNS_INSTALLED" != "$DATEFNS_LOCKED" ]; then
  echo "✗ date-fns drift: installed=$DATEFNS_INSTALLED, locked=$DATEFNS_LOCKED" >&2
  exit 1
fi
DATEFNS_VERSION_OK=1
echo "✓ date-fns $DATEFNS_INSTALLED matches lockfile."

echo "▶ [5/7] Printing install verification report..."
node scripts/install-report.mjs

echo "▶ [6/7] ESLint gate: blocking date-fns barrel imports (--max-warnings=0)..."
ESLINT_RAN=1
if bunx eslint . --config eslint.date-fns.config.js --max-warnings=0; then
  ESLINT_OK=1
else
  ESLINT_OK=0
  exit 1
fi

echo "▶ [7/7] Verifying date-fns subpath files + running smoke test..."
node scripts/verify-datefns-files.mjs
echo "▶ Verifying date-fns smoke test is in sync..."
node scripts/generate-datefns-smoke-test.mjs --dry-run
echo "▶ Validating smoke test imports against tsconfig.smoke.json..."
SMOKE_TSC_RAN=1
bunx tsc --noEmit -p tsconfig.smoke.json 2>&1 | tee "$LOG_DIR/tsc-smoke.log"
SMOKE_TSC_EXIT=${PIPESTATUS[0]}
if [ "$SMOKE_TSC_EXIT" -eq 0 ]; then
  SMOKE_VITEST_RAN=1
  VITEST_START=$SECONDS
  bunx vitest run src/test/dateFns.smoke.test.ts \
    --reporter=verbose \
    --reporter=json --outputFile="$LOG_DIR/vitest-smoke.json" \
    --hideSkippedTests \
    --printConsoleTrace \
    2>&1 | tee "$LOG_DIR/vitest-smoke.log"
  SMOKE_VITEST_EXIT=${PIPESTATUS[0]}
  SMOKE_VITEST_DURATION=$((SECONDS - VITEST_START))
fi

echo "▶ [8/8] Emitting dependency-health snapshot for smoke run..."
node scripts/emit-smoke-health.mjs \
  --tsc-exit "$SMOKE_TSC_EXIT" \
  --vitest-exit "$SMOKE_VITEST_EXIT" \
  --out "$LOG_DIR/datefns-smoke-health.json" || true

if [ "$SMOKE_TSC_EXIT" -ne 0 ]; then
  echo "✗ Focused tsc failed. See $LOG_DIR/tsc-smoke.log (uploaded as CI artifact)." >&2
  exit "$SMOKE_TSC_EXIT"
fi
if [ "$SMOKE_VITEST_EXIT" -ne 0 ]; then
  echo "✗ Smoke vitest failed. See $LOG_DIR/vitest-smoke.log (uploaded as CI artifact)." >&2
  exit "$SMOKE_VITEST_EXIT"
fi

echo "✅ Smoke check passed: clean install + cache evict + version match + file verify + smoke test green."
