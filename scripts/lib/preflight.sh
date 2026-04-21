#!/usr/bin/env bash
# Shared preflight + cache-eviction helpers for ci-check.sh / ci-smoke.sh.
# Source from a bash script: `source "$(dirname "$0")/lib/preflight.sh"`.

preflight() {
  local missing=()
  command -v bun  >/dev/null 2>&1 || missing+=("bun")
  command -v node >/dev/null 2>&1 || missing+=("node")
  if [ ${#missing[@]} -gt 0 ]; then
    echo "✗ Missing required tools: ${missing[*]}" >&2
    echo "  Install Bun: https://bun.sh   |   Node: https://nodejs.org" >&2
    exit 127
  fi
  case "$(uname -s 2>/dev/null || echo unknown)" in
    Linux*|Darwin*)        PLATFORM=unix ;;
    MINGW*|MSYS*|CYGWIN*)  PLATFORM=windows ;;
    *)                     PLATFORM=unknown ;;
  esac
  export PLATFORM
}

evict_datefns_cache() {
  shopt -s nullglob globstar 2>/dev/null || true
  rm -rf "${BUN_INSTALL:-$HOME/.bun}/install/cache/date-fns"* 2>/dev/null || true
  rm -rf "$HOME"/.npm/_cacache/content-v2/**/date-fns-* 2>/dev/null || true
  if [ "${PLATFORM:-}" = "windows" ] && [ -n "${LOCALAPPDATA:-}" ]; then
    local winpath="$LOCALAPPDATA/npm-cache"
    command -v cygpath >/dev/null 2>&1 && winpath="$(cygpath -u "$winpath")"
    rm -rf "$winpath"/**/date-fns-* 2>/dev/null || true
  fi
}

# Resolve date-fns version from bun.lock via the shared resolver module.
resolve_locked_datefns() {
  node -e "import('./scripts/lib/resolve-locked-version.mjs').then(m=>{const fs=require('fs');const v=m.resolveLockedVersion(fs.readFileSync('bun.lock','utf8'),'date-fns');process.stdout.write(v||'')})"
}

# Run scripts/verify-datefns-files.mjs and, on failure, print the missing
# subpaths from public/dependency-health.json (refreshed via --write-health)
# in a single shared format used by both ci-check.sh and ci-smoke.sh, then
# exit early with code 1.
run_verify_datefns_files_or_die() {
  if node scripts/verify-datefns-files.mjs --write-health; then
    return 0
  fi
  local rule="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "" >&2
  echo "$rule" >&2
  echo "✗ verify-datefns-files.mjs failed — missing date-fns subpath(s)" >&2
  echo "$rule" >&2
  node -e '
    try {
      const fs = require("fs");
      const p = "public/dependency-health.json";
      if (!fs.existsSync(p)) { process.stdout.write("  (no dependency-health.json snapshot available)\n"); process.exit(0); }
      const j = JSON.parse(fs.readFileSync(p, "utf8"));
      const entries = j?.dateFns?.subpaths?.entries || [];
      const missing = entries.filter(e => !e.exists);
      if (missing.length === 0) {
        process.stdout.write("  (verifier failed but snapshot reports no missing subpaths — see verifier output above)\n");
        return;
      }
      process.stdout.write(`  ${missing.length} missing subpath(s):\n`);
      for (const m of missing) process.stdout.write(`    • date-fns/${m.subpath}\n`);
      process.stdout.write("\n  ▶ Repair (copy & run):\n");
      process.stdout.write("      rm -rf node_modules && bun install --frozen-lockfile\n");
    } catch (e) {
      process.stdout.write(`  (failed to read snapshot: ${e.message})\n`);
    }
  ' >&2
  echo "$rule" >&2
  exit 1
}
