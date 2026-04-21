
## Plan: Upload tsc + vitest smoke logs as CI artifacts for PR inspection

### Goal
When `scripts/ci-check.sh` runs in GitHub Actions, capture the stdout/stderr of the focused tsc smoke validation (`tsconfig.smoke.json`) and the vitest smoke test run, then upload them as PR artifacts. Same for the `datefns-smoke-drift` workflow. So when CI fails, the developer can download `smoke-logs.zip` from the PR's Checks tab and read the exact tsc/vitest output without re-running locally.

### Current state
- `scripts/ci-check.sh` step `[11/14]` runs `bunx tsc --noEmit -p tsconfig.smoke.json` — output goes only to the live job log.
- Step `[13/14]` runs `bunx vitest run "$SMOKE_TEST_FILE" --reporter=verbose --passWithNoTests` — same.
- `.github/workflows/ci-check.yml` runs the script with default stdio; no artifact upload.
- `.github/workflows/datefns-smoke-drift.yml` runs `bun run verify:datefns-smoke` and `bun run verify:datefns-smoke-types` — same.
- When a job fails, the only way to read the output is scrolling the live log (which truncates long output, has no search across multiple steps, and disappears from easy view after re-runs).

### Approach
Tee step output to log files under a `ci-logs/` directory inside the script, then have the workflow upload that directory as an artifact with `actions/upload-artifact@v4` using `if: always()` so logs are uploaded even on failure (which is the whole point).

Two surfaces:
1. **Inside `scripts/ci-check.sh`** — capture per-step logs to `ci-logs/<step>.log` using `tee`, so the live log keeps printing and a copy lands on disk.
2. **In the two workflows** — add an `upload-artifact` step that runs `if: always()`.

### Changes

#### 1. `scripts/ci-check.sh` — tee smoke-related steps to `ci-logs/`

Add near the top (after `preflight`):
```sh
LOG_DIR="ci-logs"
mkdir -p "$LOG_DIR"
```

Update step `[11/14]`:
```sh
echo "▶ [11/14] Validating smoke test imports against tsconfig.smoke.json (focused tsc)..."
bunx tsc --noEmit -p tsconfig.smoke.json 2>&1 | tee "$LOG_DIR/tsc-smoke.log"
SMOKE_TSC_EXIT=${PIPESTATUS[0]}
if [ "$SMOKE_TSC_EXIT" -ne 0 ]; then
  echo "✗ Focused tsc failed. See $LOG_DIR/tsc-smoke.log (uploaded as CI artifact)." >&2
  exit "$SMOKE_TSC_EXIT"
fi
echo "✓ Smoke test imports type-check cleanly."
```

Update step `[13/14]` (the vitest run):
```sh
bunx vitest run "$SMOKE_TEST_FILE" --reporter=verbose --passWithNoTests 2>&1 | tee "$LOG_DIR/vitest-smoke.log"
VITEST_EXIT=${PIPESTATUS[0]}
if [ "$VITEST_EXIT" -ne 0 ]; then
  echo "✗ Smoke vitest failed. See $LOG_DIR/vitest-smoke.log (uploaded as CI artifact)." >&2
  exit "$VITEST_EXIT"
fi
```

Also update step `[12/14]` (project-wide tsc) the same way to capture the broader tsc output, since smoke failures often cascade from there:
```sh
bunx tsc --noEmit -p tsconfig.app.json 2>&1 | tee "$LOG_DIR/tsc-project.log"
TSC_EXIT=${PIPESTATUS[0]}
if [ "$TSC_EXIT" -ne 0 ]; then
  echo "✗ Project tsc failed. See $LOG_DIR/tsc-project.log (uploaded as CI artifact)." >&2
  exit "$TSC_EXIT"
fi
```

`PIPESTATUS` is bash-specific and works under `set -euo pipefail` because `tee` always succeeds; we explicitly read the upstream exit code.

#### 2. `.github/workflows/ci-check.yml` — add artifact upload

Add after the `Run ci-check.sh` step:
```yaml
      - name: Upload smoke logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: ci-check-smoke-logs
          path: ci-logs/
          if-no-files-found: ignore
          retention-days: 14
```

`if: always()` runs even on prior step failure. `if-no-files-found: ignore` prevents this step itself from failing if `ci-logs/` is absent (e.g., if the script aborted before creating it).

#### 3. `scripts/ci-smoke.sh` — same tee treatment for the focused tsc + vitest

Update step `[7/7]`:
```sh
LOG_DIR="ci-logs"
mkdir -p "$LOG_DIR"
# ... existing checks ...
bunx tsc --noEmit -p tsconfig.smoke.json 2>&1 | tee "$LOG_DIR/tsc-smoke.log"
SMOKE_TSC_EXIT=${PIPESTATUS[0]}
[ "$SMOKE_TSC_EXIT" -eq 0 ] || exit "$SMOKE_TSC_EXIT"
bunx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose 2>&1 | tee "$LOG_DIR/vitest-smoke.log"
VITEST_EXIT=${PIPESTATUS[0]}
[ "$VITEST_EXIT" -eq 0 ] || exit "$VITEST_EXIT"
```

Local devs benefit too: `ci-logs/` is right there to grep after a failure.

#### 4. `.github/workflows/datefns-smoke-drift.yml` — capture + upload

Wrap the two verify steps to tee output, then add an upload step. New shape:
```yaml
      - name: Verify smoke test is in sync
        run: |
          mkdir -p ci-logs
          bun run verify:datefns-smoke 2>&1 | tee ci-logs/verify-smoke-drift.log
          exit ${PIPESTATUS[0]}
      - name: Validate smoke test types
        run: |
          mkdir -p ci-logs
          bun run verify:datefns-smoke-types 2>&1 | tee ci-logs/verify-smoke-types.log
          exit ${PIPESTATUS[0]}
      - name: Upload smoke logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: datefns-smoke-drift-logs
          path: ci-logs/
          if-no-files-found: ignore
          retention-days: 14
```

#### 5. `.gitignore` — ignore `ci-logs/`

Read-only file per project rules — **skip**. Instead, document in the script header that `ci-logs/` is generated. The directory will appear locally but won't be committed accidentally as long as devs notice; if it does get committed, the artifact upload still works. (If the user wants `.gitignore` updated, they can do it themselves — the file is in the read-only list.)

### What does NOT change
- The actual checks (drift, tsc, vitest) — same commands, same exit codes, same gate behavior.
- Other CI steps not related to smoke/tsc.
- The `dependency-health.yml` workflow.
- `tsconfig.smoke.json`, the smoke test, the generator.
- Pass/fail semantics: every command's exit code is preserved via `PIPESTATUS[0]`.

### Verification
1. Green PR: workflow runs end-to-end, artifact `ci-check-smoke-logs` appears in the run summary containing `tsc-smoke.log`, `tsc-project.log`, `vitest-smoke.log` (each with the same content as the live log section).
2. Force a tsc failure (e.g., add a typo to a `src/` file): job fails at step `[12/14]`, `ci-check-smoke-logs` is still uploaded with `tsc-project.log` containing the diagnostic. The script's stderr also points the user at the artifact.
3. Force a vitest failure (e.g., make the smoke test assertion wrong): job fails at step `[13/14]`, artifact contains `vitest-smoke.log` with the failure detail.
4. `datefns-smoke-drift` workflow: same — green run uploads two `.log` files; drift failure uploads them with the diff output.
5. Local: `bash scripts/ci-check.sh` produces `ci-logs/` you can `cat` after a failure.

### Risk / scope
- 4 files edited: `scripts/ci-check.sh` (~20 lines added), `scripts/ci-smoke.sh` (~10 lines added), `.github/workflows/ci-check.yml` (+8 lines), `.github/workflows/datefns-smoke-drift.yml` (+12 lines).
- 0 new files, 0 new deps.
- Zero behavioral change on green CI other than the new artifact appearing in the run.
- `tee` + `PIPESTATUS` is standard bash; `set -euo pipefail` already in place handles it correctly.
- Artifact retention: 14 days (default is 90; 14 is plenty for PR review and keeps storage tidy).
