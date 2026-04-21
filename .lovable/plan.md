
## Plan: Pin date-fns to exact version 3.6.0

### Goal
Remove the caret (`^`) from `date-fns` in `package.json` so the version is exact-pinned, preventing any future `npm/bun install` from silently jumping to a higher minor (e.g. 3.7.x) or major (4.x) that could regress the subpath imports.

### Change
**`package.json`** — single edit:

```diff
- "date-fns": "^3.6.0",
+ "date-fns": "3.6.0",
```

(If the current entry is already `"3.6.0"` without the caret, no edit is needed and we skip straight to verification.)

### Verification steps
1. Read `package.json` to confirm current spec, apply the edit only if a range operator (`^`, `~`, `>=`) is present.
2. Run `bun install` so the lockfile is rewritten with the exact pin (no version drift; same 3.6.0 already on disk).
3. Confirm `node_modules/date-fns/package.json` still reports `"version": "3.6.0"`.
4. Grep the lockfile (`bun.lock`) for the `date-fns` entry — must resolve to `3.6.0` exactly.
5. Run the smoke test `npx vitest run src/test/dateFns.smoke.test.ts` — must stay green (8/8).
6. Run `npx tsc --noEmit -p tsconfig.app.json` — must report 0 errors.

### Notes
- No source code changes. No UI, schema, or behavior impact.
- Pure dependency hygiene: locks the version contract so the previously fixed subpath imports cannot break from an automatic upgrade.
