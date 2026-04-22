#!/usr/bin/env bash
# Local-dev lint watcher — re-runs both lint suites whenever source files
# change. ESLint has no native watch mode, so we use the same zero-dep
# `node:fs.watch` pattern as scripts/smoke-date-fns.sh --watch.
#
# Each cycle runs:
#   [1/2] npm run lint -- --max-warnings=0   (general ESLint)
#   [2/2] npm run lint:date-fns              (date-fns barrel-import rule)
#
# Both suites always run per cycle (a failure in step 1 does NOT skip
# step 2) so a single edit surfaces lint issues from both sources at once.
# Cycles never exit the watcher — the script prints the failure and waits
# for the next change. Press Ctrl-C to exit.
#
# Watched paths (recursive):
#   src/                                      → application source
#   eslint.config.js, eslint.date-fns.config.js → main + date-fns rule configs
#   eslint-rules/                             → custom rule sources
#
# Watched extensions: .ts .tsx .mts .cts .js .jsx .mjs .cjs
# Debounce: 250ms (a multi-file save triggers a single re-run).
#
# Usage:
#   bun run lint:watch          # start watcher
#   bun run lint:watch -- -h    # show this help
set -uo pipefail

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
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
  printf '\n%s%s%s\n' "$C_CYAN" "$RULE" "$C_RESET"
  printf '%s▶ [%s] %s%s\n' "$C_BOLD" "$1" "$2" "$C_RESET"
  printf '%s%s%s\n' "$C_CYAN" "$RULE" "$C_RESET"
}

# Run both lint suites for one cycle. Returns 0 only when BOTH pass.
# Mirrors scripts/lint-all.sh but inlined so we don't shell out twice and
# so each suite's exit code is captured independently for the summary.
run_lint_cycle() {
  local cycle_start s1_status s2_status
  cycle_start=$(date +%s)

  step "1/2" "npm run lint -- --max-warnings=0"
  if npm run lint -- --max-warnings=0; then s1_status="pass"; else s1_status="fail"; fi

  step "2/2" "npm run lint:date-fns"
  if npm run lint:date-fns; then s2_status="pass"; else s2_status="fail"; fi

  local elapsed=$(( $(date +%s) - cycle_start ))
  local mark1 mark2
  if [ "$s1_status" = "pass" ]; then mark1="${C_GREEN}✓ pass${C_RESET}"; else mark1="${C_RED}✗ fail${C_RESET}"; fi
  if [ "$s2_status" = "pass" ]; then mark2="${C_GREEN}✓ pass${C_RESET}"; else mark2="${C_RED}✗ fail${C_RESET}"; fi

  printf '\n%s%s%s\n' "$C_BOLD" "$RULE" "$C_RESET"
  printf '%slint:watch cycle summary  %s(%ss)%s\n' "$C_BOLD" "$C_GRAY" "$elapsed" "$C_RESET"
  printf '%s%s%s\n' "$C_BOLD" "$RULE" "$C_RESET"
  printf '  [1/2] %-44s %b\n' "lint (--max-warnings=0)" "$mark1"
  printf '  [2/2] %-44s %b\n' "lint:date-fns" "$mark2"
  printf '%s%s%s\n' "$C_BOLD" "$RULE" "$C_RESET"

  if [ "$s1_status" = "pass" ] && [ "$s2_status" = "pass" ]; then return 0; else return 1; fi
}

printf '%s%s▶ lint:watch — running initial cycle, then watching for changes…%s\n' \
  "$C_BOLD" "$C_CYAN" "$C_RESET"

cycle_num=1
printf '\n%s━━━ Cycle #%d ━━━%s\n' "$C_BOLD" "$cycle_num" "$C_RESET"
if run_lint_cycle; then
  printf '\n%s%s✓ Cycle #%d green — waiting for changes (Ctrl-C to exit)…%s\n' \
    "$C_BOLD" "$C_GREEN" "$cycle_num" "$C_RESET"
else
  printf '\n%s%s✗ Cycle #%d failed — waiting for changes to retry (Ctrl-C to exit)…%s\n' \
    "$C_BOLD" "$C_YELLOW" "$cycle_num" "$C_RESET"
fi

# Inline Node watcher — same pattern as smoke-date-fns.sh --watch.
# Watches three roots in parallel (src/, eslint-rules/, and the two config
# files at repo root). Emits one stdout line per debounced burst:
# "<n> file(s) changed". Errors are surfaced to stderr but don't kill the
# watcher — file-system glitches shouldn't end a dev session.
node --input-type=module -e '
  import { watch, existsSync } from "node:fs";
  import { extname, basename } from "node:path";
  const SRC_EXTS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
  const ROOT_CONFIG_FILES = new Set(["eslint.config.js", "eslint.date-fns.config.js"]);
  const RECURSIVE_ROOTS = ["src", "eslint-rules"].filter((p) => existsSync(p));
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
  const trigger = (filename) => {
    pending.add(filename);
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  };
  for (const root of RECURSIVE_ROOTS) {
    try {
      watch(root, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;
        if (!SRC_EXTS.has(extname(filename))) return;
        trigger(`${root}/${filename}`);
      });
    } catch (err) {
      process.stderr.write(`watcher error on ${root}: ${err?.message ?? err}\n`);
    }
  }
  try {
    watch(".", { recursive: false }, (_eventType, filename) => {
      if (!filename) return;
      const base = basename(filename);
      if (!ROOT_CONFIG_FILES.has(base)) return;
      trigger(base);
    });
  } catch (err) {
    process.stderr.write(`watcher error on repo root: ${err?.message ?? err}\n`);
  }
  process.stdin.resume();
' 2>/tmp/lint-watch-watcher.err | while IFS= read -r changed_count; do
  cycle_num=$((cycle_num + 1))
  printf '\n%s━━━ Cycle #%d — %s file(s) changed ━━━%s\n' \
    "$C_BOLD" "$cycle_num" "$changed_count" "$C_RESET"
  if run_lint_cycle; then
    printf '\n%s%s✓ Cycle #%d green — waiting for changes (Ctrl-C to exit)…%s\n' \
      "$C_BOLD" "$C_GREEN" "$cycle_num" "$C_RESET"
  else
    printf '\n%s%s✗ Cycle #%d failed — waiting for changes to retry (Ctrl-C to exit)…%s\n' \
      "$C_BOLD" "$C_YELLOW" "$cycle_num" "$C_RESET"
  fi
done
