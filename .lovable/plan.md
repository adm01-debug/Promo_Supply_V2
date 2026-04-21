
## Plan: Add `verify:date-fns` script to `package.json`

### Goal
Expose `scripts/verify-datefns-files.mjs` as a runnable npm/bun script so developers can verify date-fns subpath integrity locally without remembering the full path.

### Change — single file: `package.json`

Add one entry to the `scripts` block:

```json
"verify:date-fns": "node scripts/verify-datefns-files.mjs"
```

Place it next to the other `verify:*` / `ci:*` scripts for discoverability.

### Usage

```sh
bun run verify:date-fns   # or: npm run verify:date-fns
```

Exits 0 when all subpaths resolve on disk, non-zero with the missing-file list otherwise (existing behavior of the script).

### Out of scope
- No changes to the script itself.
- No changes to CI scripts (already wired in `ci-check.sh` step `[7/14]` and `ci-smoke.sh` step `[5/9]`).
- No README update in this pass (can follow up if desired).

### Files edited
- `package.json` — 1 line added.

### Risk / scope
- 1 file, 1 line, additive only. Zero risk.
