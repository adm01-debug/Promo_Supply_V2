
## Plan: Clean reinstall of dependencies

### Goal
Wipe `node_modules` and reinstall from the lockfile so the pinned `date-fns@3.6.0` (and every other dep) is freshly materialized on disk, eliminating any stale artifacts from prior installs.

### Steps
1. Remove `node_modules/` entirely.
2. Reinstall using Bun (project's primary package manager — `bun.lockb` + `bun.lock` present): `bun install --frozen-lockfile` so the lockfile is honored exactly.
3. Verify `node_modules/date-fns/package.json` reports `"version": "3.6.0"`.
4. Confirm the subpath entry exists: `node_modules/date-fns/format.js` (or `.mjs`) and `node_modules/date-fns/locale/pt-BR.js` resolve.
5. Run the smoke test: `npx vitest run src/test/dateFns.smoke.test.ts` — must be green.
6. Run `npx tsc --noEmit` — must report 0 errors related to `date-fns`.

### Notes
- No source, lockfile, or `package.json` changes. This is a filesystem hygiene step only.
- If `bun install --frozen-lockfile` fails due to lockfile drift, fall back to `bun install` (regenerates lock) and report the diff.
- No UI, schema, or behavior impact.
