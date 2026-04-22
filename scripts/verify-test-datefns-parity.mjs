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
// Split argv on the first literal `--`: everything before is parsed as our
// own flags, everything after is forwarded VERBATIM to both `bun run
// test:date-fns` and `npm run test:date-fns`. That lets callers do things
// like `bun run test:date-fns:parity -- -t format --reporter=verbose` to
// scope parity to a subset of tests. Forwarding to BOTH runners is the
// whole point — if we passed flags to only one, the comparison would be
// meaningless.
const ARGS = process.argv.slice(2);
const dashDashIdx = ARGS.indexOf("--");
const OWN_ARGS = dashDashIdx === -1 ? ARGS : ARGS.slice(0, dashDashIdx);
const FORWARDED_ARGS = dashDashIdx === -1 ? [] : ARGS.slice(dashDashIdx + 1);
const flagValue = (name) => {
  const i = OWN_ARGS.indexOf(name);
  return i !== -1 && OWN_ARGS[i + 1] ? OWN_ARGS[i + 1] : null;
};
const JSON_OUT = flagValue("--json-out");
const MD_OUT = flagValue("--md-out");
const QUIET = OWN_ARGS.includes("--quiet");



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
  // FORWARDED_ARGS go LAST so they can override our --reporter/--outputFile
  // if the caller really wants to (rare, but supported — vitest takes the
  // last value for repeated flags).
  const args = [
    "run",
    "test:date-fns",
    "--",
    "--reporter=json",
    `--outputFile=${jsonPath}`,
    ...FORWARDED_ARGS,
  ];

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
    // Walk testResults[].assertionResults[] (vitest's JSON reporter shape)
    // to extract a deterministic list of FAILED test identities. We use
    // `<file>::<full ancestor path > test name>` as the identity so a
    // failure that exists in one runner but not the other is unambiguous —
    // count-only comparisons miss the case where bun fails test A and npm
    // fails a DIFFERENT test B (same totals, different reality).
    const failedTests = [];
    for (const file of Array.isArray(j.testResults) ? j.testResults : []) {
      const fileName = file.name ?? file.testFilePath ?? "<unknown-file>";
      for (const a of Array.isArray(file.assertionResults) ? file.assertionResults : []) {
        if (a.status === "failed") {
          const ancestors = Array.isArray(a.ancestorTitles) ? a.ancestorTitles : [];
          const title = a.fullName ?? [...ancestors, a.title].filter(Boolean).join(" > ");
          failedTests.push(`${fileName}::${title}`);
        }
      }
    }
    failedTests.sort();
    return {
      total: j.numTotalTests ?? null,
      passed: j.numPassedTests ?? null,
      failed: j.numFailedTests ?? null,
      pending: j.numPendingTests ?? null,
      success: j.success ?? null,
      failedTests,
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

// ── Structured summary builders ─────────────────────────────────────────────
// Both `buildSummary` and the renderers below are deliberately pure: they
// take the run results + verdict, and return data/strings. That keeps the
// JSON / markdown outputs identical regardless of WHERE they're consumed
// (stdout, file, $GITHUB_STEP_SUMMARY).
function runShape(r) {
  return {
    runner: r.runner,
    exit: r.exit,
    durationMs: r.durationMs,
    error: r.error ?? null,
    tests: r.json
      ? {
          total: r.json.total,
          passed: r.json.passed,
          failed: r.json.failed,
          pending: r.json.pending ?? null,
          success: r.json.success ?? null,
        }
      : null,
  };
}

function buildSummary({ runs, diffs, status, exitCode, reason }) {
  return {
    schema: "datefns-parity/v1",
    generatedAt: new Date().toISOString(),
    status, // "pass" | "mismatch" | "single-runner" | "error"
    exitCode,
    reason: reason ?? null,
    // Forwarded args are part of the run's identity — without them a reader
    // can't tell whether `total: 4` means "all tests" or "just -t format".
    forwardedArgs: FORWARDED_ARGS,
    runners: runs.map(runShape),
    diffCount: diffs.length,
    diffs, // [] when status === "pass"
  };
}

function renderMarkdown(s) {
  const icon =
    s.status === "pass" ? "✅" : s.status === "single-runner" ? "ℹ️" : s.status === "error" ? "🛑" : "❌";
  const lines = [];
  lines.push(`### ${icon} date-fns parity (\`test:date-fns:parity\`)`);
  lines.push("");
  lines.push(`**Status:** \`${s.status}\` &nbsp; **Exit:** \`${s.exitCode}\` &nbsp; **Diffs:** \`${s.diffCount}\``);
  if (s.reason) lines.push(`**Reason:** ${s.reason}`);
  if (s.forwardedArgs && s.forwardedArgs.length > 0) {
    lines.push(`**Forwarded args:** \`${s.forwardedArgs.join(" ")}\``);
  }
  lines.push("");
  if (s.runners.length > 0) {
    lines.push("| Runner | Exit | Total | Passed | Failed | Pending | Duration |");
    lines.push("| ------ | ---: | ----: | -----: | -----: | ------: | -------: |");
    for (const r of s.runners) {
      const t = r.tests ?? { total: "—", passed: "—", failed: "—", pending: "—" };
      lines.push(
        `| \`${r.runner}\` | ${r.exit} | ${t.total ?? "—"} | ${t.passed ?? "—"} | ${t.failed ?? "—"} | ${t.pending ?? "—"} | ${(r.durationMs / 1000).toFixed(1)}s |`,
      );
    }
    lines.push("");
  }
  if (s.diffs.length > 0) {
    lines.push("**Mismatches:**");
    for (const d of s.diffs) lines.push(`- ${d}`);
    lines.push("");
  }
  return lines.join("\n");
}

function emitSummary(summary) {
  // 1. Always print the structured blocks to stdout — searchable in CI logs.
  console.log("");
  console.log("──── parity summary (json) ────");
  console.log(JSON.stringify(summary, null, 2));
  console.log("──── parity summary (md) ────");
  const md = renderMarkdown(summary);
  console.log(md);

  // 2. Optional file outputs.
  const writeTo = (path, body) => {
    const abs = resolve(path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body, "utf8");
    console.log(cyan(`▶ Wrote ${path}`));
  };
  if (JSON_OUT) writeTo(JSON_OUT, JSON.stringify(summary, null, 2) + "\n");
  if (MD_OUT) writeTo(MD_OUT, md + "\n");

  // 3. GitHub Actions integration: the markdown lands in the run summary UI
  //    automatically. Append (don't overwrite) so we coexist with prior steps.
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n", "utf8");
    } catch {
      // best-effort — never fail the parity check because the summary file
      // wasn't writable.
    }
  }
}

function main() {
  const haveBun = hasBin("bun");
  const haveNpm = hasBin("npm");

  if (!haveBun && !haveNpm) {
    console.error(red("✗ Neither `bun` nor `npm` is on PATH — cannot verify parity."));
    emitSummary(buildSummary({
      runs: [], diffs: [], status: "error", exitCode: 2,
      reason: "Neither `bun` nor `npm` is on PATH.",
    }));
    process.exit(2);
  }

  if (FORWARDED_ARGS.length > 0) {
    console.log(cyan(`▶ Forwarding to vitest in BOTH runners: ${bold(FORWARDED_ARGS.join(" "))}`));
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
      emitSummary(buildSummary({
        runs, diffs: [], status: "error", exitCode: 2,
        reason: "No runner completed successfully.",
      }));
      process.exit(2);
    }
    if (ran.length === 1) {
      const only = ran[0];
      const exitCode = only.exit === 0 ? 0 : 1;
      console.log(
        yellow(`\nℹ Only ${bold(only.runner)} was available — parity is trivially satisfied.`),
      );
      emitSummary(buildSummary({
        runs: ran, diffs: [], status: "single-runner", exitCode,
        reason: `Only \`${only.runner}\` was available on PATH.`,
      }));
      process.exit(exitCode);
    }

    const [a, b] = ran;
    const diffs = compare(a, b);
    if (!QUIET) {
      console.log("");
      console.log(cyan("Comparison:"));
      console.log(`  ${a.runner}: ${summarize(a)}`);
      console.log(`  ${b.runner}: ${summarize(b)}`);
    }

    if (diffs.length === 0) {
      console.log(green(`\n✓ Parity confirmed — ${a.runner} and ${b.runner} agree.`));
      emitSummary(buildSummary({ runs: ran, diffs, status: "pass", exitCode: 0 }));
      process.exit(0);
    }

    console.error(red(`\n✗ Parity mismatch (${diffs.length}):`));
    for (const d of diffs) console.error(red(`    • ${d}`));
    emitSummary(buildSummary({
      runs: ran, diffs, status: "mismatch", exitCode: 1,
      reason: `${diffs.length} difference(s) between runners.`,
    }));
    process.exit(1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main();

