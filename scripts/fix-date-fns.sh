#!/usr/bin/env bash
# Developer convenience script — NOT used by CI.
#
# Runs the date-fns ESLint autofix on either:
#   - your currently staged files (default), or
#   - the whole repo (with `--all`).
#
# It re-stages any files the autofix modified so you can commit immediately.
# CI behavior is unchanged: ci-check.sh / ci-smoke.sh still run the gate in
# `--max-warnings=0` mode without writing any files.
#
# Usage:
#   bun run fix:date-fns             # autofix staged files, re-stage them
#   bun run fix:date-fns -- --all    # autofix the whole repo
#   bun run fix:date-fns -- --help
#
# Bypass nothing — this is a pure helper. Your normal pre-commit hook still
# runs and will reject anything the autofix couldn't repair.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# ── ANSI colors (skip on non-TTY / NO_COLOR) ────────────────────────────────
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_BOLD="\033[1m"; C_DIM="\033[2m"; C_GREEN="\033[32m"
  C_YELLOW="\033[33m"; C_RED="\033[31m"; C_CYAN="\033[36m"; C_RESET="\033[0m"
else
  C_BOLD=""; C_DIM=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_CYAN=""; C_RESET=""
fi

print_help() {
  cat <<EOF
${C_BOLD}fix-date-fns.sh${C_RESET} — developer-only date-fns autofix helper

Runs \`eslint --config eslint.date-fns.config.js --fix\` so barrel imports
are rewritten into per-subpath imports automatically.

  ${C_CYAN}--staged${C_RESET}     (default) Only fix files staged for commit.
  ${C_CYAN}--all${C_RESET}        Fix every .ts/.tsx/.js/.jsx file in the repo.
  ${C_CYAN}--dry-run${C_RESET}    Report what would change without writing files.
  ${C_CYAN}--no-restage${C_RESET} Don't \`git add\` modified files after fixing.
  ${C_CYAN}--help${C_RESET}       Show this message.

Examples:
  bun run fix:date-fns
  bun run fix:date-fns -- --all
  bun run fix:date-fns -- --dry-run
  bun run fix:date-fns -- --all --dry-run
EOF
}

MODE="staged"
RESTAGE=1
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --all) MODE="all" ;;
    --staged) MODE="staged" ;;
    --dry-run) DRY_RUN=1 ;;
    --no-restage) RESTAGE=0 ;;
    -h|--help) print_help; exit 0 ;;
    *) echo "Unknown flag: $arg" >&2; print_help; exit 2 ;;
  esac
done

# Dry-run never restages — they're mutually exclusive in spirit.
if [ "$DRY_RUN" -eq 1 ]; then
  RESTAGE=0
fi

MODE_LABEL="$MODE"
if [ "$DRY_RUN" -eq 1 ]; then
  MODE_LABEL="$MODE, dry-run"
fi
echo -e "${C_BOLD}▶ date-fns autofix${C_RESET} ${C_DIM}(mode: $MODE_LABEL)${C_RESET}"

# ── Collect target files ────────────────────────────────────────────────────
FILES=()
if [ "$MODE" = "staged" ]; then
  mapfile -d '' STAGED < <(git diff --cached --name-only --diff-filter=ACMR -z -- \
    '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs' 2>/dev/null)
  for f in "${STAGED[@]}"; do
    [ -n "$f" ] && [ -f "$f" ] && FILES+=("$f")
  done
  if [ "${#FILES[@]}" -eq 0 ]; then
    echo -e "${C_DIM}  No staged JS/TS files. Nothing to do.${C_RESET}"
    echo -e "${C_DIM}  Tip: stage files with \`git add\` or pass --all.${C_RESET}"
    exit 0
  fi
  echo -e "  Found ${C_BOLD}${#FILES[@]}${C_RESET} staged file(s)."
fi

# ── Dry-run: compute fixes via --fix-dry-run, summarize, write nothing ──────
if [ "$DRY_RUN" -eq 1 ]; then
  echo -e "${C_BOLD}▶ Dry-run: computing fixes${C_RESET} ${C_DIM}(eslint --fix-dry-run -f json)${C_RESET}"
  REPORT_FILE="$(mktemp -t datefns-dryrun-XXXXXX.json)"
  trap 'rm -f "$REPORT_FILE"' EXIT
  if [ "$MODE" = "all" ]; then
    bunx eslint . --config eslint.date-fns.config.js \
      --fix-dry-run -f json -o "$REPORT_FILE" >/dev/null 2>&1 || true
  else
    bunx eslint --config eslint.date-fns.config.js \
      --fix-dry-run -f json -o "$REPORT_FILE" "${FILES[@]}" >/dev/null 2>&1 || true
  fi
  if [ ! -s "$REPORT_FILE" ]; then
    echo -e "${C_YELLOW}⚠ ESLint produced no JSON report. Nothing to analyze.${C_RESET}"
    exit 0
  fi
  node scripts/lib/datefns-dryrun-report.mjs "$REPORT_FILE"
  exit 0
fi

# ── Run the autofix ─────────────────────────────────────────────────────────
echo -e "${C_BOLD}▶ Running ESLint autofix${C_RESET} ${C_DIM}(eslint.date-fns.config.js --fix)${C_RESET}"
if [ "$MODE" = "all" ]; then
  bunx eslint . --config eslint.date-fns.config.js --fix
  ESLINT_EXIT=$?
else
  bunx eslint --config eslint.date-fns.config.js --fix "${FILES[@]}"
  ESLINT_EXIT=$?
fi

# Note: ESLint exits non-zero when unfixable problems remain even after --fix.
# We surface that but don't abort re-staging — the user still wants partial
# fixes saved so they can finish manually.
if [ "$ESLINT_EXIT" -ne 0 ]; then
  echo ""
  echo -e "${C_YELLOW}⚠ ESLint reported unfixable problems (exit $ESLINT_EXIT).${C_RESET}"
  echo -e "  Common causes: default/namespace imports, unknown locale names."
  echo -e "  Fix the remaining issues by hand, then re-run this script."
fi

# ── Re-stage modified files so the next commit picks them up ────────────────
if [ "$RESTAGE" -eq 1 ]; then
  if [ "$MODE" = "staged" ]; then
    CHANGED=()
    for f in "${FILES[@]}"; do
      if ! git diff --quiet -- "$f" 2>/dev/null; then
        CHANGED+=("$f")
      fi
    done
    if [ "${#CHANGED[@]}" -gt 0 ]; then
      git add -- "${CHANGED[@]}"
      echo -e "${C_GREEN}✓ Re-staged ${#CHANGED[@]} modified file(s).${C_RESET}"
    else
      echo -e "${C_DIM}  No files were modified by the autofix.${C_RESET}"
    fi
  else
    # In --all mode we don't auto-stage; show a hint instead.
    if ! git diff --quiet 2>/dev/null; then
      echo -e "${C_DIM}  Review changes with \`git diff\`, then \`git add\` what you want to keep.${C_RESET}"
    fi
  fi
fi

if [ "$ESLINT_EXIT" -eq 0 ]; then
  echo -e "${C_GREEN}✓ date-fns autofix complete.${C_RESET}"
else
  exit "$ESLINT_EXIT"
fi
