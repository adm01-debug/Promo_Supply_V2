
## Plan: Add a fixture + test that proves the date-fns rule fails

### Goal
Create a deliberately-bad example file and a tiny test that runs the date-fns ESLint config against it and asserts the rule fires. The fixture must NOT pollute the main lint gate (CI must stay green).

### Files

#### New — `eslint-rules/__fixtures__/bad-date-fns-import.ts` (~6 lines)
A throwaway TS file that intentionally violates the rule:
```ts
// Intentional violation — used by eslint-rules/__tests__/date-fns-subpath.test.ts
// to prove `local/date-fns-subpath` reports on barrel imports.
// DO NOT FIX. DO NOT IMPORT FROM RUNTIME CODE.
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const _sample = format(new Date(), "yyyy-MM-dd", { locale: ptBR });
```

#### Modified — `eslint.date-fns.config.js`
Extend the existing `ignores` array to skip the fixtures directory so the main `lint:date-fns` / `ci:lint:date-fns` gate doesn't trip on it:
```js
ignores: [
  "dist/**",
  "node_modules/**",
  "supabase/functions/**",
  "eslint-rules/**",
  "eslint-rules/__fixtures__/**", // explicit, even though covered by line above
],
```
(`eslint-rules/**` already covers it; the explicit line is documentation.)

#### New — `eslint-rules/__tests__/date-fns-subpath.test.ts` (~40 lines)
Vitest test that:
1. Imports `ESLint` from `eslint` programmatically.
2. Builds a Linter instance with ONLY the custom rule loaded (bypasses the config's `ignores`).
3. Lints the fixture file.
4. Asserts:
   - Exactly 2 messages reported (one per barrel import).
   - Both have `ruleId === "local/date-fns-subpath"`.
   - Messages reference the `barrel` and `barrelLocale` message IDs respectively.
5. Sanity check the autofixer: run with `fix: true`, assert output contains `from "date-fns/format"` and `from "date-fns/locale/pt-BR"`.

```ts
import { describe, it, expect } from "vitest";
import { Linter } from "eslint";
import { readFileSync } from "node:fs";
import { dateFnsSubpath } from "../date-fns-subpath.js";

const FIXTURE = "eslint-rules/__fixtures__/bad-date-fns-import.ts";

function lint(code: string, fix = false) {
  const linter = new Linter();
  linter.defineRule("local/date-fns-subpath", dateFnsSubpath as never);
  return linter.verifyAndFix(code, {
    parserOptions: { ecmaVersion: 2020, sourceType: "module" },
    rules: { "local/date-fns-subpath": "error" },
  }, { filename: FIXTURE });
}

describe("local/date-fns-subpath", () => {
  const src = readFileSync(FIXTURE, "utf8");

  it("reports both barrel imports", () => {
    const linter = new Linter();
    linter.defineRule("local/date-fns-subpath", dateFnsSubpath as never);
    const msgs = linter.verify(src, {
      parserOptions: { ecmaVersion: 2020, sourceType: "module" },
      rules: { "local/date-fns-subpath": "error" },
    }, FIXTURE);
    expect(msgs).toHaveLength(2);
    expect(msgs.every(m => m.ruleId === "local/date-fns-subpath")).toBe(true);
    expect(msgs.map(m => m.messageId).sort()).toEqual(["barrel", "barrelLocale"]);
  });

  it("autofix rewrites to subpath imports", () => {
    const result = lint(src, true);
    expect(result.fixed).toBe(true);
    expect(result.output).toContain('from "date-fns/format"');
    expect(result.output).toContain('from "date-fns/locale/pt-BR"');
    expect(result.output).not.toMatch(/from "date-fns"/);
  });
});
```

Note: the project already has `eslint` as a devDep (it's used by `lint:date-fns`), so no new dependency. Vitest is also already configured (`vitest.config.ts` exists, plenty of tests in `src/test/`).

#### Modified — `vitest.config.ts` (only if needed)
Confirm the test glob picks up `eslint-rules/**/*.test.ts`. If the existing config restricts to `src/`, widen `include` to also match `eslint-rules/__tests__/**/*.test.ts`. (Will inspect during implementation; if `src/`-scoped, add the extra glob — single-line change.)

### Verification
1. `bun run test eslint-rules/__tests__/date-fns-subpath.test.ts` → both assertions pass (rule fires on fixture, autofix rewrites correctly).
2. `bun run lint:date-fns` → exits 0 (fixture is ignored by config, real source still clean).
3. `bun run ci:lint:date-fns` → same, exits 0.
4. `bash scripts/ci-check.sh` and `bash scripts/ci-smoke.sh` → unchanged, green.
5. The new GitHub Actions workflow (`lint-date-fns.yml`) → green on PRs since the fixture is ignored.

### Risk / scope
- 2 new files (~50 lines combined). 1 small config edit (comment-only line in `ignores`). Optional 1-line vitest config widening. Zero source/dep/route/schema changes. The fixture is explicitly excluded from the lint gate, so CI remains green.
