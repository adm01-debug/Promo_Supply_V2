
## Plan: Make reinstalls cache-proof for date-fns

### Problem
`bun install --frozen-lockfile` already exists in `scripts/ci-check.sh` and `scripts/ci-smoke.sh`, but bun's **global install cache** (`~/.bun/install/cache`) can still hand back a stale `date-fns` tarball if the cache entry was poisoned (corrupted download, manual mutation, mid-flight upgrade). The frozen lockfile guarantees the *requested* version, not the *bytes on disk*. A clean `node_modules` plus a poisoned cache = the same stale install, silently.

### Goal
Guarantee that every CI install resolves `date-fns` from a freshly-fetched tarball, never from a cached one — without slowing down unrelated dependencies.

### Change 1 — surgical cache eviction in both CI scripts

In `scripts/ci-check.sh` and `scripts/ci-smoke.sh`, between `rm -rf node_modules` and `bun install`, add:

```bash
echo "▶ Evicting any cached date-fns tarballs..."
rm -rf "${BUN_INSTALL:-$HOME/.bun}/install/cache/date-fns"* 2>/dev/null || true
rm -rf "$HOME/.npm/_cacache/content-v2"/**/date-fns-* 2>/dev/null || true
```

- Targets only `date-fns` cache entries — leaves the rest of the global cache warm so other deps still install fast.
- Glob covers both bun's flat layout (`date-fns@3.6.0/`) and npm's content-addressed layout (fallback when bun isn't the resolver).
- `|| true` keeps the script green when the cache dir doesn't exist (fresh environment).
- Quotes around `${BUN_INSTALL:-$HOME/.bun}` handle the env var being unset.

### Change 2 — promote step counters

- `scripts/ci-smoke.sh`: 4 → 5 steps (cache evict becomes step 2/5).
- `scripts/ci-check.sh`: 8 → 9 steps (cache evict becomes step 2/9).

### Change 3 — post-install integrity assertion

After install completes, before the existing `verify-datefns-files.mjs` runs, add a one-liner that confirms the resolved version on disk matches the lockfile expectation. This catches the rare case where bun resolves from a partially-corrupted cache entry that *exists* but contains wrong bytes:

```bash
echo "▶ Confirming installed date-fns version matches lockfile..."
INSTALLED="$(node -p "require('./node_modules/date-fns/package.json').version")"
LOCKED="$(grep -A1 '\"date-fns\"' bun.lock 2>/dev/null | grep -oE '[0-9]+\\.[0-9]+\\.[0-9]+' | head -n1)"
if [ -n "$LOCKED" ] && [ "$INSTALLED" != "$LOCKED" ]; then
  echo "✗ date-fns drift: installed=$INSTALLED, locked=$LOCKED" >&2
  exit 1
fi
echo "✓ date-fns $INSTALLED matches lockfile."
```

This is a **belt-and-suspenders** check — the existing smoke test (`installed === pkg.json spec`) verifies declared spec parity, this verifies *lockfile* parity (catches a desynced lockfile that the smoke test would miss).

### Final pipeline shapes

`scripts/ci-smoke.sh` (5 steps):
```text
[1/5] rm -rf node_modules
[2/5] evict date-fns from bun/npm caches              ← NEW
[3/5] bun install --frozen-lockfile
[4/5] confirm installed === lockfile date-fns         ← NEW
[5/5] node scripts/verify-datefns-files.mjs
[5/5] npx vitest run src/test/dateFns.smoke.test.ts
```
(merged into 5 ordered steps in the actual script.)

`scripts/ci-check.sh` (9 steps): same insert pattern between current 1 and 2, plus the integrity check before current step 3.

### Why this shape (not the alternatives)
- **Not `rm -rf ~/.bun/install/cache`**: nukes the entire cache → every dep redownloads → CI cost spikes for an unrelated reason. Surgical eviction keeps the warm cache benefit.
- **Not `bun install --no-cache`**: that flag affects all deps for that run; same cost problem.
- **Not adding integrity hashes to package.json**: bun's lockfile already stores integrity hashes; the gap is the *cache layer*, not the *manifest layer*.
- **Lockfile version parse via `grep`**: `bun.lock` is text; avoiding a JSON parser keeps the script zero-dep and matches the existing style (the dependency-health.json step uses the same `grep` pattern already).

### Verification
1. `bash scripts/ci-smoke.sh` → 5 steps, all green.
2. `bash scripts/ci-check.sh` → 9 steps, all green, snapshot written.
3. Sanity A: `mkdir -p ~/.bun/install/cache/date-fns@99.0.0 && touch ~/.bun/install/cache/date-fns@99.0.0/poison` → rerun `ci-smoke.sh` → step 2 silently removes it, install proceeds clean.
4. Sanity B: temporarily edit `bun.lock` to bump `date-fns` to `3.5.0` (without reinstalling) → step 4 fails with `✗ date-fns drift: installed=3.6.0, locked=3.5.0`. Revert.
5. Sanity C: unset `BUN_INSTALL`, delete `~/.bun` → rerun → step 2 no-ops cleanly (no error from missing dir).

### Risk / scope
- Two existing scripts edited. No new files. No source, dependency, route, schema, or runtime changes.
- Adds <50ms (rm of small dir) plus one `node -p` call (~30ms) per CI run.
- Cache eviction is scoped to `date-fns` — zero impact on install speed of the other ~60 dependencies.
