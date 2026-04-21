
## Plan: Wire the date-fns ESLint gate into PR CI

### Current state
- `package.json` already has `lint:date-fns` (strict gate, `--max-warnings=0`) and `lint:date-fns:fix` (autofix).
- `scripts/ci-check.sh` and `scripts/ci-smoke.sh` already invoke the gate locally.
- **Gap:** no GitHub Actions workflow runs it on PRs, so the gate is local-only.

### Change 1 — `package.json`
Add one alias script for clarity in CI logs (the underlying command is identical to `lint:date-fns`, but a PR-named script makes the workflow step self-documenting):
```json
"ci:lint:date-fns": "eslint . --config eslint.date-fns.config.js --max-warnings=0"
```
Existing `lint:date-fns` stays unchanged.

### Change 2 — new file `.github/workflows/lint-date-fns.yml`
Single-job workflow, runs on every PR (any branch) and on pushes to `main`:

```yaml
name: lint-date-fns

on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint-date-fns:
    name: ESLint date-fns subpath gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: Install dependencies (frozen lockfile)
        run: bun install --frozen-lockfile
      - name: Run ESLint date-fns gate
        run: bun run ci:lint:date-fns
```

Why these choices:
- **`pull_request` with no `branches` filter** → fires on PRs targeting any branch, matching the request literally.
- **`push: main`** → catches direct pushes / post-merge regressions.
- **`bun install --frozen-lockfile`** → matches the project's existing CI scripts; no version drift.
- **No matrix, no caching tricks** → the gate is <5s; keep the workflow boring and fast to read.
- **Job name `ESLint date-fns subpath gate`** → this is the string that appears as a required status check; readable in branch protection settings.

### After merge — branch protection (one-time, user action)
GitHub repo → Settings → Branches → branch protection rule for `main` → require status check **"ESLint date-fns subpath gate"**. Without this, the workflow runs but PRs can still merge red. Mention this in the PR description.

### Verification
1. Open a PR introducing `import { format } from "date-fns"` → workflow fails with the custom rule's barrel message; PR cannot merge once branch protection is set.
2. Run `bun run ci:lint:date-fns:fix`-equivalent (`bun run lint:date-fns:fix`), push → workflow goes green.
3. Existing `scripts/ci-check.sh` and `scripts/ci-smoke.sh` unchanged → local flow unaffected.

### Risk / scope
- One new workflow file (~20 lines). One new `package.json` script entry. Zero source, dependency, or config changes. No effect on existing CI scripts. Strictly additive.
