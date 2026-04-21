
## Plan: Cache Bun dependencies in CI

### Goal
Speed up `bun install --frozen-lockfile` in both GitHub Actions workflows by caching Bun's global install cache, keyed on `bun.lock`. Lockfile is still the source of truth — caching only avoids re-downloading tarballs.

### What gets cached
Bun's global install cache lives at `~/.bun/install/cache`. That's where downloaded package tarballs land before being linked into `node_modules`. Caching this directory (not `node_modules` itself) is the safe pattern: the lockfile still drives resolution, install still runs, but network fetches are skipped on cache hits.

### Changes

#### `.github/workflows/typecheck.yml`
Insert a cache step between `setup-bun` and `bun install`:

```yaml
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: Cache Bun dependencies
        uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('bun.lock') }}
          restore-keys: |
            ${{ runner.os }}-bun-
      - name: Install dependencies (frozen lockfile)
        run: bun install --frozen-lockfile
```

#### `.github/workflows/lint-date-fns.yml`
Identical insertion — same cache key so both workflows share cache entries (GitHub Actions cache is scoped per repo + key, so a hit in one workflow warms the other).

### Why these choices
- **`hashFiles('bun.lock')`** → exact key changes only when the lockfile changes; deterministic.
- **`restore-keys: ${{ runner.os }}-bun-`** → partial-hit fallback. If `bun.lock` changed, restore the previous cache and let Bun fetch only the diff. Avoids cold-start on every dep bump.
- **`runner.os` prefix** → defensive; if the matrix ever expands beyond `ubuntu-latest`, caches won't cross-contaminate.
- **Cache `~/.bun/install/cache`, not `node_modules`** → `node_modules` caching is fragile (postinstall scripts, platform binaries, symlinks). Caching the tarball cache is the documented Bun pattern and keeps `--frozen-lockfile` semantics intact.
- **No change to `scripts/ci-check.sh` / `scripts/ci-smoke.sh`** → those scripts intentionally `rm -rf node_modules` and evict caches as part of their drift-detection contract; adding caching there would defeat their purpose. CI workflows and local clean-install scripts serve different roles.
- **`actions/cache@v4`** → current major; matches `actions/checkout@v4` already in use.

### Verification
1. First run after merge → cache miss, installs normally, uploads cache (~5–15s overhead first time).
2. Subsequent runs with unchanged `bun.lock` → cache hit, install step drops from ~10–20s to ~2–5s.
3. PR that bumps a dep → partial restore via `restore-keys`, only the changed tarballs fetched.
4. `bun install --frozen-lockfile` still fails on lockfile drift — caching does not bypass the frozen check.
5. Local `scripts/ci-check.sh` and `scripts/ci-smoke.sh` unchanged → clean-install behavior preserved.

### Risk / scope
- Two workflow files, ~7 added lines each. Zero source, dependency, config, or schema changes. Strictly additive; worst case (cache service outage) GitHub Actions falls back to a normal install.
