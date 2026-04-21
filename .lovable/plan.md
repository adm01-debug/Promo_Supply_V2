
## Plan: Confirm clean-install + smoke-test CI flow

### Current state
`scripts/ci-check.sh` already implements exactly this flow as steps 1, 2, and 6 of a 7-step pipeline:

```text
[1/7] rm -rf node_modules
[2/7] bun install --frozen-lockfile
[3/7] npx tsc --noEmit -p tsconfig.app.json          (source typecheck)
[4/7] node scripts/generate-datefns-smoke-test.mjs   (regenerate test)
[5/7] npx tsc --noEmit -p tsconfig.app.json          (typecheck regenerated test)
[6/7] npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose
[7/7] write public/dependency-health.json snapshot
```

The requested flow (delete `node_modules` → `bun install --frozen-lockfile` → run smoke test) is steps 1, 2, and 6. The intermediate steps (3, 4, 5) only strengthen the signal — they do not block or alter the requested behavior.

### Goal
Add an entry-point script that **only** does the three requested steps, so it can be invoked directly (e.g. from a Git hook, a lighter CI lane, or local pre-push checks) without paying for typecheck + generator + snapshot.

Keep `scripts/ci-check.sh` as the full pipeline. Add a new minimal script alongside it.

### Change — new file `scripts/ci-smoke.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "▶ [1/3] Removing node_modules..."
rm -rf node_modules

echo "▶ [2/3] Installing from frozen lockfile..."
bun install --frozen-lockfile

echo "▶ [3/3] Running date-fns smoke test..."
npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose

echo "✅ Smoke check passed: clean install + date-fns smoke test green."
```

Made executable via `chmod +x scripts/ci-smoke.sh`.

Notes:
- Uses the **already-committed** `src/test/dateFns.smoke.test.ts` — does not regenerate it. That keeps this script fast and deterministic; if the test is stale relative to current `src/` imports, run `scripts/ci-check.sh` instead.
- `set -euo pipefail` halts on any non-zero exit so a failed install or failing test fails CI immediately.
- No edit to `scripts/ci-check.sh` (the full 7-step flow is unchanged).
- No edit to `package.json` scripts (project convention is to invoke shell scripts directly, matching `scripts/ci-check.sh`).

### Verification
1. `bash scripts/ci-smoke.sh` → 3 numbered steps, ends with `✅ Smoke check passed`.
2. Sanity check: temporarily edit `package.json` to `"date-fns": "3.5.0"` (no reinstall) → rerun → step 3 fails on the version-pin assertion. Revert.
3. `bash scripts/ci-check.sh` → still 7 steps green (unaffected).

### Risk / scope
- One new file (`scripts/ci-smoke.sh`, ~12 lines). No source, dependency, route, schema, or runtime changes.
- Runtime: ~clean-install time + <1s for the smoke test.
