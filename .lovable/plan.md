
## Plan: Detailed `dependency-health.json` diff in CI output

### Goal
When `bun run deps:health` runs in CI (step `[14/14]` of `scripts/ci-check.sh`), surface a human-readable diff of `public/dependency-health.json` between the previously committed snapshot and the freshly generated one — focused on the fields that matter: `date-fns` spec/locked/installed versions, tracked package drift flags, and the tree-shaking offenders list (which captures locale and `date-fns/*` import changes).

### Current state
- `scripts/generate-dependency-health.mjs` overwrites `public/dependency-health.json` and prints a flat one-line summary per package plus a `tree-shaking` line.
- CI step `[14/14]` just calls `bun run deps:health`. If the snapshot changes, the only signal is the file diff in the eventual commit — invisible during the CI run itself.
- No way to see *what* changed (e.g., did `date-fns` move from `3.6.0` → `3.6.1`? Did a new barrel import appear? Did a tracked package drift?) without manually diffing two JSON blobs.

### Approach
Read the *existing* `public/dependency-health.json` **before** the generator overwrites it, then compute and print a focused diff after generation. Implement as a new script `scripts/diff-dependency-health.mjs` invoked as a wrapper, leaving the existing generator untouched.

### Changes

#### 1. New file: `scripts/diff-dependency-health.mjs` (~120 lines)

Pure Node, zero deps. Responsibilities:

a. **Snapshot the previous file** before the generator runs:
   - Read `public/dependency-health.json` if it exists; keep contents in memory.
   - If missing (first run), record `previous = null` and print `"No previous snapshot — this is the baseline."`.

b. **Invoke the generator** via `child_process.spawnSync("node", ["scripts/generate-dependency-health.mjs"], { stdio: "inherit" })`. Propagate exit code on failure.

c. **Read the new file** and compute a focused diff:
   - **`date-fns` block**: per-field comparison of `spec`, `installed`, `locked`, `exactPinned`. Print only changed fields, e.g. `date-fns.installed: 3.6.0 → 3.6.1`.
   - **`packages[]` array**: keyed by `name`. For each tracked package, compare `spec`, `locked`, `installed`, `driftDetected`. Print added/removed/changed entries.
   - **`lockfileDrift.detected`**: boolean flip → highlight as `⚠ lockfile drift status: false → true` (or vice versa).
   - **`treeShaking`**:
     - `barrelImportsFound`: numeric delta with arrow.
     - `riskLevel`: state transition (`ok → warning`, etc.) — flagged with `⚠` if degrading.
     - `offenders[]`: keyed by `${file}:${line}:${importPath}`. Print added (`+ src/foo.ts:42 imports "date-fns/locale"`) and removed (`- src/bar.ts:10 imports "date-fns"`) entries. Cap at 20 added + 20 removed; print `… and N more` if truncated. This is the line that surfaces locale/export changes.

d. **Output format** — plain text, prefixed with section headers and color-friendly arrows, written to stdout so it appears inline in CI logs:
   ```
   ▶ dependency-health.json diff
     date-fns:
       installed: 3.6.0 → 3.6.1
     packages:
       react.locked: 18.3.1 → 18.3.2
     tree-shaking:
       barrelImportsFound: 0 → 1
       riskLevel: ok → warning  ⚠
       offenders:
         + src/components/Foo.tsx:14  "date-fns/locale"
   ```
   When nothing changed: `✓ dependency-health.json unchanged.` on a single line.

e. **Exit code policy**: always exit `0` on a clean run. Diff content is informational, not a gate. (Drift gating is already handled by `[10/14]` via `--dry-run` and by separate workflows.) Only exit non-zero if the wrapped generator itself failed.

#### 2. `package.json` — wrap `deps:health`

Current:
```json
"deps:health": "node scripts/generate-dependency-health.mjs"
```

Replace with:
```json
"deps:health": "node scripts/diff-dependency-health.mjs",
"deps:health:generate": "node scripts/generate-dependency-health.mjs"
```

The wrapper becomes the default — CI and local runs both get the diff. The raw generator stays accessible as `deps:health:generate` for cases that need silent regeneration (e.g., the `dependency-health.yml` GitHub workflow which auto-commits the file; using the wrapper there too is fine since extra log noise is harmless).

#### 3. `scripts/ci-check.sh` — update step `[14/14]` label

Tiny copy update:
```sh
echo "▶ [14/14] Refreshing public/dependency-health.json snapshot (with diff vs. previous)..."
bun run deps:health
```

No structural change — just clarifies the new behavior in the step header.

### What does NOT change
- `scripts/generate-dependency-health.mjs` — kept as the single source of truth for generating the snapshot. The wrapper composes it.
- The schema of `public/dependency-health.json`.
- Edge function `supabase/functions/dependency-health/index.ts`, the admin UI panel `src/components/admin/DependencyHealthBadge.tsx`, the `dependency_health` and `dependency_health_history` tables.
- `.github/workflows/dependency-health.yml` — it currently calls `bun run deps:health`; the wrapper is a drop-in replacement that just adds log output (auto-commit logic is unaffected).
- All other CI steps and scripts (smoke test, drift check, lint, typecheck).

### Verification
1. Clean tree: `bun run deps:health` → wrapper runs generator, prints `✓ dependency-health.json unchanged.` Exit 0.
2. Manually edit `public/dependency-health.json` to set `dateFns.installed = "3.5.0"` then `bun run deps:health` → output shows `date-fns.installed: 3.5.0 → 3.6.0`. Exit 0.
3. Add `import { format } from "date-fns"` (a deliberate barrel import) to a `src/` file → output shows the new offender line under `tree-shaking → offenders → +`, plus `barrelImportsFound: 0 → 1` and `riskLevel: ok → warning ⚠`. Revert → diff shows the inverse.
4. Delete `public/dependency-health.json` then `bun run deps:health` → output starts with `"No previous snapshot — this is the baseline."`, full snapshot is regenerated, exit 0.
5. CI: step `[14/14]` log now contains the diff section inline. The `dependency-health.yml` weekly workflow continues to auto-commit; commit message unchanged.

### Risk / scope
- 1 new file (`scripts/diff-dependency-health.mjs`, ~120 lines, pure Node + JSON).
- 2 lines edited in `package.json` (one renamed, one added).
- 1 line edited in `scripts/ci-check.sh` (label only).
- Zero new deps, zero behavioral change to the snapshot itself, zero impact on green CI runs beyond extra informational log lines. The wrapper adds <100ms overhead.
