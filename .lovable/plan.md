
## Plan: Run typecheck before tests in CI

### Current state
`scripts/ci-check.sh` already runs `npx tsc --noEmit -p tsconfig.app.json` as step 3/6, **before** the generator (4/6) and the smoke test (5/6). However, the generator overwrites `src/test/dateFns.smoke.test.ts` *after* tsc runs — so if a newly added `date-fns/<subpath>` import in `src/` resolves to a missing export, tsc on the source file catches it, but tsc on the freshly regenerated test file does not run.

### Goal
Add a second typecheck pass **after** the generator and **before** vitest, so the regenerated smoke test itself is type-checked. Missing date-fns exports surface as a tsc error (faster, clearer signal) instead of waiting for the vitest runtime.

### Change — `scripts/ci-check.sh`

Restructure to 7 steps. Keep step 3 (initial tsc on source) as-is; insert a new tsc pass as step 5 after generation:

```text
[1/7] rm -rf node_modules
[2/7] bun install --frozen-lockfile
[3/7] npx tsc --noEmit -p tsconfig.app.json          (source typecheck)
[4/7] node scripts/generate-datefns-smoke-test.mjs   (regenerate test)
[5/7] npx tsc --noEmit -p tsconfig.app.json          (NEW: typecheck includes regenerated test)
[6/7] npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose
[7/7] write public/dependency-health.json snapshot
```

The new step uses the same `tsconfig.app.json` (which already includes `src/`, so the regenerated test file is in scope). `set -euo pipefail` ensures a tsc failure halts CI before vitest or the snapshot run.

### Why two tsc passes
- **Step 3** catches missing exports in production source immediately — the original signal.
- **Step 5** catches the case where the source uses a valid subpath but the *generator's emitted import line* fails to type-check (e.g. an export was removed from `date-fns` between the source-import and the generator-emit, or the regenerated file changes shape). Cheap second pass; same config; <2s on warm cache.

### Verification
1. `bash scripts/ci-check.sh` → 7 numbered steps green, snapshot written, final `✅`.
2. Sanity check: temporarily add `import { nonExistent } from "date-fns/nonExistent"` to any `src/` file → step 3 fails (source). Revert.
3. Sanity check: temporarily edit the generator template to emit `import { fakeFn } from "date-fns/format"` → step 4 succeeds, step 5 fails with TS2305 before vitest runs. Revert.
4. `npx tsc --noEmit -p tsconfig.app.json` standalone → 0 errors.

### Risk / scope
- One file edited (`scripts/ci-check.sh`). No source, dependency, route, schema, or runtime changes.
- Adds ~2s to CI (second tsc pass on warm cache).
