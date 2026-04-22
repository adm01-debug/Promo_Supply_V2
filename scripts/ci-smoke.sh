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

# Optional args:
#   $1                       path to vitest smoke test  (default: src/test/dateFns.smoke.test.ts)
#   $2 / --package-json=<p>  path to alternate package.json used for the pinned
#                            date-fns version check (monorepo support).
#                            Defaults to ./package.json. Exported as
#                            SMOKE_PACKAGE_JSON so the smoke test's beforeAll
#                            versions log reads the SAME file as the bash check.
SMOKE_TEST_PATH=""
SMOKE_PACKAGE_JSON=""
for arg in "$@"; do
  case "$arg" in
    --package-json=*) SMOKE_PACKAGE_JSON="${arg#--package-json=}" ;;
    --help|-h)
      sed -n '14,21p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*) echo "✗ Unknown flag: $arg" >&2; exit 2 ;;
    *)
      if [ -z "$SMOKE_TEST_PATH" ]; then SMOKE_TEST_PATH="$arg"
      elif [ -z "$SMOKE_PACKAGE_JSON" ]; then SMOKE_PACKAGE_JSON="$arg"
      else echo "✗ Unexpected positional arg: $arg" >&2; exit 2
      fi
      ;;
  esac
done
SMOKE_TEST_PATH="${SMOKE_TEST_PATH:-src/test/dateFns.smoke.test.ts}"
SMOKE_PACKAGE_JSON="${SMOKE_PACKAGE_JSON:-package.json}"
export SMOKE_PACKAGE_JSON

if [ ! -f "$SMOKE_TEST_PATH" ]; then
  echo "✗ Smoke test file not found: $SMOKE_TEST_PATH" >&2
  echo "  Usage: $0 [path/to/smoke.test.ts] [path/to/package.json] [--package-json=<path>]" >&2
  exit 2
fi
if [ ! -f "$SMOKE_PACKAGE_JSON" ]; then
  echo "✗ package.json not found: $SMOKE_PACKAGE_JSON" >&2
  echo "  Pass an existing file via positional arg #2 or --package-json=<path>." >&2
  exit 2
fi

echo "▶ Smoke test target: $SMOKE_TEST_PATH"
echo "▶ Pin source       : $SMOKE_PACKAGE_JSON"

# ─────────────────────────────────────────────────────────────────────────────
# Summary state — populated as steps run; printed by trap on EXIT.
# ─────────────────────────────────────────────────────────────────────────────
DATEFNS_INSTALLED=""
DATEFNS_LOCKED=""
DATEFNS_VERSION_OK=0
VERIFY_FILES_RAN=0
VERIFY_FILES_OK=0
VERIFY_SMOKE_DRYRUN_RAN=0
VERIFY_SMOKE_DRYRUN_OK=0
ESLINT_FULL_RAN=0
ESLINT_FULL_OK=0
ESLINT_RAN=0
ESLINT_OK=0
SMOKE_TSC_RAN=0
SMOKE_TSC_EXIT=0
SMOKE_VITEST_RAN=0
SMOKE_VITEST_EXIT=0
SMOKE_VITEST_DURATION=0
SCRIPT_START=$SECONDS

# Lockfile snapshot (computed by snapshot_lockfiles, surfaced in print_summary).
# Captured EARLY so it appears in the summary even when the lockfile-format
# guard exits before any other step runs.
LOCKFILE_BUN_LOCK_PRESENT=0
LOCKFILE_BUN_LOCK_BYTES=0
LOCKFILE_BUN_LOCKB_PRESENT=0
LOCKFILE_BUN_LOCKB_BYTES=0

# `stat -c %s` is GNU; macOS/BSD uses `stat -f %z`. Try GNU first, fall
# back to BSD, then to `wc -c` (always available). Returns 0 for missing
# files so arithmetic comparisons stay safe.
file_bytes() {
  local f="$1"
  [ -f "$f" ] || { echo 0; return; }
  local n
  n=$(stat -c %s "$f" 2>/dev/null \
    || stat -f %z "$f" 2>/dev/null \
    || wc -c <"$f" | tr -d ' \n')
  echo "${n:-0}"
}

snapshot_lockfiles() {
  if [ -f "bun.lock" ]; then
    LOCKFILE_BUN_LOCK_PRESENT=1
    LOCKFILE_BUN_LOCK_BYTES=$(file_bytes "bun.lock")
  fi
  if [ -f "bun.lockb" ]; then
    LOCKFILE_BUN_LOCKB_PRESENT=1
    LOCKFILE_BUN_LOCKB_BYTES=$(file_bytes "bun.lockb")
  fi
}

# Render bytes as e.g. "12.3 KB" / "1.4 MB" / "842 B". Pure awk so it works
# on macOS (no `numfmt`) without extra deps.
human_bytes() {
  awk -v b="${1:-0}" 'BEGIN{
    if (b+0 < 1024)         printf "%d B", b;
    else if (b+0 < 1048576) printf "%.1f KB", b/1024;
    else                    printf "%.1f MB", b/1048576;
  }'
}

snapshot_lockfiles

print_summary() {
  local overall_exit=$?
  local rule="────────────────────────────────────────────────────────────"
  local total_duration=$((SECONDS - SCRIPT_START))

  # date-fns line
  local datefns_line
  if [ -n "$DATEFNS_INSTALLED" ] && [ -n "$DATEFNS_LOCKED" ]; then
    if [ "$DATEFNS_VERSION_OK" -eq 1 ]; then
      datefns_line="$DATEFNS_INSTALLED (matches lockfile ✓)"
      if [ "${DATEFNS_RETRY_TRIGGERED:-0}" -eq 1 ]; then
        datefns_line="$datefns_line  [recovered after 1 retry]"
      fi
    else
      datefns_line="installed=$DATEFNS_INSTALLED locked=$DATEFNS_LOCKED ✗"
    fi
  else
    datefns_line="not verified ✗"
  fi

  # full eslint line
  local eslint_full_line
  if [ "$ESLINT_FULL_RAN" -eq 0 ]; then
    eslint_full_line="not run"
  elif [ "$ESLINT_FULL_OK" -eq 1 ]; then
    eslint_full_line="passed ✓"
  else
    eslint_full_line="✗ FAIL"
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

  # verify-datefns-files line
  local verify_files_line
  if [ "$VERIFY_FILES_RAN" -eq 0 ]; then
    verify_files_line="not run"
  elif [ "$VERIFY_FILES_OK" -eq 1 ]; then
    verify_files_line="verified ✓"
  else
    verify_files_line="✗ FAIL"
  fi

  # verify:datefns-smoke (dry-run) line
  local verify_smoke_dryrun_line
  if [ "$VERIFY_SMOKE_DRYRUN_RAN" -eq 0 ]; then
    verify_smoke_dryrun_line="not run"
  elif [ "$VERIFY_SMOKE_DRYRUN_OK" -eq 1 ]; then
    verify_smoke_dryrun_line="in sync ✓       (smoke test + manifest)"
  else
    verify_smoke_dryrun_line="✗ DRIFT         (smoke test or manifest)"
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
  printf "  Subpath files       : %s\n" "$verify_files_line"
  printf "  Smoke + manifest sync: %s\n" "$verify_smoke_dryrun_line"
  printf "  ESLint full project : %s\n" "$eslint_full_line"
  printf "  ESLint date-fns gate: %s\n" "$eslint_line"
  printf "  Smoke tsc           : %s\n" "$tsc_line"
  printf "  Smoke vitest        : %s\n" "$vitest_line"
  printf "  Smoke test file     : %s\n" "$SMOKE_TEST_PATH"
  printf "  Pin source          : %s\n" "$SMOKE_PACKAGE_JSON"

  # Lockfile snapshot — reflects state at script start (before any install).
  # Helps debug "why did frozen-lockfile fail?" / "why is locked= empty?"
  # without re-running. Sizes are informational only; ✓/✗ is the signal.
  local lock_text_line lock_bin_line
  if [ "$LOCKFILE_BUN_LOCK_PRESENT" -eq 1 ]; then
    lock_text_line="present ✓  ($(human_bytes "$LOCKFILE_BUN_LOCK_BYTES"))"
  else
    lock_text_line="missing ✗"
  fi
  if [ "$LOCKFILE_BUN_LOCKB_PRESENT" -eq 1 ]; then
    lock_bin_line="present  ($(human_bytes "$LOCKFILE_BUN_LOCKB_BYTES"))"
  else
    lock_bin_line="absent"
  fi
  printf "  Lockfile (bun.lock) : %s\n" "$lock_text_line"
  printf "  Lockfile (bun.lockb): %s\n" "$lock_bin_line"
  printf "  Logs                : %s/tsc-smoke.log\n" "$LOG_DIR"
  printf "                        %s/vitest-smoke.log\n" "$LOG_DIR"
  printf "                        %s/vitest-smoke.json\n" "$LOG_DIR"
  printf "                        %s/verify-datefns-smoke.log\n" "$LOG_DIR"
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

echo "▶ [1/10] Removing node_modules..."
rm -rf node_modules

echo "▶ [2/10] Evicting any cached date-fns tarballs..."
evict_datefns_cache

# ─────────────────────────────────────────────────────────────────────────────
# Lockfile-format guard.
#
# `bun install --frozen-lockfile` requires the text-format `bun.lock` (Bun
# ≥1.1.39 default). If the repo only ships the legacy binary `bun.lockb`,
# the install step below fails with a cryptic "lockfile not found" error
# AND every downstream verifier (resolve_locked_datefns, install-report,
# emit-mismatch-report) silently degrades to "(bun.lock not found)" — which
# masks real drift. Bail out early with the exact regen recipe instead.
#
# Exit codes (so CI / scripts can branch on the failure mode):
#   10 → bun.lockb present but bun.lock missing  (just needs regeneration)
#   11 → no lockfile at all                      (repo is uninitialized)
# Both are distinct from generic failures (exit 1) and arg errors (exit 2).
# ─────────────────────────────────────────────────────────────────────────────
readonly EXIT_LOCKFILE_LEGACY_ONLY=10
readonly EXIT_LOCKFILE_MISSING=11
if [ ! -f "bun.lock" ]; then
  if [ -f "bun.lockb" ]; then
    cat >&2 <<'EOF'
✗ Found legacy binary lockfile (bun.lockb) but no text lockfile (bun.lock).
  ci-smoke.sh and every date-fns verifier read bun.lock — the binary format
  cannot be parsed by Node, so version drift checks would silently degrade.

  Regenerate bun.lock as a text lockfile (run from the repo root):

      rm -rf node_modules
      bun install --save-text-lockfile      # writes bun.lock alongside bun.lockb
      git add bun.lock
      # Optional: drop the legacy binary if your team is fully on text-format
      # git rm bun.lockb

  Then re-run:  bun run ci:smoke
EOF
    echo "  (exit code: $EXIT_LOCKFILE_LEGACY_ONLY — legacy lockfile only)" >&2
    exit "$EXIT_LOCKFILE_LEGACY_ONLY"
  else
    echo "✗ No lockfile found (neither bun.lock nor bun.lockb)." >&2
    echo "  Run: bun install --save-text-lockfile  (then commit bun.lock)." >&2
    echo "  (exit code: $EXIT_LOCKFILE_MISSING — no lockfile present)" >&2
    exit "$EXIT_LOCKFILE_MISSING"
  fi
fi

echo "▶ [3/10] Installing from frozen lockfile..."
bun install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Step 4 — date-fns version triple-check (installed vs locked vs pinned).
#
# Optional env flag DATEFNS_VERIFY_RETRY=1:
#   On the FIRST mismatch we'll evict any cached date-fns tarballs and run
#   `bun install --frozen-lockfile` ONCE more, then re-check. This guards
#   against transient CI flakes (corrupt cache hit, partial install, NFS
#   write lag) without masking real drift — a second mismatch still fails.
#   Default OFF for backwards compatibility; opt in via `DATEFNS_VERIFY_RETRY=1`.
# ─────────────────────────────────────────────────────────────────────────────
DATEFNS_RETRY_ENABLED="${DATEFNS_VERIFY_RETRY:-0}"
DATEFNS_RETRY_TRIGGERED=0

read_pinned_version() {
  node -e '
    const p = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    process.stdout.write(p.dependencies?.["date-fns"] || p.devDependencies?.["date-fns"] || "");
  ' "$SMOKE_PACKAGE_JSON"
}

# Sets DATEFNS_INSTALLED, DATEFNS_LOCKED, DATEFNS_PINNED + MISMATCH_REASON.
# Returns 0 when all three agree, 1 otherwise. Never exits — the caller
# decides whether to retry or fail.
check_datefns_versions() {
  DATEFNS_INSTALLED="$(node -p "require('./node_modules/date-fns/package.json').version" 2>/dev/null || echo "")"
  DATEFNS_LOCKED="$(resolve_locked_datefns)"
  DATEFNS_PINNED="$(read_pinned_version)"
  MISMATCH_REASON=""
  if [ -z "$DATEFNS_INSTALLED" ]; then
    MISMATCH_REASON="installed version unreadable (node_modules/date-fns missing or corrupt)"
    return 1
  fi
  if [ -z "$DATEFNS_PINNED" ]; then
    MISMATCH_REASON="date-fns not declared in $SMOKE_PACKAGE_JSON"
    return 1
  fi
  if [ -n "$DATEFNS_LOCKED" ] && [ "$DATEFNS_INSTALLED" != "$DATEFNS_LOCKED" ]; then
    MISMATCH_REASON="installed=$DATEFNS_INSTALLED ≠ locked=$DATEFNS_LOCKED"
    return 1
  fi
  if [ "$DATEFNS_INSTALLED" != "$DATEFNS_PINNED" ]; then
    MISMATCH_REASON="installed=$DATEFNS_INSTALLED ≠ pinned=$DATEFNS_PINNED ($SMOKE_PACKAGE_JSON)"
    return 1
  fi
  return 0
}

echo "▶ [4/10] Confirming installed date-fns version matches lockfile and pin source ($SMOKE_PACKAGE_JSON)..."
if ! check_datefns_versions; then
  if [ "$DATEFNS_RETRY_ENABLED" = "1" ]; then
    DATEFNS_RETRY_TRIGGERED=1
    echo "⚠ date-fns mismatch detected: $MISMATCH_REASON" >&2
    echo "  DATEFNS_VERIFY_RETRY=1 → evicting cache and reinstalling once before re-checking..." >&2
    evict_datefns_cache
    rm -rf node_modules/date-fns
    bun install --frozen-lockfile
    if ! check_datefns_versions; then
      echo "✗ date-fns mismatch persists after retry: $MISMATCH_REASON" >&2
      exit 1
    fi
    echo "✓ date-fns mismatch resolved after one retry (was likely transient cache/install flake)."
  else
    echo "✗ date-fns mismatch: $MISMATCH_REASON" >&2
    echo "  Hint: set DATEFNS_VERIFY_RETRY=1 to auto-retry once on transient install/cache flakes." >&2
    exit 1
  fi
fi
DATEFNS_VERSION_OK=1
echo "✓ date-fns $DATEFNS_INSTALLED matches lockfile + pin source ($SMOKE_PACKAGE_JSON)."

echo "▶ [5/10] Verifying date-fns subpath files exist on disk..."
VERIFY_FILES_RAN=1
if ! node scripts/verify-datefns-files.mjs; then
  VERIFY_FILES_OK=0
  echo "✗ verify-datefns-files.mjs failed — broken install or missing subpath." >&2
  exit 1
fi
VERIFY_FILES_OK=1

echo "▶ [6/10] Printing install verification report..."
node scripts/install-report.mjs 2>&1 | tee "$LOG_DIR/install-report.txt"

# Run the full project ESLint gate EARLY so any lint regression — including
# date-fns barrel imports — fails the smoke job before we burn time on tsc
# and vitest. `set -euo pipefail` at the top guarantees an immediate exit on
# the first non-zero status; the explicit exit below is belt-and-suspenders
# and surfaces a targeted hint in the job log.
echo "▶ [7/10] ESLint gate: full project (--max-warnings=0)..."
ESLINT_FULL_RAN=1
bunx eslint . --max-warnings=0 2>&1 | tee "$LOG_DIR/eslint-full.log"
ESLINT_FULL_EXIT=${PIPESTATUS[0]}
if [ "$ESLINT_FULL_EXIT" -ne 0 ]; then
  ESLINT_FULL_OK=0
  echo "✗ ESLint failed (full project, --max-warnings=0). See $LOG_DIR/eslint-full.log." >&2
  echo "  Common cause: \`import { ... } from \"date-fns\"\` (barrel) — must be \`date-fns/<subpath>\`." >&2
  exit "$ESLINT_FULL_EXIT"
fi
ESLINT_FULL_OK=1

echo "▶ [8/10] ESLint gate: blocking date-fns barrel imports (--max-warnings=0)..."
ESLINT_RAN=1
if bunx eslint . --config eslint.date-fns.config.js --max-warnings=0; then
  ESLINT_OK=1
else
  ESLINT_OK=0
  exit 1
fi

echo "▶ [9/10] Running smoke test pipeline..."
# Mirror the verify-datefns-smoke.yml CI guard: fail fast if the committed
# src/test/dateFns.smoke.test.ts OR public/datefns-usage.json no longer matches
# what the generator would produce. The generator's --dry-run mode diffs both
# files and exits 1 on either drift. We capture the log so the summary block
# can point reviewers straight at it.
echo "▶ Verifying date-fns smoke test + manifest are in sync (generator dry-run)..."
VERIFY_SMOKE_DRYRUN_RAN=1
if node scripts/generate-datefns-smoke-test.mjs --dry-run 2>&1 | tee "$LOG_DIR/verify-datefns-smoke.log"; then
  VERIFY_SMOKE_DRYRUN_OK=1
else
  VERIFY_SMOKE_DRYRUN_OK=0
  echo "✗ Smoke test or manifest drift detected." >&2
  echo "  Affected files:" >&2
  echo "    - src/test/dateFns.smoke.test.ts" >&2
  echo "    - public/datefns-usage.json" >&2
  echo "  Fix locally:  bun run date-fns:smoke -- --force" >&2
  echo "  See log:      $LOG_DIR/verify-datefns-smoke.log" >&2
  exit 1
fi
echo "▶ Validating smoke test imports against tsconfig.smoke.json..."
SMOKE_TSC_RAN=1
bunx tsc --noEmit -p tsconfig.smoke.json 2>&1 | tee "$LOG_DIR/tsc-smoke.log"
SMOKE_TSC_EXIT=${PIPESTATUS[0]}
if [ "$SMOKE_TSC_EXIT" -eq 0 ]; then
  SMOKE_VITEST_RAN=1
  VITEST_START=$SECONDS
  # Stay aligned with the local `bun run test:date-fns` script. CI appends
  # the test path override + extra reporters/flags after `--`.
  bun run test:date-fns -- \
    "$SMOKE_TEST_PATH" \
    --reporter=json --outputFile="$LOG_DIR/vitest-smoke.json" \
    --hideSkippedTests \
    --printConsoleTrace \
    2>&1 | tee "$LOG_DIR/vitest-smoke.log"
  SMOKE_VITEST_EXIT=${PIPESTATUS[0]}
  SMOKE_VITEST_DURATION=$((SECONDS - VITEST_START))
fi

echo "▶ [10/10] Emitting dependency-health snapshot for smoke run..."
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
