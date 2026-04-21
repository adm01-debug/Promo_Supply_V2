
## Plan: Fail CI when smoke test file is out of date

### Goal
Block PRs where a contributor changed `date-fns/*` imports in `src/` but forgot to commit the regenerated `src/test/dateFns.smoke.test.ts`. The check runs the generator, then fails if the file would differ from what's checked in.

### Change

#### `scripts/ci-check.sh` — split step [9/11]

Today step [9/11] regenerates the smoke test in-place, silently overwriting any drift. Replace it with a drift-detection variant:

```bash
echo "▶ [9/11] Verifying date-fns smoke test is up to date..."
SMOKE_TEST_FILE="src/test/dateFns.smoke.test.ts"
SMOKE_BACKUP="$(mktemp)"
if [ -f "$SMOKE_TEST_FILE" ]; then
  cp "$SMOKE_TEST_FILE" "$SMOKE_BACKUP"
fi
node scripts/generate-datefns-smoke-test.mjs
if [ -f "$SMOKE_BACKUP" ]; then
  if ! diff -q "$SMOKE_BACKUP" "$SMOKE_TEST_FILE" > /dev/null 2>&1; then
    echo "✗ $SMOKE_TEST_FILE is out of date." >&2
    echo "  Run \`node scripts/generate-datefns-smoke-test.mjs\` and commit the result." >&2
    echo "  Diff:" >&2
    diff -u "$SMOKE_BACKUP" "$SMOKE_TEST_FILE" >&2 || true
    cp "$SMOKE_BACKUP" "$SMOKE_TEST_FILE"  # restore so later steps run on committed file
    rm -f "$SMOKE_BACKUP"
    exit 1
  fi
  rm -f "$SMOKE_BACKUP"
else
  echo "✗ $SMOKE_TEST_FILE did not exist before generation." >&2
  echo "  Run \`node scripts/generate-datefns-smoke-test.mjs\` and commit the result." >&2
  exit 1
fi
echo "✓ Smoke test file is up to date."
```

Step [10/11] (presence check + tsc + vitest) and step [11/11] (deps:health) remain unchanged.

### What does NOT change
- `scripts/ci-smoke.sh` (quick path, no generator step).
- The generator script, vitest config, GitHub workflow, or step numbering.
- Local dev: contributors run `node scripts/generate-datefns-smoke-test.mjs` (already documented) and commit the diff.

### Verification
1. Clean tree, generator output matches committed file → step [9/11] prints "✓ Smoke test file is up to date." and CI proceeds.
2. Add a new `import { addYears } from "date-fns/addYears"` to a `src/` file but skip regenerating → step [9/11] exits 1 with a unified diff and the actionable "Run … and commit" message. Steps [10] and [11] don't run.
3. Delete the committed file entirely → step [9/11] exits 1 with the "did not exist before generation" message.
4. Run `node scripts/generate-datefns-smoke-test.mjs` locally and commit → CI green again.

### Risk / scope
- ~20 added lines in one shell script. Zero behavioral change on green runs (file restored to committed contents whether check passes or fails). No other files touched.
