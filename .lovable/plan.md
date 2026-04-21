
## Plan: Explicit lockfile-drift gate in CI

### Goal
Add a dedicated CI step that **fails loudly** if `bun.lock` is out of sync with `package.json`. Today both workflows already run `bun install --frozen-lockfile`, which technically fails on drift — but the failure message ("lockfile had changes, but lockfile is frozen") is buried in install output and easy to misread as a network/install error. A separate, explicit step makes the intent and the failure mode obvious in the PR checks UI.

### Approach
Keep the existing `bun install --frozen-lockfile` step (it still installs deps). **Before** it, add a no-op verification step that runs `bun install --frozen-lockfile --dry-run`. With `--dry-run`, Bun resolves the lockfile against `package.json` and exits non-zero on drift **without** writing `node_modules` — fast (~1–2s), and its failure message in the GitHub Actions log is unambiguously "lockfile drift" rather than "install failed".

This runs in both PR workflows so a stale lockfile is caught regardless of which gate someone is looking at.

### Changes

#### `.github/workflows/typecheck.yml`
Insert one step between the cache restore and the existing install:

```yaml
      - name: Cache Bun dependencies
        uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('bun.lock') }}
          restore-keys: |
            ${{ runner.os }}-bun-
      - name: Verify lockfile is up to date (no drift vs package.json)
        run: bun install --frozen-lockfile --dry-run
      - name: Install dependencies (frozen lockfile)
        run: bun install --frozen-lockfile
```

#### `.github/workflows/lint-date-fns.yml`
Identical insertion in the same position.

### Why these choices
- **`--dry-run` before the real install** → distinct status line in the PR checks UI ("Verify lockfile is up to date") with a clear failure cause; the subsequent install step still runs (and would also fail on drift, but redundancy is the point — defense in depth).
- **Both workflows updated** → the lockfile gate is a property of the repo state, not of any one check. Adding it to both means a stale lockfile blocks every PR check, not just one.
- **No change to `scripts/ci-check.sh` / `scripts/ci-smoke.sh`** → those already do `rm -rf node_modules && bun install --frozen-lockfile` and have version-drift assertions afterward. They're the authoritative local gate; CI workflows mirror their intent.
- **Step placed AFTER cache restore but BEFORE install** → cache hit doesn't bypass the drift check (the dry-run still resolves against `package.json`); placing it before install means failure is reported as "lockfile drift" not as "install couldn't finish".
- **No new tools, no script changes, no `package.json` edits** → strictly additive workflow steps.

### Verification
1. Open a PR that edits `package.json` (e.g. bumps a version) without running `bun install` → **"Verify lockfile is up to date"** step fails with Bun's "lockfile had changes" message; install step never runs.
2. Open a PR that edits both `package.json` and `bun.lock` consistently → step passes, install runs, lint + typecheck proceed.
3. PR with no dep changes → step is a ~1s no-op cache-friendly success.
4. Existing local scripts (`scripts/ci-check.sh`, `scripts/ci-smoke.sh`) → unchanged.

### Risk / scope
- 2 workflow files, 2 added lines each. Zero source, dependency, config, schema, or script changes. Worst case (Bun CLI changes `--dry-run` semantics) the redundant `bun install --frozen-lockfile` step right after still catches drift — no regression in coverage.
