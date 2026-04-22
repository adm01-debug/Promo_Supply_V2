#!/usr/bin/env node
/**
 * Generate a per-flag impact report for the TypeScript strict-family
 * settings that are NOT yet enabled in tsconfig.app.json. For each
 * candidate flag we run `tsc --noEmit -p tsconfig.app.json --<flag>` in
 * isolation, parse the diagnostics, and aggregate them three ways:
 *
 *   1. Totals per flag (overall blast radius).
 *   2. Per error code within each flag (which TS rule fires most).
 *   3. Per file within each flag (which files are hot-spots).
 *
 * Outputs:
 *   - Human-readable Markdown → /mnt/documents/strict-impact-report.md
 *   - Flat CSV (one row per diagnostic) → /mnt/documents/strict-impact-report.csv
 *   - Stdout summary so the run is greppable in a terminal too.
 *
 * Always exits 0 — this is a planning report, not a gate.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = "/mnt/documents";
const MD_PATH = `${OUT_DIR}/strict-impact-report.md`;
const CSV_PATH = `${OUT_DIR}/strict-impact-report.csv`;

// Flags currently OFF in tsconfig.app.json (verified manually). Add new
// ones here as TypeScript ships them; the script auto-detects "no errors"
// vs "many errors" so adding a flag that's already a no-op is safe.
const CANDIDATE_FLAGS = [
  "noPropertyAccessFromIndexSignature",
  "exactOptionalPropertyTypes",
  "noUncheckedIndexedAccess",
];

// `<file>(<line>,<col>): error TS<code>: <message>`
// Captures: 1=file 2=line 3=col 4=code 5=message
const TSC_LINE_RE = /^(.+?)\((\d+),(\d+)\):\s+error\s+TS(\d+):\s+(.+)$/;

function runTsc(extraFlag) {
  // `--pretty false` → grep-friendly, no ANSI, one diagnostic per line.
  const r = spawnSync(
    "bunx",
    ["tsc", "--noEmit", "-p", "tsconfig.app.json", "--pretty", "false", `--${extraFlag}`],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
  );
  return `${r.stdout || ""}${r.stderr || ""}`;
}

function parseDiagnostics(output, flag) {
  const rows = [];
  for (const line of output.split("\n")) {
    const m = line.match(TSC_LINE_RE);
    if (!m) continue;
    const [, file, lineNo, col, code, message] = m;
    rows.push({
      flag,
      file: file.replace(`${ROOT}/`, ""), // strip absolute prefix if present
      line: Number(lineNo),
      col: Number(col),
      code: `TS${code}`,
      message: message.trim(),
    });
  }
  return rows;
}

function groupBy(rows, key) {
  const out = new Map();
  for (const r of rows) {
    const k = typeof key === "function" ? key(r) : r[key];
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]);
}

function csvEscape(v) {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function renderMarkdown(perFlag) {
  const lines = [];
  lines.push(`# TypeScript strict-flag impact report`);
  lines.push("");
  lines.push(`Generated: \`${new Date().toISOString()}\``);
  lines.push("");
  lines.push(
    `Each section below shows what would happen if the flag were enabled in` +
      ` \`tsconfig.app.json\` **on top of the current strict settings**.` +
      ` Flag isolation matters: enabling two flags together can produce a different` +
      ` (usually larger) error set than the sum of their individual runs.`,
  );
  lines.push("");

  // Top-level summary table.
  lines.push("## Blast radius summary");
  lines.push("");
  lines.push("| Flag | Errors | Files affected | Distinct error codes |");
  lines.push("|---|---:|---:|---:|");
  for (const { flag, rows } of perFlag) {
    const files = new Set(rows.map((r) => r.file)).size;
    const codes = new Set(rows.map((r) => r.code)).size;
    lines.push(`| \`${flag}\` | ${rows.length} | ${files} | ${codes} |`);
  }
  lines.push("");

  for (const { flag, rows } of perFlag) {
    lines.push(`## \`${flag}\` — ${rows.length} error(s)`);
    lines.push("");

    if (rows.length === 0) {
      lines.push("> ✅ No errors — flag can be enabled without code changes.");
      lines.push("");
      continue;
    }

    // Per error code.
    lines.push(`### Errors by code`);
    lines.push("");
    lines.push("| Code | Count | Sample message |");
    lines.push("|---|---:|---|");
    const byCode = new Map();
    for (const r of rows) {
      if (!byCode.has(r.code)) byCode.set(r.code, { count: 0, sample: r.message });
      byCode.get(r.code).count += 1;
    }
    const sortedCodes = [...byCode.entries()].sort((a, b) => b[1].count - a[1].count);
    for (const [code, { count, sample }] of sortedCodes) {
      const trimmed = sample.length > 110 ? `${sample.slice(0, 107)}…` : sample;
      lines.push(`| \`${code}\` | ${count} | ${trimmed.replace(/\|/g, "\\|")} |`);
    }
    lines.push("");

    // Per file (top 25 hot-spots).
    lines.push(`### Files affected (top 25)`);
    lines.push("");
    lines.push("| File | Errors |");
    lines.push("|---|---:|");
    const byFile = groupBy(rows, "file");
    for (const [file, count] of byFile.slice(0, 25)) {
      lines.push(`| \`${file}\` | ${count} |`);
    }
    if (byFile.length > 25) {
      lines.push(`| _… and ${byFile.length - 25} more file(s)_ | |`);
    }
    lines.push("");
  }

  return lines.join("\n") + "\n";
}

function renderCsv(perFlag) {
  const header = "flag,file,line,col,code,message";
  const body = perFlag
    .flatMap(({ rows }) => rows)
    .map((r) =>
      [r.flag, r.file, r.line, r.col, r.code, r.message].map(csvEscape).join(","),
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

function main() {
  console.log(`▶ Strict-flag impact report — ${CANDIDATE_FLAGS.length} flag(s) to probe.`);
  const perFlag = [];

  for (const flag of CANDIDATE_FLAGS) {
    process.stdout.write(`  · ${flag} … `);
    const output = runTsc(flag);
    const rows = parseDiagnostics(output, flag);
    perFlag.push({ flag, rows });
    const files = new Set(rows.map((r) => r.file)).size;
    const codes = new Set(rows.map((r) => r.code)).size;
    console.log(`${rows.length} error(s) across ${files} file(s), ${codes} distinct code(s)`);
  }

  mkdirSync(dirname(MD_PATH), { recursive: true });
  writeFileSync(MD_PATH, renderMarkdown(perFlag), "utf8");
  writeFileSync(CSV_PATH, renderCsv(perFlag), "utf8");

  console.log("");
  console.log(`✓ Markdown report → ${MD_PATH}`);
  console.log(`✓ CSV (one row per diagnostic) → ${CSV_PATH}`);
}

main();
