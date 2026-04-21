
## Plan: Per-subpath existence report in `public/dependency-health.json`

### Goal
Extend the snapshot written by `scripts/verify-datefns-files.mjs --write-health` so each detected `date-fns/<subpath>` is recorded **with its on-disk status and the resolved file**, not just as a name in a flat list. This makes drift between installs (e.g. a subpath flipping from `exists: true` to `exists: false`) visible to `scripts/diff-dependency-health.mjs`.

### Current state (baseline)
After today's `--write-health` run, the snapshot contains:

```json
"dateFns": {
  "spec": "3.6.0", "installed": "3.6.0", "locked": "3.6.0", "exactPinned": true,
  "subpaths": {
    "scannedAt": "2026-04-21T...",
    "count": 21,
    "list": ["addDays", "addMonths", ..., "parseISO"]
  }
}
```

The flat `list` says **what we import** but not **whether it resolves**. Today the verifier already probes each subpath against six candidate files — we just throw that result away after the pass/fail decision.

### Design

#### 1. Reshape `dateFns.subpaths` — additive at the field level
Replace `list: string[]` with `entries: Array<{ subpath, exists, resolvedFile }>`, and keep `count` plus a new `missingCount` for grep-ability.

```json
"dateFns": {
  "spec": "3.6.0", "installed": "3.6.0", "locked": "3.6.0", "exactPinned": true,
  "subpaths": {
    "scannedAt": "2026-04-21T18:30:00.000Z",
    "count": 21,
    "missingCount": 0,
    "entries": [
      { "subpath": "addDays",      "exists": true, "resolvedFile": "addDays.js" },
      { "subpath": "format",       "exists": true, "resolvedFile": "format/index.js" },
      { "subpath": "locale/pt-BR", "exists": true, "resolvedFile": "locale/pt-BR/index.js" },
      ...
    ]
  }
}
```

- `entries` is sorted by `subpath` (already what the verifier does).
- `resolvedFile` is the **first** matching candidate from the existing probe list (`<sp>.js`, `<sp>.mjs`, `<sp>.cjs`, `<sp>/index.js`, `<sp>/index.mjs`, `<sp>/index.cjs`), printed **relative to `node_modules/date-fns`** so the value is short and stable across machines.
- `resolvedFile` is `null` when `exists: false`.
- `list` is **dropped** — `entries.map(e => e.subpath)` reconstructs it. Backwards-compatible reads of `dateFns.spec/installed/locked/exactPinned` are untouched; `subpaths.list` had only one consumer (`diff-dependency-health.mjs`'s newly-added subpath diff) which we update in step 3.

#### 2. Compute the report inside the verifier — reuse, don't re-walk
Refactor the existence loop so it builds `entries` for **every** subpath (existing loop only tracks the missing ones). One pass, same probes:

```js
const entries = [];
const missing = [];
for (const sp of [...subpaths].sort()) {
  const candidates = [`${sp}.js`, `${sp}.mjs`, `${sp}.cjs`,
                      `${sp}/index.js`, `${sp}/index.mjs`, `${sp}/index.cjs`];
  const hit = candidates.find((c) => existsSync(join(PKG_DIR, c))) ?? null;
  entries.push({ subpath: sp, exists: hit !== null, resolvedFile: hit });
  if (!hit) missing.push({ subpath: sp, tried: candidates });
}
```

Failure-mode formatting (Failure mode C: missing subpaths block) is unchanged — it still uses `missing[]` and exits with code `1`.

#### 3. Write the richer block under `--write-health`
The `--write-health` branch (already at the bottom of the script) now serializes `entries` instead of `list`:

```js
const subpathsBlock = {
  scannedAt: new Date().toISOString(),
  count: entries.length,
  missingCount: entries.filter((e) => !e.exists).length,
  entries,
};
```

Crucially: this branch runs **after** the `missing.length > 0` exit. So `--write-health` only lands a snapshot in the success path. That matches the existing intent (don't poison the snapshot on a broken install) and keeps `missingCount` always `0` in committed snapshots — but the field is still useful when a developer runs the verifier locally with `--write-health` on a partly-broken tree (we'll move the write earlier? **No.** Keep current ordering: a missing subpath aborts before we write. Document the `missingCount: 0` invariant in a comment.).

Actually — re-reading the user's intent ("lists the detected date-fns subpaths and whether each one exists on disk") suggests they want the report **even when some don't exist**. Compromise: under `--write-health`, write the snapshot **before** the early-exit, then still exit 1. That preserves CI gating while making the report comprehensive. Add a one-line comment explaining the ordering.

```js
if (WRITE_HEALTH) writeSnapshot(entries);  // always write first
if (missing.length > 0) { /* print failure block + exit 1 */ }
```

#### 4. Update the diff helper for the new shape
`scripts/diff-dependency-health.mjs::diffDateFns()` currently reads `subpaths.list`. Update it to read `subpaths.entries.map(e => e.subpath)` for added/removed detection, and add a third diff line for **resolution flips** — subpaths present in both snapshots whose `exists` or `resolvedFile` changed:

```
  date-fns:
    subpaths.count: 21 → 22
    subpaths.missingCount: 0 → 1
    subpaths added:
      + locale/de
    subpaths resolution changed:
      ~ format: exists true → false  (resolved format/index.js → —)
```

Cap each list at `OFFENDER_DIFF_CAP` (20) — same pattern as today.

Backwards-compat: if the previous snapshot still has `list` (older format), fall back to that for the added/removed comparison and skip the resolution-flip section.

#### 5. Generator preserves the new shape
`scripts/generate-dependency-health.mjs` already preserves `existing.dateFns.subpaths` wholesale (the block we added in the previous plan). No change needed — the new `entries` shape rides through the same code path.

### Behavior matrix

| Scenario | Snapshot effect | Exit code |
|---|---|---|
| `verify:datefns-files` (no flag, all present) | None | 0 |
| `verify:datefns-files:write` (all present) | `entries` written, `missingCount: 0` | 0 |
| `verify:datefns-files:write` (some missing) | `entries` written **with `exists: false` rows**, `missingCount > 0` | 1 |
| `deps:health` (regenerator) | `subpaths` block preserved unchanged | 0 |
| `deps:health` diff after a `:write` run | Now also reports added/removed/flipped subpaths | 0 |

### Files edited
- `scripts/verify-datefns-files.mjs` — refactor probe loop to build `entries[]`, move `--write-health` branch to before the missing-subpath exit, write new shape (~20 lines changed).
- `scripts/diff-dependency-health.mjs` — read `entries`, add resolution-flip section, keep `list` fallback (~25 lines changed).

### Out of scope
- No change to the failure-block formatting, exit codes, or detection regex set.
- No new CLI flags — `--write-health` keeps its single role.
- No new `npm` scripts.
- No CI workflow change — the existing `.github/workflows/dependency-health.yml` step (`bun run verify:datefns-files:write`) automatically picks up the richer payload.
- No tests added (matches existing convention; no unit tests exist for verifier or diff).

### Risk / scope
- 2 files, ~45 lines total, additive at the JSON-field level (`list` removed, `entries` added).
- The only consumer of the prior shape was the diff helper — updated in the same change.
- One subtle behavioral change: with `--write-health`, the snapshot is now written even when subpaths are missing (so the report is comprehensive). The verifier still exits 1 in that case. If you'd rather keep the old "abort before write" ordering, say so and I'll flip it.
