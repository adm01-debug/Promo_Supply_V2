
## Plan: CI guard for smoke test freshness on locale changes

### Goal
Catch the case where someone edits `date-fns/locale/*` imports in `src/` but the generated `src/test/dateFns.smoke.test.ts` and `public/datefns-usage.json` weren't regenerated to reflect them. Today's drift step ([9/11] in `ci-check.sh`) already catches *content* drift; this adds a focused, fast-feedback locale-specific guard that runs earlier and reports clearly when locales are the cause.

### Approach
Add a small Node script that:
1. Scans `src/` for `date-fns/locale/*` subpath imports (reusing the same regex family already in `generate-datefns-smoke-test.mjs`).
2. Reads `public/datefns-usage.json` (the manifest emitted by the generator).
3. Compares the set of locale subpaths found in source vs. listed in the manifest.
4. Also compares the manifest's `totalLocales` to the actual count.
5. Fails (exit 1) with a precise message naming the missing/extra locale subpaths and telling the contributor to run the generator.

Then wire it into `ci-check.sh` as a new fast step before the full content-drift check, so locale-only regressions surface with a clearer error.

### Changes

#### 1. New file: `scripts/verify-datefns-locales.mjs` (~70 lines)

- Reuses the same `walk()` + import regex pattern from `generate-datefns-smoke-test.mjs` (copy the small helpers — these are ~30 lines and zero deps; keeping them local avoids creating a shared module just for two callers).
- Builds `Set<string>` of locale subpaths found in `src/` (filter to `subpath.startsWith("locale/")`).
- Loads `public/datefns-usage.json`; if missing, exits 1 with: *"Manifest missing. Run `node scripts/generate-datefns-smoke-test.mjs` and commit the result."*
- Builds `Set<string>` from `manifest.locales[].subpath`.
- Computes `missing = source - manifest` and `extra = manifest - source`.
- Also asserts:
  - `manifest.totalLocales === manifest.locales.length`
  - `manifest.generatedAt` is a valid ISO date string (parseable, not `NaN`)
- Prints a single-line success: *"✓ Locales in sync: N entries (manifest generated <relative time>)."*
- On any mismatch: prints both lists side by side and exits 1 with the actionable run-the-generator message.

#### 2. `scripts/ci-check.sh` — insert new step

Before the existing content-drift step (currently `[9/11]`), insert a new step:

```
▶ [N/M] Verifying date-fns locale imports match manifest...
node scripts/verify-datefns-locales.mjs
```

Renumber the subsequent steps accordingly (becomes `[9/12]` … `[12/12]`). Step descriptions stay identical otherwise.

The existing content-drift step still runs after and remains the source of truth for full file-byte equality; this new step just gives faster, locale-specific feedback.

#### 3. `package.json` — optional npm script alias

Add `"verify:datefns-locales": "node scripts/verify-datefns-locales.mjs"` so contributors can run it standalone (`bun run verify:datefns-locales`). Single-line addition next to the existing `deps:health` entry.

### What does NOT change
- `scripts/generate-datefns-smoke-test.mjs` (the generator itself — already correct).
- The smoke test file or the manifest schema.
- `eslint-rules/`, edge functions, CI lint job (`.github/workflows/lint-date-fns.yml`).
- The admin `DateFnsUsagePanel` component.

### Verification
1. Clean tree → step passes silently with the green summary line.
2. Add `import { enUS } from "date-fns/locale/en-US"` somewhere in `src/`, do **not** regenerate → new step fails with: *"Missing in manifest: locale/en-US. Run `node scripts/generate-datefns-smoke-test.mjs` and commit."* — surfaces before the broader content-drift step.
3. Run the generator → manifest updates, step passes, content-drift step also passes.
4. Delete `public/datefns-usage.json` → step fails with the manifest-missing message and exits 1.
5. Hand-edit the manifest to add a phantom locale → step fails with: *"Extra in manifest (not in src/): locale/fake-XX."*
6. Hand-corrupt `manifest.generatedAt` → step fails with the timestamp-validation message.

### Risk / scope
~70 added lines in a new script + ~3 added lines in `ci-check.sh` + 1 line in `package.json`. No new deps, no behavioral change on green CI runs, no source files renamed.
