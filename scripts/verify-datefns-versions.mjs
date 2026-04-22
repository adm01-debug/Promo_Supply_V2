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
import {
  renderMismatch,
  renderTripleMismatch,
  renderUnifiedDiff,
} from "./lib/semver-diff.mjs";

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
    console.error(renderMismatch("spec", SPEC_NORM, "locked", LOCKED, { caseLabel: "spec↔locked" }));
  } else if (specEqLock && !lockEqInstalled) {
    console.error(renderMismatch("locked", LOCKED, "installed", INSTALLED, { caseLabel: "locked↔installed" }));
  } else if (specEqInstalled && !specEqLock) {
    console.error(renderMismatch("spec", SPEC_NORM, "locked", LOCKED, { caseLabel: "spec↔locked" }));
  } else {
    // All three differ — render the labeled triple block with summary line.
    console.error(renderTripleMismatch(SPEC_NORM, LOCKED, INSTALLED));
  }

  // Unified-diff style summary (normalized spec vs installed) — git-patch
  // shape with consistent label padding and TTY-aware colors. This is the
  // first thing most contributors look at; the detailed labeled blocks
  // above are kept for deeper post-mortem.
  console.error("\n  Unified diff (spec vs installed):");
  console.error(renderUnifiedDiff("spec", SPEC_NORM, "installed", INSTALLED));

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

  // Diagnose drift pattern → targeted fix + distinct exit code.
  // `commands` is an ordered list of { cmd, why } pairs the user can paste
  // verbatim. Each pair documents the exact bun invocation + the role of every
  // non-obvious flag.
  let diagnosis, exitCode, rationale, commands;
  if (!specEqLock && lockEqInstalled) {
    diagnosis = "spec drifted from lock+installed (package.json edited but not relocked)";
    exitCode = EXIT.SPEC_DRIFT;
    rationale = [
      `• bun.lock (${LOCKED}) and node_modules (${INSTALLED}) agree, but`,
      `  package.json now says ${SPEC}. The spec was edited after the last install.`,
      `• \`bun install\` (no flags) re-resolves against the new spec and rewrites`,
      `  bun.lock + node_modules to match — no need to nuke anything.`,
    ];
    commands = [
      {
        cmd: "bun install",
        why: "Re-resolves date-fns against the updated spec, rewrites bun.lock, and updates node_modules. NO --frozen-lockfile here: that flag would refuse to update bun.lock and the install would fail.",
      },
      {
        cmd: "bun run verify:date-fns",
        why: "Confirms spec ↔ lock ↔ installed are now aligned (exit 0).",
      },
    ];
  } else if (specEqLock && !lockEqInstalled) {
    diagnosis = "node_modules drifted from spec+lock (stale or hand-mutated)";
    exitCode = EXIT.INSTALLED_DRIFT;
    rationale = [
      `• package.json (${SPEC}) and bun.lock (${LOCKED}) agree, but`,
      `  node_modules has ${INSTALLED} — likely hand-mutated or partially upgraded.`,
      `• \`--frozen-lockfile\` forbids lock rewrites and reinstalls strictly from`,
      `  bun.lock, restoring the canonical install without changing the lock.`,
    ];
    commands = [
      {
        cmd: "rm -rf node_modules/date-fns",
        why: "Drops the drifted copy so bun reinstalls it cleanly. Scoped to the date-fns folder to avoid a full node_modules rebuild.",
      },
      {
        cmd: "bun install --frozen-lockfile",
        why: "--frozen-lockfile pins the install to bun.lock exactly and FAILS if anything would force a lock rewrite — the right guarantee when the lock is already correct.",
      },
      {
        cmd: "bun run verify:date-fns",
        why: "Confirms node_modules now matches the locked version.",
      },
    ];
  } else if (specEqInstalled && !specEqLock) {
    diagnosis = "lockfile drifted from spec+installed (lock is stale or corrupt)";
    exitCode = EXIT.LOCK_DRIFT;
    rationale = [
      `• package.json (${SPEC}) and node_modules (${INSTALLED}) agree, but`,
      `  bun.lock pins ${LOCKED} — the lockfile is stale or corrupt.`,
      `• Deleting bun.lock forces a full re-resolution from the spec; the new lock`,
      `  will pin the version already installed (${INSTALLED}).`,
    ];
    commands = [
      {
        cmd: "rm bun.lock",
        why: "Removes the stale lockfile so bun resolves fresh from package.json. Do NOT pass --frozen-lockfile next — there is no lock to freeze against.",
      },
      {
        cmd: "bun install",
        why: "Generates a new bun.lock from the current spec. Since node_modules already matches the spec, this should converge without reinstalling much.",
      },
      {
        cmd: "bun run verify:date-fns",
        why: "Confirms the regenerated lock now matches spec + installed.",
      },
    ];
  } else {
    diagnosis = "all three sources differ (full corruption)";
    exitCode = EXIT.ALL_DIFFER;
    rationale = [
      `• All three sources disagree: spec=${SPEC}, lock=${LOCKED}, installed=${INSTALLED}.`,
      `  No single source is trustworthy, so partial fixes risk re-introducing drift.`,
      `• Wiping node_modules + bun.lock and reinstalling from package.json is the`,
      `  only deterministic recovery.`,
    ];
    commands = [
      {
        cmd: "rm -rf node_modules bun.lock",
        why: "Wipes both untrusted sources so package.json becomes the single source of truth.",
      },
      {
        cmd: "bun install",
        why: "Resolves from the spec, regenerates bun.lock, and reinstalls node_modules. NO --frozen-lockfile (there's no lock yet).",
      },
      {
        cmd: "bun run verify:date-fns",
        why: "Confirms full alignment after the rebuild.",
      },
      {
        cmd: "bun run test:date-fns",
        why: "Runs the date-fns smoke test — catches subpath/locale regressions a fresh install can introduce.",
      },
    ];
  }

  console.error(`\n  Fix (${diagnosis}):`);
  console.error(`    Current state:`);
  console.error(`      • package.json spec → ${SPEC}${SPEC !== SPEC_NORM ? ` (normalized: ${SPEC_NORM})` : ""}`);
  console.error(`      • bun.lock locked  → ${LOCKED}`);
  console.error(`      • node_modules     → ${INSTALLED}`);
  console.error(`    Why this approach:`);
  for (const line of rationale) console.error(`      ${line}`);
  console.error(`    Run these bun commands locally (in order):`);
  commands.forEach(({ cmd, why }, i) => {
    console.error(`      ${i + 1}. $ ${cmd}`);
    // Soft-wrap the rationale at ~80 cols so terminals stay readable.
    const indent = "         ↳ ";
    const wrapWidth = 78;
    const words = why.split(/\s+/);
    let line = indent;
    for (const w of words) {
      if (line.length + w.length + 1 > wrapWidth && line !== indent) {
        console.error(line);
        line = "           " + w;
      } else {
        line += (line === indent ? "" : " ") + w;
      }
    }
    if (line.trim()) console.error(line);
  });
  console.error(`\n  Exit code: ${exitCode}`);
  process.exit(exitCode);
}

console.log(
  `✓ date-fns ${INSTALLED} aligned across spec / lock / node_modules`,
);
