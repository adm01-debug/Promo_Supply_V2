
## Plan: Add typecheck CI workflow

### Goal
A GitHub Actions workflow that runs `bun install --frozen-lockfile` followed by `tsc --noEmit` on every push (any branch) and every pull request, so type errors block merges.

### Change — new file `.github/workflows/typecheck.yml`

```yaml
name: typecheck

on:
  push:
  pull_request:

jobs:
  typecheck:
    name: TypeScript typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: Install dependencies (frozen lockfile)
        run: bun install --frozen-lockfile
      - name: Type-check (tsc --noEmit)
        run: bunx tsc --noEmit -p tsconfig.app.json
```

### Why these choices
- **`push:` with no branch filter + `pull_request:`** → fires on every push and every PR, matching the request literally.
- **`bunx tsc --noEmit -p tsconfig.app.json`** → matches the invocation already used in `scripts/ci-check.sh` step [8/11], so local + CI behavior stays identical. Using `tsconfig.app.json` (not the root `tsconfig.json`) avoids picking up Node-only configs and keeps the check scoped to the app.
- **`oven-sh/setup-bun@v2` + `bun install --frozen-lockfile`** → mirrors the existing `lint-date-fns.yml` workflow for consistency.
- **Separate workflow file** (not appended to `lint-date-fns.yml`) → independent status check; one can fail without masking the other in branch protection.
- **Job name `TypeScript typecheck`** → readable string for the required-status-check selector in branch protection.

### After merge — branch protection (one-time, user action)
GitHub repo → Settings → Branches → branch protection rule for `main` → add **"TypeScript typecheck"** as a required status check (alongside the existing **"ESLint date-fns subpath gate"**).

### Verification
1. Open a PR introducing a deliberate type error → workflow fails on the `Type-check` step.
2. Fix the error, push → workflow goes green.
3. Existing `scripts/ci-check.sh`, `scripts/ci-smoke.sh`, and `lint-date-fns.yml` workflow → all unchanged.

### Risk / scope
- One new file (~15 lines). Zero source, dependency, config, or schema changes. Strictly additive.
