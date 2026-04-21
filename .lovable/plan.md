
## Plan: One-shot `verify:date-fns` script

### Goal
Single command that compares the three sources of truth for `date-fns` — `package.json` spec, `bun.lock` resolved version, `node_modules` installed version — and exits non-zero with a precise diff message if any drift exists. Usable locally and as a fast pre-flight in CI without the full clean-install cycle.

### Approach
Reuse the logic already in `scripts/install-report.mjs` (it computes all three values), but wrap it in a strict pass/fail script. Rather than duplicating, add a new minimal script that delegates to the same fields and `process.exit(1)` on mismatch.

### Change 1 — new file `scripts/verify-datefns-versions.mjs`

~30 lines:

- Read `package.json` → `dependencies["date-fns"]` (the spec, e.g. `4.1.0` or `^4.1.0`).
- Read `bun.lock` → grep for `"date-fns@X.Y.Z"` to extract the locked version.
- Read `node_modules/date-fns/package.json` → installed version.
- Normalize spec by stripping leading `^` / `~`.
- Compare all three. On mismatch, print a clear table:

  ```
  ✗ date-fns version drift detected:

      package.json spec : ^4.1.0  (normalized: 4.1.0)
      bun.lock resolved : 4.1.0
      node_modules      : 3.6.0   ← MISMATCH

    Fix: rm -rf node_modules && bun install --frozen-lockfile
  ```

  Then `process.exit(1)`. On match, print one green line and exit 0.

- Handle missing files explicitly (e.g. `node_modules/date-fns` absent → "not installed — run `bun install`").

### Change 2 — `package.json` scripts

Add one entry:

```json
"verify:date-fns": "node scripts/verify-datefns-versions.mjs"
```

Run via `bun run verify:date-fns` or `npm run verify:date-fns`.

### Why this shape
- **Separate from `install-report.mjs`.** That script is a *report* (always exits 0, prints info). This is a *gate* (exits 1 on drift). Mixing the two would force every CI step that just wants the report to also fail on drift, which is the opposite of how `ci-smoke.sh` step 5 is designed.
- **No new deps.** Pure Node, same parsing approach as the existing report script.
- **Doesn't replace CI logic.** `ci-smoke.sh` and `ci-check.sh` already do version checks inline (steps 4). This script gives developers and ad-hoc CI jobs the same gate as a one-liner, without running the full clean-install.

### Verification
1. `bun run verify:date-fns` on current tree → exits 0, prints "✓ date-fns X.Y.Z aligned across spec / lock / node_modules".
2. Sanity A: temporarily edit `package.json` `date-fns` to `"3.5.0"` (no reinstall) → script exits 1, message highlights spec vs installed mismatch. Revert.
3. Sanity B: temporarily `rm -rf node_modules/date-fns` → script exits 1 with "not installed" message. Restore via `bun install`.
4. `bash scripts/ci-smoke.sh` and `bash scripts/ci-check.sh` → unchanged, still green.

### Risk / scope
- One new file (~30 lines). One new `package.json` script entry. No source, dependency, route, schema, runtime, or existing-CI-script changes.
