#!/usr/bin/env node
/**
 * Wrapper around scripts/generate-dependency-health.mjs that:
 *   1. Snapshots the current public/dependency-health.json (if any).
 *   2. Invokes the generator (inheriting stdio).
 *   3. Reads the freshly generated file and prints a focused, human-readable
 *      diff vs. the previous snapshot — date-fns versions, tracked package
 *      drift, lockfile drift, and tree-shaking offenders (which capture
 *      date-fns/* and locale import changes).
 *
 * Exit code policy: always 0 on success. Diff is informational, not a gate.
 * Drift gating is enforced elsewhere (ci-check.sh [10/14] dry-run + workflows).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SNAPSHOT_PATH = resolve(root, "public/dependency-health.json");
const GENERATOR_PATH = resolve(__dirname, "generate-dependency-health.mjs");
const OFFENDER_DIFF_CAP = 20;

function readJsonSafe(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function diffPrimitive(label, prev, next, lines, { warnOnChange = false } = {}) {
  if (prev === next) return;
  const arrow = `${prev ?? "—"} → ${next ?? "—"}`;
  const flag = warnOnChange ? "  ⚠" : "";
  lines.push(`    ${label}: ${arrow}${flag}`);
}

function diffDateFns(prev, next, lines) {
  const a = prev?.dateFns ?? {};
  const b = next?.dateFns ?? {};
  const section = [];
  for (const key of ["spec", "installed", "locked", "exactPinned"]) {
    if (a[key] !== b[key]) {
      section.push(`    ${key}: ${a[key] ?? "—"} → ${b[key] ?? "—"}`);
    }
  }

  // Subpaths drift (added/removed entries between snapshots)
  const aSub = a.subpaths ?? null;
  const bSub = b.subpaths ?? null;
  if (aSub || bSub) {
    const aList = new Set(aSub?.list ?? []);
    const bList = new Set(bSub?.list ?? []);
    if ((aSub?.count ?? aList.size) !== (bSub?.count ?? bList.size)) {
      section.push(
        `    subpaths.count: ${aSub?.count ?? aList.size ?? "—"} → ${bSub?.count ?? bList.size ?? "—"}`,
      );
    }
    const added = [...bList].filter((s) => !aList.has(s)).sort();
    const removed = [...aList].filter((s) => !bList.has(s)).sort();
    if (added.length > 0) {
      section.push("    subpaths added:");
      for (const s of added.slice(0, OFFENDER_DIFF_CAP)) section.push(`      + ${s}`);
      if (added.length > OFFENDER_DIFF_CAP) {
        section.push(`      … and ${added.length - OFFENDER_DIFF_CAP} more added`);
      }
    }
    if (removed.length > 0) {
      section.push("    subpaths removed:");
      for (const s of removed.slice(0, OFFENDER_DIFF_CAP)) section.push(`      - ${s}`);
      if (removed.length > OFFENDER_DIFF_CAP) {
        section.push(`      … and ${removed.length - OFFENDER_DIFF_CAP} more removed`);
      }
    }
  }

  if (section.length > 0) {
    lines.push("  date-fns:");
    lines.push(...section);
  }
}

function diffPackages(prev, next, lines) {
  const prevByName = new Map((prev?.packages ?? []).map((p) => [p.name, p]));
  const nextByName = new Map((next?.packages ?? []).map((p) => [p.name, p]));
  const allNames = new Set([...prevByName.keys(), ...nextByName.keys()]);
  const section = [];

  for (const name of allNames) {
    const a = prevByName.get(name);
    const b = nextByName.get(name);
    if (!a) {
      section.push(`    + ${name} (added) spec=${b.spec || "—"} locked=${b.locked || "—"}`);
      continue;
    }
    if (!b) {
      section.push(`    - ${name} (removed)`);
      continue;
    }
    for (const key of ["spec", "locked", "installed", "driftDetected"]) {
      if (a[key] !== b[key]) {
        const flag = key === "driftDetected" && b[key] === true ? "  ⚠" : "";
        section.push(`    ${name}.${key}: ${a[key] ?? "—"} → ${b[key] ?? "—"}${flag}`);
      }
    }
  }

  if (section.length > 0) {
    lines.push("  packages:");
    lines.push(...section);
  }
}

function diffLockfileDrift(prev, next, lines) {
  const a = prev?.lockfileDrift?.detected;
  const b = next?.lockfileDrift?.detected;
  if (a === b) return;
  const flag = b === true ? "  ⚠" : "";
  lines.push("  lockfile:");
  lines.push(`    drift detected: ${a ?? "—"} → ${b ?? "—"}${flag}`);
}

function offenderKey(o) {
  return `${o.file}:${o.line}:${o.importPath}`;
}

function diffTreeShaking(prev, next, lines) {
  const a = prev?.treeShaking ?? {};
  const b = next?.treeShaking ?? {};
  const section = [];

  if (a.barrelImportsFound !== b.barrelImportsFound) {
    section.push(
      `    barrelImportsFound: ${a.barrelImportsFound ?? "—"} → ${b.barrelImportsFound ?? "—"}`,
    );
  }

  if (a.riskLevel !== b.riskLevel) {
    const order = { ok: 0, warning: 1, critical: 2 };
    const degrading = (order[b.riskLevel] ?? 0) > (order[a.riskLevel] ?? 0);
    const flag = degrading ? "  ⚠" : "";
    section.push(`    riskLevel: ${a.riskLevel ?? "—"} → ${b.riskLevel ?? "—"}${flag}`);
  }

  const prevOff = new Map((a.offenders ?? []).map((o) => [offenderKey(o), o]));
  const nextOff = new Map((b.offenders ?? []).map((o) => [offenderKey(o), o]));
  const added = [];
  const removed = [];
  for (const [k, o] of nextOff) if (!prevOff.has(k)) added.push(o);
  for (const [k, o] of prevOff) if (!nextOff.has(k)) removed.push(o);

  if (added.length > 0 || removed.length > 0) {
    section.push("    offenders:");
    const addedShown = added.slice(0, OFFENDER_DIFF_CAP);
    for (const o of addedShown) {
      section.push(`      + ${o.file}:${o.line}  "${o.importPath}"`);
    }
    if (added.length > OFFENDER_DIFF_CAP) {
      section.push(`      … and ${added.length - OFFENDER_DIFF_CAP} more added`);
    }
    const removedShown = removed.slice(0, OFFENDER_DIFF_CAP);
    for (const o of removedShown) {
      section.push(`      - ${o.file}:${o.line}  "${o.importPath}"`);
    }
    if (removed.length > OFFENDER_DIFF_CAP) {
      section.push(`      … and ${removed.length - OFFENDER_DIFF_CAP} more removed`);
    }
  }

  if (section.length > 0) {
    lines.push("  tree-shaking:");
    lines.push(...section);
  }
}

function main() {
  const previous = readJsonSafe(SNAPSHOT_PATH);
  if (previous === null) {
    console.log("ℹ No previous snapshot — this is the baseline.");
  }

  const result = spawnSync("node", [GENERATOR_PATH], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const next = readJsonSafe(SNAPSHOT_PATH);
  if (!next) {
    console.error("✗ Failed to read regenerated dependency-health.json");
    process.exit(1);
  }

  if (!previous) {
    console.log("\n▶ dependency-health.json baseline written.");
    return;
  }

  const lines = [];
  diffDateFns(previous, next, lines);
  diffPackages(previous, next, lines);
  diffLockfileDrift(previous, next, lines);
  diffTreeShaking(previous, next, lines);

  console.log("");
  if (lines.length === 0) {
    console.log("✓ dependency-health.json unchanged.");
  } else {
    console.log("▶ dependency-health.json diff");
    for (const line of lines) console.log(line);
  }
}

main();
