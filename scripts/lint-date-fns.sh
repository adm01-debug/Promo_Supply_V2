#!/usr/bin/env bash
# Wrapper around `eslint . --config eslint.date-fns.config.js --max-warnings=0`
# that prints a concise summary of offending files and the exact forbidden
# `date-fns` barrel import patterns before exiting non-zero.
#
# Why a wrapper instead of an ESLint formatter?
#   • Formatters can't change the exit code or run conditionally on errors.
#   • A small bash + jq pipeline keeps zero-runtime-deps and works with any
#     ESLint version without writing a custom formatter package.
#
# Pipeline:
#   1. Run ESLint with the json formatter into a temp file.
#   2. Stream the human-readable (`stylish`) report to the terminal so the
#      normal full output is still visible.
#   3. If there are errors, parse the JSON, print:
#        • Offender file count + total error count
#        • Up to 10 offending files with their first offending line:col
#        • The exact forbidden import statement (single source line) for
#          each shown offender
#        • A one-liner pointing at the autofix command
#   4. Exit with ESLint's original exit code.
#
# Usage:
#   bun run lint:date-fns                    # runs this wrapper
#   bash scripts/lint-date-fns.sh -- --fix   # passthrough flags to eslint
set -uo pipefail

# ── ANSI helpers (TTY only) ───────────────────────────────────────────────────
if [ -t 1 ]; then
  C_BOLD=$'\033[1m'; C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'
  C_RED=$'\033[31m'; C_GRAY=$'\033[90m'; C_YELLOW=$'\033[33m'; C_RESET=$'\033[0m'
else
  C_BOLD=""; C_CYAN=""; C_GREEN=""; C_RED=""; C_GRAY=""; C_YELLOW=""; C_RESET=""
fi
RULE="────────────────────────────────────────────────────────────────"

JSON_REPORT="$(mktemp -t lint-date-fns.XXXXXX.json)"
trap 'rm -f "$JSON_REPORT"' EXIT

# Dedicated ESLint cache for the date-fns suite. Kept separate from the
# general lint cache (`.eslintcache`) because the two runs use different
# config files and ESLint keys cache entries by config hash — sharing a
# cache file would just cause constant invalidation. The CI workflow
# (lint.yml) caches `node_modules/.cache/eslint/` so this file persists
# across runs.
ESLINT_CACHE_DIR="node_modules/.cache/eslint"
mkdir -p "$ESLINT_CACHE_DIR"
ESLINT_CACHE_FILE="$ESLINT_CACHE_DIR/.eslintcache-date-fns"

# Run ESLint twice in a single invocation by leveraging --format and
# --output-file: the json report goes to disk, while the stylish output
# streams to the terminal. We use a second invocation only if the user
# passed extra flags like --fix; for the default zero-warnings gate one
# pass is enough.
ESLINT_ARGS=(
  "."
  "--config" "eslint.date-fns.config.js"
  "--max-warnings=0"
  "--cache"
  "--cache-location" "$ESLINT_CACHE_FILE"
  "--cache-strategy" "content"
  "$@"
)

# Stream stylish output to the terminal AND capture json side-by-side.
# Two-pass keeps it simple and avoids tee+formatter gymnastics — both
# passes share ESLint's cache so the cost is essentially one parse.
npx eslint "${ESLINT_ARGS[@]}" --format=stylish
STYLISH_EXIT=$?

# Always also produce JSON so we can summarize even on success (silent
# pass) and on failure (offender summary). Cached parse → near-instant.
npx eslint "${ESLINT_ARGS[@]}" --format=json --output-file="$JSON_REPORT" >/dev/null 2>&1 || true

# ── Summary ───────────────────────────────────────────────────────────────────
# Use Node (always available) instead of jq (not always installed) so the
# wrapper has zero new dependencies. Reads the JSON report, partitions
# results, and prints a concise offender block when there are errors.
if [ -s "$JSON_REPORT" ]; then
  node --input-type=module -e '
    import { readFileSync } from "node:fs";
    const path = process.argv[1];
    const raw = readFileSync(path, "utf8");
    let report;
    try { report = JSON.parse(raw); } catch { process.exit(0); }
    const offenders = report.filter(r => (r.errorCount ?? 0) > 0);
    const totalErrors = offenders.reduce((s, r) => s + (r.errorCount ?? 0), 0);
    const totalFiles = offenders.length;
    const C = process.stdout.isTTY;
    const c = (code, s) => C ? `\x1b[${code}m${s}\x1b[0m` : s;
    const bold = s => c(1, s), red = s => c(31, s), cyan = s => c(36, s);
    const gray = s => c(90, s), yellow = s => c(33, s);
    const RULE = "─".repeat(64);

    if (totalFiles === 0) process.exit(0); // nothing to summarize

    process.stderr.write("\n" + red(RULE) + "\n");
    process.stderr.write(bold(red(`✗ lint:date-fns — ${totalErrors} forbidden barrel import(s) across ${totalFiles} file(s)`)) + "\n");
    process.stderr.write(red(RULE) + "\n\n");

    process.stderr.write(cyan("  Forbidden patterns (use per-subpath imports instead):") + "\n");
    process.stderr.write(`    ${red("✗")} ${bold("import { format } from \"date-fns\"")}            ${gray("→ import { format } from \"date-fns/format\"")}\n`);
    process.stderr.write(`    ${red("✗")} ${bold("import { ptBR } from \"date-fns/locale\"")}      ${gray("→ import { ptBR } from \"date-fns/locale/pt-BR\"")}\n`);
    process.stderr.write(`    ${red("✗")} ${bold("import * as df from \"date-fns\"")}              ${gray("→ import per-subpath then re-export if needed")}\n`);
    process.stderr.write("\n");

    const CAP = 10;
    const shown = offenders.slice(0, CAP);
    process.stderr.write(cyan(`  Offending files (showing ${shown.length}/${totalFiles}):`) + "\n");
    const cwd = process.cwd();
    for (const file of shown) {
      const rel = file.filePath.startsWith(cwd) ? file.filePath.slice(cwd.length + 1) : file.filePath;
      const first = (file.messages || []).find(m => m.severity === 2);
      const where = first ? `:${first.line}:${first.column}` : "";
      process.stderr.write(`    ${red("•")} ${bold(rel + where)}  ${gray(`(${file.errorCount} error${file.errorCount === 1 ? "" : "s"})`)}\n`);
      // Pull the exact source line so reviewers see the literal import.
      if (first && first.line) {
        try {
          const src = readFileSync(file.filePath, "utf8").split(/\r?\n/);
          const line = src[first.line - 1] ?? "";
          const trimmed = line.trim();
          if (trimmed) {
            process.stderr.write(`        ${gray(trimmed.length > 100 ? trimmed.slice(0, 97) + "..." : trimmed)}\n`);
          }
        } catch { /* ignore — file may have been deleted between passes */ }
      }
    }
    if (offenders.length > CAP) {
      process.stderr.write(`    ${gray(`… and ${offenders.length - CAP} more file(s) — see the full ESLint output above`)}\n`);
    }

    process.stderr.write("\n");
    process.stderr.write(cyan("  ▶ Autofix (rewrites barrel imports into per-subpath imports):") + "\n");
    process.stderr.write(`    ${bold("bun run lint:date-fns:fix")}\n`);
    process.stderr.write(`    ${gray("# or")}\n`);
    process.stderr.write(`    ${bold("bun run fix:date-fns")}     ${gray("(also fixes formatting)")}\n`);
    process.stderr.write("\n");
    process.stderr.write(red(RULE) + "\n");
  ' "$JSON_REPORT"
fi

exit "$STYLISH_EXIT"
