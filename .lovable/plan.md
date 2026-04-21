
## Plan: Persist discovered date-fns subpaths into `public/dependency-health.json`

### Goal
Let `scripts/verify-datefns-files.mjs` optionally append the sorted list of discovered `date-fns/<subpath>` references into `public/dependency-health.json`, so install-to-install drift in subpath usage is visible to the existing `scripts/diff-dependency-health.mjs` tooling.

### Design

#### 1. Opt-in flag in `verify-datefns-files.mjs`
Add a `--write-health` (also `--update-health`) CLI flag, off by default.
- Without flag → behavior is unchanged (pure verifier, exits 0/1).
- With flag → after a successful verification, merge a new `dateFns.subpaths` block into `public/dependency-health.json`.

Why opt-in: the verifier runs in pre-push hooks and CI step `[5/9]`/`[7/14]`; we don't want every developer's local run to dirty `public/dependency-health.json`. The flag is for the dependency-health workflow and on-demand local diffs.

#### 2. JSON shape — additive, non-breaking
Inside the existing `dateFns` object in `public/dependency-health.json`:

```json
"dateFns": {
  "spec": "3.6.0",
  "installed": "3.6.0",
  "locked": "3.6.0",
  "exactPinned": true,
  "subpaths": {
    "scannedAt": "2026-04-21T18:30:00.000Z",
    "count": 42,
    "list": ["addDays", "format", "locale/pt-BR", "parseISO", ...]
  }
}
```

- Keys at the top of the file (`generatedAt`, `packages`, `lockfileDrift`, `treeShaking`) are untouched.
- `list` is sorted alphabetically (already sorted by the verifier's existence loop).
- `count` is redundant with `list.length` but cheap and improves grep-ability.

#### 3. Merge semantics
The verifier doesn't regenerate the whole snapshot — it only rewrites the `dateFns.subpaths` sub-object. Read-merge-write:

```js
const snapshot = existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, "utf8")) : {};
snapshot.dateFns = snapshot.dateFns ?? {};
snapshot.dateFns.subpaths = { scannedAt, count, list };
writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2) + "\n");
```

If the file doesn't exist yet, write a minimal `{ dateFns: { subpaths: {...} } }` skeleton — `scripts/generate-dependency-health.mjs` will fill in the rest on its next run.

#### 4. Generator stays the source of truth for everything else
`scripts/generate-dependency-health.mjs` keeps writing `generatedAt`, `packages`, `lockfileDrift`, `treeShaking`, **and now** preserves any pre-existing `dateFns.subpaths` it finds (read-then-merge, same pattern). One added safeguard so a generator run after a verifier run doesn't wipe `subpaths`:

```js
const existing = readJsonSafe(outPath);
if (existing?.dateFns?.subpaths) snapshot.dateFns.subpaths = existing.dateFns.subpaths;
```

#### 5. Diff visibility
Extend `scripts/diff-dependency-health.mjs`'s `diffDateFns()` to print added/removed subpaths when `dateFns.subpaths.list` differs:

```
  date-fns:
    subpaths.count: 41 → 42
    subpaths added:
      + locale/pt-BR
    subpaths removed:
      - locale/pt
```

Cap added/removed lists at 20 entries (mirrors `OFFENDER_DIFF_CAP`). No exit-code change — diff is informational, matching existing policy.

#### 6. New npm script for convenience
Add to `package.json`:

```json
"verify:datefns-files:write": "node scripts/verify-datefns-files.mjs --write-health"
```

Naming aligns with the existing `verify:datefns-files` entry.

#### 7. CI wiring
- `scripts/ci-smoke.sh` step `[5/9]` → unchanged (still runs verifier without `--write-health`; CI shouldn't dirty the snapshot).
- `scripts/ci-check.sh` step `[7/14]` → unchanged.
- `.github/workflows/dependency-health.yml` → after `bun run deps:health`, add one line: `bun run verify:datefns-files:write`. The auto-commit step (`stefanzweifel/git-auto-commit-action@v5`) already commits `public/dependency-health.json`, so the new field rides along.

### Behavior matrix

| Invocation | Output | Snapshot side effect |
|---|---|---|
| `bun run verify:datefns-files` (default) | Verifier output only | None |
| `bun run verify:datefns-files:write` | Verifier output + `▶ Wrote dateFns.subpaths to public/dependency-health.json (N entries)` | `dateFns.subpaths` updated |
| `bun run deps:health` | Generator output | Full snapshot rewritten; preserves any prior `dateFns.subpaths` |
| `bun run deps:health:diff` (after a `:write` run) | Now also prints subpath added/removed | None |
| Weekly `dependency-health` workflow | Generator + verifier:write | Snapshot committed with both `treeShaking` and `dateFns.subpaths` refreshed |

### Files edited
- `scripts/verify-datefns-files.mjs` — add `--write-health` flag handler (~25 lines).
- `scripts/generate-dependency-health.mjs` — preserve existing `dateFns.subpaths` on regeneration (~5 lines).
- `scripts/diff-dependency-health.mjs` — extend `diffDateFns()` with subpath added/removed section (~25 lines).
- `package.json` — add `verify:datefns-files:write` script (1 line).
- `.github/workflows/dependency-health.yml` — add one verifier-write step after `deps:health` (~3 lines).

### Out of scope
- No change to detection patterns (still static named imports — broader patterns remain a separate plan).
- No change to verifier exit codes or failure-block formatting.
- No new top-level keys in `dependency-health.json` — `subpaths` lives under the existing `dateFns` object to keep the shape additive.
- No tests added for the diff helper (matches existing convention — `diff-dependency-health.mjs` has no unit tests today).

### Risk / scope
- 5 files, ~60 lines total, all additive.
- Default verifier behavior unchanged → zero impact on pre-push and CI.
- JSON shape extension is backwards-compatible (consumers reading `dateFns.spec`/`installed`/`locked` are unaffected).
