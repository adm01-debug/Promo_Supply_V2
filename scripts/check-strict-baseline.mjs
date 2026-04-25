#!/usr/bin/env node
/**
 * Strict-flag regression guard for CI.
 *
 * Runs `tsc --noEmit -p tsconfig.app.json --<flag>` for each opt-in
 * strict flag listed in `ci-artifacts/strict-baseline.json`, snapshots each
 * diagnostic as an "offender", and fails ONLY when a new offender appears
 * that is not already in the checked-in baseline snapshot.
 *
 * Baseline shape:
 *   {
 *     "flags": { "noUncheckedIndexedAccess": 326 },
 *     "offenders": {
 *       "noUncheckedIndexedAccess": [
 *         { "id": "src/x.ts|TS2532|Object is possibly 'undefined'.", ... }
 *       ]
 *     }
 *   }
 *
 * `flags` remains as a count summary for readability/backwards compatibility.
 * `offenders` is the allowlist. A moved line does NOT become a new offender;
 * identity is file + TS code + normalized first-line message, with duplicate
 * occurrences tracked by multiplicity.
 *
 * Flags:
 *   --update   rewrite the baseline with current counts + offender snapshot.
 *              Never run in CI — use after an intentional cleanup/rebaseline.
 *   --json     emit machine-readable JSON.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, "ci-artifacts", "strict-baseline.json");
const argv = process.argv.slice(2);
const UPDATE = argv.includes("--update");
const JSON_MODE = argv.includes("--json");
const MAX_SAMPLE = 20;

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

const TSC_DIAGNOSTIC_RE = /^(.*?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)$/;

function normalizeMessage(message) {
  return String(message).replace(/\s+/g, " ").trim();
}

function offenderId({ file, code, message }) {
  return `${file}|${code}|${normalizeMessage(message)}`;
}

function normalizeBaselineEntry(entry) {
  if (typeof entry === "string") return { id: entry };
  if (entry?.id) return entry;
  const normalized = {
    file: String(entry?.file ?? ""),
    line: Number(entry?.line ?? 0),
    column: Number(entry?.column ?? 0),
    code: String(entry?.code ?? ""),
    message: normalizeMessage(entry?.message ?? ""),
  };
  return { ...normalized, id: offenderId(normalized) };
}

function countById(offenders) {
  const counts = new Map();
  for (const offender of offenders) {
    counts.set(offender.id, (counts.get(offender.id) ?? 0) + 1);
  }
  return counts;
}

function collectOffenders(flag) {
  const r = spawnSync(
    "bunx",
    ["tsc", "--noEmit", "-p", "tsconfig.app.json", "--pretty", "false", `--${flag}`],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
  );
  const output = `${r.stdout || ""}${r.stderr || ""}`;
  const offenders = [];

  for (const line of output.split("\n")) {
    const match = TSC_DIAGNOSTIC_RE.exec(line.trim());
    if (!match) continue;
    const [, file, lineNumber, columnNumber, code, rawMessage] = match;
    const offender = {
      file,
      line: Number(lineNumber),
      column: Number(columnNumber),
      code,
      message: normalizeMessage(rawMessage),
    };
    offenders.push({ ...offender, id: offenderId(offender) });
  }

  return offenders.sort((a, b) => a.id.localeCompare(b.id) || a.line - b.line || a.column - b.column);
}

function findNewOffenders(actual, allowlisted) {
  const allowCounts = countById(allowlisted);
  const seenActual = new Map();
  const fresh = [];

  for (const offender of actual) {
    const seen = (seenActual.get(offender.id) ?? 0) + 1;
    seenActual.set(offender.id, seen);
    const allowed = allowCounts.get(offender.id) ?? 0;
    if (seen > allowed) fresh.push(offender);
  }

  return fresh;
}

function findResolvedOffenders(actual, allowlisted) {
  const actualCounts = countById(actual);
  const seenBaseline = new Map();
  const resolved = [];

  for (const offender of allowlisted) {
    const seen = (seenBaseline.get(offender.id) ?? 0) + 1;
    seenBaseline.set(offender.id, seen);
    const stillPresent = actualCounts.get(offender.id) ?? 0;
    if (seen > stillPresent) resolved.push(offender);
  }

  return resolved;
}

function baselineCountFor(flag) {
  const value = baseline.flags[flag];
  if (typeof value === "number") return value;
  if (typeof value?.count === "number") return value.count;
  return 0;
}

const results = [];
for (const flag of flags) {
  const expectedCount = baselineCountFor(flag);
  if (!JSON_MODE) process.stdout.write(`▶ ${flag} … `);

  const actualOffenders = collectOffenders(flag);
  const baselineEntries = baseline.offenders?.[flag];
  const allowlistedOffenders = Array.isArray(baselineEntries)
    ? baselineEntries.map(normalizeBaselineEntry)
    : [];

  // Backwards-compatible fallback for old count-only baselines. Once
  // `--update` is run, offender-level comparison becomes authoritative.
  const newOffenders = allowlistedOffenders.length > 0
    ? findNewOffenders(actualOffenders, allowlistedOffenders)
    : actualOffenders.length > expectedCount
      ? actualOffenders.slice(expectedCount)
      : [];
  const resolvedOffenders = allowlistedOffenders.length > 0
    ? findResolvedOffenders(actualOffenders, allowlistedOffenders)
    : [];

  let status = "ok";
  let message = `held: ${actualOffenders.length} offender(s), no new non-allowlisted diagnostics`;
  if (newOffenders.length > 0) {
    status = "regression";
    message = `new offender(s): ${newOffenders.length} non-allowlisted diagnostic(s)`;
  } else if (resolvedOffenders.length > 0 || actualOffenders.length < expectedCount) {
    status = "improvement";
    message = `improved: ${resolvedOffenders.length || expectedCount - actualOffenders.length} allowlisted offender(s) resolved — run --update`;
  } else if (actualOffenders.length === 0) {
    message = "clean — promote this flag into tsconfig.app.json";
  }

  const result = {
    flag,
    expected: expectedCount,
    actual: actualOffenders.length,
    status,
    message,
    newOffenders: newOffenders.length,
    resolvedOffenders: resolvedOffenders.length,
    samples: newOffenders.slice(0, MAX_SAMPLE),
  };
  results.push(result);

  if (!JSON_MODE) {
    console.log(`actual=${result.actual} baseline=${result.expected} → ${status}`);
  }
}

if (UPDATE) {
  const next = {
    ...baseline,
    generatedAt: new Date().toISOString(),
    flags: {},
    offenders: {},
  };

  for (const flag of flags) {
    const offenders = collectOffenders(flag);
    next.flags[flag] = offenders.length;
    next.offenders[flag] = offenders;
  }

  writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
  console.log(`\n✓ Wrote offender baseline → ${BASELINE_PATH}`);
  process.exit(0);
}

const failed = results.filter((r) => r.status === "regression");
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
  console.log("\n──── Strict offender baseline summary ────");
  for (const r of results) {
    const icon = r.status === "regression" ? "✗" : r.status === "improvement" ? "↓" : "✓";
    console.log(`  ${icon} ${r.flag.padEnd(38)} ${r.message}`);
    for (const offender of r.samples) {
      console.log(`      ${offender.file}:${offender.line}:${offender.column} ${offender.code} ${offender.message}`);
    }
  }
  if (improvements.length > 0) {
    console.log(
      `\n  ${improvements.length} flag(s) improved — refresh the offender allowlist with:\n` +
        `    node scripts/check-strict-baseline.mjs --update`,
    );
  }
}

process.exit(failed.length > 0 ? 1 : 0);
