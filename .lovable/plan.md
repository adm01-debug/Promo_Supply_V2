
## Plan: Batch locale formatting checks in the generated smoke test

### Goal
Reduce the number of `it()` blocks and redundant work in `src/test/dateFns.smoke.test.ts` so vitest startup + per-test overhead drops, while preserving the same validation coverage (callable functions, structurally valid locales, format works per locale, distinct weekdays, version pin).

### Current cost
Today the smoke test runs 6 `it()` blocks. Three of them iterate the locales array independently:
- "all imported locales are structurally valid" — loops locales
- "format works with each imported locale" — loops locales, calls `format` 3× per locale
- "every imported locale produces a distinct weekday name" — loops locales again, calls `format` 1× per locale

Each `it()` carries vitest setup/teardown overhead, and the locale array is walked 3× with overlapping work (the weekday `format` call is duplicated between tests 2 and 3).

### Change

#### `scripts/generate-datefns-smoke-test.mjs` — render a single batched locale test

Replace the three locale `it()` blocks with **one** consolidated block that walks the locales array once and asserts everything inline. Cache each locale's `format` outputs in local consts so `weekday` is computed exactly once and reused for both the per-locale assertion and the distinct-set check.

New rendered block (replaces the three current locale tests):

```ts
it("locales are structurally valid, format correctly, and produce distinct weekdays", () => {
  const locales = [...] as const;
  const weekdays: string[] = [];
  for (const [name, locale] of locales) {
    // structural validity
    expect(locale, name).toBeDefined();
    expect(typeof locale, name).toBe("object");
    const l = locale as {
      code?: unknown;
      formatLong?: unknown;
      localize?: unknown;
      match?: unknown;
    };
    expect(typeof l.code, name).toBe("string");
    expect(l.formatLong, name).toBeTruthy();
    expect(l.localize, name).toBeTruthy();
    expect(l.match, name).toBeTruthy();

    // format coverage (numeric, long, weekday) — single pass
    const numeric = format(ref, "dd/MM/yyyy", { locale });
    expect(numeric, name).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    const longDate = format(ref, "PPP", { locale });
    expect(typeof longDate, name).toBe("string");
    expect(longDate.length, name).toBeGreaterThan(0);
    const weekday = format(ref, "EEEE", { locale });
    expect(typeof weekday, name).toBe("string");
    expect(weekday.length, name).toBeGreaterThan(0);
    weekdays.push(weekday);
  }

  // distinctness check — only meaningful with 2+ locales
  if (weekdays.length >= 2) {
    expect(new Set(weekdays).size, "distinct weekday names").toBe(weekdays.length);
  }
});
```

Net effect with the current single locale (`pt-BR`):
- 6 `it()` blocks → **4** `it()` blocks
- Locales walked 3× → **1×**
- `format(ref, "EEEE", ...)` called 2× per locale → **1×**
- All current assertions retained byte-for-byte (same expect calls, same labels, same regex).

### Files touched
- `scripts/generate-datefns-smoke-test.mjs` — rewrite the locale-test rendering section (~30 lines changed, no new imports, no new deps).

After regeneration:
- `src/test/dateFns.smoke.test.ts` — auto-updates via the generator.
- `public/datefns-usage.json` — unchanged (manifest schema is independent of test rendering).

### What does NOT change
- Function-callable test (`it("all imported function exports are callable")`).
- Ref date stability test.
- Version pin test.
- Generator's scanning logic, manifest output, exit codes.
- `scripts/ci-check.sh` step [9/11] drift check — it just reruns the generator and diffs; on first commit the smoke test file changes once, then stays stable.

### Verification
1. Run generator → `src/test/dateFns.smoke.test.ts` now has 4 `it()` blocks; ci-check step [9/11] flags the drift on the very first run; commit the new output and CI stays green from then on.
2. `bunx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose` → 4 tests pass, total runtime drops noticeably (vitest per-test overhead × 2 fewer tests + ~33% fewer `format` calls).
3. Add a second locale (e.g. `enUS` from `date-fns/locale/en-US`) somewhere in `src/`, regenerate → batched test still passes; distinctness assertion now actively runs (weekdays length ≥ 2).
4. Break a locale on purpose (e.g. swap to a malformed object via a temporary edit) → batched test fails with the same labeled `expect` so the failing locale is still identifiable in the output.
5. CI step [10/11] still type-checks the generated file (no new types introduced) and runs the smoke test.

### Risk / scope
- One generator-script edit, ~30 lines. Output remains deterministic and sorted. Coverage preserved (every prior assertion still present, just inlined into one loop). One-time drift commit on the first regeneration.
