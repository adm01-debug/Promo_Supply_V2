
## Plan: GitHub Actions workflow for `ci-check.sh` on PRs

### Goal
Run the full `bash scripts/ci-check.sh` gate on every pull request so date-fns drift, lint violations, type errors, and the smoke test all block merges before review.

### New file: `.github/workflows/ci-check.yml`

```yaml
name: CI Check

on:
  pull_request:
    branches: [main]

concurrency:
  group: ci-check-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci-check:
    name: Full CI gate (date-fns + lint + types + smoke)
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run ci-check.sh
        run: bash scripts/ci-check.sh
        env:
          CI: 'true'
```

### Design notes
- **Trigger**: `pull_request` against `main` only — avoids double-runs on push-to-PR-branch since PR events already cover branch updates. Add `[main, develop]` later if a long-lived dev branch appears.
- **Concurrency**: cancels in-progress runs when a PR is force-pushed; saves CI minutes.
- **Bun + Node**: `ci-check.sh` preflight requires both on PATH (per `scripts/lib/preflight.sh`). Bun handles `bun install --frozen-lockfile`; Node runs the `.mjs` verification scripts.
- **Timeout**: 15 min covers clean install + lint + tsc twice + smoke test with margin.
- **No secrets**: script is fully offline (no GitHub API calls, no Supabase calls).
- **No caching**: `ci-check.sh` deliberately removes `node_modules` for a clean install — caching would defeat its purpose.

### What does NOT change
- Existing workflows (`dependency-health.yml`, `lint.yml`, `lint-date-fns.yml`, `typecheck.yml`) stay as-is. They run narrower checks faster on push; the new workflow is the all-in-one gate scoped to PRs.
- `scripts/ci-check.sh` itself — already cross-platform and CI-ready.
- No `package.json`, no `supabase/`, no app code changes.

### Verification
1. Open a PR against `main` → "CI Check / Full CI gate" appears in checks.
2. Push a commit adding `import { format } from "date-fns"` to a `src/` file → workflow fails at step [6/11] (ESLint gate).
3. Push a commit with a TS error → fails at step [8/11] (`tsc --noEmit`).
4. Force-push to PR branch → previous run cancels via concurrency group.
5. Clean PR → all 11 steps green within ~5-8 min.

### Risk / scope
- 1 new file, ~30 lines. Zero changes to existing workflows or scripts. Required-status-check enrollment is a repo setting the user can flip on later in GitHub branch protection.
