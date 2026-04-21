#!/usr/bin/env node
/**
 * Emit a small per-run dependency-health JSON snapshot for the smoke flow.
 *
 * Always exits 0 — this is a report, not a gate. The actual gates remain
 * `verify-datefns-versions.mjs` and the smoke vitest run itself.
 *
 * Usage:
 *   node scripts/emit-smoke-health.mjs \
 *     --tsc-exit <n> --vitest-exit <n> [--out <path>]
 */
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, resolve } from "node:path";
import { resolveLockedVersion } from "./lib/resolve-locked-version.mjs";

const ROOT = process.cwd();

function argVal(flag, fallback = "") {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const tscExit = Number.parseInt(argVal("--tsc-exit", "0"), 10) || 0;
const vitestExit = Number.parseInt(argVal("--vitest-exit", "0"), 10) || 0;
const outPath = resolve(ROOT, argVal("--out", "ci-logs/datefns-smoke-health.json"));

// ── package.json spec ─────────────────────────────────────────────
let spec = "";
try {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  spec = pkg.dependencies?.["date-fns"] ?? pkg.devDependencies?.["date-fns"] ?? "";
} catch {
  /* leave spec empty */
}
const specNormalized = spec.replace(/^[\^~]/, "");
const exactPinned = spec !== "" && /^[0-9]/.test(spec);

// ── bun.lock resolved version + hash + size ───────────────────────
const lockPath = join(ROOT, "bun.lock");
let locked = "";
let lockSha = "";
let lockSize = 0;
if (existsSync(lockPath)) {
  const buf = readFileSync(lockPath);
  lockSha = createHash("sha256").update(buf).digest("hex").slice(0, 16);
  lockSize = statSync(lockPath).size;
  locked = resolveLockedVersion(buf.toString("utf8"), "date-fns") ?? "";
}

// ── installed version ─────────────────────────────────────────────
const dfPkgPath = join(ROOT, "node_modules", "date-fns", "package.json");
let installed = "";
if (existsSync(dfPkgPath)) {
  try {
    installed = JSON.parse(readFileSync(dfPkgPath, "utf8")).version ?? "";
  } catch {
    /* leave installed empty */
  }
}

const aligned =
  spec !== "" &&
  locked !== "" &&
  installed !== "" &&
  specNormalized === locked &&
  locked === installed;

const report = {
  generatedAt: new Date().toISOString(),
  source: "scripts/emit-smoke-health.mjs",
  dateFns: {
    spec,
    specNormalized,
    locked,
    installed,
    exactPinned,
    aligned,
  },
  lockfile: {
    path: "bun.lock",
    sha256: lockSha,
    sizeBytes: lockSize,
  },
  smoke: {
    tscExitCode: tscExit,
    vitestExitCode: vitestExit,
  },
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(`✓ Wrote ${outPath} (aligned=${aligned})`);
process.exit(0);
