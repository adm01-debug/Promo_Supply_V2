#!/usr/bin/env node
/**
 * Reads an ESLint JSON report (produced with --fix-dry-run -f json) and
 * prints a developer-friendly summary of what the date-fns autofix WOULD
 * change, plus a per-file unified diff preview AND a per-import
 * "what each `date-fns/locale*` line becomes" table. Pure read-only —
 * never writes to source files.
 *
 * Usage: node scripts/lib/datefns-dryrun-report.mjs <report.json>
 */
import fs from "node:fs";
import path from "node:path";

const reportPath = process.argv[2];
if (!reportPath) {
  console.error("Usage: datefns-dryrun-report.mjs <report.json>");
  process.exit(2);
}

const isTTY = process.stdout.isTTY && !process.env.NO_COLOR;
const c = isTTY
  ? {
      bold: "\x1b[1m",
      dim: "\x1b[2m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      red: "\x1b[31m",
      cyan: "\x1b[36m",
      reset: "\x1b[0m",
    }
  : { bold: "", dim: "", green: "", yellow: "", red: "", cyan: "", reset: "" };

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch (e) {
  console.error("Failed to parse ESLint JSON report:", e.message);
  process.exit(1);
}

// In `--fix-dry-run`, ESLint sets `output` on results that WOULD be rewritten.
const fixable = report.filter((r) => typeof r.output === "string");
const unfixableOnly = report.filter(
  (r) =>
    r.output == null && (r.errorCount || 0) + (r.warningCount || 0) > 0,
);

const cwd = process.cwd();
const rel = (p) => path.relative(cwd, p) || p;

if (fixable.length === 0 && unfixableOnly.length === 0) {
  console.log(
    `${c.green}✓ No date-fns issues found. Nothing would change.${c.reset}`,
  );
  process.exit(0);
}

console.log(`${c.bold}▶ Dry-run summary${c.reset}`);
console.log(
  `  Files that ${c.green}would be rewritten${c.reset}: ${c.bold}${fixable.length}${c.reset}`,
);
console.log(
  `  Files with ${c.yellow}unfixable problems only${c.reset}: ${c.bold}${unfixableOnly.length}${c.reset}`,
);
console.log("");

// ─── Locale-import detail extraction ────────────────────────────────────────
// camelCase → kebab subpath, mirrors the map in eslint-rules/date-fns-subpath.js.
// Kept inline so the report has zero runtime coupling to the rule module —
// when the rule's map is updated, regenerate this list with:
//   node -e 'import("./eslint-rules/date-fns-subpath.js").then(m=>console.log(m))'
// The report only NEEDS the kebab mapping for reverse-lookup display; if a
// locale is missing here it just shows up without a "→ subpath" hint, never
// crashes.
const LOCALE_KEBAB = {
  af: "af", ar: "ar", arDZ: "ar-DZ", arEG: "ar-EG", arMA: "ar-MA",
  arSA: "ar-SA", arTN: "ar-TN", az: "az", be: "be", beTarask: "be-tarask",
  bg: "bg", bn: "bn", bs: "bs", ca: "ca", ckb: "ckb", cs: "cs", cy: "cy",
  da: "da", de: "de", deAT: "de-AT", el: "el", enAU: "en-AU", enCA: "en-CA",
  enGB: "en-GB", enIE: "en-IE", enIN: "en-IN", enNZ: "en-NZ", enUS: "en-US",
  enZA: "en-ZA", eo: "eo", es: "es", et: "et", eu: "eu", faIR: "fa-IR",
  fi: "fi", fr: "fr", frCA: "fr-CA", frCH: "fr-CH", fy: "fy", gd: "gd",
  gl: "gl", gu: "gu", he: "he", hi: "hi", hr: "hr", ht: "ht", hu: "hu",
  hy: "hy", id: "id", is: "is", it: "it", itCH: "it-CH", ja: "ja",
  jaHira: "ja-Hira", ka: "ka", kk: "kk", km: "km", kn: "kn", ko: "ko",
  lb: "lb", lt: "lt", lv: "lv", mk: "mk", mn: "mn", ms: "ms", mt: "mt",
  nb: "nb", nl: "nl", nlBE: "nl-BE", nn: "nn", oc: "oc", pl: "pl", pt: "pt",
  ptBR: "pt-BR", ro: "ro", ru: "ru", se: "se", sk: "sk", sl: "sl", sq: "sq",
  sr: "sr", srLatn: "sr-Latn", sv: "sv", ta: "ta", te: "te", th: "th",
  tr: "tr", ug: "ug", uk: "uk", uz: "uz", uzCyrl: "uz-Cyrl", vi: "vi",
  zhCN: "zh-CN", zhHK: "zh-HK", zhTW: "zh-TW",
};

/**
 * Parse the named specifiers out of the brace list of a flat
 * `import { … } from "date-fns/locale";` line. Tolerates `as` aliases,
 * inline `type` modifiers, and arbitrary whitespace. Returns an array
 * of `{ imported, local, isType }`. Returns `null` when the line
 * doesn't match the single-line locale-barrel shape — multi-line
 * imports fall back to the unified diff above.
 */
function parseLocaleBarrelLine(line) {
  const m = line.match(
    /^\s*import\s+(type\s+)?\{\s*([^}]*)\s*\}\s+from\s+["']date-fns\/locale["']\s*;?\s*$/,
  );
  if (!m) return null;
  const isDeclType = Boolean(m[1]);
  const specs = m[2]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      // Inline `type Foo` / `type Foo as Bar`.
      let isType = isDeclType;
      let body = raw;
      if (/^type\s+/.test(body)) {
        isType = true;
        body = body.replace(/^type\s+/, "");
      }
      const aliasMatch = body.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      if (aliasMatch) {
        return { imported: aliasMatch[1], local: aliasMatch[2], isType };
      }
      const idMatch = body.match(/^([A-Za-z_$][\w$]*)$/);
      if (!idMatch) return null;
      return { imported: idMatch[1], local: idMatch[1], isType };
    });
  if (specs.some((s) => s == null)) return null;
  return { isDeclType, specs };
}

/**
 * Build the canonical per-specifier rewrite line(s) for one locale-barrel
 * import. Mirrors the rule's autofix logic so the report can show
 * exactly what each specifier becomes — including which ones the rule
 * intentionally cannot fix (unknown locale identifier).
 */
function rewriteLocaleBarrel(parsed) {
  const out = [];
  for (const spec of parsed.specs) {
    const subpath = LOCALE_KEBAB[spec.imported];
    const namePart =
      spec.imported === spec.local
        ? spec.imported
        : `${spec.imported} as ${spec.local}`;
    const typePrefix = parsed.isDeclType
      ? "type "
      : spec.isType
        ? "type "
        : "";
    if (!subpath) {
      out.push({
        fixable: false,
        reason: `unknown locale "${spec.imported}" (not in built-in subpath map)`,
        before: `import ${parsed.isDeclType ? "type " : ""}{ ${namePart} } from "date-fns/locale";`,
        after: null,
      });
      continue;
    }
    out.push({
      fixable: true,
      reason: null,
      before: `import ${parsed.isDeclType ? "type " : ""}{ ${namePart} } from "date-fns/locale";`,
      after: `import ${typePrefix}{ ${namePart} } from "date-fns/locale/${subpath}";`,
    });
  }
  return out;
}

/**
 * Walk every file in the report, find its `date-fns/locale` (barrel) and
 * `date-fns/locale/<subpath>` (already-fixed-or-typo) imports, and emit
 * a single flat list of per-import rewrite rows.
 */
function collectLocaleImportRewrites(allResults) {
  const rows = [];
  for (const r of allResults) {
    const localeMessages = (r.messages || []).filter(
      (m) =>
        m.ruleId === "local/date-fns-subpath" &&
        typeof m.line === "number",
    );
    if (localeMessages.length === 0) continue;

    let lines;
    try {
      lines = fs.readFileSync(r.filePath, "utf8").split("\n");
    } catch {
      continue;
    }

    for (const m of localeMessages) {
      const srcLine = lines[m.line - 1] ?? "";
      // Only emit per-locale rows for actual locale-related imports.
      // Function-subpath barrels are handled by the unified diff section.
      if (!/date-fns\/locale/.test(srcLine)) continue;

      const parsed = parseLocaleBarrelLine(srcLine);
      if (parsed) {
        for (const rw of rewriteLocaleBarrel(parsed)) {
          rows.push({
            file: r.filePath,
            line: m.line,
            ...rw,
          });
        }
      } else {
        // Multi-line locale barrel, or some other shape (e.g. typo
        // path `date-fns/locale/ptbr`). Surface it as unfixable with
        // the rule's own message — the autofix may still apply at the
        // file level (covered by the diff above), but we can't show
        // a clean before/after one-liner.
        rows.push({
          file: r.filePath,
          line: m.line,
          fixable: typeof r.output === "string",
          reason:
            "multi-line import or non-canonical shape — see file diff above",
          before: srcLine.trim(),
          after: null,
        });
      }
    }
  }
  return rows;
}

/**
 * Minimal line-by-line unified diff. Sufficient for date-fns rewrites,
 * which only mutate contiguous import lines at the top of files.
 */
function unifiedDiff(before, after, file) {
  const a = before.split("\n");
  const b = after.split("\n");
  const out = [
    `${c.cyan}--- ${file}${c.reset}`,
    `${c.cyan}+++ ${file} (autofixed)${c.reset}`,
  ];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    let si = i;
    let sj = j;
    while (si < a.length && !b.slice(j).includes(a[si])) si++;
    while (sj < b.length && !a.slice(i).includes(b[sj])) sj++;
    for (let k = i; k < si; k++) out.push(`${c.red}- ${a[k]}${c.reset}`);
    for (let k = j; k < sj; k++) out.push(`${c.green}+ ${b[k]}${c.reset}`);
    if (si === i && sj === j) break;
    i = si;
    j = sj;
  }
  return out.join("\n");
}

if (fixable.length > 0) {
  console.log(`${c.bold}── Would rewrite ──${c.reset}`);
  for (const r of fixable) {
    let before;
    try {
      before = fs.readFileSync(r.filePath, "utf8");
    } catch {
      console.log(
        `${c.yellow}  (could not read ${rel(r.filePath)} for diff)${c.reset}`,
      );
      continue;
    }
    console.log("");
    console.log(unifiedDiff(before, r.output, rel(r.filePath)));
  }
}

// ── Per-locale-import rewrite table ─────────────────────────────────────────
// Computed across BOTH `fixable` and `unfixableOnly` so users see the full
// picture of every offending locale line, including ones the rule chose
// not to autofix (unknown locale identifier, multi-line shape, etc.).
const localeRows = collectLocaleImportRewrites([...fixable, ...unfixableOnly]);
if (localeRows.length > 0) {
  console.log("");
  console.log(`${c.bold}── Locale imports — per-line rewrite ──${c.reset}`);
  const fixableCount = localeRows.filter((r) => r.fixable).length;
  const unfixableCount = localeRows.length - fixableCount;
  console.log(
    `  ${c.green}fixable${c.reset}: ${c.bold}${fixableCount}${c.reset}   ${c.yellow}unfixable${c.reset}: ${c.bold}${unfixableCount}${c.reset}`,
  );
  for (const row of localeRows) {
    const tag = row.fixable
      ? `${c.green}[fixable]${c.reset}`
      : `${c.yellow}[unfixable]${c.reset}`;
    console.log("");
    console.log(`  ${tag} ${c.dim}${rel(row.file)}:${row.line}${c.reset}`);
    console.log(`    ${c.red}-${c.reset} ${row.before}`);
    if (row.after) {
      console.log(`    ${c.green}+${c.reset} ${row.after}`);
    } else {
      console.log(
        `    ${c.dim}(no autofix — ${row.reason ?? "manual edit required"})${c.reset}`,
      );
    }
  }
}

if (unfixableOnly.length > 0) {
  console.log("");
  console.log(`${c.bold}── Unfixable (manual edit required) ──${c.reset}`);
  for (const r of unfixableOnly) {
    console.log(`  ${c.yellow}•${c.reset} ${rel(r.filePath)}`);
    for (const m of r.messages || []) {
      if (m.ruleId !== "local/date-fns-subpath") continue;
      console.log(
        `    ${c.dim}line ${m.line}:${m.column}${c.reset} ${m.message}`,
      );
    }
  }
}

console.log("");
console.log(
  `${c.dim}Re-run without --dry-run to apply these changes.${c.reset}`,
);
