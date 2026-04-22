#!/usr/bin/env node
/**
 * Strict-flag regression guard for CI.
 *
 * Runs `tsc --noEmit -p tsconfig.app.json --<flag>` for each opt-in
 * strict flag NOT yet enabled in tsconfig.app.json, counts the
 * resulting TS diagnostics, and compares the totals to a checked-in
 * baseline (`ci-artifacts/strict-baseline.json`).
 *
 * Modes per flag:
 *   • baseline > 0  → "ratchet" mode: pass while count <= baseline,
 *                     fail if count went UP (regression). New violations
 *                     never sneak in even though the flag is still off
 *                     in tsconfig.
 *   • baseline = 0  → "must-be-zero" mode: any error fails the job.
 *                     This is the signal that the flag is ready to be
 *                     promoted into tsconfig.app.json in the next PR.
 *
 * Flags:
 *   --update   rewrite ci-artifacts/strict-baseline.json with current
 *              counts (use after a cleanup PR drives a count down).
 *              Never run in CI — meant for the contributor's local
 *              workflow.
 *   --json     emit a single machine-readable JSON object instead of
 *              the human report (useful for GHA step summaries).
 *
 * Always exits 1 on any regression or any "must-be-zero" violation;
 * exits 0 otherwise.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, "ci-artifacts", "strict-baseline.json");
const argv = process.argv.slice(2);
const UPDATE = argv.includes("--update");
const JSON_MODE = argv.includes("--json");

if (!existsSync(BASELINE_PATH)) {
  console.error(`✗ Baseline file missing: ${BASELINE_PATH}`);
  process.exit(2);
}
const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
const flags = Object.keys(baseline.flags ?? {});
if (flags.length === 0) {
  console.error("✗ No flags in baseline.flags — nothing to check.");
  process.exit(2);
}

const TSC_LINE_RE = /\((\d+),(\d+)\):\s+error\s+TS\d+:/;

function countErrors(flag) {
  const r = spawnSync(
    "bunx",
    ["tsc", "--noEmit", "-p", "tsconfig.app.json", "--pretty", "false", `--${flag}`],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
  );
  const output = `${r.stdout || ""}${r.stderr || ""}`;
  let count = 0;
  for (const line of output.split("\n")) if (TSC_LINE_RE.test(line)) count += 1;
  return count;
}

const results = [];
for (const flag of flags) {
  const expected = baseline.flags[flag];
  if (!JSON_MODE) process.stdout.write(`▶ ${flag} … `);
  const actual = countErrors(flag);
  let status;
  let message;
  if (expected === 0) {
    if (actual === 0) {
      status = "ok";
      message = "must-be-zero: clean — promote into tsconfig.app.json";
    } else {
      status = "violation";
      message = `must-be-zero: ${actual} error(s) — flag was promoted but errors crept back`;
    }
  } else if (actual > expected) {
    status = "regression";
    message = `ratchet broken: ${actual} > baseline ${expected} (introduced ${actual - expected})`;
  } else if (actual < expected) {
    status = "improvement";
    message = `ratchet improved: ${actual} < baseline ${expected} — run with --update to lower the bar`;
  } else {
    status = "ok";
    message = `ratchet held at ${actual}`;
  }
  results.push({ flag, expected, actual, status, message });
  if (!JSON_MODE) console.log(`actual=${actual} baseline=${expected} → ${status}`);
}

if (UPDATE) {
  const next = { ...baseline, generatedAt: new Date().toISOString(), flags: {} };
  for (const r of results) next.flags[r.flag] = r.actual;
  writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
  console.log(`\n✓ Wrote new baseline → ${BASELINE_PATH}`);
  process.exit(0);
}

const failed = results.filter((r) => r.status === "regression" || r.status === "violation");
const improvements = results.filter((r) => r.status === "improvement");

if (JSON_MODE) {
  process.stdout.write(
    JSON.stringify(
      { generatedAt: new Date().toISOString(), results, failed: failed.length },
      null,
      2,
    ) + "\n",
  );
} else {
  console.log("\n──── Strict baseline summary ────");
  for (const r of results) {
    const icon =
      r.status === "regression" || r.status === "violation"
        ? "✗"
        : r.status === "improvement"
          ? "↓"
          : "✓";
    console.log(`  ${icon} ${r.flag.padEnd(38)} ${r.message}`);
  }
  if (improvements.length > 0) {
    console.log(
      `\n  ${improvements.length} flag(s) improved — lower the baseline with:\n` +
        `    node scripts/check-strict-baseline.mjs --update`,
    );
  }
}

process.exit(failed.length > 0 ? 1 : 0);
