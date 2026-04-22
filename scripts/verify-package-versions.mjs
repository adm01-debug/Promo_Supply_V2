#!/usr/bin/env node
/**
 * Generalized package version verifier.
 *
 * Confirms that one or more npm packages are aligned across:
 *   - package.json spec (dependencies / devDependencies / optionalDependencies / peerDependencies)
 *   - bun.lock resolved version
 *   - node_modules/<pkg>/package.json installed version
 *
 * Usage:
 *   node scripts/verify-package-versions.mjs <pkg> [<pkg> ...]
 *   node scripts/verify-package-versions.mjs --all          # verify every dep in package.json
 *   node scripts/verify-package-versions.mjs --json         # machine-readable output
 *
 * Examples:
 *   node scripts/verify-package-versions.mjs date-fns
 *   node scripts/verify-package-versions.mjs react react-dom zod
 *   node scripts/verify-package-versions.mjs --all --json
 *
 * Exit codes (per-package codes are aggregated; the highest non-zero wins):
 *    0  all packages aligned
 *   10  spec drifted from lock+installed   (package.json edited, not relocked)
 *   11  node_modules drifted from spec+lock (stale / hand-mutated install)
 *   12  lockfile drifted from spec+installed (lock stale or corrupt)
 *   13  all three sources differ           (full corruption)
 *   20  package missing from package.json
 *   21  bun.lock missing
 *   22  package entry not found in bun.lock
 *   23  package not installed in node_modules
 *   30  mixed failures across multiple packages
 *    1  unexpected / generic failure
 *    2  bad CLI usage
 *
 * This script is the package-agnostic generalization of
 * `verify-datefns-versions.mjs`. The date-fns–specific script is kept as a
 * thin alias for backwards-compat with existing CI gates.
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
  MIXED: 30,
  GENERIC: 1,
  USAGE: 2,
};

const ROOT = process.cwd();

// ───────────────────────── arg parsing ─────────────────────────
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const positional = argv.filter((a) => !a.startsWith("--"));
const JSON_OUT = flags.has("--json");
const ALL = flags.has("--all");
const HELP = flags.has("--help") || flags.has("-h");

if (HELP) {
  console.log(
    [
      "Usage: node scripts/verify-package-versions.mjs <pkg> [<pkg>...] [--all] [--json]",
      "",
      "  <pkg>     One or more package names (repeat as needed).",
      "  --all     Verify every dependency listed in package.json (deps + devDeps).",
      "  --json    Emit machine-readable JSON instead of a human report.",
      "",
      "Exit codes: 0 aligned · 10 spec · 11 installed · 12 lock · 13 all-diff",
      "            20 missing-spec · 21 missing-lock · 22 missing-lock-entry · 23 missing-install",
      "            30 mixed failures across multiple packages",
    ].join("\n"),
  );
  process.exit(EXIT.OK);
}

// ───────────────────────── shared sources ─────────────────────────
const pkgPath = join(ROOT, "package.json");
if (!existsSync(pkgPath)) {
  console.error(`✗ package.json not found at ${pkgPath}`);
  process.exit(EXIT.MISSING_SPEC);
}
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const lockPath = join(ROOT, "bun.lock");
if (!existsSync(lockPath)) {
  console.error("✗ bun.lock not found — run `bun install` to generate it.");
  process.exit(EXIT.MISSING_LOCK);
}
const lockText = readFileSync(lockPath, "utf8");

// ───────────────────────── resolve target list ─────────────────────────
const SPEC_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

function findSpec(name) {
  for (const field of SPEC_FIELDS) {
    const v = pkg[field]?.[name];
    if (v) return { spec: v, field };
  }
  return null;
}

let targets = [];
if (ALL) {
  const seen = new Set();
  for (const field of SPEC_FIELDS) {
    for (const name of Object.keys(pkg[field] ?? {})) {
      if (!seen.has(name)) {
        seen.add(name);
        targets.push(name);
      }
    }
  }
} else {
  targets = positional;
}

if (targets.length === 0) {
  console.error(
    "✗ No packages specified. Pass package names or use --all. See --help.",
  );
  process.exit(EXIT.USAGE);
}

// ───────────────────────── per-package check ─────────────────────────
/**
 * @param {string} name
 * @returns {{
 *   name: string, status: "ok"|"drift"|"missing-spec"|"missing-lock-entry"|"missing-install",
 *   spec?: string, specNorm?: string, locked?: string, installed?: string,
 *   driftKind?: "SPEC_DRIFT"|"INSTALLED_DRIFT"|"LOCK_DRIFT"|"ALL_DIFFER",
 *   exitCode: number, fixCmd?: string, diagnosis?: string,
 *   pairs?: Array<{ a: object, b: object, match: boolean, reason: string }>,
 * }}
 */
function verifyOne(name) {
  const found = findSpec(name);
  if (!found) {
    return {
      name,
      status: "missing-spec",
      exitCode: EXIT.MISSING_SPEC,
      diagnosis: `${name} is not declared in package.json (${SPEC_FIELDS.join(" / ")}).`,
      fixCmd: `bun add ${name}    # or move/declare it in package.json`,
    };
  }
  const { spec, field } = found;
  const specNorm = spec.replace(/^[\^~]/, "");

  const locked = resolveLockedVersion(lockText, name);
  if (!locked) {
    return {
      name,
      status: "missing-lock-entry",
      spec,
      specNorm,
      exitCode: EXIT.MISSING_LOCK_ENTRY,
      diagnosis: `${name} entry not found in bun.lock (tried: ${RESOLVER_PATTERN_NAMES.join(", ")}).`,
      fixCmd: "bun install",
    };
  }

  const dfPkgPath = join(ROOT, "node_modules", name, "package.json");
  if (!existsSync(dfPkgPath)) {
    return {
      name,
      status: "missing-install",
      spec,
      specNorm,
      locked,
      exitCode: EXIT.MISSING_INSTALL,
      diagnosis: `${name} is not installed in node_modules.`,
      fixCmd: "bun install --frozen-lockfile",
    };
  }
  const installed = JSON.parse(readFileSync(dfPkgPath, "utf8")).version;

  const specEqLock = specNorm === locked;
  const lockEqInstalled = locked === installed;
  const specEqInstalled = specNorm === installed;
  const aligned = specEqLock && lockEqInstalled;

  if (aligned) {
    return {
      name,
      status: "ok",
      spec,
      specNorm,
      locked,
      installed,
      field,
      exitCode: EXIT.OK,
    };
  }

  // Diagnose drift pattern
  let driftKind, diagnosis, fixCmd, exitCode;
  if (!specEqLock && lockEqInstalled) {
    driftKind = "SPEC_DRIFT";
    diagnosis = "spec drifted from lock+installed (package.json edited but not relocked)";
    fixCmd = "bun install";
    exitCode = EXIT.SPEC_DRIFT;
  } else if (specEqLock && !lockEqInstalled) {
    driftKind = "INSTALLED_DRIFT";
    diagnosis = "node_modules drifted from spec+lock (stale or hand-mutated)";
    fixCmd = "bun install --frozen-lockfile";
    exitCode = EXIT.INSTALLED_DRIFT;
  } else if (specEqInstalled && !specEqLock) {
    driftKind = "LOCK_DRIFT";
    diagnosis = "lockfile drifted from spec+installed (lock is stale or corrupt)";
    fixCmd = "rm bun.lock && bun install";
    exitCode = EXIT.LOCK_DRIFT;
  } else {
    driftKind = "ALL_DIFFER";
    diagnosis = "all three sources differ (full corruption)";
    fixCmd = "rm -rf node_modules bun.lock && bun install";
    exitCode = EXIT.ALL_DIFFER;
  }

  // Pairwise diagnosis (same scheme as verify-datefns-versions.mjs)
  const pairs = [
    {
      a: { label: "package.json (spec)", file: "package.json",                 value: specNorm },
      b: { label: "bun.lock (locked)",   file: "bun.lock",                     value: locked },
      reasonMatch:
        "spec ↔ lock match — package.json and bun.lock agree on the resolved version.",
      reasonDrift:
        "spec ↔ lock differ — package.json was edited (or bun.lock is stale) and the lockfile was not regenerated. Run `bun install` to relock.",
    },
    {
      a: { label: "bun.lock (locked)",   file: "bun.lock",                                                   value: locked },
      b: { label: "node_modules",        file: `node_modules/${name}/package.json`,                          value: installed },
      reasonMatch:
        "lock ↔ installed match — the install on disk matches what bun.lock pinned.",
      reasonDrift:
        "lock ↔ installed differ — node_modules was hand-mutated, partially upgraded, or never reinstalled after a lock change. Run `bun install --frozen-lockfile`.",
    },
    {
      a: { label: "package.json (spec)", file: "package.json",                                               value: specNorm },
      b: { label: "node_modules",        file: `node_modules/${name}/package.json`,                          value: installed },
      reasonMatch:
        "spec ↔ installed match — the installed version satisfies the declared spec.",
      reasonDrift:
        "spec ↔ installed differ — the version in node_modules does not match the declared spec.",
    },
  ].map((p) => ({
    a: p.a,
    b: p.b,
    match: p.a.value === p.b.value,
    reason: p.a.value === p.b.value ? p.reasonMatch : p.reasonDrift,
  }));

  return {
    name,
    status: "drift",
    spec,
    specNorm,
    locked,
    installed,
    field,
    driftKind,
    exitCode,
    diagnosis,
    fixCmd,
    pairs,
  };
}

const results = targets.map(verifyOne);

// ───────────────────────── output ─────────────────────────
if (JSON_OUT) {
  const okCount = results.filter((r) => r.status === "ok").length;
  const failures = results.filter((r) => r.status !== "ok");
  console.log(
    JSON.stringify(
      {
        ok: failures.length === 0,
        total: results.length,
        passed: okCount,
        failed: failures.length,
        results,
      },
      null,
      2,
    ),
  );
} else {
  // Per-package report
  for (const r of results) {
    if (r.status === "ok") {
      console.log(`✓ ${r.name} ${r.installed} aligned across spec / lock / node_modules`);
      continue;
    }

    console.error("");
    console.error(`✗ ${r.name}: ${r.diagnosis}`);

    if (r.spec || r.locked || r.installed) {
      const rows = [
        ["package.json spec", r.spec ?? "(missing)"],
        ["bun.lock resolved", r.locked ?? "(missing)"],
        ["node_modules", r.installed ?? "(missing)"],
      ];
      const colSource = Math.max(...rows.map((x) => x[0].length), "SOURCE".length);
      const colVersion = Math.max(...rows.map((x) => x[1].length), "VERSION".length);
      const pad = (s, n) => s + " ".repeat(n - s.length);
      const sep = (n) => "─".repeat(n);
      console.error(`    ${pad("SOURCE", colSource)}  ${pad("VERSION", colVersion)}`);
      console.error(`    ${sep(colSource)}  ${sep(colVersion)}`);
      for (const [src, ver] of rows) {
        console.error(`    ${pad(src, colSource)}  ${pad(ver, colVersion)}`);
      }
    }

    if (r.spec && r.specNorm && r.spec !== r.specNorm) {
      console.error(`    (spec normalized: ${r.specNorm})`);
    }

    if (r.status === "drift" && r.pairs) {
      console.error("\n  Mismatch detail:");
      const sn = r.specNorm, lk = r.locked, ins = r.installed;
      const specEqLock = sn === lk;
      const lockEqInstalled = lk === ins;
      const specEqInstalled = sn === ins;
      if (!specEqLock && lockEqInstalled) {
        console.error(renderMismatch("spec", sn, "locked", lk));
      } else if (specEqLock && !lockEqInstalled) {
        console.error(renderMismatch("locked", lk, "installed", ins));
      } else if (specEqInstalled && !specEqLock) {
        console.error(renderMismatch("spec", sn, "locked", lk));
      } else {
        console.error(renderMismatch("spec", sn, "locked", lk));
        console.error("");
        console.error(renderMismatch("locked", lk, "installed", ins));
      }

      console.error("\n  Pairwise drift diagnosis:");
      for (const p of r.pairs) {
        const marker = p.match ? "✓" : "✗";
        console.error(`    ${marker} ${p.a.label} (${p.a.value})  vs  ${p.b.label} (${p.b.value})`);
        console.error(`        files: ${p.a.file}  ↔  ${p.b.file}`);
        console.error(`        ${p.reason}`);
      }
    }

    if (r.fixCmd) {
      console.error(`\n  Fix:`);
      console.error(`    ${r.fixCmd}`);
    }
    console.error(`  Exit code: ${r.exitCode}`);
  }

  // Summary line for multi-package runs
  if (results.length > 1) {
    const okN = results.filter((x) => x.status === "ok").length;
    const failN = results.length - okN;
    console.error("");
    if (failN === 0) {
      console.log(`✓ ${okN}/${results.length} package(s) aligned.`);
    } else {
      console.error(`✗ ${failN}/${results.length} package(s) failed verification (${okN} aligned).`);
    }
  }
}

// ───────────────────────── aggregate exit code ─────────────────────────
const failureCodes = results.map((r) => r.exitCode).filter((c) => c !== EXIT.OK);
if (failureCodes.length === 0) {
  process.exit(EXIT.OK);
}
if (failureCodes.length === 1) {
  process.exit(failureCodes[0]);
}
// Multiple failures across packages: if they're all the same kind, surface
// that code; otherwise surface MIXED so callers can branch on it.
const uniq = [...new Set(failureCodes)];
process.exit(uniq.length === 1 ? uniq[0] : EXIT.MIXED);
