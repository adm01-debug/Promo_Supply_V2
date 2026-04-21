
## Plan: Add CI workflow that runs `scripts/ci-smoke.sh` before `ci-check.sh` on PRs

### Goal
Run the fast smoke lane (`scripts/ci-smoke.sh`) as a required gate on PRs **before** the full `ci-check.sh` lane runs, so obvious `date-fns` install/import drift fails in ~2 min instead of waiting ~10 min for the full check.

### Current state
- `.github/workflows/ci-check.yml` runs `bash scripts/ci-check.sh` on `pull_request` to `main`, uploads `ci-logs/` as artifact `ci-check-smoke-logs`.
- `scripts/ci-smoke.sh` exists (clean install + frozen lockfile + ESLint date-fns gate + file/locale verify + focused tsc + smoke vitest + health emit) but has no workflow wiring.
- No job dependency exists between the two.

### Changes

#### 1. New file: `.github/workflows/ci-smoke.yml` (~40 lines)

Mirror the structure of `ci-check.yml`:
- Trigger: `pull_request` → `main`.
- Concurrency group `ci-smoke-${{ github.ref }}` with `cancel-in-progress: true`.
- `runs-on: ubuntu-latest`, `timeout-minutes: 8`.
- Steps: checkout → setup-bun → setup-node 20 → `bash scripts/ci-smoke.sh` (env `CI=true`, `TZ=UTC`) → upload `ci-logs/` as artifact `ci-smoke-logs` (`if: always()`, 14-day retention, `if-no-files-found: ignore`).

#### 2. Edit `.github/workflows/ci-check.yml` — gate on smoke

Add `needs: [ci-smoke]` to the `ci-check` job so the heavy lane only runs once smoke is green. Two options for the dependency:

- **Option A (chosen)**: Reference smoke as a separate workflow via a single combined workflow file. Since GitHub Actions can't `needs:` across workflow files, the cleanest implementation is to **merge both into one workflow** with two jobs (`ci-smoke` first, `ci-check` with `needs: [ci-smoke]`).

Concretely:
- Rename the new file's job to `ci-smoke` and **add it to `ci-check.yml`** as the first job, instead of creating a separate `.yml`. Keep filename `.github/workflows/ci-check.yml` (already what branch protection points at). Add `needs: [ci-smoke]` to the existing `ci-check` job.

Final shape of `.github/workflows/ci-check.yml`:
```yaml
name: CI Check
on:
  pull_request:
    branches: [main]
concurrency:
  group: ci-check-${{ github.ref }}
  cancel-in-progress: true
jobs:
  ci-smoke:
    name: Fast smoke gate (date-fns install + smoke test)
    runs-on: ubuntu-latest
    timeout-minutes: 8
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Run ci-smoke.sh
        run: bash scripts/ci-smoke.sh
        env: { CI: 'true', TZ: UTC }
      - name: Upload smoke logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: ci-smoke-logs
          path: ci-logs/
          if-no-files-found: ignore
          retention-days: 14

  ci-check:
    name: Full CI gate (date-fns + lint + types + smoke)
    needs: [ci-smoke]
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      # ... existing steps unchanged ...
```

The existing `ci-check` job body, env, and artifact upload (`ci-check-smoke-logs`) are preserved verbatim — only `needs: [ci-smoke]` is added.

#### 3. No other changes
- `scripts/ci-smoke.sh` and `scripts/ci-check.sh` — unchanged.
- Other workflows (`lint.yml`, `typecheck.yml`, `lint-date-fns.yml`, `dependency-health.yml`, `datefns-smoke-drift.yml`) — unchanged; they continue to run in parallel as independent gates.
- Branch protection — already targets `ci-check.yml`; both jobs in the same workflow will appear as required checks once GitHub registers them on the next PR.

### Verification
1. Open a PR → `ci-smoke` job starts immediately, `ci-check` is queued with "Waiting for ci-smoke".
2. Smoke green → `ci-check` runs as before; both artifacts (`ci-smoke-logs`, `ci-check-smoke-logs`) uploaded.
3. Smoke red (e.g. introduce a barrel `import { format } from "date-fns"`) → `ci-check` is skipped, PR fails fast in ~2 min with `ci-smoke-logs` artifact attached.
4. Concurrency: pushing a new commit cancels both jobs of the prior run via the shared `ci-check-${{ github.ref }}` group.

### Risk / scope
- 1 file edited (`.github/workflows/ci-check.yml`), 0 new files, 0 script changes, 0 dep changes.
- Adds ~2 min to total wall-clock on green PRs (smoke runs serially before check). Acceptable trade-off for fail-fast on red.
- Branch protection requires no manual update — same workflow filename, just an extra required job named `ci-smoke` will appear after first run; admin should mark it required in repo settings.
