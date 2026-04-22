#!/usr/bin/env node
/**
 * install-report-export.mjs
 *
 * Converts the JSON payload from `scripts/install-report.mjs --json` into
 * either Prometheus textfile-exporter metrics or a single-row CSV artifact
 * suitable for dashboarding (Grafana, Datadog, BigQuery, etc.).
 *
 * Usage:
 *   node scripts/install-report.mjs --json | node scripts/install-report-export.mjs --format=prom
 *   node scripts/install-report.mjs --json | node scripts/install-report-export.mjs --format=csv
 *   node scripts/install-report-export.mjs --format=prom --input=public/install-report.json
 *   node scripts/install-report-export.mjs --format=csv  --output=ci-artifacts/install-report.csv
 *
 * Flags:
 *   --format=prom|csv   Output format (default: prom).
 *   --input=<path>      Read JSON from a file instead of stdin.
 *   --output=<path>     Write to file instead of stdout.
 *   --no-header         CSV only: omit the header row (for appending).
 *
 * Exit codes:
 *   0  success
 *   2  invocation/parse error
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? "true"] : [a, "true"];
  }),
);

const format = (args.format ?? "prom").toLowerCase();
if (!["prom", "csv"].includes(format)) {
  console.error(`[install-report-export] unknown --format=${format} (want prom|csv)`);
  process.exit(2);
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

const raw = args.input
  ? readFileSync(args.input, "utf8")
  : await readStdin();

let report;
try {
  report = JSON.parse(raw);
} catch (e) {
  console.error(`[install-report-export] failed to parse JSON: ${e instanceof Error ? e.message : e}`);
  process.exit(2);
}

const d = report.dateFns ?? {};
const a = report.alignment ?? {};
const b = report.bunLock ?? {};
const generatedAt = report.generatedAt ?? new Date().toISOString();
const generatedAtMs = Date.parse(generatedAt);
const tsMs = Number.isFinite(generatedAtMs) ? generatedAtMs : Date.now();

const bool = (v) => (v === true ? 1 : v === false ? 0 : "");

function escapeProm(v) {
  return String(v ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function renderProm() {
  // Common labels carry the resolved versions so a single PromQL query can
  // pivot on them (e.g. group by locked) without a join against another series.
  const labels = [
    `spec="${escapeProm(d.spec)}"`,
    `locked="${escapeProm(d.locked)}"`,
    `installed="${escapeProm(d.installed)}"`,
    `lock_sha256="${escapeProm(b.sha256)}"`,
  ].join(",");

  const lines = [
    "# HELP install_report_aligned Whether spec, locked, and installed all match (1=yes, 0=no).",
    "# TYPE install_report_aligned gauge",
    `install_report_aligned{${labels}} ${bool(a.aligned)} ${tsMs}`,
    "# HELP install_report_alignment_axis Per-axis alignment booleans (1=match, 0=mismatch).",
    "# TYPE install_report_alignment_axis gauge",
    `install_report_alignment_axis{axis="spec_eq_locked",${labels}} ${bool(a.specEqLocked)} ${tsMs}`,
    `install_report_alignment_axis{axis="locked_eq_installed",${labels}} ${bool(a.lockedEqInstalled)} ${tsMs}`,
    `install_report_alignment_axis{axis="spec_eq_installed",${labels}} ${bool(a.specEqInstalled)} ${tsMs}`,
    "# HELP install_report_date_fns_exact_pinned Whether date-fns spec is an exact pin (no ^/~).",
    "# TYPE install_report_date_fns_exact_pinned gauge",
    `install_report_date_fns_exact_pinned{${labels}} ${bool(d.exactPinned)} ${tsMs}`,
    "# HELP install_report_bun_lock_size_bytes Size of bun.lock in bytes.",
    "# TYPE install_report_bun_lock_size_bytes gauge",
    `install_report_bun_lock_size_bytes{${labels}} ${Number(b.sizeBytes ?? 0)} ${tsMs}`,
    "# HELP install_report_strict_mode Whether the report was generated with --strict (1=yes).",
    "# TYPE install_report_strict_mode gauge",
    `install_report_strict_mode{${labels}} ${bool(report.strict)} ${tsMs}`,
    "# HELP install_report_generated_timestamp_seconds Report generation time as Unix seconds.",
    "# TYPE install_report_generated_timestamp_seconds gauge",
    `install_report_generated_timestamp_seconds{${labels}} ${Math.floor(tsMs / 1000)} ${tsMs}`,
    "",
  ];
  return lines.join("\n");
}

function escapeCsv(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function renderCsv() {
  const cols = [
    "generated_at",
    "datefns_spec",
    "datefns_spec_normalized",
    "datefns_locked",
    "datefns_installed",
    "datefns_exact_pinned",
    "datefns_pkg_sha256",
    "bun_lock_sha256",
    "bun_lock_size_bytes",
    "aligned",
    "spec_eq_locked",
    "locked_eq_installed",
    "spec_eq_installed",
    "strict",
  ];
  const row = [
    generatedAt,
    d.spec,
    d.specNormalized,
    d.locked,
    d.installed,
    bool(d.exactPinned),
    d.pkgSha256,
    b.sha256,
    b.sizeBytes ?? 0,
    bool(a.aligned),
    bool(a.specEqLocked),
    bool(a.lockedEqInstalled),
    bool(a.specEqInstalled),
    bool(report.strict),
  ].map(escapeCsv).join(",");
  const header = cols.join(",");
  return args["no-header"] === "true" ? `${row}\n` : `${header}\n${row}\n`;
}

const output = format === "prom" ? renderProm() : renderCsv();

if (args.output) {
  mkdirSync(dirname(args.output), { recursive: true });
  writeFileSync(args.output, output);
  console.error(`[install-report-export] wrote ${format} → ${args.output}`);
} else {
  process.stdout.write(output);
}
