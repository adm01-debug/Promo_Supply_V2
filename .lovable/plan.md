
## Plan: Align date-fns version with lockfile

### Current state
- `package.json` declares `date-fns@3.6.0` (set during the previous fix attempt).
- All 56 source files now use subpath imports (`from "date-fns/format"`, `from "date-fns/locale/pt-BR"`), which work on both v3 and v4.
- The lockfiles (`bun.lock`, `package-lock.json`) may still resolve to a different version than declared, causing drift.

### Goal
Verify the actually-installed version, then regenerate the lockfile so it matches `package.json` exactly and the build is reproducible.

### Steps
1. Read installed version from `node_modules/date-fns/package.json` and the resolved entry in `bun.lock` / `package-lock.json` — confirm whether they agree with `package.json` (`3.6.0`).
2. If there is drift, pin `date-fns` to `3.6.0` explicitly in `package.json` (exact version, no caret) so future installs cannot upgrade to 4.x.
3. Regenerate `bun.lock` (project's primary lockfile per `bun.lockb` presence) by running `bun install` so the lock entry matches the pinned version. Also refresh `package-lock.json` via `npm install --package-lock-only` to keep both lockfiles consistent.
4. Re-verify: `node_modules/date-fns/package.json` reports `3.6.0`, lockfile entries point to `3.6.0`, and `npx tsc --noEmit` still passes (subpath imports remain valid).

### Notes
- No source code changes — subpath imports already work on v3 and v4, so this is purely a dependency hygiene step.
- Pinning to `3.6.0` (not `^3.6.0`) prevents accidental upgrade to v4 which removes barrel exports and could regress if any future code reverts to `from "date-fns"`.
- No UI, schema, or behavior changes.
