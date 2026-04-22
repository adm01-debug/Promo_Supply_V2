#!/usr/bin/env node
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { resolveLockedVersion } from "./lib/resolve-locked-version.mjs";
import { renderMismatch, renderTripleMismatch } from "./lib/semver-diff.mjs";

// CLI flags:
//   --strict          exit 1 when spec / lock / installed are not aligned (default: exit 0)
//   --json            emit a single JSON object (no human-readable lines) for log
//                     parsing / dashboards. Combines with --strict.
//   --json-file=PATH  also write the JSON payload to PATH (creates parent dirs).
//                     Works with or without --json: when used alone, the human
//                     report still prints to stdout and the file gets the JSON.
const argv = process.argv.slice(2);
const STRICT = argv.includes("--strict");
const JSON_MODE = argv.includes("--json");
const JSON_FILE = (() => {
  const flag = argv.find((a) => a === "--json-file" || a.startsWith("--json-file="));
  if (!flag) return null;
  if (flag.includes("=")) return flag.slice(flag.indexOf("=") + 1) || null;
  // Support space-separated form: --json-file path/to/out.json
  const idx = argv.indexOf(flag);
  return argv[idx + 1] && !argv[idx + 1].startsWith("--") ? argv[idx + 1] : null;
})();

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

const SPEC_NORM = SPEC.replace(/^[\^~]/, "");

if (JSON_MODE) {
  const payload = {
    generatedAt: new Date().toISOString(),
    dateFns: {
      spec: SPEC,
      specNormalized: SPEC_NORM,
      locked: LOCKED,
      installed: INSTALLED,
      pkgSha256: dfSha,
      exactPinned: /^[0-9]/.test(SPEC),
    },
    bunLock: { sha256: lockSha, sizeBytes: lockSize },
    alignment: {
      aligned,
      specEqLocked: SPEC_NORM === LOCKED,
      lockedEqInstalled: LOCKED === INSTALLED,
      specEqInstalled: SPEC_NORM === INSTALLED,
    },
    strict: STRICT,
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  if (!aligned && STRICT) process.exit(1);
} else {
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
    const specEqLock = SPEC_NORM === LOCKED;
    const lockEqInstalled = LOCKED === INSTALLED;
    const specEqInstalled = SPEC_NORM === INSTALLED;
    console.log("\n  Mismatch detail:");
    if (!specEqLock && lockEqInstalled) {
      console.log(renderMismatch("spec", SPEC_NORM, "locked", LOCKED, { caseLabel: "spec↔locked" }));
    } else if (specEqLock && !lockEqInstalled) {
      console.log(renderMismatch("locked", LOCKED, "installed", INSTALLED, { caseLabel: "locked↔installed" }));
    } else if (specEqInstalled && !specEqLock) {
      console.log(renderMismatch("spec", SPEC_NORM, "locked", LOCKED, { caseLabel: "spec↔locked" }));
    } else {
      // All three differ — labeled triple block with summary line.
      console.log(renderTripleMismatch(SPEC_NORM, LOCKED, INSTALLED));
    }
    if (STRICT) {
      console.error("\n✗ install-report --strict: spec / lock / installed drift detected.");
      process.exit(1);
    }
  }
}