
## Plan: Improve missing-subpath output in `verify-datefns-files.mjs`

### Goal
Make the failure output of `scripts/verify-datefns-files.mjs` more actionable: clearly enumerate every missing `date-fns/<subpath>`, show which candidate files were probed, and surface a copy-pasteable repair command in a visually distinct block.

### Current state (baseline)
On failure today the script prints:
```
✗ Missing date-fns subpath files (N):
  - date-fns/<sp>
  ...
Checked under: node_modules/date-fns
Run `rm -rf node_modules && bun install --frozen-lockfile` to repair.
```
The repair command is buried on the last line, the subpaths aren't grouped, and there's no hint of which candidate filenames were tried.

### Change — single file: `scripts/verify-datefns-files.mjs`

#### 1. Track candidates per missing subpath
Refactor the existence loop to record, per missing subpath, the full list of candidate paths it tried (already computed — just keep them):

```js
const missing = []; // [{ subpath, tried: [absPath, ...] }]
for (const sp of [...subpaths].sort()) {
  const candidates = [
    `${sp}.js`, `${sp}.mjs`, `${sp}.cjs`,
    `${sp}/index.js`, `${sp}/index.mjs`, `${sp}/index.cjs`,
  ].map((c) => join(PKG_DIR, c));
  if (!candidates.some(existsSync)) {
    missing.push({ subpath: sp, tried: candidates });
  }
}
```

#### 2. Format the failure block
Replace the current failure print with a clearly delimited, three-section block:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ verify-datefns-files: N missing date-fns subpath(s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Missing subpaths (imported from src/ but not on disk):
  • date-fns/<sp1>
      tried: <sp1>.js, <sp1>.mjs, <sp1>.cjs,
             <sp1>/index.js, <sp1>/index.mjs, <sp1>/index.cjs
  • date-fns/<sp2>
      tried: ...

Package directory checked:
  node_modules/date-fns

Likely cause:
  Broken or partial install — the lockfile resolves date-fns@X.Y.Z
  but one or more subpath files are missing from node_modules.

▶ Repair (copy & run):

    rm -rf node_modules && bun install --frozen-lockfile

After repair, re-run:

    bun run verify:datefns-files

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Implementation notes:
- The `tried:` paths are printed **relative to `node_modules/date-fns`** (strip `PKG_DIR + "/"`) so lines stay short.
- Use plain ASCII `━` / `•` / `▶` (already used elsewhere in the repo, e.g. `scripts/hooks/datefns-precommit.sh`).
- Wrap the repair command in **its own indented line with blank lines above/below** so terminal triple-click selects only the command — the "copyable text" requirement.
- Use ANSI color helpers (`red`, `cyan`, `gray`, `green`) **only when `process.stdout.isTTY`** so CI logs stay clean. Mirror the small color-helper pattern from `scripts/hooks/datefns-precommit.sh`.

#### 3. Polish the empty-set and missing-pkg branches
Apply the same delimited-block style to the existing two early-exit error paths so all three failure modes look consistent:
- `node_modules/date-fns not found` — suggest the same repair command.
- `no date-fns subpath imports found in src/` — suggest checking the scan root, no repair command.

#### 4. Success message unchanged
```
✓ Verified N date-fns subpath(s) exist on disk under node_modules/date-fns.
```
Keep as-is — already concise.

### Behavior

| Scenario | Output |
|---|---|
| All subpaths present | Single-line `✓ Verified N ...` (unchanged) |
| Missing subpaths | New delimited block: enumerated subpaths with their tried candidate files, followed by an isolated, copy-pasteable repair command |
| `node_modules/date-fns` missing | Same delimited style, copy-pasteable repair command |
| No imports found in `src/` | Same delimited style, no repair command (different cause) |

### Out of scope
- No new CLI flags (no `--json`, no `--quiet`).
- No change to exit codes (still `1` on any failure, `0` on success).
- No change to detection patterns (still static named imports only — broader patterns are a separate plan already discussed).
- No change to CI scripts, `package.json`, or workflows.

### Files edited
- `scripts/verify-datefns-files.mjs` — ~40 lines changed (new formatting helpers + restructured failure blocks).

### Risk / scope
- 1 file, output-only change. Exit contract preserved. CI parsing isn't affected (no script greps this output today). Strictly improves developer experience on failure.
