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
import { renderMismatch } from "./lib/semver-diff.mjs";

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
if (!existsSync(pkgPath)) fail("✗ package.json not found at " + pkgPath, EXIT.MISSING_SPEC);
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const SPEC =
  pkg.dependencies?.["date-fns"] ?? pkg.devDependencies?.["date-fns"];
if (!SPEC) fail("✗ date-fns is not declared in package.json dependencies.", EXIT.MISSING_SPEC);
const SPEC_NORM = SPEC.replace(/^[\^~]/, "");

const lockPath = join(ROOT, "bun.lock");
if (!existsSync(lockPath))
  fail("✗ bun.lock not found — run `bun install` to generate it.", EXIT.MISSING_LOCK);
const lockText = readFileSync(lockPath, "utf8");
const LOCKED = resolveLockedVersion(lockText, "date-fns");
if (!LOCKED) {
  fail(
    `✗ date-fns entry not found in bun.lock (tried: ${RESOLVER_PATTERN_NAMES.join(", ")}) — run \`bun install\`.`,
    EXIT.MISSING_LOCK_ENTRY,
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
    EXIT.MISSING_INSTALL,
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

  // Mismatch detail: caret-pointer diff per drifting pair
  console.error("\n  Mismatch detail:");
  if (!specEqLock && lockEqInstalled) {
    console.error(renderMismatch("spec", SPEC_NORM, "locked", LOCKED));
  } else if (specEqLock && !lockEqInstalled) {
    console.error(renderMismatch("locked", LOCKED, "installed", INSTALLED));
  } else if (specEqInstalled && !specEqLock) {
    console.error(renderMismatch("spec", SPEC_NORM, "locked", LOCKED));
  } else {
    console.error(renderMismatch("spec", SPEC_NORM, "locked", LOCKED));
    console.error("");
    console.error(renderMismatch("locked", LOCKED, "installed", INSTALLED));
  }

  // Pairwise drift diagnosis: explicitly label each of the 3 pairs and explain
  // which file is out of sync and the concrete reason. This complements the
  // global diagnosis below by showing the relationship between every pair.
  const pairwise = [
    {
      a: { label: "package.json (spec)", file: "package.json",                       value: SPEC_NORM },
      b: { label: "bun.lock (locked)",   file: "bun.lock",                           value: LOCKED },
      reasonMatch:
        "spec ↔ lock match — package.json and bun.lock agree on the resolved version.",
      reasonDrift:
        "spec ↔ lock differ — package.json was edited (or bun.lock is stale) and the lockfile was not regenerated. Run `bun install` to relock against the current spec.",
    },
    {
      a: { label: "bun.lock (locked)",   file: "bun.lock",                           value: LOCKED },
      b: { label: "node_modules",        file: "node_modules/date-fns/package.json", value: INSTALLED },
      reasonMatch:
        "lock ↔ installed match — the install on disk matches what bun.lock pinned.",
      reasonDrift:
        "lock ↔ installed differ — node_modules was hand-mutated, partially upgraded, or never reinstalled after a lock change. Run `bun install --frozen-lockfile` to restore the locked install.",
    },
    {
      a: { label: "package.json (spec)", file: "package.json",                       value: SPEC_NORM },
      b: { label: "node_modules",        file: "node_modules/date-fns/package.json", value: INSTALLED },
      reasonMatch:
        "spec ↔ installed match — the installed version satisfies the declared spec.",
      reasonDrift:
        "spec ↔ installed differ — the version in node_modules does not match the declared spec. Either the install is stale, or the spec was edited without reinstalling.",
    },
  ];

  console.error("\n  Pairwise drift diagnosis:");
  for (const { a, b, reasonMatch, reasonDrift } of pairwise) {
    const match = a.value === b.value;
    const marker = match ? "✓" : "✗";
    console.error(
      `    ${marker} ${a.label} (${a.value})  vs  ${b.label} (${b.value})`,
    );
    console.error(`        files: ${a.file}  ↔  ${b.file}`);
    console.error(`        ${match ? reasonMatch : reasonDrift}`);
  }

  // Diagnose drift pattern → targeted fix + distinct exit code
  let diagnosis, fixCmd, exitCode;
  if (!specEqLock && lockEqInstalled) {
    diagnosis = "spec drifted from lock+installed (package.json edited but not relocked)";
    fixCmd = "bun install";
    exitCode = EXIT.SPEC_DRIFT;
  } else if (specEqLock && !lockEqInstalled) {
    diagnosis = "node_modules drifted from spec+lock (stale or hand-mutated)";
    fixCmd = "bun install --frozen-lockfile";
    exitCode = EXIT.INSTALLED_DRIFT;
  } else if (specEqInstalled && !specEqLock) {
    diagnosis = "lockfile drifted from spec+installed (lock is stale or corrupt)";
    fixCmd = "rm bun.lock && bun install";
    exitCode = EXIT.LOCK_DRIFT;
  } else {
    diagnosis = "all three sources differ (full corruption)";
    fixCmd = "rm -rf node_modules bun.lock && bun install";
    exitCode = EXIT.ALL_DIFFER;
  }

  console.error(`\n  Fix (${diagnosis}):`);
  console.error(`    ${fixCmd}`);
  console.error(`\n  Exit code: ${exitCode}`);
  process.exit(exitCode);
}

console.log(
  `✓ date-fns ${INSTALLED} aligned across spec / lock / node_modules`,
);
