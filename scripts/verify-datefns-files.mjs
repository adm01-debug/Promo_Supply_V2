#!/usr/bin/env node
/**
 * Verifies that node_modules/date-fns contains every subpath file imported
 * under src/ (e.g. format, locale/pt-BR). Fails fast with a clear message
 * if any are missing — catches broken installs before vitest/tsc do.
 * Pure Node, zero deps. Same scan logic as generate-datefns-smoke-test.mjs.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");
const PKG_DIR = join(ROOT, "node_modules", "date-fns");
const EXCLUDE_DIRS = new Set(["test", "node_modules", ".git", "dist", "build"]);
const FILE_EXT = /\.(ts|tsx)$/;
const IMPORT_RE =
  /import\s+(type\s+)?\{[^{}]*\}\s+from\s+["']date-fns\/([^"']+)["']/g;

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

const subpaths = new Set();
for (const file of walk(SRC_DIR)) {
  const src = readFileSync(file, "utf8");
  let m;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    if (m[1]) continue; // skip type-only imports
    subpaths.add(m[2]);
  }
}

if (!existsSync(PKG_DIR)) {
  console.error(
    `✗ ${relative(ROOT, PKG_DIR)} not found. Run \`bun install --frozen-lockfile\`.`,
  );
  process.exit(1);
}

if (subpaths.size === 0) {
  console.error(
    "✗ verify-datefns-files: no date-fns subpath imports found in src/. Aborting.",
  );
  process.exit(1);
}

const missing = [];
for (const sp of [...subpaths].sort()) {
  const candidates = [
    `${sp}.js`,
    `${sp}.mjs`,
    `${sp}.cjs`,
    `${sp}/index.js`,
    `${sp}/index.mjs`,
    `${sp}/index.cjs`,
  ];
  const found = candidates.some((c) => existsSync(join(PKG_DIR, c)));
  if (!found) missing.push(sp);
}

if (missing.length > 0) {
  console.error(`✗ Missing date-fns subpath files (${missing.length}):`);
  for (const sp of missing) console.error(`  - date-fns/${sp}`);
  console.error(`\nChecked under: ${relative(ROOT, PKG_DIR)}`);
  console.error(
    `Run \`rm -rf node_modules && bun install --frozen-lockfile\` to repair.`,
  );
  process.exit(1);
}

console.log(
  `✓ Verified ${subpaths.size} date-fns subpath(s) exist on disk under ${relative(ROOT, PKG_DIR)}.`,
);
