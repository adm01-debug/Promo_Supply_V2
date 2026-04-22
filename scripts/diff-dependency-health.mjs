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

function subpathNames(sub) {
  if (!sub) return [];
  if (Array.isArray(sub.entries)) return sub.entries.map((e) => e.subpath);
  if (Array.isArray(sub.list)) return sub.list; // legacy shape fallback
  return [];
}

function entriesByName(sub) {
  const map = new Map();
  if (sub && Array.isArray(sub.entries)) {
    for (const e of sub.entries) map.set(e.subpath, e);
  }
  return map;
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

  // Scan input drift (roots/excludes/files) — surfaced FIRST so a changed
  // entries[] is immediately attributable to "scan widened/narrowed" vs
  // "real source change". Only fires when at least one snapshot carries the
  // new scanInput block; older snapshots degrade to silence.
  const aScan = a.subpaths?.scanInput ?? null;
  const bScan = b.subpaths?.scanInput ?? null;
  if (aScan || bScan) {
    const scanLines = [];
    const aRoots = (aScan?.roots ?? []).join(", ");
    const bRoots = (bScan?.roots ?? []).join(", ");
    if (aRoots !== bRoots) scanLines.push(`    roots: [${aRoots}] → [${bRoots}]`);
    if ((aScan?.rootsSource ?? null) !== (bScan?.rootsSource ?? null)) {
      scanLines.push(`    rootsSource: ${aScan?.rootsSource ?? "—"} → ${bScan?.rootsSource ?? "—"}`);
    }
    const aExcl = (aScan?.excludeDirs ?? []).join(", ");
    const bExcl = (bScan?.excludeDirs ?? []).join(", ");
    if (aExcl !== bExcl) scanLines.push(`    excludeDirs: [${aExcl}] → [${bExcl}]`);
    if ((aScan?.excludeFilePattern ?? null) !== (bScan?.excludeFilePattern ?? null)) {
      scanLines.push(
        `    excludeFilePattern: ${aScan?.excludeFilePattern ?? "—"} → ${bScan?.excludeFilePattern ?? "—"}`,
      );
    }
    if ((aScan?.fileExtensions ?? null) !== (bScan?.fileExtensions ?? null)) {
      scanLines.push(
        `    fileExtensions: ${aScan?.fileExtensions ?? "—"} → ${bScan?.fileExtensions ?? "—"}`,
      );
    }
    if ((aScan?.fileCount ?? null) !== (bScan?.fileCount ?? null)) {
      scanLines.push(`    fileCount: ${aScan?.fileCount ?? "—"} → ${bScan?.fileCount ?? "—"}`);
    }
    // fileHash is the cheap "did the actual file set change?" probe; only
    // walk the files[] arrays when it differs (lists can be long).
    if ((aScan?.fileHash ?? null) !== (bScan?.fileHash ?? null)) {
      scanLines.push(
        `    fileHash: ${(aScan?.fileHash ?? "—").slice(0, 12)} → ${(bScan?.fileHash ?? "—").slice(0, 12)}`,
      );
      const aFiles = new Set(aScan?.files ?? []);
      const bFiles = new Set(bScan?.files ?? []);
      const addedFiles = [...bFiles].filter((f) => !aFiles.has(f)).sort();
      const removedFiles = [...aFiles].filter((f) => !bFiles.has(f)).sort();
      if (addedFiles.length > 0) {
        scanLines.push(`    files added (${addedFiles.length}):`);
        for (const f of addedFiles.slice(0, OFFENDER_DIFF_CAP)) scanLines.push(`      + ${f}`);
        if (addedFiles.length > OFFENDER_DIFF_CAP) {
          scanLines.push(`      … and ${addedFiles.length - OFFENDER_DIFF_CAP} more`);
        }
      }
      if (removedFiles.length > 0) {
        scanLines.push(`    files removed (${removedFiles.length}):`);
        for (const f of removedFiles.slice(0, OFFENDER_DIFF_CAP)) scanLines.push(`      - ${f}`);
        if (removedFiles.length > OFFENDER_DIFF_CAP) {
          scanLines.push(`      … and ${removedFiles.length - OFFENDER_DIFF_CAP} more`);
        }
      }
    }
    if (scanLines.length > 0) {
      section.push("    scanInput:");
      section.push(...scanLines);
    }
  }

  // Subpaths drift (added/removed entries between snapshots; supports both
  // the new entries[] shape and the legacy list[] shape for back-compat).
  const aSub = a.subpaths ?? null;
  const bSub = b.subpaths ?? null;
  if (aSub || bSub) {
    const aNames = new Set(subpathNames(aSub));
    const bNames = new Set(subpathNames(bSub));
    const aCount = aSub?.count ?? aNames.size;
    const bCount = bSub?.count ?? bNames.size;
    if (aCount !== bCount) {
      section.push(`    subpaths.count: ${aCount ?? "—"} → ${bCount ?? "—"}`);
    }
    if ((aSub?.missingCount ?? undefined) !== (bSub?.missingCount ?? undefined)) {
      const flag = (bSub?.missingCount ?? 0) > (aSub?.missingCount ?? 0) ? "  ⚠" : "";
      section.push(
        `    subpaths.missingCount: ${aSub?.missingCount ?? "—"} → ${bSub?.missingCount ?? "—"}${flag}`,
      );
    }
    const added = [...bNames].filter((s) => !aNames.has(s)).sort();
    const removed = [...aNames].filter((s) => !bNames.has(s)).sort();

    // Enrich each added/removed line with the per-entry fileCount + a small
    // sample of importing files (when the snapshot carries them — older
    // snapshots without fileCount degrade gracefully to the bare subpath).
    const aMapForDrift = entriesByName(aSub);
    const bMapForDrift = entriesByName(bSub);
    const renderDriftLine = (sym, name, src) => {
      const e = src.get(name);
      if (!e || typeof e.fileCount !== "number") return `      ${sym} ${name}`;
      const sample = Array.isArray(e.files) && e.files.length
        ? `  [${e.files.slice(0, 3).join(", ")}${e.files.length > 3 ? ", …" : ""}]`
        : "";
      const noun = e.fileCount === 1 ? "file" : "files";
      return `      ${sym} ${name}  (${e.fileCount} ${noun})${sample}`;
    };

    if (added.length > 0) {
      section.push("    subpaths added:");
      for (const s of added.slice(0, OFFENDER_DIFF_CAP)) {
        section.push(renderDriftLine("+", s, bMapForDrift));
      }
      if (added.length > OFFENDER_DIFF_CAP) {
        section.push(`      … and ${added.length - OFFENDER_DIFF_CAP} more added`);
      }
    }
    if (removed.length > 0) {
      section.push("    subpaths removed:");
      for (const s of removed.slice(0, OFFENDER_DIFF_CAP)) {
        section.push(renderDriftLine("-", s, aMapForDrift));
      }
      if (removed.length > OFFENDER_DIFF_CAP) {
        section.push(`      … and ${removed.length - OFFENDER_DIFF_CAP} more removed`);
      }
    }

    // Resolution flips — partitioned into three explicit buckets so reviewers
    // immediately see severity:
    //   ⚠ became MISSING   — was on disk, now absent  (regression risk)
    //   ✓ became AVAILABLE — was absent, now resolved (recovery)
    //   ~ resolved-path    — same exists, different file under date-fns/
    // Rendered in its own "subpaths resolution:" sub-block (still under the
    // date-fns heading) and ALSO promoted to a top-level "  resolution:"
    // section by `diffResolutionFlips` below for at-a-glance visibility when
    // the subpath set itself is unchanged. Both views read from the same
    // partition to stay consistent.
    const aMap = entriesByName(aSub);
    const bMap = entriesByName(bSub);
    if (aMap.size > 0 && bMap.size > 0) {
      const becameMissing = [];
      const becameAvailable = [];
      const pathOnly = [];
      for (const [name, ae] of aMap) {
        const be = bMap.get(name);
        if (!be) continue;
        if (ae.exists === true && be.exists === false) {
          becameMissing.push({ name, ae, be });
        } else if (ae.exists === false && be.exists === true) {
          becameAvailable.push({ name, ae, be });
        } else if (ae.resolvedFile !== be.resolvedFile) {
          pathOnly.push({ name, ae, be });
        }
      }
      const totalFlips = becameMissing.length + becameAvailable.length + pathOnly.length;
      if (totalFlips > 0) {
        section.push("    subpaths resolution:");
        const renderBucket = (label, sym, items) => {
          if (items.length === 0) return;
          section.push(`      ${label} (${items.length}):`);
          for (const { name, ae, be } of items.slice(0, OFFENDER_DIFF_CAP)) {
            section.push(
              `        ${sym} ${name}: ${ae.resolvedFile ?? "—"} → ${be.resolvedFile ?? "—"}`,
            );
          }
          if (items.length > OFFENDER_DIFF_CAP) {
            section.push(`        … and ${items.length - OFFENDER_DIFF_CAP} more`);
          }
        };
        renderBucket("⚠ became MISSING", "⚠", becameMissing);
        renderBucket("✓ became AVAILABLE", "✓", becameAvailable);
        renderBucket("~ resolved-path changed", "~", pathOnly);
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
