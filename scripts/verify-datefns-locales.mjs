#!/usr/bin/env node
/**
 * Fast-feedback CI guard: ensures every `date-fns/locale/*` import in src/
 * is reflected in public/datefns-usage.json (the manifest emitted by
 * scripts/generate-datefns-smoke-test.mjs). Surfaces locale-specific drift
 * with a clearer error before the broader content-drift step.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { detectMalformedDateFnsImports } from "./lib/datefns-scan.mjs";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");
const MANIFEST_FILE = join(ROOT, "public", "datefns-usage.json");
const EXCLUDE_DIRS = new Set(["test", "node_modules", ".git", "dist", "build"]);
const FILE_EXT = /\.(ts|tsx)$/;
const IMPORT_RE =
  /import\s+(type\s+)?\{([^{}]*)\}\s+from\s+["']date-fns\/([^"']+)["']/g;
const GENERATOR_HINT =
  "Run `node scripts/generate-datefns-smoke-test.mjs` and commit the result.";

// CLI flags.
//   --verbose / -v: per-file trace + per-locale match decision.
//   --strict     : malformed locale imports (zero usable specifiers after
//                  comment stripping) become a fatal error.
const ARGV = process.argv.slice(2);
const VERBOSE = ARGV.some((a) => a === "--verbose" || a === "-v");
const STRICT = ARGV.some((a) => a === "--strict");
const vlog = (msg) => { if (VERBOSE) console.log(`  · ${msg}`); };

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

function fail(msg) {
  console.error(`✗ ${msg}`);
  console.error(`  ${GENERATOR_HINT}`);
  process.exit(1);
}

function relTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

// --- 1. Scan src/ for locale imports ---
const sourceLocales = new Set();
const malformedLocaleFindings = [];
let scannedFileCount = 0;
let filesWithLocales = 0;
for (const file of walk(SRC_DIR)) {
  scannedFileCount++;
  const src = readFileSync(file, "utf8");
  const rel = file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file;
  let printedHeader = false;
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const [, isType, , subpath] = m;
    if (!subpath.startsWith("locale/")) continue;
    if (VERBOSE && !printedHeader) {
      console.log(`◆ ${rel}`);
      printedHeader = true;
      filesWithLocales++;
    }
    if (isType) {
      vlog(`skipped → date-fns/${subpath}  (reason: type-only import, not bundled at runtime)`);
      continue;
    }
    sourceLocales.add(subpath);
    vlog(`detected → date-fns/${subpath}`);
  }
  // Detect malformed (empty/comment-only) locale imports — these never make
  // it into sourceLocales because their specifier list is empty after
  // comment stripping, but the contributor almost certainly wrote them by
  // mistake. Surface them so they don't silently rot.
  for (const f of detectMalformedDateFnsImports(src, rel)) {
    if (!f.isLocale) continue;
    malformedLocaleFindings.push(f);
    if (VERBOSE) {
      if (!printedHeader) { console.log(`◆ ${rel}`); printedHeader = true; }
      vlog(`malformed → date-fns/${f.subpath} @ line ${f.line} (reason: zero usable specifiers after comment stripping)`);
    }
  }
}

if (VERBOSE) {
  console.log(
    `\n· Scanned ${scannedFileCount} file(s); ${filesWithLocales} contain date-fns locale imports.\n`,
  );
}

if (malformedLocaleFindings.length > 0) {
  const log = STRICT ? console.error : console.warn;
  log(
    `${STRICT ? "✗" : "⚠"} Found ${malformedLocaleFindings.length} malformed date-fns locale import(s) (zero usable specifiers after comment stripping):`,
  );
  for (const f of malformedLocaleFindings) {
    log(`   ${f.file}:${f.line} → date-fns/${f.subpath}`);
  }
  if (STRICT) {
    console.error(
      "  Hint: remove the empty import or add at least one named locale specifier. Re-run without --strict to downgrade to a warning.",
    );
    process.exit(1);
  }
}

// --- 2. Load manifest ---
if (!existsSync(MANIFEST_FILE)) {
  fail(`Manifest missing: ${MANIFEST_FILE}.`);
}
let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST_FILE, "utf8"));
} catch (err) {
  fail(`Manifest is not valid JSON: ${err.message}`);
}

if (!Array.isArray(manifest.locales)) {
  fail("Manifest is missing the `locales` array.");
}
if (typeof manifest.totalLocales !== "number") {
  fail("Manifest is missing a numeric `totalLocales`.");
}
if (manifest.totalLocales !== manifest.locales.length) {
  fail(
    `Manifest totalLocales=${manifest.totalLocales} but locales.length=${manifest.locales.length}.`,
  );
}
if (typeof manifest.generatedAt !== "string") {
  fail("Manifest is missing `generatedAt` timestamp.");
}
if (Number.isNaN(new Date(manifest.generatedAt).getTime())) {
  fail(`Manifest generatedAt="${manifest.generatedAt}" is not a valid ISO date.`);
}

const manifestLocales = new Set(manifest.locales.map((l) => l.subpath));

if (VERBOSE) {
  const union = new Set([...sourceLocales, ...manifestLocales]);
  console.log(`Per-locale match decisions (${union.size} unique):`);
  for (const sp of [...union].sort()) {
    const inSrc = sourceLocales.has(sp);
    const inManifest = manifestLocales.has(sp);
    if (inSrc && inManifest) vlog(`✓ ${sp}  (src ↔ manifest)`);
    else if (inSrc) vlog(`✗ ${sp}  (in src, MISSING from manifest — regenerate)`);
    else vlog(`✗ ${sp}  (in manifest, NOT in src — stale manifest entry)`);
  }
  console.log("");
}

// --- 3. Diff ---
const missing = [...sourceLocales].filter((s) => !manifestLocales.has(s)).sort();
const extra = [...manifestLocales].filter((s) => !sourceLocales.has(s)).sort();

if (missing.length > 0 || extra.length > 0) {
  console.error("✗ date-fns locale drift detected between src/ and manifest.\n");
  console.error(`  Source imports (${sourceLocales.size}):`);
  for (const s of [...sourceLocales].sort()) console.error(`    - ${s}`);
  console.error(`\n  Manifest entries (${manifestLocales.size}):`);
  for (const s of [...manifestLocales].sort()) console.error(`    - ${s}`);
  if (missing.length > 0) {
    console.error(`\n  Missing in manifest: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    console.error(`  Extra in manifest (not in src/): ${extra.join(", ")}`);
  }
  console.error(`\n  ${GENERATOR_HINT}`);
  process.exit(1);
}

console.log(
  `✓ Locales in sync: ${manifestLocales.size} entries (manifest generated ${relTime(manifest.generatedAt)}).`,
);
