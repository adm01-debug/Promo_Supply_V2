
## Plan: Generator-emitted imports guaranteed compatible with `tsconfig.app.json` + dedicated tsc validation

### Goal
Two related guarantees for `src/test/dateFns.smoke.test.ts`:
1. The **import shape** the generator emits is always compatible with the project's `tsconfig.app.json` (`module: ESNext`, `moduleResolution: bundler`, `resolvePackageJsonExports: true`, `verbatimModuleSyntax: false`, `allowImportingTsExtensions: true`, `isolatedModules: true`).
2. A **dedicated, narrowly-scoped `tsc` pass** validates only the generated file, so a missing/renamed `date-fns` export fails fast with a focused error — independent of the broader `[8/13]` and `[11/13]` passes.

### Current state
- The generator emits `import { foo } from "date-fns/foo";` — already correct for `moduleResolution: bundler` + `resolvePackageJsonExports: true` (date-fns v3+ exposes each subpath via its `exports` map).
- `[11/13]` in `scripts/ci-check.sh` already runs `bunx tsc --noEmit -p tsconfig.app.json` after regeneration. It type-checks the **whole project** (~2-5s on this codebase). When it fails, the error is buried among unrelated diagnostics if any other file regresses simultaneously.
- No standalone validation isolates the smoke file.

### What's actually missing
Two concrete gaps:

**A. Compatibility hardening in the generator** — three small but real risks today:
- Emitted imports use bare `"date-fns/<sub>"` strings. Under `verbatimModuleSyntax: false` (current setting) this is fine; if anyone flips that flag, type-only re-exports inside `date-fns` could trip. Add a header comment in the generated file documenting the required tsconfig flags so a future flip is caught in review.
- The two dynamic JSON imports at the bottom (`import("../../package.json")` and `import("date-fns/package.json")`) rely on `resolveJsonModule: true` (already on) and on `date-fns/package.json` being in the package's `exports` map. v3+ exports it; pin a runtime guard that prints a clear message if the dynamic import fails, instead of letting Vitest surface a cryptic stack.
- The generator currently does not emit a `// @ts-check` or any per-file pragma. Not strictly needed (the file is `.ts`), but it should explicitly declare it has no triple-slash refs and no side-effect imports — a one-line banner comment for clarity.

**B. Dedicated `tsc` validation step** — a focused single-file check.
- TypeScript can't `--noEmit` a single file *without* a project (it loses path mapping, lib defaults, etc.). The clean approach: keep the existing project-wide `[11/13]` (it's the source of truth) but **add a new pre-step `[10b]` (or renumber)** that uses `tsc --noEmit -p tsconfig.app.json` with `--incremental` + a dedicated `tsBuildInfoFile` cached only against the smoke file's mtime. On second runs (when only the smoke file changed) this completes in <500ms.
- Alternatively, generate a tiny, throwaway `tsconfig.smoke.json` that `extends` `tsconfig.app.json` and narrows `include` to `["src/test/dateFns.smoke.test.ts", "src/**/*.d.ts"]`. This gives a focused error report scoped to just the smoke file's import graph. **This is the better approach** — no caching state to manage, deterministic output, and the focused `include` means tsc only loads files reachable from the smoke test.

### Approach

#### 1. `scripts/generate-datefns-smoke-test.mjs` — header + runtime guard

Update the rendered template to:

a. Add a **3-line header comment** below the existing AUTO-GENERATED banner documenting the tsconfig assumptions:
```ts
// Compatible with tsconfig.app.json: module=ESNext, moduleResolution=bundler,
// resolvePackageJsonExports=true, resolveJsonModule=true, isolatedModules=true.
// Each `date-fns/<subpath>` import resolves via date-fns v3+ package exports map.
```
This makes the contract explicit so a future tsconfig change that breaks resolution is caught in code review.

b. Wrap the two dynamic JSON imports in a `try/catch` that re-throws with a focused message:
```ts
let rootPkgMod, installedPkgMod;
try {
  [rootPkgMod, installedPkgMod] = await Promise.all([
    import("../../package.json"),
    import("date-fns/package.json"),
  ]);
} catch (err) {
  throw new Error(
    `Failed to dynamic-import package.json files. ` +
    `Check tsconfig.app.json has resolveJsonModule:true and date-fns v3+ exposes ./package.json in its exports map. ` +
    `Original: ${(err as Error).message}`,
  );
}
```
No behavioral change on green CI; cryptic failures get a actionable message.

c. **No change** to the import statement format itself — current `import { name } from "date-fns/sub"` is already the optimal shape for bundler resolution + tree-shaking + date-fns v3+ exports map.

#### 2. New file: `tsconfig.smoke.json`

Tiny extension of the app config, narrowed to the smoke test:
```json
{
  "extends": "./tsconfig.app.json",
  "include": [
    "src/test/dateFns.smoke.test.ts",
    "src/vite-env.d.ts",
    "package.json"
  ]
}
```

This loads the same compiler options (so any future tsconfig flip is honored) but only walks the smoke file's import graph. tsc completes in <1s vs ~3-5s for the full project pass.

#### 3. New `package.json` script

Add next to `verify:datefns-smoke`:
```json
"verify:datefns-smoke-types": "bunx tsc --noEmit -p tsconfig.smoke.json"
```

Runnable locally as `bun run verify:datefns-smoke-types` for fast iteration when fiddling with date-fns imports.

#### 4. `scripts/ci-check.sh` — insert a focused validation step

Currently:
```
[10/13] Verify smoke test is up to date  (--dry-run drift guard)
[11/13] Type-check regenerated smoke test  (project-wide tsc)
[12/13] Run date-fns smoke test  (vitest)
[13/13] deps:health snapshot
```

Insert a new focused step between `[10]` and the existing project-wide check, renumber to `/14`:
```
[10/14] Verify smoke test is up to date
[11/14] Validate smoke test imports against tsconfig.smoke.json   ← NEW (fast, focused)
[12/14] Type-check full project                                    ← was [11/13]
[13/14] Run date-fns smoke test                                    ← was [12/13]
[14/14] deps:health snapshot                                       ← was [13/13]
```

The new `[11/14]` runs `bunx tsc --noEmit -p tsconfig.smoke.json`. If a missing `date-fns` export sneaks in (e.g. `import { addYears } from "date-fns/addYears"` regenerated, but `addYears` doesn't exist in the installed version), this step fails with **only the smoke file's diagnostics** — no noise from unrelated files. If something else is also broken, the broader `[12/14]` catches it next.

#### 5. `scripts/ci-smoke.sh` — same focused guard

Add one line near the existing date-fns checks:
```sh
echo "▶ Validating smoke test imports..."
bunx tsc --noEmit -p tsconfig.smoke.json
```

#### 6. New GitHub workflow step (extend existing `datefns-smoke-drift.yml`)

Append one step after `Verify smoke test is in sync`:
```yaml
- name: Validate smoke test types
  run: bun run verify:datefns-smoke-types
```

Same job, same cache, ~+1s runtime. Now the workflow guards both drift and type validity in one PR check.

### What does NOT change
- The emitted import statement format (already optimal for the current tsconfig).
- Manifest schema (`public/datefns-usage.json`).
- The generator's `--dry-run` flag, regex scanner, or comment-stripping logic.
- ESLint date-fns rule, edge functions, other workflows.
- `tsconfig.app.json` itself (the new `tsconfig.smoke.json` only extends it).

### Verification
1. Clean tree → `bun run verify:datefns-smoke-types` exits 0 in <1s. `[11/14]` in `ci-check.sh` passes; full pipeline green with new numbering.
2. Add `import { nonExistent } from "date-fns/nonExistent"` to a `src/` file, regenerate the smoke test → `[11/14]` fails with a focused tsc error naming only the smoke file. Vitest never starts.
3. Revert → green.
4. Hand-flip `tsconfig.app.json`'s `resolveJsonModule` to `false` → `[11/14]` fails with the new runtime-guard message about JSON imports (when the smoke test runs in step `[13/14]`). The header comment in the generated file makes the cause obvious during code review.
5. `node scripts/generate-datefns-smoke-test.mjs --dry-run` against current tree → exits 0; the only content drift vs. today is the new 3-line header comment + try/catch wrapper. Run the no-flag generator once to commit the new format, then drift guard stays green.
6. New PR workflow: both `Verify smoke test is in sync` and `Validate smoke test types` show as separate green checks.

### Risk / scope
- 1 new file (`tsconfig.smoke.json`, ~8 lines).
- 1 new workflow step (~3 lines added to `datefns-smoke-drift.yml`).
- ~15 lines added to `scripts/generate-datefns-smoke-test.mjs` (header comment + try/catch in the rendered template).
- ~4 lines added + 4 step labels renumbered in `scripts/ci-check.sh`.
- 2 lines added to `scripts/ci-smoke.sh`.
- 1 line added to `package.json`.
- One forced regeneration of `src/test/dateFns.smoke.test.ts` to embed the new header (safe — generator is the source of truth).
- Zero new deps, zero behavioral change on green CI runs. The new focused tsc step adds ~1s; the existing project-wide pass is unchanged.
