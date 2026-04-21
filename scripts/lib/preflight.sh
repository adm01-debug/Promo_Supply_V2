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
