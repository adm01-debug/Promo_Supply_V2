
## Plan: Assert installed date-fns version matches pinned version

### Goal
Fail the smoke test (and therefore CI) when the resolved `node_modules/date-fns` version drifts from the spec pinned in `package.json`. Log the version on every run for visibility.

### Change — `scripts/generate-datefns-smoke-test.mjs`

Extend the generator template to emit one additional `it(...)` block at the end of the existing `describe`. No new files, no CI changes — the new assertion rides the existing generate → tsc → vitest pipeline.

The emitted block reads both `package.json` files at test time and compares:

```ts
it("installed date-fns version matches the pinned spec in package.json", async () => {
  const [{ default: rootPkg }, { default: installedPkg }] = await Promise.all([
    import("../../package.json"),
    import("date-fns/package.json"),
  ]);
  const spec =
    rootPkg.dependencies?.["date-fns"] ??
    rootPkg.devDependencies?.["date-fns"] ??
    "";
  const installed = installedPkg.version as string;

  // eslint-disable-next-line no-console
  console.log(`[date-fns smoke] pinned spec="${spec}" installed="${installed}"`);

  expect(spec, "date-fns must be listed in package.json").not.toBe("");
  expect(/^[0-9]/.test(spec), `spec "${spec}" must be exact-pinned (no ^ or ~)`).toBe(true);
  expect(installed, `installed ${installed} must match pinned ${spec}`).toBe(spec);
});
```

Three assertions:
1. `date-fns` is declared in `package.json`.
2. The spec is exact-pinned (starts with a digit — rejects `^3.6.0`, `~3.6.0`, `latest`, ranges).
3. The resolved version in `node_modules` equals the spec exactly.

The `console.log` line surfaces both versions in vitest's verbose output for every CI run.

### Supporting tweak — `tsconfig.app.json`

Verify `resolveJsonModule: true` is already set (standard in Vite/Lovable projects). If absent, add it so the two `import("…/package.json")` calls type-check. This is a no-op for runtime; vitest already resolves JSON imports natively.

### Why this shape
- **Single source of truth stays the generator.** The new test rides the same regenerate → tsc → vitest pipeline already in CI; no new step, no new file.
- **Reads `package.json` at test time, not generate time.** Catches drift introduced after the generator runs (e.g. someone hand-edits `package.json` between generate and test, or a stale `node_modules` from an unclean install).
- **Exact-pin guard.** Prevents the test from silently passing when someone loosens the spec to `^3.6.0` — which is the exact failure mode this whole CI chain exists to prevent.
- **Aligns with `public/dependency-health.json`.** Step 7 already records `spec` / `installed` / `exactPinned`; this test enforces the same invariants at runtime so the snapshot can never lie.

### Verification
1. `node scripts/generate-datefns-smoke-test.mjs` → file regenerates with the new `it(...)` block, summary log printed.
2. `npx tsc --noEmit -p tsconfig.app.json` → 0 errors.
3. `npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose` → all tests green; console shows `[date-fns smoke] pinned spec="3.6.0" installed="3.6.0"`.
4. Sanity check A: temporarily change `package.json` to `"date-fns": "^3.6.0"` → rerun → exact-pin assertion fails with clear message. Revert.
5. Sanity check B: temporarily change `package.json` to `"date-fns": "3.5.0"` (without reinstalling) → rerun → mismatch assertion fails (`installed 3.6.0 must match pinned 3.5.0`). Revert.
6. `bash scripts/ci-check.sh` → 7 numbered steps green.

### Risk / scope
- One generator file edited; one generated test file refreshed (still ≤120 lines). Possibly one `tsconfig.app.json` flag if missing. No source, route, schema, or runtime changes.
- Adds <50ms to the smoke test (two JSON imports).
