#!/usr/bin/env node
/**
 * Reads an ESLint JSON report (produced with --fix-dry-run -f json) and
 * prints a developer-friendly summary of what the date-fns autofix WOULD
 * change, plus a per-file unified diff preview. Pure read-only — never
 * writes to source files.
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
