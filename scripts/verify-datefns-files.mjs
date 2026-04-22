#!/usr/bin/env node
/**
 * Verifies that node_modules/date-fns contains every subpath file imported
 * under src/ (e.g. format, locale/pt-BR). Fails fast with a clear message
 * if any are missing — catches broken installs before vitest/tsc do.
 * Pure Node, zero deps. Same scan logic as generate-datefns-smoke-test.mjs.
 */
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);
const WRITE_HEALTH = ARGS.some((a) => a === "--write-health" || a === "--update-health");
// `--dry-run` (only meaningful with --write-health) computes & prints the
// snapshot that WOULD be written, without touching disk. Lets reviewers
// preview drift before committing the JSON in CI.
const DRY_RUN = ARGS.some((a) => a === "--dry-run");
// `--summary-md <path>` (also via env DATEFNS_SMOKE_SUMMARY_MD) writes a
// concise Markdown drift table — pinned date-fns version + missing-subpath
// table grouped by Functions/Locales — to <path>. Designed for piping into
// $GITHUB_STEP_SUMMARY in CI so reviewers see drift at a glance instead of
// scrolling job logs. Emitted on BOTH pass and fail (the empty-table "no
// drift" case is just as informative). Never affects exit code.
let SUMMARY_MD_PATH = process.env.DATEFNS_SMOKE_SUMMARY_MD || null;
// `--report-md <path>` (also via env DATEFNS_SMOKE_REPORT_MD) writes a FULL
// failure report — partitioned missing subpaths, copy-paste bare list,
// likely-cause diagnosis, and the exact 3-step repair recipe — to <path>
// when (and only when) drift is detected. Designed to be uploaded as a CI
// artifact on failure so reviewers get the full repair recipe offline
// without scrolling job logs. On a clean run, no file is written.
let REPORT_MD_PATH = process.env.DATEFNS_SMOKE_REPORT_MD || null;
// `--report-json <path>` (also via env DATEFNS_SMOKE_REPORT_JSON) writes a
// machine-readable JSON sibling of the Markdown failure report. Always
// emitted on failure (and optionally on success — see `emittedOn` below in
// the payload), so CI dashboards / bots can consume the exact missing
// subpath list + pinned version + one-step reinstall command without
// scraping the Markdown. Schema is versioned (`schemaVersion: 1`) so
// downstream consumers can pin against breaking changes.
let REPORT_JSON_PATH = process.env.DATEFNS_SMOKE_REPORT_JSON || null;
for (let i = 0; i < ARGS.length; i++) {
  if (ARGS[i] === "--summary-md" && ARGS[i + 1]) {
    SUMMARY_MD_PATH = ARGS[i + 1];
    i++;
  } else if (ARGS[i] === "--report-md" && ARGS[i + 1]) {
    REPORT_MD_PATH = ARGS[i + 1];
    i++;
  } else if (ARGS[i] === "--report-json" && ARGS[i + 1]) {
    REPORT_JSON_PATH = ARGS[i + 1];
    i++;
  }
}
const SNAPSHOT_PATH = join(ROOT, "public", "dependency-health.json");
const SRC_DIR = join(ROOT, "src");
const PKG_DIR = join(ROOT, "node_modules", "date-fns");
const PKG_REL = relative(ROOT, PKG_DIR);

// ── Scan roots ───────────────────────────────────────────────────────────────
// Default: src/ plus any sibling test directories that actually exist
// (tests/, test/, e2e/). Build output (dist/, build/), node_modules, .git,
// stories and mocks are excluded via EXCLUDE_DIRS / EXCLUDE_FILE_RE below —
// keeping local + CI scans tightly scoped to runtime source.
//
// Override via repeatable `--scan-dir <path>` (relative to repo root). When
// any `--scan-dir` flag is given, the defaults are REPLACED, not extended.
const DEFAULT_SCAN_ROOTS = ["src", "tests", "test", "e2e"]
  .map((d) => join(ROOT, d))
  .filter((p) => existsSync(p) && statSync(p).isDirectory());
const CLI_SCAN_ROOTS = [];
// `--filter <glob>` (repeatable, alias `--only`) restricts the existence
// check + report to subpaths matching ANY of the given glob patterns (e.g.
// `locale/*`, `format*`, `parseISO`). Tiny glob → RegExp translator (only
// `*`, `**`, and `?`) so we don't pull in a dep. Filtering is applied AFTER
// the source scan, so per-subpath file counts stay accurate. Incompatible
// with `--write-health`: persisting a partial scan would silently delete
// unrelated entries from dateFns.subpaths.entries[].
const CLI_FILTERS = [];
for (let i = 0; i < ARGS.length; i++) {
  if (ARGS[i] === "--scan-dir" && ARGS[i + 1]) {
    CLI_SCAN_ROOTS.push(join(ROOT, ARGS[i + 1]));
    i++;
  } else if ((ARGS[i] === "--filter" || ARGS[i] === "--only") && ARGS[i + 1]) {
    CLI_FILTERS.push(ARGS[i + 1]);
    i++;
  }
}
const SCAN_ROOTS = CLI_SCAN_ROOTS.length > 0 ? CLI_SCAN_ROOTS : DEFAULT_SCAN_ROOTS;

const FILTER_REGEXES = CLI_FILTERS.map((g) => {
  const re = g
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0000/g, ".*")
    .replace(/\?/g, "[^/]");
  return new RegExp(`^${re}$`);
});
const FILTER_ACTIVE = FILTER_REGEXES.length > 0;
const matchesFilter = (sp) => !FILTER_ACTIVE || FILTER_REGEXES.some((r) => r.test(sp));

if (FILTER_ACTIVE && WRITE_HEALTH) {
  process.stderr.write(
    `\n✗ verify-datefns-files: --filter is incompatible with --write-health.\n` +
      `  A filtered run only inspects a subset of subpaths; persisting it would\n` +
      `  erase the unrelated entries already recorded in dependency-health.json.\n` +
      `  ▶ Drop --filter to update the snapshot, or drop --write-health to inspect.\n\n`,
  );
  process.exit(2);
}

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
const EXCLUDE_FILE_RE = /\.(stories|story|mock)\.(ts|tsx|js|jsx|cjs|mjs)$/;
// Extended to .js/.jsx/.cjs/.mjs so CommonJS `require("date-fns/...")` calls
// (typically in build scripts, .cjs configs, or vendored runtime helpers)
// participate in the existence check alongside ESM imports.
const FILE_EXT = /\.(ts|tsx|js|jsx|cjs|mjs)$/;
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
  // CommonJS require: `require("date-fns/format")` — including destructured
  // (`const { format } = require(...)`) and bare side-effect form. Treated
  // as a first-class kind so mixed CJS/ESM repos get the same fail-fast
  // behavior on missing subpaths. Captures only the subpath; the binding
  // shape is irrelevant to the existence check.
  {
    kind: "cjs-require",
    re: /require\s*\(\s*["']date-fns\/([^"']+)["']\s*\)/g,
    typeIdx: -1,
    pathIdx: 1,
  },
];

// Display order for the breakdown report — most → least common in practice.
const PATTERN_KINDS = ["static", "dynamic", "cjs-require", "export-from", "export-star"];

// Unresolvable dynamic imports — `import(\`date-fns/${x}\`)` and friends.
// These can't be statically verified (the subpath depends on a runtime value),
// so the verifier must FAIL FAST instead of silently accepting them. Three
// variants we can detect with a regex (anything more exotic — string
// concatenation, indirection through a variable — is out of scope and the
// ESLint rule should catch separately):
//
//   1. Pure interpolation:    import(`date-fns/${name}`)
//   2. Suffix interpolation:  import(`date-fns/locale/${tag}`)
//   3. Prefix-only literal:   import(`date-fns/` + name)  ← string concat
//
// We deliberately match only template literals containing `${` (or `+`) AFTER
// the `date-fns/` prefix; a fully-literal template like `import(\`date-fns/format\`)`
// is resolvable and would be picked up by extending the static `dynamic` regex
// — see `RESOLVABLE_TEMPLATE_RE` below.
const UNRESOLVABLE_DYNAMIC_RE =
  /import\s*\(\s*(?:`date-fns\/[^`]*\$\{[^`]*`|["'`]date-fns\/?["'`]\s*\+)/g;

// Same shape, CommonJS flavor: `require(\`date-fns/${x}\`)` / `require("date-fns/" + x)`.
// Surfaced through the same failure-mode-D path as ESM unresolvable imports.
const UNRESOLVABLE_REQUIRE_RE =
  /require\s*\(\s*(?:`date-fns\/[^`]*\$\{[^`]*`|["'`]date-fns\/?["'`]\s*\+)/g;

// Resolvable template literal — no interpolation, just backticks. Treat as
// a normal dynamic import so we still verify the subpath exists.
const RESOLVABLE_TEMPLATE_RE = /import\s*\(\s*`date-fns\/([^`${}]+)`\s*\)/g;
// CJS counterpart: `require(\`date-fns/format\`)` — folded into `cjs-require`.
const RESOLVABLE_REQUIRE_TEMPLATE_RE = /require\s*\(\s*`date-fns\/([^`${}]+)`\s*\)/g;

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

function walk(dir, scanRoot, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Legacy quirk: skip src/test (vendored test fixtures), but DON'T
      // skip the scan root itself when the user pointed us at a test dir.
      if (full === join(SRC_DIR, "test")) continue;
      // Don't apply the basename exclude list to the scan root — otherwise
      // `--scan-dir test` would no-op because `test` is in EXCLUDE_DIRS.
      if (full !== scanRoot && EXCLUDE_DIRS.has(entry)) continue;
      walk(full, scanRoot, acc);
    } else if (FILE_EXT.test(entry) && !EXCLUDE_FILE_RE.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

const subpaths = new Set();
// Per-kind tracking: occurrences (raw match count) and unique subpaths.
// Both are useful — occurrences shows churn, unique shows surface area.
const kindOccurrences = Object.fromEntries(PATTERN_KINDS.map((k) => [k, 0]));
const kindSubpaths = Object.fromEntries(PATTERN_KINDS.map((k) => [k, new Set()]));
// subpath → Set<absoluteFilePath>. Drives the per-entry `fileCount` / `files[]`
// fields in the snapshot, which the diff script uses to highlight which
// imports actually drove drift (added/removed) and how widespread they are.
const subpathFiles = new Map();
// subpath → Map<absoluteFilePath, Set<lineNumber>>. Captures every concrete
// import location that contributed to each subpath. Drives the per-subpath
// "offenders" lists rendered in both the terminal failure block and the
// Markdown failure report so reviewers can jump straight from a missing
// subpath to the exact `file:line` that imported it. Line numbers are 1-based.
const subpathOffenders = new Map();
const recordSubpathFile = (sp, file, line) => {
  let s = subpathFiles.get(sp);
  if (!s) { s = new Set(); subpathFiles.set(sp, s); }
  s.add(file);
  if (typeof line === "number" && line > 0) {
    let perFile = subpathOffenders.get(sp);
    if (!perFile) { perFile = new Map(); subpathOffenders.set(sp, perFile); }
    let lines = perFile.get(file);
    if (!lines) { lines = new Set(); perFile.set(file, lines); }
    lines.add(line);
  }
};
// Unresolvable dynamic imports: `[{ file, line, snippet }]`. Surfaced via
// failure mode D below — verifier exits non-zero if any are present.
const unresolvableDynamic = [];

// Convert a char offset to a 1-based line number. Cheap enough to compute
// per-match because the unresolvable case is expected to be rare (zero in
// a healthy repo).
function lineFromOffset(src, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < src.length; i++) {
    if (src.charCodeAt(i) === 10) line++;
  }
  return line;
}

// Aggregate scanned file list across every root, then dedupe by absolute
// path. Roots can overlap (e.g. someone passes both `src` and `src/lib`)
// without double-counting matches or inflating the breakdown numbers.
const scannedFiles = new Set();
for (const root of SCAN_ROOTS) {
  for (const f of walk(root, root)) scannedFiles.add(f);
}
for (const file of scannedFiles) {
  const src = readFileSync(file, "utf8");
  for (const { kind, re, typeIdx, pathIdx } of IMPORT_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (typeIdx >= 0 && m[typeIdx]) continue; // skip type-only imports/exports
      const sp = m[pathIdx];
      subpaths.add(sp);
      kindOccurrences[kind] += 1;
      kindSubpaths[kind].add(sp);
      recordSubpathFile(sp, file, lineFromOffset(src, m.index));
    }
  }
  // Resolvable template literals — `import(\`date-fns/format\`)` — are valid
  // dynamic imports; fold them into the `dynamic` bucket alongside the
  // quoted-string variant.
  RESOLVABLE_TEMPLATE_RE.lastIndex = 0;
  let tm;
  while ((tm = RESOLVABLE_TEMPLATE_RE.exec(src)) !== null) {
    const sp = tm[1];
    subpaths.add(sp);
    kindOccurrences.dynamic += 1;
    kindSubpaths.dynamic.add(sp);
    recordSubpathFile(sp, file, lineFromOffset(src, tm.index));
  }
  // CJS counterpart: backtick-template require, no interpolation.
  RESOLVABLE_REQUIRE_TEMPLATE_RE.lastIndex = 0;
  let rtm;
  while ((rtm = RESOLVABLE_REQUIRE_TEMPLATE_RE.exec(src)) !== null) {
    const sp = rtm[1];
    subpaths.add(sp);
    kindOccurrences["cjs-require"] += 1;
    kindSubpaths["cjs-require"].add(sp);
    recordSubpathFile(sp, file, lineFromOffset(src, rtm.index));
  }
  // Unresolvable dynamic imports — record for failure mode D.
  UNRESOLVABLE_DYNAMIC_RE.lastIndex = 0;
  let um;
  while ((um = UNRESOLVABLE_DYNAMIC_RE.exec(src)) !== null) {
    unresolvableDynamic.push({
      file: relative(ROOT, file),
      line: lineFromOffset(src, um.index),
      snippet: um[0],
      kind: "import",
    });
  }
  // Same fail-fast policy for CommonJS: `require(\`date-fns/${x}\`)` and
  // `require("date-fns/" + x)` defeat the existence check just as badly as
  // their ESM counterparts. Tagged with `kind: "require"` so the failure
  // block can render the right fix recipe.
  UNRESOLVABLE_REQUIRE_RE.lastIndex = 0;
  let urm;
  while ((urm = UNRESOLVABLE_REQUIRE_RE.exec(src)) !== null) {
    unresolvableDynamic.push({
      file: relative(ROOT, file),
      line: lineFromOffset(src, urm.index),
      snippet: urm[0],
      kind: "require",
    });
  }
}

// ── Breakdown report ─────────────────────────────────────────────────────────
// Printed BEFORE the existence check so the user sees the discovery stats
// even when verification later fails. Kept compact (one line per kind) so
// it doesn't drown the green ✓ summary on success.
function printBreakdown() {
  const rootsLabel = SCAN_ROOTS.map((r) => relative(ROOT, r) || ".").join(", ");
  console.log(cyan(`▶ date-fns import breakdown (pre-verify) — roots: ${rootsLabel}, files: ${scannedFiles.size}`));
  for (const kind of PATTERN_KINDS) {
    const occ = kindOccurrences[kind];
    const uniq = kindSubpaths[kind].size;
    if (occ === 0) {
      console.log(`    ${gray(`• ${kind.padEnd(12)} 0 occurrences`)}`);
      continue;
    }
    const label = kind.padEnd(12);
    const occStr = `${occ} occurrence${occ === 1 ? "" : "s"}`;
    const uniqStr = `${uniq} unique subpath${uniq === 1 ? "" : "s"}`;
    console.log(`    • ${bold(label)} ${occStr.padEnd(18)} ${gray(`(${uniqStr})`)}`);
  }
  console.log(`    ${gray("─".repeat(48))}`);
  console.log(
    `    ${bold("total".padEnd(12))} ${gray(`${subpaths.size} unique subpath(s) across all patterns`)}`,
  );
  if (unresolvableDynamic.length > 0) {
    console.log(
      `    ${bold("unresolved".padEnd(12))} ${red(`${unresolvableDynamic.length} dynamic import(s) with interpolation — see failure below`)}`,
    );
  }
  console.log("");
}
printBreakdown();

// ── Failure mode D: unresolvable dynamic imports ─────────────────────────────
// Runs BEFORE the package/file checks because no amount of disk verification
// can prove a runtime-computed subpath is safe. Fail fast with copy-paste
// fix recipes so the developer doesn't have to grep for the offending lines.
if (unresolvableDynamic.length > 0) {
  // Partition by call shape so the heading and the recipe both stay accurate
  // when a repo mixes ESM dynamic imports with CJS requires.
  const importHits = unresolvableDynamic.filter((u) => u.kind === "import");
  const requireHits = unresolvableDynamic.filter((u) => u.kind === "require");
  const lines = [];
  const parts = [];
  if (importHits.length) parts.push(`${importHits.length} dynamic import(s)`);
  if (requireHits.length) parts.push(`${requireHits.length} require() call(s)`);
  lines.push(
    cyan(`Found ${parts.join(" and ")} with an interpolated date-fns subpath.`),
  );
  lines.push(
    gray(
      "  These can't be statically verified, defeat tree-shaking, and silently break",
    ),
  );
  lines.push(gray("  when a runtime value resolves to a subpath that doesn't exist."));
  lines.push("");
  lines.push(cyan("Offending sites:"));
  for (const { file, line, snippet } of unresolvableDynamic) {
    lines.push(`  ${red("•")} ${bold(`${file}:${line}`)}`);
    lines.push(`      ${gray(snippet)}`);
  }
  lines.push("");
  lines.push(cyan("▶ Fix (rewrite as a static import or a switch over known subpaths):"));
  lines.push("");
  lines.push(bold('    // ✗ unresolvable (ESM)'));
  lines.push(bold('    const mod = await import(`date-fns/locale/${tag}`);'));
  if (requireHits.length) {
    lines.push(bold('    // ✗ unresolvable (CJS)'));
    lines.push(bold('    const mod = require(`date-fns/locale/${tag}`);'));
  }
  lines.push("");
  lines.push(bold('    // ✓ static (preferred when the set is known)'));
  lines.push(bold('    import { ptBR } from "date-fns/locale/pt-BR";'));
  lines.push(bold('    import { enUS } from "date-fns/locale/en-US";'));
  lines.push(bold('    const mod = tag === "pt-BR" ? { default: ptBR } : { default: enUS };'));
  lines.push("");
  lines.push(bold('    // ✓ explicit dynamic switch (when lazy-loading matters)'));
  lines.push(bold('    const mod = tag === "pt-BR"'));
  lines.push(bold('      ? await import("date-fns/locale/pt-BR")'));
  lines.push(bold('      : await import("date-fns/locale/en-US");'));
  if (requireHits.length) {
    lines.push("");
    lines.push(bold('    // ✓ CJS equivalent'));
    lines.push(bold('    const mod = tag === "pt-BR"'));
    lines.push(bold('      ? require("date-fns/locale/pt-BR")'));
    lines.push(bold('      : require("date-fns/locale/en-US");'));
  }
  printBlock(
    `verify-datefns-files: ${unresolvableDynamic.length} unresolvable dynamic date-fns reference(s)`,
    lines.join("\n"),
  );
  process.exit(1);
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
    cyan("Scan roots:"),
    ...SCAN_ROOTS.map((r) => `  ${relative(ROOT, r) || "."}`),
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
// Per-entry shape now carries `fileCount` and a small `files[]` sample so
// `diff-dependency-health.mjs` can render "this added subpath is imported in
// 3 files: …" without re-walking the source tree. The sample is capped at
// SAMPLE_FILES_PER_ENTRY to keep snapshot diffs reviewable.
const SAMPLE_FILES_PER_ENTRY = 5;
const entries = []; // [{ subpath, exists, resolvedFile, fileCount, files }]
const missing = []; // [{ subpath, tried: [relPath, ...] }]
// Apply --filter (if any) AFTER discovery so per-file counts above stay
// truthful. The filtered set drives existence checks AND the failure-mode
// summary below — a missing subpath excluded by the filter won't fail this
// run (use the unfiltered run / CI gate to catch those).
const filteredSubpaths = FILTER_ACTIVE
  ? [...subpaths].filter(matchesFilter).sort()
  : [...subpaths].sort();

if (FILTER_ACTIVE) {
  console.log(
    cyan(
      `▶ --filter active (${CLI_FILTERS.map((f) => `"${f}"`).join(", ")}): ` +
        `${filteredSubpaths.length}/${subpaths.size} subpath(s) selected.`,
    ),
  );
  if (filteredSubpaths.length === 0) {
    console.log(gray("  No subpaths matched. Examples of discovered subpaths:"));
    for (const sp of [...subpaths].sort().slice(0, 8)) console.log(`    ${sp}`);
    process.exit(0);
  }
}

for (const sp of filteredSubpaths) {
  const candidates = [
    `${sp}.js`,
    `${sp}.mjs`,
    `${sp}.cjs`,
    `${sp}/index.js`,
    `${sp}/index.mjs`,
    `${sp}/index.cjs`,
  ];
  const hit = candidates.find((c) => existsSync(join(PKG_DIR, c))) ?? null;
  const filesForSp = [...(subpathFiles.get(sp) ?? [])]
    .map((f) => relative(ROOT, f))
    .sort();
  entries.push({
    subpath: sp,
    exists: hit !== null,
    resolvedFile: hit,
    fileCount: filesForSp.length,
    files: filesForSp.slice(0, SAMPLE_FILES_PER_ENTRY),
  });
  if (!hit) missing.push({ subpath: sp, tried: candidates });
}

// ── Optional: persist per-subpath report into dependency-health.json ────────
// Intentionally written BEFORE the missing-subpath exit so the snapshot is
// comprehensive (includes exists:false rows) even on a partly-broken install.
// Verifier still exits 1 below if any subpath is missing — CI gating intact.
function writeHealthSnapshot(entriesArr) {
  // Build a deterministic, diff-friendly description of WHAT was scanned
  // this run. When `entries[]` changes between snapshots, reviewers need to
  // know whether a subpath appeared/disappeared because real source changed
  // or because the scan input itself changed (new test dir, exclusion edit,
  // CLI `--scan-root` flag, …). The fileHash gives `diff-dependency-health`
  // a single-field check before walking the (potentially long) files list.
  const scannedRel = [...scannedFiles]
    .map((f) => relative(ROOT, f).replace(/\\/g, "/"))
    .sort();
  const fileHash = createHash("sha256")
    .update(scannedRel.join("\n"))
    .digest("hex");
  const scanInput = {
    roots: SCAN_ROOTS.map((r) => relative(ROOT, r).replace(/\\/g, "/") || "."),
    rootsSource: CLI_SCAN_ROOTS.length > 0 ? "cli" : "default",
    excludeDirs: [...EXCLUDE_DIRS].sort(),
    excludeFilePattern: EXCLUDE_FILE_RE.source,
    fileExtensions: FILE_EXT.source,
    fileCount: scannedRel.length,
    fileHash,
    files: scannedRel,
  };
  const subpathsBlock = {
    scannedAt: new Date().toISOString(),
    count: entriesArr.length,
    missingCount: entriesArr.filter((e) => !e.exists).length,
    entries: entriesArr,
    // Legacy alias kept for any older consumer expecting `.list` (just the
    // names). Distinct from `entries[]` (rich shape with fileCount, etc.).
    list: entriesArr.map((e) => e.subpath),
    scanInput,
  };
  let snapshot = {};

  // ── Pre-write guard: existing snapshot must be valid JSON ────────────────
  // Previously corruption was silently swallowed (`snapshot = {}`), which
  // meant a malformed file would be quietly overwritten — losing whatever
  // other tools (rollup-pin-check, smoke-test runner, etc.) had written
  // into it. Fail fast instead, with a recovery recipe.
  if (existsSync(SNAPSHOT_PATH)) {
    const raw = readFileSync(SNAPSHOT_PATH, "utf8");
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new TypeError(
          `expected a JSON object at the top level, got ${
            Array.isArray(parsed) ? "array" : typeof parsed
          }`,
        );
      }
      snapshot = parsed;
    } catch (err) {
      const body = [
        cyan("File checked:"),
        `  ${relative(ROOT, SNAPSHOT_PATH)}`,
        "",
        cyan("Parse error:"),
        `  ${red(String(err?.message ?? err))}`,
        "",
        cyan("Likely cause:"),
        "  Concurrent writes, an aborted previous run, or a manual edit that",
        "  left the file mid-character. The verifier refuses to overwrite it",
        "  blindly because that would erase any sibling blocks (rollup-pin,",
        "  smoke-test, etc.) other tools may have stored alongside dateFns.",
        "",
        cyan("▶ Repair (copy & run, in order):"),
        "",
        bold("    # 1. Inspect — confirm the corruption isn't recoverable by hand:"),
        bold(`    cat ${relative(ROOT, SNAPSHOT_PATH)} | head -40`),
        "",
        bold("    # 2. If unrecoverable, delete and let this script regenerate it:"),
        bold(`    rm ${relative(ROOT, SNAPSHOT_PATH)}`),
        bold("    bun run verify:datefns-files -- --write-health"),
        "",
        bold("    # 3. Optionally restore from git history first:"),
        bold(`    git checkout HEAD -- ${relative(ROOT, SNAPSHOT_PATH)}`),
      ].join("\n");
      printBlock(
        `verify-datefns-files: ${relative(ROOT, SNAPSHOT_PATH)} is not valid JSON`,
        body,
      );
      process.exit(1);
    }
  } else {
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
  }
  snapshot.dateFns = snapshot.dateFns ?? {};
  snapshot.dateFns.subpaths = subpathsBlock;

  // ── Post-serialize guard: the bytes we're about to write must round-trip ─
  // Cheap belt-and-braces check: catches any non-JSON-safe value that crept
  // into the snapshot (BigInt, undefined in arrays, circular refs throwing
  // earlier — etc.) BEFORE we replace the on-disk file.
  let serialized;
  try {
    serialized = JSON.stringify(snapshot, null, 2) + "\n";
    JSON.parse(serialized); // throws if stringify produced anything invalid
  } catch (err) {
    printBlock(
      "verify-datefns-files: refusing to write — generated snapshot is not valid JSON",
      [
        cyan("Target file (NOT touched):"),
        `  ${relative(ROOT, SNAPSHOT_PATH)}`,
        "",
        cyan("Serialization error:"),
        `  ${red(String(err?.message ?? err))}`,
        "",
        gray("This is a verifier bug — the snapshot object contains a value"),
        gray("that doesn't round-trip through JSON.stringify/parse. Please"),
        gray("report it with the offending entries[] payload above."),
      ].join("\n"),
    );
    process.exit(1);
  }
  if (DRY_RUN) {
    // Don't touch disk. Print exactly what WOULD land in the file, plus a
    // short delta vs. the existing dateFns.subpaths block so reviewers can
    // eyeball drift before re-running without --dry-run.
    const prevBlock = (() => {
      try {
        const raw = readFileSync(SNAPSHOT_PATH, "utf8");
        return JSON.parse(raw)?.dateFns?.subpaths ?? null;
      } catch {
        return null;
      }
    })();
    const prevNames = new Set(
      (prevBlock?.entries ?? []).map((e) => e.subpath),
    );
    const nextNames = new Set(entriesArr.map((e) => e.subpath));
    const added = [...nextNames].filter((s) => !prevNames.has(s)).sort();
    const removed = [...prevNames].filter((s) => !nextNames.has(s)).sort();
    console.log(
      cyan(
        `▶ [dry-run] Would write dateFns.subpaths to ${relative(ROOT, SNAPSHOT_PATH)} (${entriesArr.length} entries, ${subpathsBlock.missingCount} missing).`,
      ),
    );
    console.log(gray("  No files were modified."));
    if (prevBlock) {
      const prevCount = prevBlock.count ?? (prevBlock.entries?.length ?? 0);
      const prevMissing = prevBlock.missingCount ?? 0;
      console.log(
        gray(
          `  Delta vs. existing snapshot: count ${prevCount} → ${entriesArr.length}, missingCount ${prevMissing} → ${subpathsBlock.missingCount}, +${added.length} added / -${removed.length} removed.`,
        ),
      );
      const SHOW = 20;
      if (added.length > 0) {
        console.log(cyan("  + would add:"));
        for (const s of added.slice(0, SHOW)) console.log(`      + ${s}`);
        if (added.length > SHOW) console.log(gray(`      … and ${added.length - SHOW} more`));
      }
      if (removed.length > 0) {
        console.log(cyan("  - would remove:"));
        for (const s of removed.slice(0, SHOW)) console.log(`      - ${s}`);
        if (removed.length > SHOW) console.log(gray(`      … and ${removed.length - SHOW} more`));
      }
      if (added.length === 0 && removed.length === 0) {
        console.log(gray("  No subpath set changes — only metadata fields may differ."));
      }
    } else {
      console.log(gray("  (No previous snapshot found — this would be the baseline.)"));
    }
    console.log("");
    console.log(gray("  ── Snapshot preview (full bytes that would be written) ──"));
    process.stdout.write(serialized);
    return;
  }
  writeFileSync(SNAPSHOT_PATH, serialized, "utf8");
  console.log(
    cyan(
      `▶ Wrote dateFns.subpaths to ${relative(ROOT, SNAPSHOT_PATH)} (${entriesArr.length} entries, ${subpathsBlock.missingCount} missing).`,
    ),
  );
}
if (WRITE_HEALTH) writeHealthSnapshot(entries);
else if (DRY_RUN) {
  console.log(
    gray("ℹ --dry-run is a no-op without --write-health (nothing to preview)."),
  );
}

// ── --write-health summary: compact missing table ────────────────────────────
// Only fires when persisting the snapshot (incl. --dry-run preview), so the
// default verifier output stays terse. Failure mode C below still prints the
// full diagnostic block + exits 1 — this table is just an at-a-glance recap
// pinned next to the "▶ Wrote …" line so reviewers see WHICH subpaths are
// missing without scrolling through the long resolution explainer.
if ((WRITE_HEALTH || DRY_RUN) && missing.length > 0) {
  // Width = longest subpath name, capped so a runaway path can't blow out
  // a narrow terminal. Candidate column is left-aligned & comma-joined.
  const SUBPATH_COL_MAX = 32;
  const subpathCol = Math.min(
    SUBPATH_COL_MAX,
    Math.max("Subpath".length, ...missing.map((m) => m.subpath.length)),
  );
  const pad = (s, n) => (s.length >= n ? s : s + " ".repeat(n - s.length));
  const header = `  ${pad("Subpath", subpathCol)}  Tried (relative to ${PKG_REL})`;
  const rule = `  ${"─".repeat(subpathCol)}  ${"─".repeat(40)}`;
  console.log("");
  console.log(
    cyan(`▶ ${missing.length} subpath(s) recorded as missing in the snapshot:`),
  );
  console.log(gray(header));
  console.log(gray(rule));
  for (const m of missing) {
    const name =
      m.subpath.length > subpathCol
        ? m.subpath.slice(0, subpathCol - 1) + "…"
        : m.subpath;
    console.log(`  ${red(pad(name, subpathCol))}  ${gray((m.tried ?? []).join(", "))}`);
  }
  console.log("");
}


// ── Pinned date-fns version (best-effort, used by both summary + failure block)
let installedVersion = null;
try {
  const pkgJson = JSON.parse(readFileSync(join(PKG_DIR, "package.json"), "utf8"));
  installedVersion = typeof pkgJson.version === "string" ? pkgJson.version : null;
} catch {
  /* ignore — fall back to "unknown" in summary; reinstall hint omits pin */
}

// ── --summary-md: concise Markdown drift table for $GITHUB_STEP_SUMMARY ──────
// Always emitted when --summary-md / DATEFNS_SMOKE_SUMMARY_MD is set, regardless
// of pass/fail. The "no drift" form is intentionally short (one ✓ line) so a
// green CI run doesn't bloat the job summary. Never affects exit code — the
// existing failure-mode-C path below still exits 1 when missing.length > 0.
function writeSummaryMd(path) {
  const lines = [];
  const pinned = installedVersion ?? "unknown";
  lines.push(`### date-fns subpath drift`);
  lines.push("");
  lines.push(`**Pinned date-fns version:** \`${pinned}\``);
  lines.push(
    `**Imported subpaths:** ${entries.length}` +
      (FILTER_ACTIVE ? ` _(filtered from ${subpaths.size})_` : ""),
  );
  lines.push(`**Missing on disk:** ${missing.length}`);
  lines.push("");
  if (missing.length === 0) {
    lines.push(`✓ No drift — every imported subpath resolves under \`${PKG_REL}\`.`);
  } else {
    const fns = missing.filter((m) => !m.subpath.startsWith("locale/"));
    const locales = missing.filter((m) => m.subpath.startsWith("locale/"));
    lines.push(
      `❌ ${missing.length} subpath${missing.length === 1 ? "" : "s"} imported from \`src/\` ` +
        `but not present in \`${PKG_REL}\` on the pinned version.`,
    );
    lines.push("");
    lines.push(`| Kind | Subpath | Imported in (files) | Pinned date-fns |`);
    lines.push(`| --- | --- | ---: | --- |`);
    const renderRow = (kindLabel, subpath) => {
      const fileCount = (subpathFiles.get(subpath) ?? new Set()).size;
      lines.push(`| ${kindLabel} | \`date-fns/${subpath}\` | ${fileCount} | \`${pinned}\` |`);
    };
    for (const { subpath } of fns) renderRow("function", subpath);
    for (const { subpath } of locales) renderRow("locale", subpath);
    lines.push("");
    lines.push(
      `_Fix: rerun \`bun install --frozen-lockfile\`, or correct the typo. ` +
        `See the smoke job log for the full repair recipe._`,
    );
  }
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, lines.join("\n") + "\n", "utf8");
  } catch (err) {
    // Never fail the verifier just because the summary file couldn't be
    // written — the gate's job is to detect drift, not produce reports.
    console.error(gray(`(verify-datefns-files: could not write summary to ${path}: ${err?.message ?? err})`));
  }
}
if (SUMMARY_MD_PATH) writeSummaryMd(SUMMARY_MD_PATH);

// ── Failure mode C: one or more subpaths missing on disk ─────────────────────
if (missing.length > 0) {
  // Partition missing entries so the failure block makes the root cause obvious:
  // a missing locale almost always means a partial/corrupt install, while a
  // missing function subpath can also mean an import typo.
  const missingLocales = missing.filter((m) => m.subpath.startsWith("locale/"));
  const missingFns = missing.filter((m) => !m.subpath.startsWith("locale/"));

  // (installedVersion is read above so the summary-md block + failure block
  // share the same value.)

  const lines = [];
  lines.push(
    cyan(
      `Missing ${missing.length} subpath(s) — imported from src/ but not present in ${PKG_REL}:`,
    ),
  );
  lines.push("");

  // Cap per-subpath offender list to keep the failure block readable when a
  // missing subpath is imported by hundreds of files. The full unbounded
  // list is preserved verbatim in the Markdown report (CI artifact).
  const TERMINAL_OFFENDER_CAP = 8;
  // Cheapest possible "stable" sort: (file path asc, then line asc).
  const sortedOffenders = (subpath) => {
    const perFile = subpathOffenders.get(subpath);
    if (!perFile || perFile.size === 0) return [];
    const out = [];
    for (const [file, lineSet] of perFile) {
      const sortedLines = [...lineSet].sort((a, b) => a - b);
      out.push({ file: relative(ROOT, file), lines: sortedLines });
    }
    out.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
    return out;
  };

  const renderGroup = (title, group) => {
    if (group.length === 0) return;
    lines.push(cyan(`  ${title} (${group.length}):`));
    for (const { subpath } of group) {
      lines.push(`    ${red("•")} ${bold(`date-fns/${subpath}`)}`);
      const offenders = sortedOffenders(subpath);
      if (offenders.length === 0) {
        // Should not happen — every missing subpath was discovered by
        // scanning a file — but degrade gracefully if line tracking failed.
        const fileSet = subpathFiles.get(subpath);
        if (fileSet && fileSet.size > 0) {
          lines.push(gray(`        (${fileSet.size} file(s) — line numbers unavailable)`));
        }
        continue;
      }
      const shown = offenders.slice(0, TERMINAL_OFFENDER_CAP);
      for (const { file, lines: ls } of shown) {
        // `path:line[, line, …]` — directly clickable in most terminals
        // when only one line, still actionable when multiple.
        lines.push(gray(`        ${file}:${ls.join(",")}`));
      }
      const hidden = offenders.length - shown.length;
      if (hidden > 0) {
        lines.push(gray(`        … and ${hidden} more file(s) — see the full failure-report artifact`));
      }
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

  // ── --report-md: full Markdown failure report (CI artifact) ────────────────
  // Written ONLY on failure, ONLY when --report-md / DATEFNS_SMOKE_REPORT_MD
  // is set. Mirrors the terminal failure block (partitioned missing list +
  // copy-paste bare list + likely cause + 3-step repair recipe) but in plain
  // Markdown so it can be uploaded as a CI artifact and read offline. Never
  // affects exit code — exit(1) below still runs unchanged.
  if (REPORT_MD_PATH) {
    const md = [];
    const pinned = installedVersion ?? "unknown";
    md.push(`# date-fns subpath drift — failure report`);
    md.push("");
    md.push(`**Pinned date-fns version:** \`${pinned}\``);
    md.push(`**Imported subpaths scanned:** ${entries.length}` +
      (FILTER_ACTIVE ? ` _(filtered from ${subpaths.size})_` : ""));
    md.push(`**Missing on disk:** ${missing.length}`);
    md.push("");
    md.push(`> Imported from \`src/\` but not present in \`${PKG_REL}\` on the pinned version.`);
    md.push("");

    const renderMdGroup = (title, group) => {
      if (group.length === 0) return;
      md.push(`## ${title} (${group.length})`);
      md.push("");
      md.push(`| # | Subpath | Imported in (files) | Offenders (\`file:line\`) |`);
      md.push(`| ---: | --- | ---: | --- |`);
      group.forEach(({ subpath }, i) => {
        const fileCount = (subpathFiles.get(subpath) ?? new Set()).size;
        const offenders = sortedOffenders(subpath);
        // Render every offender in the artifact — full audit trail. Uses
        // <br> for in-cell line breaks so the table stays valid Markdown
        // but each `file:line` is on its own visual row in the rendered
        // output (GitHub job summary, browser preview, etc.).
        const cell = offenders.length > 0
          ? offenders.map(({ file, lines: ls }) => `\`${file}:${ls.join(",")}\``).join("<br>")
          : "_(line numbers unavailable)_";
        md.push(`| ${i + 1} | \`date-fns/${subpath}\` | ${fileCount} | ${cell} |`);
      });
      md.push("");
    };
    renderMdGroup("Functions", missingFns);
    renderMdGroup("Locales", missingLocales);

    md.push(`## Copy-paste list (bare subpaths)`);
    md.push("");
    md.push("```");
    for (const { subpath } of missing) md.push(`date-fns/${subpath}`);
    md.push("```");
    md.push("");

    if (missing[0]) {
      md.push(`## Resolution candidates probed for each subpath`);
      md.push("");
      md.push("```");
      for (const c of missing[0].tried) md.push(c);
      md.push("```");
      md.push("");
    }

    md.push(`## Likely cause`);
    md.push("");
    if (missingLocales.length > 0 && missingFns.length === 0) {
      md.push("Partial install — date-fns is present but its `locale/` tree is incomplete. Common after an interrupted install or a stale package manager cache.");
    } else if (missingFns.length > 0 && missingLocales.length === 0) {
      md.push("Either a broken install **OR** an import typo (e.g. `date-fns/formatt`). Verify the bare subpath list above matches real date-fns exports first.");
    } else {
      md.push("Broken or partial install — the lockfile resolves a date-fns version but one or more subpath files are missing from `node_modules/date-fns`.");
    }
    md.push("");

    md.push(`## Repair (copy & run, in order — stop at the first that succeeds)`);
    md.push("");
    md.push(`### 1. Frozen reinstall (preferred — respects \`bun.lock\`)`);
    md.push("```bash");
    md.push("rm -rf node_modules && bun install --frozen-lockfile");
    md.push("```");
    md.push("");
    if (pinnedReinstall) {
      md.push(`### 2. Re-pin date-fns to the currently-installed version (\`${installedVersion}\`)`);
      md.push("```bash");
      md.push(pinnedReinstall);
      md.push("```");
    } else {
      md.push("### 2. Re-pin date-fns (could not read installed version — use spec from `package.json`)");
      md.push("```bash");
      md.push("bun add date-fns@<version-from-package.json> --exact");
      md.push("```");
    }
    md.push("");
    md.push("### 3. Last resort — clear bun's global cache then reinstall");
    md.push("```bash");
    md.push("bun pm cache rm && rm -rf node_modules && bun install --frozen-lockfile");
    md.push("```");
    md.push("");
    md.push("### After repair, re-run");
    md.push("```bash");
    md.push("bun run verify:datefns-files");
    md.push("```");
    md.push("");

    try {
      mkdirSync(dirname(REPORT_MD_PATH), { recursive: true });
      writeFileSync(REPORT_MD_PATH, md.join("\n"), "utf8");
    } catch (err) {
      console.error(gray(`(verify-datefns-files: could not write failure report to ${REPORT_MD_PATH}: ${err?.message ?? err})`));
    }
  }

  // ── --report-json: machine-readable missing-subpath report (CI artifact) ──
  // Mirrors the Markdown report but in a stable, versioned JSON schema so
  // dashboards / bots can consume the exact missing subpath list + pinned
  // version + one-step reinstall command without scraping Markdown.
  if (REPORT_JSON_PATH) {
    const buildEntry = ({ subpath, tried }) => {
      const offenders = sortedOffenders(subpath); // [{ file, lines: number[] }]
      const fileCount = (subpathFiles.get(subpath) ?? new Set()).size;
      return {
        subpath,
        specifier: `date-fns/${subpath}`,
        kind: subpath.startsWith("locale/") ? "locale" : "function",
        fileCount,
        offenders, // [{ file: "src/x.ts", lines: [12, 88] }]
        triedPaths: tried,
      };
    };
    const reinstallCommand = installedVersion
      ? `bun add date-fns@${installedVersion} --exact`
      : `rm -rf node_modules && bun install --frozen-lockfile`;
    const payload = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      emittedOn: "failure",
      pinnedVersion: installedVersion,
      packageRelativeDir: PKG_REL,
      scannedFiles: scannedFiles.size,
      importedSubpathCount: entries.length,
      filterActive: FILTER_ACTIVE,
      missingCount: missing.length,
      missing: missing.map(buildEntry),
      reinstall: {
        oneStep: reinstallCommand,
        steps: [
          { label: "Frozen reinstall (preferred — respects bun.lock)", command: "rm -rf node_modules && bun install --frozen-lockfile" },
          { label: installedVersion
              ? `Re-pin date-fns to the currently-installed version (${installedVersion})`
              : "Re-pin date-fns (use spec from package.json)",
            command: installedVersion
              ? `bun add date-fns@${installedVersion} --exact`
              : "bun add date-fns@<version-from-package.json> --exact" },
          { label: "Last resort — clear bun's global cache then reinstall", command: "bun pm cache rm && rm -rf node_modules && bun install --frozen-lockfile" },
        ],
        verifyAfter: "bun run verify:datefns-files",
      },
    };
    try {
      mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
      writeFileSync(REPORT_JSON_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
    } catch (err) {
      console.error(gray(`(verify-datefns-files: could not write JSON report to ${REPORT_JSON_PATH}: ${err?.message ?? err})`));
    }
  }

  process.exit(1);
}

console.log(
  green(
    `✓ Verified ${entries.length} date-fns subpath(s) exist on disk under ${PKG_REL}${FILTER_ACTIVE ? ` (filtered from ${subpaths.size})` : ""}.`,
  ),
);

