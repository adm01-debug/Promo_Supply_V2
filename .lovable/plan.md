
## Plan: Add `test:date-fns` script for quick local verification

### Goal
One-command shortcut to run only the date-fns smoke test, without paying for clean-install/cache-evict overhead. For local "did I break the date-fns import surface?" checks.

### Change — `package.json`

Add one entry under `scripts`:

```json
"test:date-fns": "vitest run src/test/dateFns.smoke.test.ts --reporter=verbose"
```

Runnable as `bun run test:date-fns` or `npm run test:date-fns`.

### Why this shape
- **Targets the committed test file directly** — same invocation as step 5 of `ci-smoke.sh` and step 8 of `ci-check.sh`, so local result == CI result for this specific test.
- **No regenerate, no install, no cache evict.** Those belong in the CI scripts. Local devs want sub-second feedback after editing a `date-fns` import.
- **`vitest` (not `npx vitest`)** — vitest is already a project dep; the package-script PATH resolves it without the npx lookup cost.
- **`run` subcommand** — one-shot, no watch mode (watch mode is the wrong default for a smoke check).
- **`--reporter=verbose`** — matches CI output so failures look identical locally and in CI.

### Verification
1. `bun run test:date-fns` → runs the 6 assertions in `src/test/dateFns.smoke.test.ts`, exits 0.
2. Sanity: temporarily edit `package.json` `date-fns` spec to a wrong version (no reinstall) → `bun run test:date-fns` → "installed X must match pinned Y" assertion fails. Revert.
3. `bash scripts/ci-smoke.sh` and `bash scripts/ci-check.sh` → unchanged, still green.

### Risk / scope
- One line added to `package.json`. No source, dependency, route, schema, runtime, or CI-script changes.
