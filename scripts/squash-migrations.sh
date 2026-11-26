#!/usr/bin/env bash
# scripts/squash-migrations.sh
#
# F-031: Migration squash tooling
#
# PURPOSE
# -------
# With 265+ individual migration files, cold-start times and history readability
# suffer. This script concatenates every migration up to (but not including)
# a configurable CUTOFF date into a single baseline file, then removes the
# originals so Supabase only needs to replay migrations newer than the cutoff.
#
# USAGE
# -----
#   bash scripts/squash-migrations.sh [--cutoff YYYYMMDD[HHMMSS]] [--dry-run] [--help]
#
# ARGUMENTS
#   --cutoff YYYYMMDD[HHMMSS]
#                       Migrations strictly before this timestamp prefix are
#                       squashed (8 or 14 digits).  Defaults to the oldest migration that is
#                       NOT part of the official schema baseline (i.e. anything
#                       before the first Lovable-generated UUID-named file).
#                       Example: --cutoff 20260101000000
#   --dry-run           Print what would happen without changing any files.
#   --help              Show this message.
#
# OUTPUT
#   supabase/migrations/<LAST>_squashed_baseline.sql  ← new combined file
#   <LAST> is the timestamp of the newest squashed migration, NOT the cutoff: the
#   cutoff may be the version of a migration that stays (it is, in auto-detect
#   mode), and two files with the same version collide in Supabase and sort the
#   baseline AFTER the migration it must precede. <LAST> is free (that file is
#   removed) and is older than everything that stays.
#   The original files below the cutoff are DELETED.
#   An existing *_squashed_baseline.sql below the cutoff is folded into the new
#   one (never overwritten); the baseline is written to a temp file and only
#   renamed into place after every source was read.
#
# SAFETY RULES
#   1. The working tree must be clean (git status) before running: no tracked
#      change anywhere and nothing pending (untracked included) in
#      supabase/migrations/.
#   2. Always commit the squashed file and push before deploying to production.
#   3. On a Supabase managed project, run "supabase db reset" locally first
#      to verify the squashed file produces an identical schema.
#   4. Coordinate with every developer — they must "git pull" before running
#      new migrations or they will get timestamp conflicts.
#
# PREREQUISITES
#   - git
#   - bash 4+
#   - GNU cat / ls (standard on Linux/macOS)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"

# Byte order for globs and string comparison, whatever the caller's locale.
export LC_ALL=C

# ── Defaults ──────────────────────────────────────────────────────────────────
CUTOFF=""
DRY_RUN=false

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --cutoff)
      if [[ $# -lt 2 ]]; then
        echo "ERROR: --cutoff requires a value (YYYYMMDD or YYYYMMDDHHMMSS)" >&2; exit 1
      fi
      CUTOFF="$2"; shift 2 ;;
    --dry-run)
      DRY_RUN=true; shift ;;
    --help|-h)
      # Only the header block (stops at the first non-comment line).
      awk 'NR == 1 { next } !/^#/ { exit } { sub(/^# ?/, ""); print }' "$0"; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

# ── Validate ──────────────────────────────────────────────────────────────────
if [[ -n "$CUTOFF" && ! "$CUTOFF" =~ ^([0-9]{8}|[0-9]{14})$ ]]; then
  echo "ERROR: invalid --cutoff '$CUTOFF' (expected 8 or 14 digits: YYYYMMDD or YYYYMMDDHHMMSS)" >&2
  exit 1
fi

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "ERROR: migrations directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

# Require clean working tree (skip in dry-run)
if [[ "$DRY_RUN" = false ]]; then
  if ! git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "ERROR: $REPO_ROOT is not a git work tree — refusing to delete migrations without history." >&2
    exit 1
  fi
  if ! git -C "$REPO_ROOT" diff --quiet HEAD 2>/dev/null \
    || [[ -n "$(git -C "$REPO_ROOT" status --porcelain -- supabase/migrations)" ]]; then
    echo "ERROR: working tree has uncommitted changes. Commit or stash first." >&2
    exit 1
  fi
fi

# ── List migrations (YYYYMMDDHHMMSS_*.sql only) ───────────────────────────────
ALL=()
for f in "$MIGRATIONS_DIR"/*.sql; do
  [[ -e "$f" ]] || continue
  name="$(basename "$f")"
  if [[ "$name" =~ ^[0-9]{14}_ ]]; then
    ALL+=("$f")
  else
    echo "WARNING: ignoring file without a 14-digit timestamp prefix: $name" >&2
  fi
done

# Auto-detect cutoff: use the timestamp of the first file that looks like a
# Lovable UUID migration (format YYYYMMDDHHMMSS_<uuid>.sql).
if [[ -z "$CUTOFF" ]]; then
  for f in ${ALL[@]+"${ALL[@]}"}; do
    name="$(basename "$f")"
    if [[ "$name" =~ ^([0-9]{14})_[0-9a-f]{8}- ]]; then
      CUTOFF="${BASH_REMATCH[1]}"
      break
    fi
  done

  if [[ -z "$CUTOFF" ]]; then
    echo "ERROR: could not auto-detect cutoff. Pass --cutoff YYYYMMDDHHMMSS" >&2
    exit 1
  fi
  echo "Auto-detected cutoff: $CUTOFF"
fi

# ── Collect files to squash ───────────────────────────────────────────────────
TO_SQUASH=()
NEW_SOURCES=0
for f in ${ALL[@]+"${ALL[@]}"}; do
  name="$(basename "$f")"
  # Timestamp prefix (first 14 chars of filename), compared as a string.
  if [[ "${name:0:14}" < "$CUTOFF" ]]; then
    TO_SQUASH+=("$f")
    [[ "$name" == *_squashed_baseline.sql ]] || NEW_SOURCES=$((NEW_SOURCES + 1))
  fi
done

COUNT="${#TO_SQUASH[@]}"

if [[ "$COUNT" -eq 0 ]]; then
  echo "No migrations older than cutoff $CUTOFF — nothing to squash."
  exit 0
fi

if [[ "$NEW_SOURCES" -eq 0 ]]; then
  echo "Everything older than cutoff $CUTOFF is already a squashed baseline — nothing to squash."
  exit 0
fi

LAST_NAME="$(basename "${TO_SQUASH[$((COUNT - 1))]}")"
BASELINE_FILE="$MIGRATIONS_DIR/${LAST_NAME:0:14}_squashed_baseline.sql"

echo "──────────────────────────────────────────────────────────────"
echo "  Migration squash plan"
echo "  Cutoff       : $CUTOFF"
echo "  Files to squash: $COUNT"
echo "  Output file  : $BASELINE_FILE"
echo "  Dry-run      : $DRY_RUN"
echo "──────────────────────────────────────────────────────────────"

if [[ "$DRY_RUN" = true ]]; then
  echo ""
  echo "Files that WOULD be squashed:"
  for f in "${TO_SQUASH[@]}"; do
    echo "  - $(basename "$f")"
  done
  echo ""
  echo "Would write: $(basename "$BASELINE_FILE")"
  echo "Dry-run complete — no files changed."
  exit 0
fi

# ── Write baseline (temp file first; originals are only removed after it is complete) ──
TMP_FILE="$MIGRATIONS_DIR/.squash-baseline.$$.tmp"
trap 'rm -f "$TMP_FILE"' EXIT

{
  echo "-- =============================================================="
  echo "-- SQUASHED BASELINE"
  echo "-- Generated by scripts/squash-migrations.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "-- Contains $COUNT migration files squashed up to cutoff $CUTOFF"
  echo "--"
  echo "-- DO NOT EDIT THIS FILE MANUALLY."
  echo "-- To regenerate: bash scripts/squash-migrations.sh --cutoff $CUTOFF"
  echo "-- =============================================================="
  echo ""

  for f in "${TO_SQUASH[@]}"; do
    echo "-- ── $(basename "$f") ───────────────────────────────────────────────"
    cat "$f"
    echo ""
  done
} > "$TMP_FILE"

# ── Remove originals ──────────────────────────────────────────────────────────
for f in "${TO_SQUASH[@]}"; do
  rm "$f"
  echo "  Removed: $(basename "$f")"
done

mv "$TMP_FILE" "$BASELINE_FILE"
trap - EXIT

echo "Written: $BASELINE_FILE ($(wc -l < "$BASELINE_FILE") lines)"

echo ""
echo "Done. $COUNT files squashed into $(basename "$BASELINE_FILE")."
echo ""
echo "NEXT STEPS:"
echo "  1. git add supabase/migrations/"
echo "  2. git commit -m 'chore: squash $COUNT migrations into baseline $CUTOFF'"
echo "  3. Run 'supabase db reset' locally to verify the schema is identical."
echo "  4. Inform all developers to 'git pull' before creating new migrations."
