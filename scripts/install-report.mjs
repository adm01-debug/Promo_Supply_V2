#!/usr/bin/env node
import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { resolveLockedVersion } from "./lib/resolve-locked-version.mjs";
import { renderMismatch } from "./lib/semver-diff.mjs";

// CLI flags:
//   --strict   exit 1 when spec / lock / installed are not aligned (default: exit 0)
const STRICT = process.argv.slice(2).some((a) => a === "--strict");

const ROOT = process.cwd();
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const SPEC = PKG.dependencies?.["date-fns"] ?? PKG.devDependencies?.["date-fns"] ?? "—";

const dfPkgPath = join(ROOT, "node_modules", "date-fns", "package.json");
const INSTALLED = existsSync(dfPkgPath)
  ? JSON.parse(readFileSync(dfPkgPath, "utf8")).version
  : "(not installed)";

const lockPath = join(ROOT, "bun.lock");
let LOCKED = "—";
let lockSha = "—";
let lockSize = 0;
if (existsSync(lockPath)) {
  const buf = readFileSync(lockPath);
  lockSha = createHash("sha256").update(buf).digest("hex").slice(0, 16);
  lockSize = statSync(lockPath).size;
  const resolved = resolveLockedVersion(buf.toString("utf8"), "date-fns");
  if (resolved) LOCKED = resolved;
}

let dfSha = "—";
if (existsSync(dfPkgPath)) {
  // Hash the installed package.json as a cheap proxy for tarball identity
  dfSha = createHash("sha256")
    .update(readFileSync(dfPkgPath))
    .digest("hex")
    .slice(0, 16);
}

const aligned =
  SPEC.replace(/^[\^~]/, "") === INSTALLED && INSTALLED === LOCKED;

const line = (k, v) => `  ${k.padEnd(22)} ${v}`;
console.log("──────── Install verification report ────────");
console.log(line("date-fns spec",       SPEC));
console.log(line("date-fns locked",     LOCKED));
console.log(line("date-fns installed",  INSTALLED));
console.log(line("date-fns pkg sha256", dfSha));
console.log(line("bun.lock sha256",     lockSha));
console.log(line("bun.lock size",       `${lockSize} bytes`));
console.log(line("alignment",           aligned ? "✓ spec / lock / installed match" : "✗ DRIFT"));
console.log("─────────────────────────────────────────────");

if (!aligned) {
  const SPEC_NORM = SPEC.replace(/^[\^~]/, "");
  const specEqLock = SPEC_NORM === LOCKED;
  const lockEqInstalled = LOCKED === INSTALLED;
  const specEqInstalled = SPEC_NORM === INSTALLED;
  console.log("\n  Mismatch detail:");
  if (!specEqLock && lockEqInstalled) {
    console.log(renderMismatch("spec", SPEC_NORM, "locked", LOCKED));
  } else if (specEqLock && !lockEqInstalled) {
    console.log(renderMismatch("locked", LOCKED, "installed", INSTALLED));
  } else if (specEqInstalled && !specEqLock) {
    console.log(renderMismatch("spec", SPEC_NORM, "locked", LOCKED));
  } else {
    console.log(renderMismatch("spec", SPEC_NORM, "locked", LOCKED));
    console.log("");
    console.log(renderMismatch("locked", LOCKED, "installed", INSTALLED));
  }
  if (STRICT) {
    console.error("\n✗ install-report --strict: spec / lock / installed drift detected.");
    process.exit(1);
  }
}
