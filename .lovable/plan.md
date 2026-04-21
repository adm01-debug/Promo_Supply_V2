
## Plan: Wire `verify-datefns-files.mjs` into both CI scripts with hard failure semantics

### Goal
Ensure `scripts/verify-datefns-files.mjs` (the on-disk subpath verifier) runs at the correct point in both CI scripts and that any non-zero exit aborts the run. Today:
- `ci-check.sh` already calls it at step `[7/13]` — but inside a `tee`-less plain command, exit propagation is fine; needs confirmation it's positioned **after install, before tsc/vitest**.
- `ci-smoke.sh` calls it at step `[7/7]` chained on the same line as `node scripts/generate-datefns-smoke-test.mjs --dry-run`. Under `set -e` this works, but it's positionally late (after ESLint, just before vitest) and lacks an explicit step label / failure log.

### Changes

#### 1. `scripts/ci-smoke.sh`
Promote the verifier to its own labeled step, run it **immediately after the version-match check (step [4/8]) and before the install-report**, so a broken install is caught before any heavier step runs.

Renumber to a clean `/9` sequence:

| Step | Action |
|---|---|
| `[1/9]` | Remove node_modules |
| `[2/9]` | Evict cache |
| `[3/9]` | Install frozen |
| `[4/9]` | Confirm date-fns version matches lockfile |
| **`[5/9]`** | **`node scripts/verify-datefns-files.mjs`** ← new dedicated step |
| `[6/9]` | Install report |
| `[7/9]` | ESLint date-fns gate |
| `[8/9]` | Generator dry-run + tsc smoke + vitest smoke |
| `[9/9]` | Emit health snapshot |

Implementation details:
- Wrap in `if ! node scripts/verify-datefns-files.mjs; then echo "✗ verify-datefns-files failed"; exit 1; fi` so failure is explicit even if `set -e` were ever relaxed.
- Add summary-state vars `VERIFY_FILES_RAN=0` / `VERIFY_FILES_OK=0` and a new line in `print_summary()`:
  ```
  printf "  Subpath files       : %s\n" "$verify_files_line"
  ```
  (`"verified ✓"` / `"✗ FAIL"` / `"not run"`).
- Remove the duplicate inline `node scripts/verify-datefns-files.mjs` from the old step `[7/7]` block since it's now its own step.

#### 2. `scripts/ci-check.sh`
The verifier is already at `[7/13]` — correct position (after install + version check, before tsc). Tighten it:

- Wrap with explicit failure handling (same `if ! ... exit 1` pattern) so a future edit that disables `set -e` or pipes the call through `tee` cannot silently swallow the exit code.
- Renumber to `/14` consistently (current script mixes `/13` and `/14` labels).
- No positional change needed.

Diff sketch:
```bash
echo "▶ [7/14] Verifying date-fns subpath files exist on disk..."
if ! node scripts/verify-datefns-files.mjs; then
  echo "✗ verify-datefns-files.mjs failed — broken install or missing subpath." >&2
  exit 1
fi
```

### Behavior

| Scenario | `ci-smoke.sh` | `ci-check.sh` |
|---|---|---|
| All subpaths present | Step `[5/9]` prints `✓ Verified N subpath(s)...`, summary shows `verified ✓` | Step `[7/14]` prints `✓ Verified N...`, continues |
| Missing subpath after install | Exits **1** at step `[5/9]` **before** ESLint/tsc/vitest run; summary shows `✗ FAIL`; tail of output shows the verifier's missing-file list | Exits **1** at `[7/14]` before tsc; CI artifact unaffected (verifier prints to stderr, not a log file) |
| `node_modules/date-fns` missing | Verifier's own existence guard fires first with "Run `bun install --frozen-lockfile`" | Same |

### Out of scope
- No changes to `scripts/verify-datefns-files.mjs` itself (already exits non-zero on missing files / missing package dir).
- No changes to GitHub workflows (both scripts already run under `bash scripts/ci-*.sh` and inherit exit codes).
- No changes to `package.json` scripts.
- No changes to `tsconfig.smoke.json`.

### Files edited
- `scripts/ci-smoke.sh` — promote verifier to dedicated step `[5/9]`, renumber all step labels to `/9`, add summary line + state vars, remove duplicate call from old step `[7/7]`.
- `scripts/ci-check.sh` — wrap existing call in explicit `if !` guard, normalize step labels to `/14`.

### Risk / scope
- 2 files edited, ~20 lines net change, 0 new files, 0 dep/workflow changes.
- Default behavior on a healthy install is unchanged (verifier already passed at the old position).
- Failure mode strictly improves: earlier exit in `ci-smoke.sh`, explicit exit guard in `ci-check.sh`.
