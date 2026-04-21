
## Plan: Clearer vitest output + end-of-run summary in `scripts/ci-smoke.sh`

### Goal
When the smoke vitest step in `scripts/ci-smoke.sh` runs, give failures more readable context and always print a compact summary block at the very end of the script — so a CI viewer scrolling to the bottom sees pass/fail status, duration, and where the logs live without re-reading the full output.

### Current state
Step [7/7] runs:
```bash
bunx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose 2>&1 | tee "$LOG_DIR/vitest-smoke.log"
SMOKE_VITEST_EXIT=${PIPESTATUS[0]}
```
- Single `verbose` reporter → noisy on green, missing diff context on red.
- No final summary; failure messages just say "see log".
- `SMOKE_TSC_EXIT` / `SMOKE_VITEST_EXIT` already captured but only used to gate exit codes.

### Changes — single file: `scripts/ci-smoke.sh`

#### 1. Richer vitest invocation
Replace the single `--reporter=verbose` with dual reporters so humans get readable output and machines get structured data for the summary:

```bash
bunx vitest run src/test/dateFns.smoke.test.ts \
  --reporter=verbose \
  --reporter=json --outputFile="$LOG_DIR/vitest-smoke.json" \
  --hideSkippedTests \
  --printConsoleTrace \
  2>&1 | tee "$LOG_DIR/vitest-smoke.log"
SMOKE_VITEST_EXIT=${PIPESTATUS[0]}
```

- `--reporter=json` writes a parseable result file alongside the human log.
- `--hideSkippedTests` removes noise from the verbose output.
- `--printConsoleTrace` attaches stack traces to any `console.error` calls inside the smoke test (helps debug the version-mismatch path that already logs `[date-fns smoke] pinned spec=...`).

#### 2. Capture timing
Wrap the vitest call with `SECONDS=0` before and `SMOKE_VITEST_DURATION=$SECONDS` after, so the summary can show wall-clock time.

#### 3. Final summary block (always prints, even on failure)
Add a `print_summary()` function called via `trap '... EXIT'` so it runs whether the script exits green, on tsc failure, or on vitest failure. It reads the JSON if present and falls back to the exit codes:

```
────────────────────────────────────────────────────────────
  ci-smoke.sh summary
────────────────────────────────────────────────────────────
  date-fns version    : 3.6.0 (matches lockfile ✓)
  ESLint date-fns gate: passed ✓
  Smoke tsc           : passed ✓        (tsconfig.smoke.json)
  Smoke vitest        : 4 passed / 0 failed in 1.8s ✓
  Logs                : ci-logs/tsc-smoke.log
                        ci-logs/vitest-smoke.log
                        ci-logs/vitest-smoke.json
                        ci-logs/datefns-smoke-health.json
  Result              : ✅ PASS
────────────────────────────────────────────────────────────
```

On failure, the relevant line flips to `✗ FAIL` and the `Result` line becomes `❌ FAIL — see <log path>` with a one-line excerpt of the first failed test name pulled from the JSON (via `node -e` one-liner — no new deps).

The trap is installed early so even an unexpected `set -e` abort still produces the block.

#### 4. Conditional behavior on failure
- If `SMOKE_VITEST_EXIT != 0`: after the summary, also `tail -n 40 "$LOG_DIR/vitest-smoke.log"` so the most recent failure context is the last thing on screen — no need to scroll up or open the artifact.
- If `SMOKE_TSC_EXIT != 0`: same idea, `tail -n 30 "$LOG_DIR/tsc-smoke.log"`.

#### 5. Preserve existing contract
- Exit codes unchanged: still propagates `SMOKE_TSC_EXIT` / `SMOKE_VITEST_EXIT`.
- Files written to `ci-logs/` unchanged plus one new file (`vitest-smoke.json`) — the existing `actions/upload-artifact@v4` step in `.github/workflows/ci-check.yml` uploads the whole directory, so it picks up automatically.
- `emit-smoke-health.mjs` still receives the same `--tsc-exit` / `--vitest-exit` flags.
- No changes to `scripts/ci-check.sh`, `scripts/smoke-date-fns.sh`, or any workflow file.

### Verification
1. Green run: bottom of log shows the summary box with all ✓ and `✅ PASS`. Existing CI artifact gains `vitest-smoke.json`.
2. Force a smoke test failure (e.g., temporarily break an import): summary shows `Smoke vitest: 3 passed / 1 failed`, `❌ FAIL` result, last 40 lines of vitest log echoed below; script exits non-zero with the same code as before.
3. Force a tsc failure: summary shows `Smoke tsc: ✗ FAIL`, vitest line shows `skipped (tsc failed)`, last 30 lines of tsc log echoed; same exit code as today.
4. CI artifact `ci-check-smoke-logs` now includes the JSON file alongside the existing two `.log` files.

### Risk / scope
- 1 file edited (`scripts/ci-smoke.sh`), ~50 lines added (function + trap + reporter flags), 0 new files, 0 dep changes, 0 workflow changes, 0 exit-code changes.
- Pure additive output — existing parsers/health-emit script see identical inputs.
- `--reporter=json` and `--outputFile` are stable vitest flags (vitest ≥0.34); already in use elsewhere in the repo's testing stack.
