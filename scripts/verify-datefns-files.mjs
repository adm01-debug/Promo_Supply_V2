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
// Each pattern is tagged with a `kind` so the breakdown report can show how
// each subpath was discovered. `export-from` (named re-export) and
// `export-star` (`export * from`) are separated because they have very
// different tree-shaking implications — a star re-export of a date-fns
// subpath is usually a smell worth flagging in the summary.
const IMPORT_PATTERNS = [
  // Static imports: named/default/namespace (incl. `import type`)
  {
    kind: "static",
    re: /import\s+(type\s+)?(?:\{[^{}]*\}|\*\s+as\s+[\w$]+|[\w$]+(?:\s*,\s*\{[^{}]*\})?)\s+from\s+["']date-fns\/([^"']+)["']/g,
    typeIdx: 1,
    pathIdx: 2,
  },
  // Side-effect import: `import "date-fns/format"` — counted as static.
  {
    kind: "static",
    re: /import\s+["']date-fns\/([^"']+)["']/g,
    typeIdx: -1,
    pathIdx: 1,
  },
  // Named re-export: `export { x } from "date-fns/..."` (incl. `export type`)
  {
    kind: "export-from",
    re: /export\s+(type\s+)?\{[^{}]*\}\s+from\s+["']date-fns\/([^"']+)["']/g,
    typeIdx: 1,
    pathIdx: 2,
  },
  // Star re-export: `export * from "date-fns/..."` / `export * as ns from "..."`
  {
    kind: "export-star",
    re: /export\s+(type\s+)?\*(?:\s+as\s+[\w$]+)?\s+from\s+["']date-fns\/([^"']+)["']/g,
    typeIdx: 1,
    pathIdx: 2,
  },
  // Dynamic import: `import("date-fns/format")` or `await import('date-fns/format')`
  {
    kind: "dynamic",
    re: /import\s*\(\s*["']date-fns\/([^"']+)["']\s*\)/g,
    typeIdx: -1,
    pathIdx: 1,
  },
];

// Display order for the breakdown report — most → least common in practice.
const PATTERN_KINDS = ["static", "dynamic", "export-from", "export-star"];

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
    } else if (FILE_EXT.test(entry) && !EXCLUDE_FILE_RE.test(entry)) {
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

// ── Existence check (build per-subpath entries + collect missing) ───────────
// Single pass: probe each subpath's six candidate files, record the first hit
// (relative to node_modules/date-fns) into entries[], and accumulate missing[]
// for the failure-mode formatter below.
const entries = []; // [{ subpath, exists, resolvedFile }]
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
  const hit = candidates.find((c) => existsSync(join(PKG_DIR, c))) ?? null;
  entries.push({ subpath: sp, exists: hit !== null, resolvedFile: hit });
  if (!hit) missing.push({ subpath: sp, tried: candidates });
}

// ── Optional: persist per-subpath report into dependency-health.json ────────
// Intentionally written BEFORE the missing-subpath exit so the snapshot is
// comprehensive (includes exists:false rows) even on a partly-broken install.
// Verifier still exits 1 below if any subpath is missing — CI gating intact.
function writeHealthSnapshot(entriesArr) {
  const subpathsBlock = {
    scannedAt: new Date().toISOString(),
    count: entriesArr.length,
    missingCount: entriesArr.filter((e) => !e.exists).length,
    entries: entriesArr,
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
      `▶ Wrote dateFns.subpaths to ${relative(ROOT, SNAPSHOT_PATH)} (${entriesArr.length} entries, ${subpathsBlock.missingCount} missing).`,
    ),
  );
}
if (WRITE_HEALTH) writeHealthSnapshot(entries);

// ── Failure mode C: one or more subpaths missing on disk ─────────────────────
if (missing.length > 0) {
  // Partition missing entries so the failure block makes the root cause obvious:
  // a missing locale almost always means a partial/corrupt install, while a
  // missing function subpath can also mean an import typo.
  const missingLocales = missing.filter((m) => m.subpath.startsWith("locale/"));
  const missingFns = missing.filter((m) => !m.subpath.startsWith("locale/"));

  // Read the installed date-fns version (best-effort) so the suggested
  // reinstall command can pin to the exact version we expect on disk.
  let installedVersion = null;
  try {
    const pkgJson = JSON.parse(
      readFileSync(join(PKG_DIR, "package.json"), "utf8"),
    );
    installedVersion = typeof pkgJson.version === "string" ? pkgJson.version : null;
  } catch {
    /* ignore — fall back to unpinned reinstall hint */
  }

  const lines = [];
  lines.push(
    cyan(
      `Missing ${missing.length} subpath(s) — imported from src/ but not present in ${PKG_REL}:`,
    ),
  );
  lines.push("");

  const renderGroup = (title, group) => {
    if (group.length === 0) return;
    lines.push(cyan(`  ${title} (${group.length}):`));
    for (const { subpath } of group) {
      lines.push(`    ${red("•")} ${bold(`date-fns/${subpath}`)}`);
    }
    lines.push("");
  };
  renderGroup("Functions", missingFns);
  renderGroup("Locales", missingLocales);

  // Copy-paste list of just the bare subpaths — handy to grep src/ or paste
  // into an issue without the bullet/ANSI noise.
  lines.push(cyan("Copy-paste list (bare subpaths):"));
  for (const { subpath } of missing) {
    lines.push(`    date-fns/${subpath}`);
  }
  lines.push("");

  // One representative `tried:` block — the candidate set is identical for
  // every subpath, so repeating it per-entry was pure noise.
  if (missing[0]) {
    lines.push(cyan("Resolution candidates probed for each subpath:"));
    for (const c of missing[0].tried) lines.push(gray(`    ${c}`));
    lines.push("");
  }

  lines.push(cyan("Likely cause:"));
  if (missingLocales.length > 0 && missingFns.length === 0) {
    lines.push("  Partial install — date-fns is present but its locale/ tree is incomplete.");
    lines.push("  Common after an interrupted install or a stale package manager cache.");
  } else if (missingFns.length > 0 && missingLocales.length === 0) {
    lines.push("  Either a broken install OR an import typo (e.g. `date-fns/formatt`).");
    lines.push("  Verify the bare subpath list above matches real date-fns exports first.");
  } else {
    lines.push("  Broken or partial install — the lockfile resolves a date-fns version");
    lines.push("  but one or more subpath files are missing from node_modules/date-fns.");
  }
  lines.push("");

  // Suggested fix — pin to the installed version when known so a reinstall
  // can't silently bump and mask the real bug.
  const pinnedReinstall = installedVersion
    ? `bun add date-fns@${installedVersion} --exact`
    : null;

  lines.push(cyan("▶ Repair (copy & run, in order — stop at the first that succeeds):"));
  lines.push("");
  lines.push(bold("    # 1. Frozen reinstall (preferred — respects bun.lock):"));
  lines.push(bold("    rm -rf node_modules && bun install --frozen-lockfile"));
  if (pinnedReinstall) {
    lines.push("");
    lines.push(bold(`    # 2. Re-pin date-fns to the currently-installed version (${installedVersion}):`));
    lines.push(bold(`    ${pinnedReinstall}`));
  } else {
    lines.push("");
    lines.push(bold("    # 2. Re-pin date-fns (could not read installed version — use the spec from package.json):"));
    lines.push(bold("    bun add date-fns@<version-from-package.json> --exact"));
  }
  lines.push("");
  lines.push(bold("    # 3. Last resort — clear bun's global cache then reinstall:"));
  lines.push(bold("    bun pm cache rm && rm -rf node_modules && bun install --frozen-lockfile"));
  lines.push("");
  lines.push("After repair, re-run:");
  lines.push("");
  lines.push(bold("    bun run verify:datefns-files"));

  printBlock(
    `verify-datefns-files: ${missing.length} missing date-fns subpath(s)${installedVersion ? ` (installed: ${installedVersion})` : ""}`,
    lines.join("\n"),
  );
  process.exit(1);
}

console.log(
  green(
    `✓ Verified ${subpaths.size} date-fns subpath(s) exist on disk under ${PKG_REL}.`,
  ),
);

