
## Plan: ESLint guard for invalid `date-fns` imports

### Goal
Catch invalid `date-fns` subpath imports and bad named exports at lint time (before type-check, before CI), with clear error messages pointing at the offending line.

### Approach
Use `eslint-plugin-import` with the TypeScript resolver — it understands `package.json` `exports`, so any `date-fns/<bad>` subpath or non-existent named export fires immediately:

- `import/no-unresolved` — flags `import x from "date-fns/foo"` if the subpath isn't exported.
- `import/named` — flags `import { nonExistent } from "date-fns"`.

Two new dev deps: `eslint-plugin-import` + `eslint-import-resolver-typescript`. Both are the de facto standard pairing for ESLint flat config + TS path resolution.

### Change — `eslint.config.js`

Add the plugin, register the two rules, and wire up the TS resolver pointing at `tsconfig.app.json` (so it picks up our tightened `resolvePackageJsonExports`).

Scope the new rules to `src/**/*.{ts,tsx}` only — no point linting config files or scripts.

### Why this shape
- **Plugin-based, not custom rule.** `eslint-plugin-import` is mature, widely used, and already understands the exports field via the TS resolver. Writing a custom rule for one package is overkill.
- **TS resolver, not Node resolver.** The TS resolver respects `tsconfig.app.json` settings (`resolvePackageJsonExports: true`), keeping lint and type-check in lockstep. The default Node resolver would miss exports-field violations.
- **Only two rules enabled.** `no-unresolved` + `named` cover the failure modes we actually care about (bad subpath, bad named export). Other plugin rules (`import/order`, `import/no-cycle`, etc.) are style/architecture concerns out of scope here.
- **Errors, not warnings.** A broken import is never a warning — it's a build break waiting to happen.

### Verification
1. `bun add -D eslint-plugin-import eslint-import-resolver-typescript` → installs.
2. `npx eslint src` → exits 0 (current code is clean).
3. Sanity A: temporarily add `import { format } from "date-fns/this-does-not-exist";` to a file → `npx eslint <file>` → fires `import/no-unresolved` with the bad path. Revert.
4. Sanity B: temporarily add `import { totallyFakeExport } from "date-fns";` → `npx eslint <file>` → fires `import/named`. Revert.
5. `npx tsc --noEmit -p tsconfig.app.json` → still green (no source change).

### Risk / scope
- Two new dev deps. One config file edited. No source, runtime, route, schema, or CI-script changes.
- Adds ~1–2s to `eslint` runs (resolver has to load tsconfig + walk `node_modules` exports). Trivial.
- Possible false positives on existing imports if any subpath happens to violate the exports field today — verification step 2 catches this before we ship.
