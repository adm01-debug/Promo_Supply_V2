#!/usr/bin/env node
/**
 * Verifies that node_modules/date-fns contains every subpath file imported
 * under src/ (e.g. format, locale/pt-BR). Fails fast with a clear message
 * if any are missing — catches broken installs before vitest/tsc do.
 * Pure Node, zero deps. Same scan logic as generate-datefns-smoke-test.mjs.
 */
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const ROOT = process.cwd();
const WRITE_HEALTH = process.argv.slice(2).some((a) => a === "--write-health" || a === "--update-health");
const SNAPSHOT_PATH = join(ROOT, "public", "dependency-health.json");
const SRC_DIR = join(ROOT, "src");
const PKG_DIR = join(ROOT, "node_modules", "date-fns");
const PKG_REL = relative(ROOT, PKG_DIR);
// Directories skipped during the walk (matched by basename).
// __mocks__ and storybook directories are intentionally excluded — they exercise
// imports for tooling, not runtime behavior, and should not influence the
// "what subpaths must exist on disk?" question.
const EXCLUDE_DIRS = new Set([
  "test",
  "node_modules",
  ".git",
  "dist",
  "build",
  "__mocks__",
  "__stories__",
  "stories",
  ".storybook",
]);
// Files skipped during the walk (matched against basename).
// Covers `*.stories.ts(x)`, `*.story.ts(x)`, and `*.mock.ts(x)`.
const EXCLUDE_FILE_RE = /\.(stories|story|mock)\.(ts|tsx)$/;
const FILE_EXT = /\.(ts|tsx)$/;
// Patterns we recognise (all match the `date-fns/<subpath>` specifier):
//   1. Named import:        import { fn } from "date-fns/fn"
//   2. Default import:      import fn from "date-fns/fn"
//   3. Namespace import:    import * as df from "date-fns/fn"
//   4. Side-effect import:  import "date-fns/fn"
//   5. Re-export named:     export { fn } from "date-fns/fn"
//   6. Re-export all:       export * from "date-fns/fn"
//   7. Dynamic import:      import("date-fns/fn")
// Type-only imports (`import type … from`, `export type … from`) are skipped.
const IMPORT_PATTERNS = [
  // Named/default/namespace imports — capture the optional `type` keyword
  {
    re: /import\s+(type\s+)?(?:\{[^{}]*\}|\*\s+as\s+[\w$]+|[\w$]+(?:\s*,\s*\{[^{}]*\})?)\s+from\s+["']date-fns\/([^"']+)["']/g,
    typeIdx: 1,
    pathIdx: 2,
  },
  // Side-effect import: `import "date-fns/format"`
  {
    re: /import\s+["']date-fns\/([^"']+)["']/g,
    typeIdx: -1,
    pathIdx: 1,
  },
  // Re-exports: `export { x } from "..."` and `export * from "..."` (incl. `export type`)
  {
    re: /export\s+(type\s+)?(?:\{[^{}]*\}|\*(?:\s+as\s+[\w$]+)?)\s+from\s+["']date-fns\/([^"']+)["']/g,
    typeIdx: 1,
    pathIdx: 2,
  },
  // Dynamic import: `import("date-fns/format")` or `await import('date-fns/format')`
  {
    re: /import\s*\(\s*["']date-fns\/([^"']+)["']\s*\)/g,
    typeIdx: -1,
    pathIdx: 1,
  },
];

// ── ANSI color helpers (TTY only — keep CI logs clean) ────────────────────────
const isTTY = Boolean(process.stdout.isTTY);
const color = (code, s) => (isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = (s) => color(31, s);
const green = (s) => color(32, s);
const cyan = (s) => color(36, s);
const gray = (s) => color(90, s);
const bold = (s) => color(1, s);

const RULE = "━".repeat(64);

function printBlock(title, body, { withRule = true } = {}) {
  if (withRule) console.error(red(RULE));
  console.error(red(`✗ ${title}`));
  if (withRule) console.error(red(RULE));
  console.error("");
  console.error(body);
  if (withRule) console.error(red(RULE));
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

const subpaths = new Set();
for (const file of walk(SRC_DIR)) {
  const src = readFileSync(file, "utf8");
  for (const { re, typeIdx, pathIdx } of IMPORT_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (typeIdx >= 0 && m[typeIdx]) continue; // skip type-only imports/exports
      subpaths.add(m[pathIdx]);
    }
  }
}

// ── Failure mode A: package directory missing ────────────────────────────────
if (!existsSync(PKG_DIR)) {
  const body = [
    cyan("Package directory checked:"),
    `  ${PKG_REL}`,
    "",
    cyan("Likely cause:"),
    "  Dependencies not installed (or node_modules wiped).",
    "",
    cyan("▶ Repair (copy & run):"),
    "",
    bold("    rm -rf node_modules && bun install --frozen-lockfile"),
    "",
    "After repair, re-run:",
    "",
    bold("    bun run verify:datefns-files"),
  ].join("\n");
  printBlock(
    `verify-datefns-files: ${PKG_REL} not found`,
    body,
  );
  process.exit(1);
}

// ── Failure mode B: no imports detected at all ───────────────────────────────
if (subpaths.size === 0) {
  const body = [
    cyan("Scan root:"),
    `  ${relative(ROOT, SRC_DIR)}`,
    "",
    cyan("Likely cause:"),
    "  Source layout changed, or the static-import regex no longer matches",
    "  any usage. Verify imports look like: import { fn } from \"date-fns/fn\".",
  ].join("\n");
  printBlock(
    "verify-datefns-files: no date-fns subpath imports found in src/",
    body,
  );
  process.exit(1);
}

// ── Existence check (track candidate paths per missing subpath) ──────────────
const missing = []; // [{ subpath, tried: [relPath, ...] }]
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
  if (!found) missing.push({ subpath: sp, tried: candidates });
}

// ── Failure mode C: one or more subpaths missing on disk ─────────────────────
if (missing.length > 0) {
  const lines = [];
  lines.push(cyan("Missing subpaths (imported from src/ but not on disk):"));
  for (const { subpath, tried } of missing) {
    lines.push(`  ${red("•")} ${bold(`date-fns/${subpath}`)}`);
    lines.push(gray(`      tried: ${tried.slice(0, 3).join(", ")},`));
    lines.push(gray(`             ${tried.slice(3).join(", ")}`));
  }
  lines.push("");
  lines.push(cyan("Package directory checked:"));
  lines.push(`  ${PKG_REL}`);
  lines.push("");
  lines.push(cyan("Likely cause:"));
  lines.push("  Broken or partial install — the lockfile resolves a date-fns version");
  lines.push("  but one or more subpath files are missing from node_modules.");
  lines.push("");
  lines.push(cyan("▶ Repair (copy & run):"));
  lines.push("");
  lines.push(bold("    rm -rf node_modules && bun install --frozen-lockfile"));
  lines.push("");
  lines.push("After repair, re-run:");
  lines.push("");
  lines.push(bold("    bun run verify:datefns-files"));

  printBlock(
    `verify-datefns-files: ${missing.length} missing date-fns subpath(s)`,
    lines.join("\n"),
  );
  process.exit(1);
}

console.log(
  green(
    `✓ Verified ${subpaths.size} date-fns subpath(s) exist on disk under ${PKG_REL}.`,
  ),
);

// ── Optional: persist discovered subpaths into dependency-health.json ────────
if (WRITE_HEALTH) {
  const sortedList = [...subpaths].sort();
  const subpathsBlock = {
    scannedAt: new Date().toISOString(),
    count: sortedList.length,
    list: sortedList,
  };
  let snapshot = {};
  if (existsSync(SNAPSHOT_PATH)) {
    try {
      snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
    } catch {
      snapshot = {};
    }
  } else {
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
  }
  snapshot.dateFns = snapshot.dateFns ?? {};
  snapshot.dateFns.subpaths = subpathsBlock;
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  console.log(
    cyan(
      `▶ Wrote dateFns.subpaths to ${relative(ROOT, SNAPSHOT_PATH)} (${sortedList.length} entries).`,
    ),
  );
}

