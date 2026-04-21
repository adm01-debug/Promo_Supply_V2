#!/usr/bin/env node
/**
 * Fast-feedback CI guard: ensures every `date-fns/locale/*` import in src/
 * is reflected in public/datefns-usage.json (the manifest emitted by
 * scripts/generate-datefns-smoke-test.mjs). Surfaces locale-specific drift
 * with a clearer error before the broader content-drift step.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");
const MANIFEST_FILE = join(ROOT, "public", "datefns-usage.json");
const EXCLUDE_DIRS = new Set(["test", "node_modules", ".git", "dist", "build"]);
const FILE_EXT = /\.(ts|tsx)$/;
const IMPORT_RE =
  /import\s+(type\s+)?\{([^{}]*)\}\s+from\s+["']date-fns\/([^"']+)["']/g;
const GENERATOR_HINT =
  "Run `node scripts/generate-datefns-smoke-test.mjs` and commit the result.";

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
for (const file of walk(SRC_DIR)) {
  const src = readFileSync(file, "utf8");
  let m;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const [, isType, , subpath] = m;
    if (isType) continue;
    if (subpath.startsWith("locale/")) sourceLocales.add(subpath);
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
