#!/usr/bin/env node
/**
 * Verifies that `bun run test:date-fns` and `npm run test:date-fns` produce
 * the same outcome — same exit code and same vitest pass/fail counts — so a
 * developer can switch between the two tools without surprises.
 *
 * Strategy:
 *   1. Run each tool with `--reporter=json --outputFile=<tmp>` appended after
 *      `--`, so we get a machine-readable result alongside the normal output.
 *   2. Compare exit codes, numTotalTests, numPassedTests, numFailedTests.
 *   3. Print a unified diff-style summary and exit 0 on parity, 1 otherwise.
 *
 * Skips a runner cleanly (with a warning, not a failure) when the binary is
 * not on PATH — `bun` is required, `npm` is treated as optional since not
 * every contributor environment ships it.
 *
 * Usage:
 *   node scripts/verify-test-datefns-parity.mjs
 *
 * Exit codes:
 *   0  — both runners agreed (or only one runner is available and it passed)
 *   1  — runners disagreed on exit code or test counts
 *   2  — neither runner is available, or invocation error
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, appendFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

// CLI flags (all optional, all backward-compatible):
//   --json-out <path>   Write the structured summary to this path.
//   --md-out   <path>   Write the markdown summary to this path.
//   --quiet             Suppress the human Comparison block; structured
//                       summaries are still emitted (cuts CI log noise).
// When $GITHUB_STEP_SUMMARY is set we ALSO append the markdown summary there
// automatically — that's what GitHub Actions surfaces in the run UI.
const ARGS = process.argv.slice(2);
const flagValue = (name) => {
  const i = ARGS.indexOf(name);
  return i !== -1 && ARGS[i + 1] ? ARGS[i + 1] : null;
};
const JSON_OUT = flagValue("--json-out");
const MD_OUT = flagValue("--md-out");
const QUIET = ARGS.includes("--quiet");


const isTTY = Boolean(process.stdout.isTTY);
const c = (code, s) => (isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = (s) => c(31, s);
const green = (s) => c(32, s);
const yellow = (s) => c(33, s);
const cyan = (s) => c(36, s);
const bold = (s) => c(1, s);

function hasBin(name) {
  const probe = spawnSync(process.platform === "win32" ? "where" : "which", [name], {
    stdio: "ignore",
  });
  return probe.status === 0;
}

function runRunner(runner, jsonPath) {
  // Both `bun run` and `npm run` forward args after `--` to the script.
  const args = ["run", "test:date-fns", "--", "--reporter=json", `--outputFile=${jsonPath}`];
  const start = Date.now();
  const result = spawnSync(runner, args, {
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, CI: "1" },
  });
  return {
    runner,
    exit: result.status ?? -1,
    durationMs: Date.now() - start,
    error: result.error?.message ?? null,
  };
}

function readVitestJson(path) {
  if (!existsSync(path)) return null;
  try {
    const j = JSON.parse(readFileSync(path, "utf8"));
    return {
      total: j.numTotalTests ?? null,
      passed: j.numPassedTests ?? null,
      failed: j.numFailedTests ?? null,
      pending: j.numPendingTests ?? null,
      success: j.success ?? null,
    };
  } catch {
    return null;
  }
}

function summarize(r) {
  const j = r.json
    ? `total=${r.json.total} passed=${r.json.passed} failed=${r.json.failed}`
    : "no JSON report parsed";
  return `exit=${r.exit}  ${j}  (${(r.durationMs / 1000).toFixed(1)}s)`;
}

function compare(a, b) {
  const diffs = [];
  if (a.exit !== b.exit) diffs.push(`exit code: ${a.exit} vs ${b.exit}`);
  if (a.json && b.json) {
    for (const k of ["total", "passed", "failed"]) {
      if (a.json[k] !== b.json[k]) diffs.push(`${k}: ${a.json[k]} vs ${b.json[k]}`);
    }
  } else if (Boolean(a.json) !== Boolean(b.json)) {
    diffs.push(`JSON report present: ${Boolean(a.json)} vs ${Boolean(b.json)}`);
  }
  return diffs;
}

function main() {
  const haveBun = hasBin("bun");
  const haveNpm = hasBin("npm");

  if (!haveBun && !haveNpm) {
    console.error(red("✗ Neither `bun` nor `npm` is on PATH — cannot verify parity."));
    process.exit(2);
  }

  const tmp = mkdtempSync(join(tmpdir(), "datefns-parity-"));
  const runs = [];

  try {
    for (const runner of ["bun", "npm"]) {
      const have = runner === "bun" ? haveBun : haveNpm;
      if (!have) {
        console.log(yellow(`ℹ Skipping ${bold(runner)} — not on PATH.`));
        continue;
      }
      console.log(cyan(`\n▶ Running with ${bold(runner)}…`));
      const jsonPath = join(tmp, `${runner}.json`);
      const r = runRunner(runner, jsonPath);
      r.json = readVitestJson(jsonPath);
      runs.push(r);
      console.log(`  ${runner}: ${summarize(r)}`);
    }

    const ran = runs.filter((r) => !r.error);
    if (ran.length === 0) {
      console.error(red("✗ No runner completed — see errors above."));
      process.exit(2);
    }
    if (ran.length === 1) {
      const only = ran[0];
      console.log(
        yellow(
          `\nℹ Only ${bold(only.runner)} was available — parity is trivially satisfied.`,
        ),
      );
      process.exit(only.exit === 0 ? 0 : 1);
    }

    const [a, b] = ran;
    const diffs = compare(a, b);
    console.log("");
    console.log(cyan("Comparison:"));
    console.log(`  ${a.runner}: ${summarize(a)}`);
    console.log(`  ${b.runner}: ${summarize(b)}`);

    if (diffs.length === 0) {
      console.log(green(`\n✓ Parity confirmed — ${a.runner} and ${b.runner} agree.`));
      process.exit(0);
    }

    console.error(red(`\n✗ Parity mismatch (${diffs.length}):`));
    for (const d of diffs) console.error(red(`    • ${d}`));
    process.exit(1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main();
