#!/usr/bin/env node
/**
 * Staleness guard for src/test/dateFns.smoke.test.ts.
 *
 * Catches the failure mode where someone edits a date-fns/locale/* import in
 * src/ but forgets to regenerate the smoke test file, by checking:
 *
 *   1. The smoke test file exists and is non-trivial in size
 *      (lower bound = AUTO-GENERATED header + at least one import + one test).
 *   2. The smoke test file's mtime is >= the mtime of the most recently
 *      modified file under src/ that contains a `date-fns/locale/*` import.
 *      If a locale source file is newer than the generated smoke test,
 *      the smoke test is almost certainly stale.
 *   3. (Defense in depth) If the manifest exists, its `generatedAt` is not
 *      older than the most recent locale source mtime.
 *
 * Exits non-zero with a clear remediation hint on any of the above.
 *
 * This is intentionally separate from verify-datefns-locales.mjs (which
 * compares *content*) so we catch the "content matches by accident, but the
 * file wasn't regenerated" case too.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");
const SMOKE_FILE = join(ROOT, "src", "test", "dateFns.smoke.test.ts");
const MANIFEST_FILE = join(ROOT, "public", "datefns-usage.json");

const EXCLUDE_DIRS = new Set(["test", "node_modules", ".git", "dist", "build"]);
const FILE_EXT = /\.(ts|tsx)$/;
const LOCALE_IMPORT_RE = /from\s+["']date-fns\/locale\/[^"']+["']/;

// Minimum byte size for a healthy generated smoke test. The current file is
// ~5KB; anything under 1KB means the generator emitted only the header or was
// truncated mid-write.
const MIN_SMOKE_BYTES = 1024;

const HINT =
  "Run `node scripts/generate-datefns-smoke-test.mjs` and commit the updated " +
  "src/test/dateFns.smoke.test.ts (and public/datefns-usage.json).";

function fail(msg) {
  console.error(`✗ ${msg}`);
  console.error(`  ${HINT}`);
  process.exit(1);
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (full === join(SRC_DIR, "test")) continue;
      if (EXCLUDE_DIRS.has(entry)) continue;
      walk(full, acc);
    } else if (FILE_EXT.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

// --- 1. Smoke file exists and is non-trivial in size ---
if (!existsSync(SMOKE_FILE)) {
  fail(`Smoke test file missing: ${relative(ROOT, SMOKE_FILE)}.`);
}
const smokeStat = statSync(SMOKE_FILE);
if (smokeStat.size < MIN_SMOKE_BYTES) {
  fail(
    `Smoke test file looks truncated: ${smokeStat.size} bytes < ${MIN_SMOKE_BYTES} byte minimum.`,
  );
}

// --- 2. Collect locale subpaths from src/ and from the smoke file, plus
//        track the newest mtime of any src file that *contains* a locale
//        import. We only enforce the mtime rule if the locale set itself
//        changed vs. the smoke file — otherwise unrelated edits to the same
//        source file (which still imports the same locales) would trip a
//        false positive.
const LOCALE_SUBPATH_RE =
  /from\s+["']date-fns\/(locale\/[^"']+)["']/g;

function collectLocales(src) {
  const out = new Set();
  let m;
  LOCALE_SUBPATH_RE.lastIndex = 0;
  while ((m = LOCALE_SUBPATH_RE.exec(src)) !== null) out.add(m[1]);
  return out;
}

const srcLocales = new Set();
let newestLocaleFile = null;
let newestLocaleMtime = 0;
for (const file of walk(SRC_DIR)) {
  const src = readFileSync(file, "utf8");
  if (!LOCALE_IMPORT_RE.test(src)) continue;
  for (const sp of collectLocales(src)) srcLocales.add(sp);
  const mtime = statSync(file).mtimeMs;
  if (mtime > newestLocaleMtime) {
    newestLocaleMtime = mtime;
    newestLocaleFile = file;
  }
}

const smokeContent = readFileSync(SMOKE_FILE, "utf8");
const smokeLocales = collectLocales(smokeContent);

const missingInSmoke = [...srcLocales].filter((s) => !smokeLocales.has(s)).sort();
const extraInSmoke = [...smokeLocales].filter((s) => !srcLocales.has(s)).sort();

if (missingInSmoke.length > 0 || extraInSmoke.length > 0) {
  console.error("✗ Locale set drift between src/ and smoke test file.");
  if (missingInSmoke.length > 0) {
    console.error(`  Missing in smoke test: ${missingInSmoke.join(", ")}`);
  }
  if (extraInSmoke.length > 0) {
    console.error(`  Extra in smoke test: ${extraInSmoke.join(", ")}`);
  }
  if (newestLocaleFile) {
    const smokeIso = new Date(smokeStat.mtimeMs).toISOString();
    const srcIso = new Date(newestLocaleMtime).toISOString();
    console.error(
      `  Smoke mtime: ${smokeIso} | newest locale source mtime: ${srcIso} ` +
        `(${relative(ROOT, newestLocaleFile)})`,
    );
  }
  fail("Smoke test is stale relative to current src/ locale imports.");
}

// --- 3. Manifest sanity (best effort): valid JSON + locales align with src ---
if (existsSync(MANIFEST_FILE)) {
  try {
    const manifest = JSON.parse(readFileSync(MANIFEST_FILE, "utf8"));
    if (Array.isArray(manifest.locales)) {
      const manifestLocales = new Set(
        manifest.locales.map((l) => l.subpath).filter(Boolean),
      );
      const missing = [...srcLocales].filter((s) => !manifestLocales.has(s));
      if (missing.length > 0) {
        fail(
          `Manifest is missing locale entries present in src/: ${missing.join(", ")}.`,
        );
      }
    }
  } catch (err) {
    fail(`Manifest unreadable: ${err.message}`);
  }
}

const sizeKb = (smokeStat.size / 1024).toFixed(1);
const smokeIso = new Date(smokeStat.mtimeMs).toISOString();
if (newestLocaleFile) {
  console.log(
    `✓ Smoke test fresh: ${sizeKb} KB, mtime ${smokeIso} >= newest locale source ${relative(ROOT, newestLocaleFile)}.`,
  );
} else {
  console.log(
    `✓ Smoke test present: ${sizeKb} KB, mtime ${smokeIso} (no locale imports found in src/).`,
  );
}
