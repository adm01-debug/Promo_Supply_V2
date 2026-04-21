
## Plan: Run date-fns smoke test in CI

### Goal
Make `scripts/ci-check.sh` execute the `src/test/dateFns.smoke.test.ts` smoke test on every run, so PRs that break date-fns subpath imports fail CI before merge.

### Change — `scripts/ci-check.sh`

Insert a new step between the current type-check (step 3) and the snapshot write (step 4). Renumber the echo banners to `[1/5] … [5/5]`.

New step:
```bash
echo "▶ [4/5] Running date-fns smoke test..."
npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose
```

Final script flow:
1. `rm -rf node_modules`
2. `bun install --frozen-lockfile`
3. `npx tsc --noEmit -p tsconfig.app.json`
4. `npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose` ← **new**
5. Write `public/dependency-health.json` snapshot

Because `set -euo pipefail` is already active, a failing test exits non-zero and the snapshot step is skipped — exactly what CI wants.

### Why scoped to one test file (not the full suite)
- The user asked specifically for the date-fns smoke test.
- Targeting one file keeps CI fast and the failure signal unambiguous ("date-fns subpath imports broke") instead of mixed with unrelated business test noise.
- The full suite can be added later as a separate `ci:check:full` script if desired.

### Verification
1. Run `bash scripts/ci-check.sh` locally → expect 5 numbered steps, `8/8` smoke tests passing, snapshot written, final `✅` line.
2. Sanity check: temporarily change one import in `src/test/dateFns.smoke.test.ts` to the barrel form `from "date-fns"` → ESLint won't catch it (test file may be excluded, but vitest will resolve it); rerun → if the barrel resolution fails, step 4 exits non-zero and CI fails. Revert.
3. Confirm `public/dependency-health.json` is only refreshed when all prior steps pass.

### Risk / scope
- One-file edit. No new dependencies (`vitest` is already in `package.json`). No source, schema, or runtime changes.
- Adds a few seconds to CI runtime. No impact on local `dev`/`build`.
