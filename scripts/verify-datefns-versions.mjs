#!/usr/bin/env node
/**
 * One-shot gate: verifies date-fns is aligned across
 *   - package.json spec
 *   - bun.lock resolved version
 *   - node_modules installed version
 *
 * Exits 0 on alignment, 1 on any drift or missing source.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function fail(msg) {
  console.error(msg);
  process.exit(1);
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
const lockMatch = lockText.match(/"date-fns@(\d+\.\d+\.\d+)"/);
if (!lockMatch)
  fail("✗ date-fns entry not found in bun.lock — run `bun install`.");
const LOCKED = lockMatch[1];

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

const aligned = SPEC_NORM === LOCKED && LOCKED === INSTALLED;

if (!aligned) {
  const mark = (v, ref) => (v === ref ? "" : "   ← MISMATCH");
  const ref = INSTALLED;
  console.error("✗ date-fns version drift detected:\n");
  console.error(`    package.json spec : ${SPEC}  (normalized: ${SPEC_NORM})${mark(SPEC_NORM, ref)}`);
  console.error(`    bun.lock resolved : ${LOCKED}${mark(LOCKED, ref)}`);
  console.error(`    node_modules      : ${INSTALLED}`);
  console.error("\n  Fix: rm -rf node_modules && bun install --frozen-lockfile");
  process.exit(1);
}

console.log(
  `✓ date-fns ${INSTALLED} aligned across spec / lock / node_modules`,
);
