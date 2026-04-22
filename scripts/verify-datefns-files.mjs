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
const ARGS = process.argv.slice(2);
const WRITE_HEALTH = ARGS.some((a) => a === "--write-health" || a === "--update-health");
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
for (let i = 0; i < ARGS.length; i++) {
  if (ARGS[i] === "--scan-dir" && ARGS[i + 1]) {
    CLI_SCAN_ROOTS.push(join(ROOT, ARGS[i + 1]));
    i++;
  }
}
const SCAN_ROOTS = CLI_SCAN_ROOTS.length > 0 ? CLI_SCAN_ROOTS : DEFAULT_SCAN_ROOTS;
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

// Resolvable template literal — no interpolation, just backticks. Treat as
// a normal dynamic import so we still verify the subpath exists.
const RESOLVABLE_TEMPLATE_RE = /import\s*\(\s*`date-fns\/([^`${}]+)`\s*\)/g;

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
// Per-kind tracking: occurrences (raw match count) and unique subpaths.
// Both are useful — occurrences shows churn, unique shows surface area.
const kindOccurrences = Object.fromEntries(PATTERN_KINDS.map((k) => [k, 0]));
const kindSubpaths = Object.fromEntries(PATTERN_KINDS.map((k) => [k, new Set()]));
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

for (const file of walk(SRC_DIR)) {
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
  }
  // Unresolvable dynamic imports — record for failure mode D.
  UNRESOLVABLE_DYNAMIC_RE.lastIndex = 0;
  let um;
  while ((um = UNRESOLVABLE_DYNAMIC_RE.exec(src)) !== null) {
    unresolvableDynamic.push({
      file: relative(ROOT, file),
      line: lineFromOffset(src, um.index),
      snippet: um[0],
    });
  }
}

// ── Breakdown report ─────────────────────────────────────────────────────────
// Printed BEFORE the existence check so the user sees the discovery stats
// even when verification later fails. Kept compact (one line per kind) so
// it doesn't drown the green ✓ summary on success.
function printBreakdown() {
  console.log(cyan("▶ date-fns import breakdown (pre-verify):"));
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
  const lines = [];
  lines.push(
    cyan(
      `Found ${unresolvableDynamic.length} dynamic import(s) with an interpolated date-fns subpath.`,
    ),
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
  lines.push(bold('    // ✗ unresolvable'));
  lines.push(bold('    const mod = await import(`date-fns/locale/${tag}`);'));
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
  printBlock(
    `verify-datefns-files: ${unresolvableDynamic.length} unresolvable dynamic date-fns import(s)`,
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

