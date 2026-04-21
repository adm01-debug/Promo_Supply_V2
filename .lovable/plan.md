
## Plan: Add CI script for clean install + type-check

### Goal
Provide a single, repeatable command that wipes `node_modules`, reinstalls strictly from `bun.lock` (no drift allowed), and runs `tsc --noEmit` — so CI (or any contributor) can verify the build stays green in one shot.

### Changes

**1. New file — `scripts/ci-check.sh`** (executable bash script)

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "▶ [1/3] Removing node_modules..."
rm -rf node_modules

echo "▶ [2/3] Installing from frozen lockfile..."
bun install --frozen-lockfile

echo "▶ [3/3] Type-checking with tsc --noEmit..."
npx tsc --noEmit -p tsconfig.app.json

echo "✅ CI check passed: clean install + type-check green."
```

- `set -euo pipefail` → fail fast on any error, undefined var, or pipe failure.
- `--frozen-lockfile` → install fails if `package.json` and `bun.lock` disagree (catches drift).
- Targets `tsconfig.app.json` to match the strict app config (not the looser node config).

**2. `package.json`** — add one npm script entry:

```diff
  "scripts": {
    ...
+   "ci:check": "bash scripts/ci-check.sh",
    ...
  }
```

So it can be invoked as `npm run ci:check` or `bun run ci:check` from any environment.

### Verification
1. Run `bun run ci:check` locally → must print all 3 steps and end with `✅ CI check passed`.
2. Total runtime should be a few minutes (install dominates); `tsc --noEmit` must report 0 errors.
3. Sanity check: temporarily introduce a type error in any `src/` file → script must exit non-zero at step 3 → revert.

### Notes
- No source code, dependency, or schema changes. Pure tooling addition.
- Script is portable: works in GitHub Actions, GitLab CI, local pre-push hooks, etc.
- Does not replace or modify the existing `dev`/`build`/`lint` scripts — purely additive.
