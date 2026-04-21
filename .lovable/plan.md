
## Plan: CI guard — fail if generator would modify the committed smoke test

### Goal
Ensure `src/test/dateFns.smoke.test.ts` (and `public/datefns-usage.json`) committed to the repo are always byte-identical to what `scripts/generate-datefns-smoke-test.mjs` would produce against the current `src/`. Today's `scripts/ci-check.sh` step `[10/13]` already enforces this drift check by running the generator and diffing against backups — but it has two weaknesses worth fixing:

1. It **mutates the working tree** during the check (it runs the real generator, then restores backups on drift). On unexpected failure paths (e.g. shell crash mid-step), the regenerated content can leak into the commit.
2. It only runs inside `ci-check.sh` (the "deep" CI script). The faster `scripts/ci-smoke.sh` and the per-PR GitHub workflows (`ci-check.yml`, `lint.yml`, `typecheck.yml`) don't enforce smoke-test drift, so contributors can land changes that only surface in the slow path.

### Approach
Use the generator's existing `--dry-run` flag (already implemented earlier in this thread) as the authoritative, **non-mutating** drift check. `--dry-run` exits `1` if it would write changes, `0` if not. Wrap it in a dedicated lightweight script + npm task + CI step.

### Changes

#### 1. `package.json` — new npm script

Add next to the existing `verify:datefns-locales` entry:

```json
"verify:datefns-smoke": "node scripts/generate-datefns-smoke-test.mjs --dry-run"
```

This makes it runnable locally as `bun run verify:datefns-smoke`. On drift it prints the unified diff (the dry-run output already includes it) and exits `1`.

#### 2. `scripts/ci-check.sh` — replace the mutating drift block with the dry-run

Current step `[10/13]` (~30 lines) does: backup → regenerate → diff backups → restore on drift. Replace it with a single command:

```sh
echo "▶ [10/13] Verifying date-fns smoke test is up to date..."
if ! node scripts/generate-datefns-smoke-test.mjs --dry-run; then
  echo "✗ Smoke test or manifest is out of date." >&2
  echo "  Run \`node scripts/generate-datefns-smoke-test.mjs\` and commit the result." >&2
  exit 1
fi
echo "✓ Smoke test file and manifest are up to date."
```

Net result: same guard, ~25 fewer lines, never touches the working tree, and the dry-run already prints the exact diff so debugging is unchanged.

#### 3. New GitHub workflow: `.github/workflows/datefns-smoke-drift.yml`

A focused per-PR job so drift fails fast in PR review without waiting for the full `ci-check.sh`:

```yaml
name: datefns-smoke-drift
on:
  pull_request:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }
      - name: Cache Bun deps
        uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('bun.lock') }}
      - run: bun install --frozen-lockfile
      - name: Verify smoke test is in sync
        run: bun run verify:datefns-smoke
```

Mirrors the existing `lint-date-fns.yml` shape (same caching, same Bun setup) for consistency.

#### 4. `scripts/ci-smoke.sh` — add the same guard

The faster smoke pipeline should reject drift too. Add (near the existing date-fns checks):

```sh
echo "▶ Verifying date-fns smoke test is in sync..."
node scripts/generate-datefns-smoke-test.mjs --dry-run
```

Single line, no backup dance, exits `1` on drift.

### What does NOT change
- `scripts/generate-datefns-smoke-test.mjs` — the `--dry-run` flag and exit codes already do exactly what we need.
- The smoke test template, manifest schema, or step numbering in `ci-check.sh` (still `/13`).
- `scripts/verify-datefns-locales.mjs`, the ESLint date-fns gate, edge functions.
- `.github/workflows/ci-check.yml`, `lint.yml`, `typecheck.yml`, `lint-date-fns.yml`, `dependency-health.yml` — left alone (the new dedicated workflow covers the gap without touching them).

### Verification
1. Clean tree → `bun run verify:datefns-smoke` exits `0` and prints the no-changes summary; CI green across all jobs.
2. Add `import { addYears } from "date-fns/addYears"` to a `src/` file (real export, so type-check passes) without regenerating → `bun run verify:datefns-smoke` exits `1` and prints the unified diff. `[10/13]` in `ci-check.sh` fails with the new message; the new GitHub workflow fails the PR.
3. Run `node scripts/generate-datefns-smoke-test.mjs` (no flag) → both files updated → re-run `verify:datefns-smoke` → exits `0`.
4. Hand-edit `src/test/dateFns.smoke.test.ts` (e.g. add a stray comment) → guard fails identically. Commit the regenerated file → green.
5. Mid-run abort during the old `[10/13]` step would have left a regenerated file in the tree; with the dry-run version, no file was ever touched.

### Risk / scope
- 1 new workflow file (~20 lines), ~25 lines deleted + ~6 added in `scripts/ci-check.sh`, 1 line added in `scripts/ci-smoke.sh`, 1 line added in `package.json`. Zero new deps. Zero behavioral change on green PRs (just a faster, non-mutating implementation of an already-present guard, plus one extra fast CI job for early signal).
