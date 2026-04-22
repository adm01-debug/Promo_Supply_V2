#!/usr/bin/env node
/**
 * Print a coverage table for the rule's hardcoded `LOCALE_SUBPATHS` map
 * vs the locales actually shipped by the installed `date-fns` package.
 * For each locale we show:
 *
 *   - source          : where the locale was discovered ("disk", "map",
 *                       "exports", or a comma-separated combination)
 *   - kebab subpath   : the on-disk folder name (`pt-BR`, `be-tarask`)
 *   - camelCase name  : the export identifier the rule autofix uses
 *   - fixable         : ✓ when the rule can autofix this locale,
 *                       ✗ when it would report-but-skip-fix (because
 *                       the camelCase identifier is missing from
 *                       LOCALE_SUBPATHS)
 *
 * Exit codes:
 *   0  every disk/exports locale is also in LOCALE_SUBPATHS (fixable)
 *   1  one or more locales are present in date-fns but missing from the
 *      rule's map → unfixable. Prints the diff so the fix is obvious.
 *
 * The script reads three independent sources of truth and reconciles
 * them, so a regression in any one is visible as a row that's present
 * in some columns but missing from others:
 *
 *   1. **disk**     — `node_modules/date-fns/locale/<kebab>/` directories.
 *                     The most authoritative source: it's what the
 *                     bundler and Node resolver actually see.
 *   2. **exports**  — `package.json#exports` keys matching
 *                     `./locale/<kebab>`. What date-fns formally
 *                     promises to ship; can lag disk on broken builds.
 *   3. **map**      — `LOCALE_SUBPATHS` in `eslint-rules/date-fns-subpath.js`.
 *                     What the autofix knows how to rewrite to.
 *
 * Flags:
 *   --json     emit machine-readable JSON to stdout instead of the
 *              ANSI table (still exits 1 on coverage gaps)
 *   --quiet    suppress the per-locale rows; only print the summary
 *              counts and any coverage gaps
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ARGS = process.argv.slice(2);
const JSON_OUT = ARGS.includes("--json");
const QUIET = ARGS.includes("--quiet");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DATE_FNS_DIR = path.join(REPO_ROOT, "node_modules", "date-fns");
const RULE_PATH = path.join(REPO_ROOT, "eslint-rules", "date-fns-subpath.js");

// ── Source 1: on-disk directories under node_modules/date-fns/locale ───────
function readDiskLocales() {
  const dir = path.join(DATE_FNS_DIR, "locale");
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue; // _lib helper folder
    out.push(entry.name);
  }
  return out.sort();
}

// ── Source 2: package.json#exports — what date-fns formally promises ──────
function readExportsLocales() {
  const pkgPath = path.join(DATE_FNS_DIR, "package.json");
  if (!fs.existsSync(pkgPath)) return [];
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    return [];
  }
  const exportsField = pkg.exports;
  if (!exportsField || typeof exportsField !== "object") return [];
  const out = new Set();
  for (const key of Object.keys(exportsField)) {
    // Match `./locale/<kebab>` (one segment after locale) — skip the
    // bare `./locale` barrel and any nested `./locale/_lib/*`.
    const m = key.match(/^\.\/locale\/([A-Za-z0-9-]+)$/);
    if (m) out.add(m[1]);
  }
  return [...out].sort();
}

// ── Source 3: LOCALE_SUBPATHS in the rule (camelCase → kebab) ──────────────
async function readRuleMap() {
  if (!fs.existsSync(RULE_PATH)) return {};
  // Static parse rather than dynamic import — the rule file uses ESM
  // top-level `import` but doesn't export LOCALE_SUBPATHS, so we
  // extract the literal map with a focused regex. The format is stable
  // (one `key: "value",` per line) and any edits that break the regex
  // will still surface as coverage gaps below.
  const src = fs.readFileSync(RULE_PATH, "utf8");
  const m = src.match(/const LOCALE_SUBPATHS\s*=\s*\{([\s\S]*?)\};/);
  if (!m) return {};
  const body = m[1];
  const map = {};
  // Match `<ident>: "<kebab>",` allowing whitespace and trailing comma.
  const entryRe = /([A-Za-z_$][\w$]*)\s*:\s*"([^"]+)"/g;
  let entry;
  while ((entry = entryRe.exec(body))) {
    map[entry[1]] = entry[2];
  }
  return map;
}

/**
 * Convert a kebab/lowercase locale subpath (`pt-BR`, `be-tarask`,
 * `ja-Hira`) into its expected camelCase export identifier. Mirrors
 * the convention date-fns uses across its locale exports.
 */
function kebabToCamel(kebab) {
  return kebab
    .split("-")
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

// ─── Main ──────────────────────────────────────────────────────────────────
const diskLocales = new Set(readDiskLocales());
const exportsLocales = new Set(readExportsLocales());
const ruleMap = await readRuleMap();
// Reverse map: kebab → camelCase, derived from the rule's map.
const ruleKebabToCamel = new Map();
for (const [camel, kebab] of Object.entries(ruleMap)) {
  ruleKebabToCamel.set(kebab, camel);
}

// Union of every kebab subpath we know about, from any source.
const allKebab = new Set([
  ...diskLocales,
  ...exportsLocales,
  ...ruleKebabToCamel.keys(),
]);

const rows = [];
for (const kebab of [...allKebab].sort()) {
  const onDisk = diskLocales.has(kebab);
  const inExports = exportsLocales.has(kebab);
  const inMap = ruleKebabToCamel.has(kebab);
  // Camel name = whatever the rule maps to, OR the derived guess if
  // the rule doesn't know about it yet (so the table still suggests
  // the entry that needs to be added).
  const camel = ruleKebabToCamel.get(kebab) ?? kebabToCamel(kebab);
  // A locale is "fixable" iff its kebab subpath has a camelCase entry
  // in LOCALE_SUBPATHS — that's what the rule reads at fix time. Disk
  // / exports presence determines whether it's REACHABLE; the map
  // entry determines whether it's FIXABLE once reached.
  const fixable = inMap;
  const sources = [];
  if (onDisk) sources.push("disk");
  if (inExports) sources.push("exports");
  if (inMap) sources.push("map");
  rows.push({
    kebab,
    camel,
    onDisk,
    inExports,
    inMap,
    fixable,
    sources: sources.join(","),
  });
}

const totalReachable = rows.filter((r) => r.onDisk || r.inExports).length;
const totalFixable = rows.filter((r) => r.fixable).length;
// Reachable on disk/exports BUT missing from the rule's map → unfixable.
// These are the rows that would cause `local/date-fns-subpath` to report
// without being able to autofix.
const unfixable = rows.filter((r) => (r.onDisk || r.inExports) && !r.inMap);
// Map entries that point to non-existent locales — stale/typo'd
// entries the rule would happily "fix" to a broken import. Less
// urgent than unfixable, but still worth flagging.
const stale = rows.filter((r) => r.inMap && !r.onDisk && !r.inExports);

// ─── Output ────────────────────────────────────────────────────────────────
if (JSON_OUT) {
  const payload = {
    generatedAt: new Date().toISOString(),
    counts: {
      totalKnownLocales: rows.length,
      reachable: totalReachable,
      fixable: totalFixable,
      unfixable: unfixable.length,
      staleMapEntries: stale.length,
    },
    sources: {
      disk: { count: diskLocales.size, path: path.relative(REPO_ROOT, path.join(DATE_FNS_DIR, "locale")) },
      exports: { count: exportsLocales.size, path: path.relative(REPO_ROOT, path.join(DATE_FNS_DIR, "package.json")) + "#exports" },
      map: { count: Object.keys(ruleMap).length, path: path.relative(REPO_ROOT, RULE_PATH) + "#LOCALE_SUBPATHS" },
    },
    rows,
    unfixable,
    stale,
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
} else {
  const isTTY = process.stdout.isTTY && !process.env.NO_COLOR;
  const c = isTTY
    ? { bold: "\x1b[1m", dim: "\x1b[2m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m", reset: "\x1b[0m" }
    : { bold: "", dim: "", green: "", red: "", yellow: "", cyan: "", reset: "" };

  console.log(`${c.bold}▶ date-fns LOCALE_SUBPATHS coverage${c.reset}`);
  console.log(`  ${c.dim}Sources of truth:${c.reset}`);
  console.log(`    disk     ${c.dim}${path.relative(REPO_ROOT, path.join(DATE_FNS_DIR, "locale"))}/${c.reset}                          ${c.bold}${diskLocales.size}${c.reset} locale(s)`);
  console.log(`    exports  ${c.dim}${path.relative(REPO_ROOT, path.join(DATE_FNS_DIR, "package.json"))}#exports${c.reset}             ${c.bold}${exportsLocales.size}${c.reset} locale(s)`);
  console.log(`    map      ${c.dim}${path.relative(REPO_ROOT, RULE_PATH)}#LOCALE_SUBPATHS${c.reset}    ${c.bold}${Object.keys(ruleMap).length}${c.reset} locale(s)`);
  console.log("");
  console.log(`  ${c.bold}Reachable${c.reset} (disk ∪ exports): ${c.bold}${totalReachable}${c.reset}`);
  console.log(`  ${c.green}Fixable${c.reset}   (in map):           ${c.bold}${totalFixable}${c.reset}`);
  console.log(`  ${c.red}Unfixable${c.reset} (reachable, no map): ${c.bold}${unfixable.length}${c.reset}`);
  console.log(`  ${c.yellow}Stale${c.reset}     (in map only):       ${c.bold}${stale.length}${c.reset}`);

  if (!QUIET) {
    console.log("");
    // Width the kebab and camel columns to the longest row so the
    // table aligns regardless of how many locales date-fns ships.
    const kebabW = Math.max(5, ...rows.map((r) => r.kebab.length));
    const camelW = Math.max(8, ...rows.map((r) => r.camel.length));
    const sourcesW = Math.max(7, ...rows.map((r) => r.sources.length));
    const header =
      "  " +
      "kebab".padEnd(kebabW) + "  " +
      "camelCase".padEnd(camelW) + "  " +
      "sources".padEnd(sourcesW) + "  " +
      "fixable";
    console.log(`${c.bold}${header}${c.reset}`);
    console.log(`  ${"─".repeat(kebabW)}  ${"─".repeat(camelW)}  ${"─".repeat(sourcesW)}  ───────`);
    for (const r of rows) {
      const fixMark = r.fixable
        ? `${c.green}✓${c.reset}`
        : `${c.red}✗${c.reset}`;
      // Highlight rows that diverge across sources — those are the
      // ones a reviewer needs to inspect.
      const diverged = (r.onDisk || r.inExports) !== r.inMap;
      const rowColor = diverged ? c.yellow : "";
      console.log(
        `  ${rowColor}${r.kebab.padEnd(kebabW)}${c.reset}  ` +
          `${rowColor}${r.camel.padEnd(camelW)}${c.reset}  ` +
          `${r.sources.padEnd(sourcesW)}  ${fixMark}`,
      );
    }
  }

  if (unfixable.length > 0) {
    console.log("");
    console.log(`${c.red}${c.bold}✗ ${unfixable.length} reachable locale(s) missing from LOCALE_SUBPATHS:${c.reset}`);
    for (const r of unfixable) {
      console.log(
        `  ${c.yellow}•${c.reset} ${r.kebab}  → suggested map entry: ${c.bold}${r.camel}: "${r.kebab}",${c.reset}`,
      );
    }
    console.log("");
    console.log(
      `${c.dim}Fix:${c.reset} add the entries above to ${c.bold}LOCALE_SUBPATHS${c.reset} in` +
        ` ${c.dim}eslint-rules/date-fns-subpath.js${c.reset}.`,
    );
  } else {
    console.log("");
    console.log(`${c.green}✓ Every reachable date-fns locale is fixable.${c.reset}`);
  }

  if (stale.length > 0) {
    console.log("");
    console.log(`${c.yellow}⚠ ${stale.length} stale map entry/entries (kebab not present in date-fns):${c.reset}`);
    for (const r of stale) {
      console.log(`  ${c.yellow}•${c.reset} ${r.camel}: "${r.kebab}"  ${c.dim}— remove or correct${c.reset}`);
    }
  }
}

process.exit(unfixable.length > 0 ? 1 : 0);
