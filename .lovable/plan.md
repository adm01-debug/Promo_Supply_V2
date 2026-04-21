
## Plan: Make `scripts/ci-check.sh` cross-platform

### Goal
Let `scripts/ci-check.sh` (and its sibling `scripts/ci-smoke.sh`) run cleanly on macOS, Linux, and Windows (Git Bash / WSL / MSYS) without changing the clean-install + type-check contract. Today the scripts assume POSIX shell + Unix paths and use `node -p` snippets that don't quote-escape well on Windows shells. They also `rm -rf` paths that don't exist on Windows native runs.

### Root issues in the current scripts
1. **Shebang `#!/usr/bin/env bash`** — fine on macOS/Linux/WSL, fine on Git Bash (which ships bash), but the scripts must actually be invoked through bash on Windows. Need to document that and guard against `cmd.exe` invocation.
2. **`rm -rf "${BUN_INSTALL:-$HOME/.bun}/install/cache/date-fns"*`** — on Windows the Bun cache lives at `%USERPROFILE%\.bun\install\cache` (Git Bash maps `$HOME` to that, so it works) **but** the npm cache path `$HOME/.npm/_cacache/...` doesn't exist on Windows where npm uses `%LOCALAPPDATA%\npm-cache`. The glob silently no-ops today, which is fine, but the `**` globstar requires `shopt -s globstar` in bash; without it the line expands literally and `rm` errors are swallowed by `|| true`. Works but masks real failures.
3. **`node -p "require('./node_modules/date-fns/package.json').version"`** — the embedded single quotes break under `cmd.exe` but are fine in bash on all three OSes. The bigger problem is path separators: `require('./node_modules/...')` is Node-normalized so it's fine. ✓
4. **`grep -A1 '"date-fns"' bun.lock | grep -oE '[0-9]+\.[0-9]+\.[0-9]+'`** — `grep -A1` and `grep -oE` are GNU extensions. macOS BSD grep supports `-A` and `-oE`, Git Bash bundles GNU grep. ✓ on all three.
5. **`date -u +%FT%TZ`** — GNU and BSD `date` both support this format. ✓
6. **Heredoc `cat > public/dependency-health.json <<JSON`** — works in all bash variants. ✓
7. **`mkdir -p public`** — works everywhere. ✓
8. **No `set -o pipefail` issue, but `bun.lock` parsing via `grep` is brittle** — should delegate to the existing `scripts/lib/resolve-locked-version.mjs` (already used by `scripts/install-report.mjs`) for consistency and to avoid OS-specific grep quirks.
9. **No detection of missing `bun`** — on a fresh Windows machine without Bun, the script dies with a confusing `bun: command not found`. A friendly preflight check helps.
10. **`npx eslint` / `npx tsc` / `npx vitest`** — `npx` works everywhere bun installs node_modules/.bin, but on Windows Git Bash `npx` invokes the `.cmd` shim. Switching to `bunx` (already used in the GitHub Actions workflows) is consistent and avoids needing npm on the PATH.

### Changes

#### 1. `scripts/ci-check.sh` — refactor for portability
- Add `set -euo pipefail` (already present, keep).
- Add `shopt -s nullglob globstar 2>/dev/null || true` so unmatched cache globs don't expand literally.
- Add a preflight block that verifies `bun`, `node`, and `bash` are on PATH and prints a clear error otherwise.
- Detect OS once via `uname -s` and branch the cache-eviction step:
  - **Linux/macOS/WSL/MSYS/CYGWIN**: current paths (`$HOME/.bun/install/cache/date-fns*`, `$HOME/.npm/_cacache/...`).
  - **Windows-native (`MINGW*`, `MSYS*`, `CYGWIN*`)**: also try `"$LOCALAPPDATA/npm-cache"` if `LOCALAPPDATA` is set; map it via `cygpath -u` if available, else use as-is.
- Replace the `grep | grep -oE` lockfile parser with a single `node` call delegating to `scripts/lib/resolve-locked-version.mjs`:
  ```bash
  LOCKED="$(node -e "import('./scripts/lib/resolve-locked-version.mjs').then(m=>{const v=m.resolveLockedVersion(require('fs').readFileSync('bun.lock','utf8'),'date-fns');process.stdout.write(v||'')})")"
  ```
  Same logic on every OS, no grep-flavor dependency.
- Replace `npx <tool>` with `bunx <tool>` in all four call sites (`eslint`, `tsc` x2, `vitest`). Matches the GH Actions workflows; avoids needing npm.
- Keep step numbering and log messages identical so output stays diff-friendly.
- The `cat > public/dependency-health.json <<JSON` heredoc stays; it's portable.

#### 2. `scripts/ci-smoke.sh` — apply the same five edits
Same preflight, same OS-aware cache eviction, same `resolve-locked-version.mjs` delegation, same `npx` → `bunx` swap. Keep its own step numbering.

#### 3. New `scripts/lib/preflight.sh` (~25 lines)
Tiny helper sourced by both scripts:
```bash
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
    Linux*|Darwin*) PLATFORM=unix ;;
    MINGW*|MSYS*|CYGWIN*) PLATFORM=windows ;;
    *) PLATFORM=unknown ;;
  esac
  export PLATFORM
}
evict_datefns_cache() {
  shopt -s nullglob globstar 2>/dev/null || true
  rm -rf "${BUN_INSTALL:-$HOME/.bun}/install/cache/date-fns"* 2>/dev/null || true
  rm -rf "$HOME"/.npm/_cacache/content-v2/**/date-fns-* 2>/dev/null || true
  if [ "$PLATFORM" = "windows" ] && [ -n "${LOCALAPPDATA:-}" ]; then
    local winpath="$LOCALAPPDATA/npm-cache"
    command -v cygpath >/dev/null 2>&1 && winpath="$(cygpath -u "$winpath")"
    rm -rf "$winpath"/**/date-fns-* 2>/dev/null || true
  fi
}
```
Both scripts source it: `source "$(dirname "$0")/lib/preflight.sh"` then call `preflight` and `evict_datefns_cache` instead of the inline versions.

#### 4. `package.json` — add a Windows-friendly entry point (optional but useful)
Add an npm script alias so Windows users without bash can still run the gates via `bun run ci:check` (which already works since bun executes the .sh through its bundled shell on Windows):
```json
"ci:check": "bash scripts/ci-check.sh",
"ci:smoke": "bash scripts/ci-smoke.sh"
```
If these already exist, leave them. Bun on Windows ships a POSIX shell wrapper for `bash scripts/*.sh` invocations.

#### 5. `README.md` — short "Running CI locally" note (~6 lines)
Document: macOS/Linux run `bash scripts/ci-check.sh` directly; Windows users run it from Git Bash, WSL, or via `bun run ci:check`. Mention the Bun and Node prerequisites the preflight checks for.

### What does NOT change
- GitHub Actions workflows (`typecheck.yml`, `lint-date-fns.yml`) — they run on Ubuntu, no portability issue.
- `eslint-rules/`, `vitest.config.ts`, `tsconfig.app.json`, source code — untouched.
- The clean-install contract: `rm -rf node_modules` + `bun install --frozen-lockfile` + version-match assertion still runs first on every OS.
- Step ordering, step numbering, and log lines — preserved so CI output diffs cleanly.

### Verification (post-implementation)
1. **macOS/Linux**: `bash scripts/ci-check.sh` → identical output to today.
2. **WSL Ubuntu**: same as Linux.
3. **Windows Git Bash**: `bash scripts/ci-check.sh` → preflight passes, cache eviction tries the extra Windows path, install + typecheck + smoke test all green.
4. **Windows without Bun**: preflight prints the friendly error and exits 127 instead of a cryptic `command not found`.
5. `scripts/ci-smoke.sh` — same matrix, same expected outcomes.
6. Existing GH Actions workflows — unchanged, still green.

### Risk / scope
- 2 scripts edited, 1 small helper added, optional 2 lines in `package.json`, optional 6 lines in `README.md`. Zero source, dependency, route, or schema changes. Strictly additive on Windows; behavior on macOS/Linux is byte-identical except `npx`→`bunx` (same resolved binary in `node_modules/.bin`).
