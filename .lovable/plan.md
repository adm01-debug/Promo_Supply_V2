
## Plan: Enforce date-fns subpath imports via ESLint

### Goal
Prevent regressions where someone writes `import { format } from "date-fns"` (top-level barrel) instead of the required subpath form `import { format } from "date-fns/format"`. Catch it at lint time, not runtime.

### Approach
Use ESLint's built-in `no-restricted-imports` rule to ban the bare `"date-fns"` and `"date-fns/locale"` specifiers, while allowing every subpath (`date-fns/format`, `date-fns/locale/pt-BR`, etc.). No new dependency needed — the rule ships with ESLint core.

### Change — `eslint.config.js`

Add one rule entry inside the existing `rules` block:

```js
"no-restricted-imports": ["error", {
  paths: [
    {
      name: "date-fns",
      message: "Import from a date-fns subpath instead, e.g. `from \"date-fns/format\"`. Top-level barrel imports break tree-shaking and have regressed in past upgrades.",
    },
    {
      name: "date-fns/locale",
      message: "Import the specific locale subpath, e.g. `from \"date-fns/locale/pt-BR\"`.",
    },
  ],
}],
```

That's the only file edit. Everything else stays as-is.

### Why this rule (and not a TS-only check)
- TypeScript can't distinguish "this export exists on the barrel" from "this import is forbidden by policy" — both resolve fine. ESLint's `no-restricted-imports` is the standard mechanism for *policy* bans.
- Built into ESLint core → zero new dependencies, zero config plugins.
- `paths[].name` matches the exact specifier, so `date-fns/format`, `date-fns/addDays`, `date-fns/locale/pt-BR` etc. all remain allowed automatically.

### Verification
1. Run `npx eslint . --max-warnings=0` → must pass (codebase already uses subpaths everywhere per recent fixes).
2. Sanity check: temporarily edit one file to `import { format } from "date-fns"` → confirm ESLint reports the error with the custom message → revert.
3. Same sanity check with `import { ptBR } from "date-fns/locale"` → confirm second rule fires → revert.
4. Smoke test `npx vitest run src/test/dateFns.smoke.test.ts` stays green (8/8) — the rule is lint-only, no runtime impact.

### Risk / scope
- Single-file config edit. No source changes, no dependency changes, no behavior change.
- If any pre-existing file still imports from the barrel, ESLint will flag it — fix inline by switching to the subpath form (matches the established convention).
