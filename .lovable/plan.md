
## Plan: Second `tsc --noEmit` pass after smoke test regeneration

### Goal
Catch missing/renamed `date-fns` exports surfaced by a freshly regenerated `src/test/dateFns.smoke.test.ts` *before* Vitest runs in `scripts/ci-check.sh`. Today, type errors in the regenerated smoke file would only surface during Vitest's transform — slower and noisier than a focused `tsc` failure.

### Current state
`scripts/ci-check.sh` already runs `bunx tsc --noEmit -p tsconfig.app.json` twice:
- Step `[8/12]` — initial type-check of source.
- Step `[11/12]` — re-run + Vitest smoke test (combined into one step description).

Step `[10/12]` regenerates the smoke test and asserts no drift vs. the pre-existing file. If a contributor adds `import { addYears } from "date-fns/addYears"` and `addYears` doesn't actually exist in the installed `date-fns`, the failure currently appears inside Vitest's run in `[11/12]`, mixed with test output.

### Change
Split step `[11/12]` into two distinct steps so the type-check failure is isolated and named:

- **New `[11/13]`** — `Type-checking regenerated smoke test (catches missing date-fns exports)...`
  Runs `bunx tsc --noEmit -p tsconfig.app.json` on its own. Fails fast with a clear step header if the regenerated file references a non-existent `date-fns/<x>` subpath or export.
- **New `[12/13]`** — `Running date-fns smoke test...`
  Runs only `bunx vitest run "$SMOKE_TEST_FILE" --reporter=verbose --passWithNoTests`. The pre-existence guard for `$SMOKE_TEST_FILE` stays attached to this step.
- Existing `[12/12]` (`deps:health` snapshot) becomes `[13/13]`.

### Step-numbering update
All `[N/12]` labels in `scripts/ci-check.sh` from step `[5]` onward bump their denominator to `/13`. Step `[10/12]`'s internal echoes (the drift guard prints "Run …" hints) stay textually identical — only the bracketed counter changes.

### Why a second pass (not just relying on `[8/12]`)
- `[8/12]` runs *before* regeneration, so it sees the previously committed smoke test, which is known-good.
- After `[10/12]` regenerates the file, the on-disk content may now reference a new `date-fns` subpath that doesn't exist in the installed version (e.g. typo, removed export, version drift). A dedicated `tsc` pass catches this with TypeScript's own error format rather than Vitest's transform error.

### What does NOT change
- `scripts/ci-smoke.sh` (separate, simpler flow — out of scope).
- `scripts/generate-datefns-smoke-test.mjs`, the manifest, the smoke test template.
- `.github/workflows/*.yml` — they invoke `bash scripts/ci-check.sh`, no per-step references.
- `package.json` scripts.

### Verification
1. Clean tree: `bash scripts/ci-check.sh` → all 13 steps pass with the new numbering.
2. Add `import { nonExistentFn } from "date-fns/nonExistentFn"` to a `src/` file → `[11/13]` fails with a `tsc` error naming the missing module, *before* Vitest starts. Step header makes the cause obvious.
3. Revert that import → step passes; `[12/13]` runs the smoke test as before.
4. Confirm the `deps:health` step still runs last as `[13/13]`.

### Risk / scope
~6 line edits in `scripts/ci-check.sh` (split one step into two, renumber 8 step labels). Zero code changes elsewhere, zero new deps, zero behavioral change on green CI runs (just one extra `tsc` invocation, ~3-5s on this codebase).
