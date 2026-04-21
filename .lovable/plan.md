
## Plan: Targeted mismatch reporting for `verify:date-fns`

### Goal
When drift is detected, print a true side-by-side table of spec / locked / installed with per-row mismatch markers, then a **specific** fix command tailored to which pair is out of sync — not a one-size-fits-all "reinstall everything".

### Change — `scripts/verify-datefns-versions.mjs`

Rewrite the mismatch branch (lines 49–60) to:

**1. Print a fixed-width table** so the three values line up vertically:

```
✗ date-fns version drift detected:

    SOURCE              VERSION    STATUS
    ─────────────────── ────────── ──────────────
    package.json spec   ^4.1.0     ← drift
    bun.lock resolved   4.1.0      ok
    node_modules        3.6.0      ← drift

    (spec normalized: 4.1.0)
```

The `STATUS` column compares each value to the **majority** of the three (or to `LOCKED` when all three differ), so the actual outlier is the one marked — not whichever one we picked as "reference".

**2. Diagnose the drift pattern and emit a targeted fix:**

| Pattern | Diagnosis | Fix command |
|---|---|---|
| `spec ≠ lock = installed` | package.json was edited but not relocked | `bun install` (updates lock + node_modules to satisfy new spec) |
| `spec = lock ≠ installed` | node_modules is stale or hand-mutated | `bun install --frozen-lockfile` |
| `spec = installed ≠ lock` | lockfile is corrupt or out of date | `rm bun.lock && bun install` |
| `spec ≠ lock ≠ installed` (all differ) | full corruption | `rm -rf node_modules bun.lock && bun install` |

The fix line reads e.g.:

```
  Fix (spec drifted from lock+installed):
    bun install
```

**3. Keep the success path unchanged** — single green line, exit 0.

### Why this shape
- **Side-by-side table, not inline values.** The user's request was explicit: "spec vs locked vs installed **side-by-side**". Fixed-width columns give that; the current inline format does not.
- **Majority-based outlier detection.** Hard-coding `INSTALLED` as reference (current behavior) wrongly marks two rows when only one is actually wrong. Comparing against the majority pinpoints the real outlier.
- **Pattern-specific fix command.** "Tells me exactly what to run" is the explicit ask. A single canned `rm -rf node_modules && bun install --frozen-lockfile` is wrong for the spec-drift case (it would re-install the **old** spec from the lock and mask the edit).
- **No new dependencies, no new files.** ~30 added lines inside the existing script.

### Verification
1. Current aligned tree → `node scripts/verify-datefns-versions.mjs` → exits 0, green line.
2. Edit `package.json` `date-fns` to `"3.5.0"`, no reinstall → table shows spec as outlier, fix says `bun install`. Revert.
3. `rm -rf node_modules/date-fns && bun install --ignore-scripts node_modules/date-fns` (or hand-edit its `package.json` version) → table shows installed as outlier, fix says `bun install --frozen-lockfile`. Restore.
4. Edit `bun.lock` to bump only the `"date-fns@X.Y.Z"` line → table shows lock as outlier, fix says `rm bun.lock && bun install`. Revert.
5. `bash scripts/ci-smoke.sh` and `bash scripts/ci-check.sh` → unchanged, still green.

### Risk / scope
- One file edited (~30 net new lines). No new deps, no new files, no source/route/schema/CI-script changes.
- Behavior change is strictly in the **failure** path; success path is byte-identical.
