#!/usr/bin/env bash
# End-to-end date-fns smoke pipeline.
#
# Pipeline (all three steps must pass):
#   [1/3] Generate src/test/dateFns.smoke.test.ts from current src/ imports
#   [2/3] Verify every imported date-fns subpath exists in node_modules
#   [3/3] Run the generated vitest smoke test
#
# Usage:
#   bun run date-fns:smoke                            # incremental, single run
#   bun run date-fns:smoke -- --force                 # always regenerate
#   bun run date-fns:smoke -- --watch                 # re-run on src/ changes
#   bun run date-fns:smoke -- --watch --force         # forced regen each cycle
#   bun run date-fns:smoke -- --report junit          # also emit JUnit XML
#   bun run date-fns:smoke -- --report junit \
#                             --report-path path.xml  # custom output path
#   bun run date-fns:smoke -- --help                  # show this help
#
# Watch mode (--watch) runs the full 3-step pipeline once, then re-runs the
# whole pipeline whenever any *.ts/*.tsx/*.mts/*.cts/*.js/*.jsx/*.mjs/*.cjs
# file under src/ is added, modified, or deleted. A failed cycle does NOT
# exit watch mode — it prints the failure, waits for the next change, and
# re-runs. Press Ctrl-C to exit. Coalesces bursts of saves (debounce 250ms)
# so a multi-file save triggers a single re-run.
#
# JUnit XML mode (--report junit) wires vitest's built-in `junit` reporter
# alongside the default `verbose` reporter so terminal output is unchanged
# but a machine-readable XML file is produced for CI test viewers
# (GitHub Actions test summary, JUnit-aware dashboards, etc.). Default
# output path is `ci-artifacts/datefns-smoke-junit.xml`; override with
# `--report-path <path>` (also via env DATEFNS_SMOKE_JUNIT_PATH).
#
# Exit codes:
#   0  all steps passed (single-run mode) / watch mode exited cleanly via Ctrl-C
#   1  generation, verification, or vitest failed (single-run mode only)
#   2  invalid CLI flag (e.g. unknown --report value)
set -uo pipefail

REGEN_FLAG="--if-changed"
REPORT_FORMAT=""
WATCH_MODE=0
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
    --watch|-w)
      WATCH_MODE=1
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
      sed -n '2,33p' "$0" | sed 's/^# \{0,1\}//'
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
  C_RED=$'\033[31m'; C_GRAY=$'\033[90m'; C_YELLOW=$'\033[33m'; C_RESET=$'\033[0m'
else
  C_BOLD=""; C_CYAN=""; C_GREEN=""; C_RED=""; C_GRAY=""; C_YELLOW=""; C_RESET=""
fi
RULE="────────────────────────────────────────────────────────────────"

step() {
  local n=$1 label=$2
  printf '\n%s%s%s\n' "$C_CYAN" "$RULE" "$C_RESET"
  printf '%s▶ [%s] %s%s\n' "$C_BOLD" "$n" "$label" "$C_RESET"
  printf '%s%s%s\n' "$C_CYAN" "$RULE" "$C_RESET"
}

# ── Pipeline (single cycle) ──────────────────────────────────────────────────
# Returns 0 on success, non-zero on the first failed step. Wrapped as a
# function so watch mode can re-invoke it without duplicating the body and,
# crucially, WITHOUT exiting the script when a step fails (callers handle
# the return code).
run_pipeline() {
  local cycle_start cycle_elapsed
  cycle_start=$(date +%s)

  if [ -n "$REGEN_FLAG" ]; then
    step "1/3" "Regenerate smoke test from src/ imports (incremental: $REGEN_FLAG)"
  else
    step "1/3" "Regenerate smoke test from src/ imports (forced)"
  fi
  if ! node scripts/generate-datefns-smoke-test.mjs $REGEN_FLAG; then
    printf '\n%s%s✗ [1/3] smoke-test generation failed%s\n' "$C_BOLD" "$C_RED" "$C_RESET" >&2
    return 1
  fi

  step "2/3" "Verify date-fns subpath files exist on disk"
  if ! node scripts/verify-datefns-files.mjs; then
    printf '\n%s%s✗ [2/3] subpath verification failed%s\n' "$C_BOLD" "$C_RED" "$C_RESET" >&2
    return 1
  fi

  local VITEST_ARGS=("run" "src/test/dateFns.smoke.test.ts" "--reporter=verbose")
  if [ "$REPORT_FORMAT" = "junit" ]; then
    step "3/3" "Run vitest smoke test (verbose + JUnit XML → $REPORT_PATH)"
    mkdir -p "$(dirname "$REPORT_PATH")"
    VITEST_ARGS+=("--reporter=junit" "--outputFile.junit=$REPORT_PATH")
    export VITEST_JUNIT_SUITE_NAME="date-fns subpath smoke"
  else
    step "3/3" "Run vitest smoke test (src/test/dateFns.smoke.test.ts)"
  fi

  if ! npx vitest "${VITEST_ARGS[@]}"; then
    printf '\n%s%s✗ [3/3] vitest smoke test failed%s\n' "$C_BOLD" "$C_RED" "$C_RESET" >&2
    return 1
  fi

  if [ "$REPORT_FORMAT" = "junit" ] && [ ! -s "$REPORT_PATH" ]; then
    printf '\n%s%s⚠ JUnit reporter ran but no XML was written to %s%s\n' \
      "$C_BOLD" "$C_RED" "$REPORT_PATH" "$C_RESET" >&2
    printf '%s   (vitest may need VITEST_JUNIT_OUTPUT_FILE or --outputFile.junit set differently — check your vitest version)%s\n' \
      "$C_GRAY" "$C_RESET" >&2
    return 1
  fi

  cycle_elapsed=$(( $(date +%s) - cycle_start ))
  printf '\n%s%s%s\n' "$C_GREEN" "$RULE" "$C_RESET"
  printf '%s%s✓ date-fns smoke pipeline passed in %ss%s\n' "$C_BOLD" "$C_GREEN" "$cycle_elapsed" "$C_RESET"
  printf '%s   generation → verification → vitest — all green%s\n' "$C_GRAY" "$C_RESET"
  if [ "$REPORT_FORMAT" = "junit" ]; then
    printf '%s   JUnit XML: %s%s\n' "$C_GRAY" "$REPORT_PATH" "$C_RESET"
  fi
  printf '%s%s%s\n' "$C_GREEN" "$RULE" "$C_RESET"
  return 0
}

# ── Single-run mode ──────────────────────────────────────────────────────────
if [ "$WATCH_MODE" -eq 0 ]; then
  if run_pipeline; then
    exit 0
  else
    exit 1
  fi
fi

# ── Watch mode ───────────────────────────────────────────────────────────────
# Run the pipeline once, then block on stdin lines emitted by an inline
# Node watcher (recursive fs.watch over src/, debounced 250ms, filtered to
# JS/TS source extensions). Each line on stdin = "src/ changed, re-run".
printf '%s%s▶ Watch mode enabled — running initial pipeline, then watching src/ for changes…%s\n' \
  "$C_BOLD" "$C_CYAN" "$C_RESET"

cycle_num=1
printf '\n%s━━━ Cycle #%d ━━━%s\n' "$C_BOLD" "$cycle_num" "$C_RESET"
if run_pipeline; then
  printf '\n%s%s✓ Cycle #%d green — waiting for src/ changes (Ctrl-C to exit)…%s\n' \
    "$C_BOLD" "$C_GREEN" "$cycle_num" "$C_RESET"
else
  printf '\n%s%s✗ Cycle #%d failed — waiting for src/ changes to retry (Ctrl-C to exit)…%s\n' \
    "$C_BOLD" "$C_YELLOW" "$cycle_num" "$C_RESET"
fi

# Inline Node watcher. Why Node (not entr/fswatch/chokidar-cli)?
#   • Zero new deps — Node ships with fs.watch (recursive on Linux/macOS/Win).
#   • Cross-platform without shelling out to platform-specific tools.
#   • Trivial to filter by extension and debounce in a few lines.
# Emits one line per debounced burst on stdout: "<n> file(s) changed".
# Errors / non-source events are silently ignored.
node --input-type=module -e '
  import { watch } from "node:fs";
  import { extname } from "node:path";
  const EXTS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
  const DEBOUNCE_MS = 250;
  let pending = new Set();
  let timer = null;
  const flush = () => {
    if (pending.size === 0) { timer = null; return; }
    const n = pending.size;
    pending = new Set();
    timer = null;
    process.stdout.write(`${n}\n`);
  };
  try {
    watch("src", { recursive: true }, (_eventType, filename) => {
      if (!filename) return;
      if (!EXTS.has(extname(filename))) return;
      pending.add(filename);
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    });
  } catch (err) {
    process.stderr.write(`watcher error: ${err?.message ?? err}\n`);
    process.exit(1);
  }
  // Keep alive — fs.watch holds the loop, but be explicit.
  process.stdin.resume();
' 2>/tmp/datefns-smoke-watcher.err | while IFS= read -r changed_count; do
  cycle_num=$((cycle_num + 1))
  printf '\n%s━━━ Cycle #%d — %s file(s) changed under src/ ━━━%s\n' \
    "$C_BOLD" "$cycle_num" "$changed_count" "$C_RESET"
  if run_pipeline; then
    printf '\n%s%s✓ Cycle #%d green — waiting for src/ changes (Ctrl-C to exit)…%s\n' \
      "$C_BOLD" "$C_GREEN" "$cycle_num" "$C_RESET"
  else
    printf '\n%s%s✗ Cycle #%d failed — waiting for src/ changes to retry (Ctrl-C to exit)…%s\n' \
      "$C_BOLD" "$C_YELLOW" "$cycle_num" "$C_RESET"
  fi
done
