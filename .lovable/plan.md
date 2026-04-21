
## Plan: `--dry-run` flag for the smoke test generator

### Goal
Let contributors preview what `scripts/generate-datefns-smoke-test.mjs` would change without touching the working tree. Useful for local audits and for the CI drift step to surface a richer report.

### Behavior

Invoking `node scripts/generate-datefns-smoke-test.mjs --dry-run` (alias `-n`):

1. Runs the full scan exactly as today (same regex, same exclusions).
2. Prints a compact summary to stdout:
   - Totals: `N subpaths / M function exports / K locales`.
   - **Functions** section: one line per subpath, `subpath  →  exportA, exportB`.
   - **Locales** section: same format.
3. Computes the rendered smoke-test contents in memory and the manifest JSON in memory.
4. Diffs each against the on-disk file:
   - If a target file is missing, prints `(new file)` followed by the full would-be content.
   - Otherwise prints a unified diff (`--- a/<path>` / `+++ b/<path>`) using a tiny built-in line differ (no new deps — Node's `node:util` has nothing for this, so use a minimal LCS-free implementation: split both sides on `\n`, walk with a basic Myers-lite or just emit a "changed lines" block when any line differs, prefixed with `-`/`+`). Keep it under ~40 lines.
5. **Writes nothing.** Exits `0` if both files would be unchanged, `1` if either would change or be created. This makes `--dry-run` directly reusable as a CI guard if desired.

Default invocation (no flag) is unchanged: writes both files and exits 0/1 per current rules.

### Implementation outline (`scripts/generate-datefns-smoke-test.mjs`)

- Parse argv at the top: `const dryRun = process.argv.slice(2).some(a => a === "--dry-run" || a === "-n");`
- Refactor the final write section into two small helpers:
  - `renderSmokeTest()` → returns the string currently passed to `writeFileSync(OUT_FILE, …)`.
  - `renderManifest()` → returns the JSON string currently passed to `writeFileSync(MANIFEST_FILE, …)`.
- New helper `unifiedDiff(oldStr, newStr, label)` (~30 lines, no deps): splits to lines, finds first/last differing index, emits a hunk header `@@ -a,b +c,d @@` and `-`/`+`/` ` lines. Good enough for human review; not git-quality but accurate.
- New helper `printDryRun({ subpaths, fnSubpaths, localeSubpaths, smokeText, manifestText })`:
  - Prints totals + "Functions" + "Locales" tables (plain text, fixed-width via simple padding).
  - For each of `[OUT_FILE, MANIFEST_FILE]`: read on-disk if exists, compute diff vs in-memory, print.
  - Returns `true` if any file would change.
- Branch at the end:
  - If `dryRun`: build both strings, call `printDryRun`, exit `changed ? 1 : 0`. Skip both `writeFileSync` calls.
  - Else: existing behavior (write both, log success).

### What does NOT change
- Scanning logic, regex, exclusions, exit codes for the no-flag path.
- `src/test/dateFns.smoke.test.ts` or `public/datefns-usage.json` rendering.
- `scripts/ci-check.sh` step [9/11] — still runs the generator (without `--dry-run`) and diffs the file. Existing guard behavior unchanged.
- No new npm dependencies.

### Verification
1. Clean tree: `node scripts/generate-datefns-smoke-test.mjs --dry-run` → prints summary, prints "no changes" for both files, exits 0, working tree untouched.
2. Add `import { addYears } from "date-fns/addYears"` somewhere in `src/`, run `--dry-run` → summary lists `addYears`, unified diff shows the new import + array entry in the smoke test and the new manifest row, exits 1, files unchanged on disk.
3. Delete `src/test/dateFns.smoke.test.ts`, run `--dry-run` → prints `(new file) src/test/dateFns.smoke.test.ts` followed by full content, exits 1.
4. `node scripts/generate-datefns-smoke-test.mjs` (no flag) after step 2 → writes both files normally, exits 0.
5. `-n` short alias works identically to `--dry-run`.

### Risk / scope
- One file edited (`scripts/generate-datefns-smoke-test.mjs`), ~80 added lines (helpers + dry-run branch), zero new deps, zero behavioral change for the existing no-flag path.
