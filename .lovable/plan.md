
## Plan: Accept optional Vitest test path argument in `ci-smoke.sh`

### Goal
Allow `scripts/ci-smoke.sh` to run a different smoke test file when invoked with an argument, while keeping `src/test/dateFns.smoke.test.ts` as the default. This makes the script reusable for ad-hoc smoke runs without forking it.

### Change — single file: `scripts/ci-smoke.sh`

#### 1. Parse the argument near the top
Right after `mkdir -p "$LOG_DIR"` (and before the summary state vars), add:

```bash
# Optional first arg: path to the vitest smoke test file.
# Defaults to the date-fns smoke test for backwards compatibility.
SMOKE_TEST_PATH="${1:-src/test/dateFns.smoke.test.ts}"

if [ ! -f "$SMOKE_TEST_PATH" ]; then
  echo "✗ Smoke test file not found: $SMOKE_TEST_PATH" >&2
  echo "  Usage: $0 [path/to/smoke.test.ts]" >&2
  exit 2
fi
```

#### 2. Use the variable in the vitest invocation
Replace the hardcoded path in step [7/7]:

```bash
bunx vitest run "$SMOKE_TEST_PATH" \
  --reporter=verbose \
  --reporter=json --outputFile="$LOG_DIR/vitest-smoke.json" \
  --hideSkippedTests \
  --printConsoleTrace \
  2>&1 | tee "$LOG_DIR/vitest-smoke.log"
```

#### 3. Surface the chosen path in the summary
Add one line to the `print_summary()` block (above the `Logs` line):

```
  Smoke test file     : src/test/dateFns.smoke.test.ts
```

So users can confirm which file ran when reading the summary.

#### 4. Echo it once at start
After parsing the arg, log `echo "▶ Smoke test target: $SMOKE_TEST_PATH"` so it appears near the top of the run output too.

### Behavior
- `bash scripts/ci-smoke.sh` → unchanged, runs `src/test/dateFns.smoke.test.ts`.
- `bash scripts/ci-smoke.sh src/test/example.test.ts` → runs the supplied file through the same pipeline (clean install, eslint gate, tsc, vitest, summary).
- Missing file → exits 2 with usage hint before doing any work.

### Out of scope
- No changes to `tsconfig.smoke.json` (still validates the date-fns smoke import surface; if the user passes a non-date-fns test, tsc step still runs against the same config — acceptable, documented limitation).
- No changes to `ci-check.sh`, workflows, or `package.json`.
- No changes to argument parsing beyond a single positional arg (no flags).

### Files edited
- `scripts/ci-smoke.sh` — ~10 lines added, 1 line modified.

### Risk / scope
- 1 file edited, fully backwards-compatible (default value preserves current behavior), 0 dep/workflow changes.
