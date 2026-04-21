
## Plan: Vitest test that every imported date-fns locale exists and exports are reachable

### Goal
Add a Vitest test that, for every locale imported under `src/` (e.g. `date-fns/locale/pt-BR`), asserts:
1. The locale's file exists on disk in the installed `date-fns` package.
2. The default export resolves and is a structurally-valid `Locale` object (has `code`, `formatLong`, `localize`, `match`).
3. `format(...)` actually works with it (catches half-installed/corrupt locale shards).
4. The package's `exports` map publicly exposes the subpath (catches bundler-vs-node resolution drift).

This complements the existing surface:
- `scripts/verify-datefns-files.mjs` (CI-only, file existence) — now mirrored as a vitest assertion devs see during `bun test`.
- `dateFns.smoke.test.ts` (auto-generated, only the locales currently used) — same coverage but the new test reads the **manifest** so it can't accidentally drift from the generator.

### Source of truth
`public/datefns-usage.json` — already maintained by `scripts/generate-datefns-smoke-test.mjs` and gated by `scripts/verify-datefns-locales.mjs`. Reading it means the test auto-tracks any new locale added later, with zero edits.

### Changes

#### 1. New file: `src/test/dateFns.locales.test.ts` (~110 lines)

Logic:
- Read `public/datefns-usage.json` synchronously at test load.
- For each entry in `manifest.locales` (each has `subpath` like `locale/pt-BR` and `exports` like `["ptBR"]`):
  - **Assertion A — file exists**: check `node_modules/date-fns/<subpath>.{js,mjs,cjs}` or `node_modules/date-fns/<subpath>/index.{js,mjs,cjs}` exists. Fail with the same repair hint as `verify-datefns-files.mjs` (`rm -rf node_modules && bun install --frozen-lockfile`).
  - **Assertion B — exports map exposes subpath**: read `node_modules/date-fns/package.json`, walk `exports["./<subpath>"]`. Fail if missing — that's exactly the kind of drift that breaks bundlers but not Node.
  - **Assertion C — dynamic import returns valid Locale**: `await import("date-fns/<subpath>")`, pick the named export listed in `exports[]`, assert it's an object with `code` (string), `formatLong`, `localize`, `match` (all truthy). Same shape check as `dateFns.smoke.test.ts`.
  - **Assertion D — format works**: call `format(REF, "PPP", { locale })` and `format(REF, "EEEE", { locale })`, assert non-empty strings. Catches locales that load but explode at runtime.
- One `describe` block per locale subpath so failures in CI logs/artifacts name the exact locale.

Sketch:
```ts
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { format } from "date-fns/format";

const ROOT = process.cwd();
const PKG_DIR = resolve(ROOT, "node_modules/date-fns");
const MANIFEST = JSON.parse(
  readFileSync(resolve(ROOT, "public/datefns-usage.json"), "utf8"),
);
const REF = new Date("2025-01-15T12:00:00Z");

const fileCandidates = (sp: string) => [
  `${sp}.js`, `${sp}.mjs`, `${sp}.cjs`,
  `${sp}/index.js`, `${sp}/index.mjs`, `${sp}/index.cjs`,
];

describe("date-fns locales — installed surface", () => {
  // Sanity: manifest is non-empty
  it("manifest contains at least one locale", () => {
    expect(Array.isArray(MANIFEST.locales)).toBe(true);
    expect(MANIFEST.locales.length).toBeGreaterThan(0);
  });

  for (const entry of MANIFEST.locales as Array<{ subpath: string; exports: string[] }>) {
    describe(entry.subpath, () => {
      it("has a resolvable file in node_modules/date-fns", () => {
        const found = fileCandidates(entry.subpath).some((c) =>
          existsSync(join(PKG_DIR, c)),
        );
        expect(
          found,
          `Missing date-fns/${entry.subpath} on disk. Run \`rm -rf node_modules && bun install --frozen-lockfile\`.`,
        ).toBe(true);
      });

      it("is exposed via date-fns package.json exports map", () => {
        const pkg = JSON.parse(
          readFileSync(join(PKG_DIR, "package.json"), "utf8"),
        );
        const key = `./${entry.subpath}`;
        expect(
          pkg.exports?.[key],
          `date-fns/package.json exports map is missing "${key}". ` +
            `This breaks bundler resolution even if the file exists.`,
        ).toBeTruthy();
      });

      it("dynamic-imports and exposes a structurally valid Locale", async () => {
        const mod = await import(/* @vite-ignore */ `date-fns/${entry.subpath}`);
        for (const exportName of entry.exports) {
          const locale = (mod as Record<string, unknown>)[exportName];
          expect(locale, `${entry.subpath} → ${exportName}`).toBeTruthy();
          expect(typeof locale).toBe("object");
          const l = locale as Record<string, unknown>;
          expect(typeof l.code, `${exportName}.code`).toBe("string");
          expect((l.code as string).length).toBeGreaterThan(0);
          expect(l.formatLong, `${exportName}.formatLong`).toBeTruthy();
          expect(l.localize, `${exportName}.localize`).toBeTruthy();
          expect(l.match, `${exportName}.match`).toBeTruthy();
        }
      });

      it("formats reference date without throwing", async () => {
        const mod = await import(/* @vite-ignore */ `date-fns/${entry.subpath}`);
        for (const exportName of entry.exports) {
          const locale = (mod as Record<string, unknown>)[exportName] as never;
          const long = format(REF, "PPP", { locale });
          const weekday = format(REF, "EEEE", { locale });
          expect(long.length, `${exportName} PPP`).toBeGreaterThan(0);
          expect(weekday.length, `${exportName} EEEE`).toBeGreaterThan(0);
        }
      });
    });
  }
});
```

Notes:
- `process.cwd()` is the project root under Vitest (consistent with every other `src/test/` file).
- Dynamic `import()` with a template-literal string is intentional — Vitest/Vite handles it; the `@vite-ignore` keeps Vite from trying to pre-bundle a literal-only set.
- All filesystem reads are synchronous and cheap (<10ms total for the current single-locale manifest; scales linearly).

#### 2. No changes elsewhere
- `scripts/generate-datefns-smoke-test.mjs` — unchanged; the new test consumes its output.
- `scripts/verify-datefns-files.mjs` / `verify-datefns-locales.mjs` — unchanged; CI gates remain.
- `dateFns.smoke.test.ts` — unchanged; this test is **complementary**, not a replacement (smoke focuses on import-time wiring, this one on installed surface + exports map + runtime).
- `vitest.config.ts` — picked up by the existing `src/**/*.test.ts` glob.
- CI workflows — runs as part of the regular vitest suite; no new step needed.

### Verification
1. Clean tree: `bunx vitest run src/test/dateFns.locales.test.ts` → 1 sanity + 4 assertions × N locales pass (currently 5 tests for `pt-BR`).
2. `rm -rf node_modules/date-fns/locale/pt-BR` → assertion A fails with the repair hint, naming `locale/pt-BR`.
3. Manually edit `node_modules/date-fns/package.json` to remove `"./locale/pt-BR"` from `exports` → assertion B fails naming the missing key.
4. Add a fake locale entry to `public/datefns-usage.json` (e.g. `locale/zz-ZZ`) → assertions A, B, C, D all fail for that subpath, all naming `zz-ZZ`.
5. CI: failures are visible in the existing `ci-check-smoke-logs` artifact via the regular vitest run, with the locale name in every failure message.

### Risk / scope
- 1 new file (~110 lines), 0 deps, 0 changes to existing code, generators, or workflows.
- Runs in <100ms for the current single-locale manifest.
- No behavioral change on green trees beyond N new passing tests (where N = locales × 4 assertions + 1 sanity).
- Self-extending: any locale added later via the generator is automatically picked up — no test edits needed.
