#!/usr/bin/env bash
# End-to-end date-fns smoke pipeline.
#
# Pipeline (all three steps must pass):
#   [1/3] Generate src/test/dateFns.smoke.test.ts from current src/ imports
#   [2/3] Verify every imported date-fns subpath exists in node_modules
#   [3/3] Run the generated vitest smoke test
#
# Usage:
#   bun run date-fns:smoke                            # incremental
#   bun run date-fns:smoke -- --force                 # always regenerate
#   bun run date-fns:smoke -- --report junit          # also emit JUnit XML
#   bun run date-fns:smoke -- --report junit \
#                             --report-path path.xml  # custom output path
#   bun run date-fns:smoke -- --help                  # show this help
#
# JUnit XML mode (--report junit) wires vitest's built-in `junit` reporter
# alongside the default `verbose` reporter so terminal output is unchanged
# but a machine-readable XML file is produced for CI test viewers
# (GitHub Actions test summary, JUnit-aware dashboards, etc.). Default
# output path is `ci-artifacts/datefns-smoke-junit.xml`; override with
# `--report-path <path>` (also via env DATEFNS_SMOKE_JUNIT_PATH).
#
# Exit codes:
#   0  all steps passed
#   1  generation, verification, or vitest failed (see the failed step above)
#   2  invalid CLI flag (e.g. unknown --report value)
set -euo pipefail

REGEN_FLAG="--if-changed"
REPORT_FORMAT=""
# Default JUnit output path when --report junit is requested without an
# explicit --report-path. Lives under ci-artifacts/ so it's picked up by the
# existing artifact upload steps in pr-date-fns-smoke.yml / smoke-date-fns.yml
# without any additional workflow plumbing.
REPORT_PATH="${DATEFNS_SMOKE_JUNIT_PATH:-ci-artifacts/datefns-smoke-junit.xml}"

# Tiny manual flag parser — keeps the script dep-free (no getopt) and keeps
# `--` passthrough behavior intact for `bun run … -- --flag` invocations.
while [ $# -gt 0 ]; do
  case "$1" in
    --force|-f)
      REGEN_FLAG=""
      shift
      ;;
    --report)
      if [ $# -lt 2 ]; then
        printf '✗ --report requires a value (currently only `junit` is supported).\n' >&2
        exit 2
      fi
      REPORT_FORMAT="$2"
      shift 2
      ;;
    --report=*)
      REPORT_FORMAT="${1#--report=}"
      shift
      ;;
    --report-path)
      if [ $# -lt 2 ]; then
        printf '✗ --report-path requires a value.\n' >&2
        exit 2
      fi
      REPORT_PATH="$2"
      shift 2
      ;;
    --report-path=*)
      REPORT_PATH="${1#--report-path=}"
      shift
      ;;
    --help|-h)
      sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      printf '✗ Unknown flag: %s (try --help)\n' "$1" >&2
      exit 2
      ;;
  esac
done

# Validate --report value before doing any work — fail fast on typos like
# `--report junitt` instead of running the whole pipeline only to discover
# vitest doesn't know the reporter.
if [ -n "$REPORT_FORMAT" ] && [ "$REPORT_FORMAT" != "junit" ]; then
  printf '✗ Unsupported --report format: %s (only `junit` is supported)\n' "$REPORT_FORMAT" >&2
  exit 2
fi

# ── ANSI helpers (TTY only) ───────────────────────────────────────────────────
if [ -t 1 ]; then
  C_BOLD=$'\033[1m'; C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'
  C_RED=$'\033[31m'; C_GRAY=$'\033[90m'; C_RESET=$'\033[0m'
else
  C_BOLD=""; C_CYAN=""; C_GREEN=""; C_RED=""; C_GRAY=""; C_RESET=""
fi
RULE="────────────────────────────────────────────────────────────────"

START_TS=$(date +%s)
step() {
  local n=$1 label=$2
  printf '\n%s%s%s\n' "$C_CYAN" "$RULE" "$C_RESET"
  printf '%s▶ [%s] %s%s\n' "$C_BOLD" "$n" "$label" "$C_RESET"
  printf '%s%s%s\n' "$C_CYAN" "$RULE" "$C_RESET"
}
fail() {
  local n=$1 label=$2
  printf '\n%s%s✗ [%s] %s failed — see output above.%s\n' "$C_BOLD" "$C_RED" "$n" "$label" "$C_RESET"
  exit 1
}

# ── Step 1: regenerate ────────────────────────────────────────────────────────
if [ -n "$REGEN_FLAG" ]; then
  step "1/3" "Regenerate smoke test from src/ imports (incremental: $REGEN_FLAG)"
else
  step "1/3" "Regenerate smoke test from src/ imports (forced)"
fi
node scripts/generate-datefns-smoke-test.mjs $REGEN_FLAG \
  || fail "1/3" "smoke-test generation"

# ── Step 2: verify subpath files exist ────────────────────────────────────────
step "2/3" "Verify date-fns subpath files exist on disk"
node scripts/verify-datefns-files.mjs \
  || fail "2/3" "subpath verification"

# ── Step 3: vitest ────────────────────────────────────────────────────────────
# Build the reporter list dynamically. Default: just `verbose` (unchanged
# terminal output). With --report junit: `verbose` + `junit`, plus the env
# var vitest reads for JUnit's output path. The XML file is written even
# when tests fail so CI test viewers can show per-test diagnostics.
VITEST_ARGS=("run" "src/test/dateFns.smoke.test.ts" "--reporter=verbose")
if [ "$REPORT_FORMAT" = "junit" ]; then
  step "3/3" "Run vitest smoke test (verbose + JUnit XML → $REPORT_PATH)"
  mkdir -p "$(dirname "$REPORT_PATH")"
  # Pin the JUnit output to a file via vitest's documented --outputFile.junit
  # selector. The bare `--outputFile=<path>` form would also work since
  # only one reporter writes files here, but the namespaced form is
  # explicit and survives a future second file-writing reporter being
  # added without silently overwriting this artifact.
  VITEST_ARGS+=("--reporter=junit" "--outputFile.junit=$REPORT_PATH")
  # Stable, human-readable suite name for downstream CI test viewers
  # (instead of the default `vitest tests`).
  export VITEST_JUNIT_SUITE_NAME="date-fns subpath smoke"
else
  step "3/3" "Run vitest smoke test (src/test/dateFns.smoke.test.ts)"
fi

npx vitest "${VITEST_ARGS[@]}" \
  || fail "3/3" "vitest smoke test"

# Sanity-check: when JUnit was requested, confirm the file actually
# materialized. A missing file here usually means the installed vitest
# version routes JUnit output through a different env var — surface that
# clearly instead of silently shipping a "passing" run with no artifact.
if [ "$REPORT_FORMAT" = "junit" ] && [ ! -s "$REPORT_PATH" ]; then
  printf '\n%s%s⚠ JUnit reporter ran but no XML was written to %s%s\n' \
    "$C_BOLD" "$C_RED" "$REPORT_PATH" "$C_RESET" >&2
  printf '%s   (vitest may need VITEST_JUNIT_OUTPUT_FILE or --outputFile.junit set differently — check your vitest version)%s\n' \
    "$C_GRAY" "$C_RESET" >&2
  exit 1
fi

# ── Summary ───────────────────────────────────────────────────────────────────
ELAPSED=$(( $(date +%s) - START_TS ))
printf '\n%s%s%s\n' "$C_GREEN" "$RULE" "$C_RESET"
printf '%s%s✓ date-fns smoke pipeline passed in %ss%s\n' "$C_BOLD" "$C_GREEN" "$ELAPSED" "$C_RESET"
printf '%s   generation → verification → vitest — all green%s\n' "$C_GRAY" "$C_RESET"
if [ "$REPORT_FORMAT" = "junit" ]; then
  printf '%s   JUnit XML: %s%s\n' "$C_GRAY" "$REPORT_PATH" "$C_RESET"
fi
printf '%s%s%s\n' "$C_GREEN" "$RULE" "$C_RESET"
