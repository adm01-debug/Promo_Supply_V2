#!/usr/bin/env node
/**
 * Emit a structured, human-readable mismatch report for the CI smoke flow.
 *
 * For every package in `--pkg <name>` (default: `date-fns`), this collects
 * the three version sources used by our verifiers:
 *
 *   1. spec       — the range/exact-version string declared in package.json
 *   2. locked     — the resolved version recorded in bun.lock
 *   3. installed  — the actual version in node_modules/<pkg>/package.json
 *
 * It then renders a labeled drift block — one of:
 *   - aligned (no drift)
 *   - single pairwise drift (spec↔locked OR locked↔installed), labeled
 *   - triple mismatch (all three differ) → uses renderTripleMismatch which
 *     prints both labeled blocks and a one-line summary describing the
 *     compound drift level (e.g. "spec→locked is minor, then
 *     locked→installed is major").
 *
 * Output:
 *   - Prints the structured block to stdout, framed by a banner so it's
 *     trivially greppable in CI scrollback.
 *   - When `--out <path>` is given, ALSO writes the same block to disk so
 *     CI can pick it up as an uploaded artifact (see ci-check.sh / the
 *     existing `actions/upload-artifact` step that uploads `ci-logs/`).
 *
 * Always exits 0 — this is a report, not a gate. The gates remain
 * scripts/verify-datefns-versions.mjs and the smoke vitest run itself.
 *
 * Usage:
 *   node scripts/emit-mismatch-report.mjs [--pkg date-fns ...] [--out <path>]
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { resolveLockedVersion } from "./lib/resolve-locked-version.mjs";
import {
  classifyDiff,
  renderMismatch,
  renderTripleMismatch,
  renderUnifiedDiff,
} from "./lib/semver-diff.mjs";

const ROOT = process.cwd();

function argVals(flag) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === flag && process.argv[i + 1]) out.push(process.argv[i + 1]);
  }
  return out;
}
function argVal(flag, fallback = "") {
  const vals = argVals(flag);
  return vals.length > 0 ? vals[0] : fallback;
}

const packages = argVals("--pkg");
if (packages.length === 0) packages.push("date-fns");
const outPath = argVal("--out", "");

function readPackageJson() {
  try {
    return JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  } catch {
    return {};
  }
}
function readLock() {
  const p = join(ROOT, "bun.lock");
  return existsSync(p) ? readFileSync(p, "utf8") : "";
}
function readInstalled(name) {
  const p = join(ROOT, "node_modules", name, "package.json");
  if (!existsSync(p)) return "";
  try {
    return JSON.parse(readFileSync(p, "utf8")).version ?? "";
  } catch {
    return "";
  }
}

function collect(name, pkg, lockText) {
  const spec = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name] ?? "";
  const specNormalized = spec.replace(/^[\^~]/, "");
  const locked = lockText ? (resolveLockedVersion(lockText, name) ?? "") : "";
  const installed = readInstalled(name);
  return { name, spec, specNormalized, locked, installed };
}

/**
 * Render a single package's mismatch block. Returns the block as a string;
 * never throws. Mirrors the case-selection logic in verify-datefns-versions
 * + verify-package-versions so the CI report is byte-identical to what a
 * contributor sees locally.
 */
function renderPackageBlock({ name, spec, specNormalized, locked, installed }) {
  const lines = [];
  lines.push(`── ${name} ──`);
  lines.push(`  spec      : ${spec || "<not declared>"}`);
  lines.push(`  locked    : ${locked || "<not in bun.lock>"}`);
  lines.push(`  installed : ${installed || "<not in node_modules>"}`);

  // Missing-data short-circuits: emit a clear status line and skip the diff.
  if (!spec) {
    lines.push("  status    : ⚠ skipped — package not declared in package.json");
    return lines.join("\n");
  }
  if (!locked) {
    lines.push("  status    : ⚠ skipped — no resolution entry found in bun.lock");
    return lines.join("\n");
  }
  if (!installed) {
    lines.push("  status    : ⚠ skipped — package not installed under node_modules/");
    return lines.join("\n");
  }

  const sn = specNormalized;
  const specEqLock = sn === locked;
  const lockEqInstalled = locked === installed;
  const specEqInstalled = sn === installed;

  if (specEqLock && lockEqInstalled) {
    lines.push("  status    : ✓ aligned (spec = locked = installed)");
    return lines.join("\n");
  }

  lines.push("  status    : ✗ drift detected");
  lines.push("");
  lines.push("  Mismatch detail:");

  if (!specEqLock && lockEqInstalled) {
    lines.push(renderMismatch("spec", sn, "locked", locked, { caseLabel: "spec↔locked" }));
  } else if (specEqLock && !lockEqInstalled) {
    lines.push(
      renderMismatch("locked", locked, "installed", installed, {
        caseLabel: "locked↔installed",
      }),
    );
  } else if (specEqInstalled && !specEqLock) {
    // Lockfile is the odd one out — surfaces "lockfile is stale, install
    // happened to match spec" cases. Label as spec↔locked so the contributor
    // sees which file they need to refresh.
    lines.push(renderMismatch("spec", sn, "locked", locked, { caseLabel: "spec↔locked" }));
  } else {
    // All three differ — labeled triple block + summary line.
    lines.push(renderTripleMismatch(sn, locked, installed));
  }

  // Unified-diff style summary (normalized spec vs installed). Color is
  // force-disabled because this exact same string is also written to disk
  // (see `--out` path); the artifact stays grep-friendly. Contributors
  // who want color can re-run the verifier scripts directly in a TTY.
  lines.push("");
  lines.push("  Unified diff (spec vs installed):");
  lines.push(renderUnifiedDiff("spec", sn, "installed", installed, { color: false }));

  // One-line drift summary at the end so log scrapers / dashboards can pull
  // a single grep-friendly verdict per package without parsing the block.
  const { level: l1 } = classifyDiff(sn, locked);
  const { level: l2 } = classifyDiff(locked, installed);
  lines.push("");
  lines.push(
    `  drift summary: spec→locked=${l1}  locked→installed=${l2}` +
      `  (spec=${sn}, locked=${locked}, installed=${installed})`,
  );
  return lines.join("\n");
}

function main() {
  const pkg = readPackageJson();
  const lockText = readLock();

  const banner = "═".repeat(72);
  const out = [];
  out.push(banner);
  out.push("  CI MISMATCH REPORT — spec ↔ locked ↔ installed");
  out.push(`  generated: ${new Date().toISOString()}`);
  out.push(`  packages : ${packages.join(", ")}`);
  out.push(banner);
  out.push("");

  for (const name of packages) {
    out.push(renderPackageBlock(collect(name, pkg, lockText)));
    out.push("");
  }

  out.push(banner);
  const text = out.join("\n");

  // Print to stdout so the block lands in the smoke log (ci-check.sh tee's
  // every step into ci-logs/, which the workflow uploads as an artifact).
  process.stdout.write(text + "\n");

  // Optionally also write to a dedicated file for direct artifact pickup —
  // surfaced in CI as `ci-logs/datefns-mismatch-report.txt` by ci-check.sh.
  if (outPath) {
    const abs = resolve(ROOT, outPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text + "\n", "utf8");
    console.log(`✓ Wrote mismatch report to ${abs}`);
  }
  process.exit(0);
}

main();
