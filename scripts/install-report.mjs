#!/usr/bin/env node
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, resolve as resolvePath } from "node:path";
import { resolveLockedVersion } from "./lib/resolve-locked-version.mjs";
import { renderMismatch, renderTripleMismatch } from "./lib/semver-diff.mjs";

// CLI flags:
//   --strict          exit 1 when spec / lock / installed are not aligned (default: exit 0)
//   --json            emit a single JSON object (no human-readable lines) for log
//                     parsing / dashboards. Combines with --strict.
//   --json-file=PATH  also write the JSON payload to PATH (creates parent dirs).
//                     Works with or without --json: when used alone, the human
//                     report still prints to stdout and the file gets the JSON.
//   --drift-summary-only
//                     In human mode, print only the per-block drift summary
//                     lines under "Mismatch detail:" — skip the multi-line
//                     caret diff blocks. Ignored with --json (the JSON payload
//                     already contains structured alignment data).
const argv = process.argv.slice(2);
const STRICT = argv.includes("--strict");
const JSON_MODE = argv.includes("--json");
const SUMMARY_ONLY = argv.includes("--drift-summary-only");
const HELP = argv.includes("--help") || argv.includes("-h");
function readValueFlag(name) {
  const eqForm = `${name}=`;
  const flag = argv.find((a) => a === name || a.startsWith(eqForm));
  if (!flag) return null;
  if (flag.includes("=")) return flag.slice(flag.indexOf("=") + 1) || null;
  // Support space-separated form: --flag value
  const idx = argv.indexOf(flag);
  return argv[idx + 1] && !argv[idx + 1].startsWith("--") ? argv[idx + 1] : null;
}
const JSON_FILE = readValueFlag("--json-file");
// --json-file-mode: pretty (default, 2-space indent, trailing newline) or
// minified (single line, no trailing whitespace). Minified is the right
// choice for diff-stable caching keys (sha256 the file) and for tools that
// hash artifacts byte-for-byte (e.g. actions/cache key inputs). Pretty is
// the right choice when humans will read the file on the artifact tab.
const JSON_FILE_MODE_RAW = readValueFlag("--json-file-mode") ?? "pretty";
const JSON_FILE_MODE = JSON_FILE_MODE_RAW.toLowerCase();
if (!["pretty", "minified"].includes(JSON_FILE_MODE)) {
  console.error(
    `[install-report] invalid --json-file-mode=${JSON_FILE_MODE_RAW} (expected: pretty | minified)`,
  );
  process.exit(2);
}

if (HELP) {
  console.log(
    [
      "Usage: node scripts/install-report.mjs [options]",
      "",
      "Reports the alignment of date-fns across three sources:",
      "  • spec       — version range declared in package.json",
      "  • locked     — resolved version recorded in bun.lock",
      "  • installed  — actual version under node_modules/date-fns",
      "",
      "Options:",
      "  --strict              Exit 1 when spec / lock / installed are not aligned.",
      "                        Default: exit 0 even on drift (report-only).",
      "",
      "  --json                Emit a single JSON object to stdout instead of the",
      "                        human-readable report. Combines with --strict.",
      "",
      "  --drift-summary-only  In human mode, print only the per-block drift",
      "                        summary lines under \"Mismatch detail:\" — skip the",
      "                        multi-line caret diff blocks. Ignored with --json",
      "                        (the JSON payload already contains structured",
      "                        alignment data).",
      "",
      "  --json-file=PATH      Also write the JSON payload to PATH. Parent",
      "  --json-file PATH      directories are created automatically (recursive",
      "                        mkdir). Both `=` and space-separated forms work.",
      "",
      "                        On success, logs to stderr (in BOTH --json and",
      "                        human modes):",
      "                          [install-report] wrote JSON → <ABS_PATH> (<N> bytes)",
      "                        Stderr is used so --json's stdout-as-JSON contract",
      "                        stays intact and CI logs still show the artifact",
      "                        path + size for sanity-checking uploads.",
      "",
      "                        If the write fails (permissions, bad path), the",
      "                        script exits 2 with the OS error message.",
      "",
      "  --json-file-mode=MODE Format of the file written by --json-file:",
      "                          • pretty   (default) — 2-space indent, trailing",
      "                            newline. Best for humans reading the artifact.",
      "                          • minified — single line, no trailing whitespace.",
      "                            Best for diff-stable cache keys (sha256 the",
      "                            file) and byte-for-byte artifact hashing in",
      "                            CI cache actions. Ignored when --json-file is",
      "                            not set. Invalid values exit 2.",
      "",
      "  --help, -h            Show this help and exit 0.",
      "",
      "Examples:",
      "  # Print the human report to the terminal (no file, no strict gating).",
      "  node scripts/install-report.mjs",
      "",
      "  # CI: fail the job on drift, JSON to stdout for log scrapers.",
      "  node scripts/install-report.mjs --strict --json",
      "",
      "  # CI: write the JSON artifact to disk AND keep the human log,",
      "  # creating ci-artifacts/ on the fly. Pairs with actions/upload-artifact.",
      "  node scripts/install-report.mjs --json-file=ci-artifacts/install-report.json",
      "",
      "  # CI: dual-channel — JSON on stdout for piping, file for upload, strict",
      "  # gating so a drifted install fails the build.",
      "  node scripts/install-report.mjs --strict --json \\",
      "    --json-file=ci-artifacts/install-report.json",
      "",
      "  # Compact terminal report — drop the caret diffs, keep the per-pair",
      "  # drift summary lines. Useful when scrolling long CI logs.",
      "  node scripts/install-report.mjs --drift-summary-only",
      "",
      "Exit codes:",
      "  0  Aligned, OR drift detected without --strict, OR --help.",
      "  1  Drift detected with --strict.",
      "  2  --json-file write failed (e.g. EACCES, ENOENT on parent).",
    ].join("\n"),
  );
  process.exit(0);
}


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

// --json-file always writes the payload, regardless of stdout mode. Useful
// for `bun run verify:install-report --json-file=ci-artifacts/...json` where
// the human report still goes to the build log.
//
// On success we log BOTH the absolute resolved path (so a CI log reader can
// click/copy it without guessing the working dir) AND the byte count
// (cheap sanity check that the artifact isn't empty / truncated). In --json
// mode the confirmation goes to stderr to avoid polluting the JSON-on-
// stdout contract; in human mode it also goes to stderr for consistency
// with the existing wording.
if (JSON_FILE) {
  try {
    const absPath = resolvePath(JSON_FILE);
    mkdirSync(dirname(absPath), { recursive: true });
    const body = JSON.stringify(payload, null, 2) + "\n";
    writeFileSync(absPath, body);
    const bytes = statSync(absPath).size;
    console.error(
      `[install-report] wrote JSON → ${absPath} (${bytes} bytes)`,
    );
  } catch (e) {
    console.error(`[install-report] failed to write --json-file=${JSON_FILE}: ${e instanceof Error ? e.message : e}`);
    process.exit(2);
  }
}

if (JSON_MODE) {
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
      console.log(renderMismatch("spec", SPEC_NORM, "locked", LOCKED, { caseLabel: "spec↔locked", summaryOnly: SUMMARY_ONLY }));
    } else if (specEqLock && !lockEqInstalled) {
      console.log(renderMismatch("locked", LOCKED, "installed", INSTALLED, { caseLabel: "locked↔installed", summaryOnly: SUMMARY_ONLY }));
    } else if (specEqInstalled && !specEqLock) {
      console.log(renderMismatch("spec", SPEC_NORM, "locked", LOCKED, { caseLabel: "spec↔locked", summaryOnly: SUMMARY_ONLY }));
    } else {
      // All three differ — labeled triple block with summary line.
      console.log(renderTripleMismatch(SPEC_NORM, LOCKED, INSTALLED, { summaryOnly: SUMMARY_ONLY }));
    }
    if (STRICT) {
      console.error("\n✗ install-report --strict: spec / lock / installed drift detected.");
      process.exit(1);
    }
  }
}