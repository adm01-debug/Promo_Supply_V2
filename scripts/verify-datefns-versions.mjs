#!/usr/bin/env node
/**
 * One-shot gate: verifies date-fns is aligned across
 *   - package.json spec
 *   - bun.lock resolved version
 *   - node_modules installed version
 *
 * Exit codes (CI can branch on these):
 *    0  aligned
 *   10  spec drifted from lock+installed   (package.json edited, not relocked)
 *   11  node_modules drifted from spec+lock (stale / hand-mutated install)
 *   12  lockfile drifted from spec+installed (lock stale or corrupt)
 *   13  all three sources differ           (full corruption)
 *   20  date-fns missing from package.json
 *   21  bun.lock missing
 *   22  date-fns entry not found in bun.lock
 *   23  date-fns not installed in node_modules
 *    1  unexpected / generic failure
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  resolveLockedVersion,
  RESOLVER_PATTERN_NAMES,
} from "./lib/resolve-locked-version.mjs";

const EXIT = {
  OK: 0,
  SPEC_DRIFT: 10,
  INSTALLED_DRIFT: 11,
  LOCK_DRIFT: 12,
  ALL_DIFFER: 13,
  MISSING_SPEC: 20,
  MISSING_LOCK: 21,
  MISSING_LOCK_ENTRY: 22,
  MISSING_INSTALL: 23,
  GENERIC: 1,
};

const ROOT = process.cwd();

function fail(msg, code = EXIT.GENERIC) {
  console.error(msg);
  process.exit(code);
}

const pkgPath = join(ROOT, "package.json");
if (!existsSync(pkgPath)) fail("✗ package.json not found at " + pkgPath);
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const SPEC =
  pkg.dependencies?.["date-fns"] ?? pkg.devDependencies?.["date-fns"];
if (!SPEC) fail("✗ date-fns is not declared in package.json dependencies.");
const SPEC_NORM = SPEC.replace(/^[\^~]/, "");

const lockPath = join(ROOT, "bun.lock");
if (!existsSync(lockPath))
  fail("✗ bun.lock not found — run `bun install` to generate it.");
const lockText = readFileSync(lockPath, "utf8");
const LOCKED = resolveLockedVersion(lockText, "date-fns");
if (!LOCKED) {
  fail(
    `✗ date-fns entry not found in bun.lock (tried: ${RESOLVER_PATTERN_NAMES.join(", ")}) — run \`bun install\`.`,
  );
}

const dfPkgPath = join(ROOT, "node_modules", "date-fns", "package.json");
if (!existsSync(dfPkgPath)) {
  fail(
    [
      "✗ date-fns is not installed in node_modules.",
      "",
      "  Fix: bun install --frozen-lockfile",
    ].join("\n"),
  );
}
const INSTALLED = JSON.parse(readFileSync(dfPkgPath, "utf8")).version;

const specEqLock = SPEC_NORM === LOCKED;
const lockEqInstalled = LOCKED === INSTALLED;
const specEqInstalled = SPEC_NORM === INSTALLED;
const aligned = specEqLock && lockEqInstalled;

if (!aligned) {
  // Majority-based outlier detection: a value is "ok" if it matches at least
  // one other source; it's "drift" if it matches neither of the other two.
  const status = (v, others) =>
    others.some((o) => o === v) ? "ok" : "← drift";

  const rows = [
    ["package.json spec", SPEC, status(SPEC_NORM, [LOCKED, INSTALLED])],
    ["bun.lock resolved", LOCKED, status(LOCKED, [SPEC_NORM, INSTALLED])],
    ["node_modules", INSTALLED, status(INSTALLED, [SPEC_NORM, LOCKED])],
  ];

  const colSource = Math.max(...rows.map((r) => r[0].length), "SOURCE".length);
  const colVersion = Math.max(...rows.map((r) => r[1].length), "VERSION".length);
  const colStatus = Math.max(...rows.map((r) => r[2].length), "STATUS".length);
  const pad = (s, n) => s + " ".repeat(n - s.length);
  const sep = (n) => "─".repeat(n);

  console.error("✗ date-fns version drift detected:\n");
  console.error(
    `    ${pad("SOURCE", colSource)}  ${pad("VERSION", colVersion)}  ${pad("STATUS", colStatus)}`,
  );
  console.error(
    `    ${sep(colSource)}  ${sep(colVersion)}  ${sep(colStatus)}`,
  );
  for (const [src, ver, st] of rows) {
    console.error(
      `    ${pad(src, colSource)}  ${pad(ver, colVersion)}  ${pad(st, colStatus)}`,
    );
  }
  if (SPEC !== SPEC_NORM) {
    console.error(`\n    (spec normalized: ${SPEC_NORM})`);
  }

  // Diagnose drift pattern → targeted fix
  let diagnosis, fixCmd;
  if (!specEqLock && lockEqInstalled) {
    diagnosis = "spec drifted from lock+installed (package.json edited but not relocked)";
    fixCmd = "bun install";
  } else if (specEqLock && !lockEqInstalled) {
    diagnosis = "node_modules drifted from spec+lock (stale or hand-mutated)";
    fixCmd = "bun install --frozen-lockfile";
  } else if (specEqInstalled && !specEqLock) {
    diagnosis = "lockfile drifted from spec+installed (lock is stale or corrupt)";
    fixCmd = "rm bun.lock && bun install";
  } else {
    diagnosis = "all three sources differ (full corruption)";
    fixCmd = "rm -rf node_modules bun.lock && bun install";
  }

  console.error(`\n  Fix (${diagnosis}):`);
  console.error(`    ${fixCmd}`);
  process.exit(1);
}

console.log(
  `✓ date-fns ${INSTALLED} aligned across spec / lock / node_modules`,
);
