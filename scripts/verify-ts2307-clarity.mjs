#!/usr/bin/env node
/**
 * Verify that TypeScript's TS2307 ("Cannot find module") diagnostic includes
 * BOTH the exact bad module specifier AND a usable source location
 * (file path + line/column). This is a regression guard for the in-app
 * docs we ship under "Sonda TS2307" — if a future tsc/tsconfig change ever
 * stripped the specifier or the source frame from TS2307 output, our
 * troubleshooting docs would silently start lying. This script catches
 * that the next CI run.
 *
 * Strategy: write a throwaway .ts probe under a temp dir, point a focused
 * tsconfig at it, run `tsc --noEmit --pretty false`, then grep the output.
 * The probe lives OUTSIDE src/ so it can never accidentally pollute the
 * project type-check (the existing ci-check.sh `tsc -p tsconfig.app.json`
 * step would fail loudly if it did).
 *
 * Exits 0 on success, 1 on any assertion failure. Always cleans up the
 * probe directory, even on failure (try/finally).
 */
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const PROBE_DIR = join(ROOT, ".ts2307-probe");
const PROBE_FILE = join(PROBE_DIR, "probe.ts");
const PROBE_TSCONFIG = join(PROBE_DIR, "tsconfig.probe.json");
// Intentionally bogus subpath — must NOT exist on disk under date-fns.
const BAD_SPECIFIER = "date-fns/__ts2307_probe_missing__";

function log(line) {
  process.stdout.write(`[ts2307-clarity] ${line}\n`);
}

function fail(msg, output) {
  process.stderr.write(`\n✗ ts2307-clarity: ${msg}\n`);
  if (output) {
    process.stderr.write("\n──── tsc output (first 40 lines) ────\n");
    process.stderr.write(output.split("\n").slice(0, 40).join("\n") + "\n");
    process.stderr.write("─────────────────────────────────────\n");
  }
  process.exit(1);
}

function setupProbe() {
  // Clean any leftover from a previous interrupted run.
  if (existsSync(PROBE_DIR)) rmSync(PROBE_DIR, { recursive: true, force: true });
  mkdirSync(PROBE_DIR, { recursive: true });

  writeFileSync(
    PROBE_FILE,
    `// Auto-generated TS2307 probe. NEVER commit. See scripts/verify-ts2307-clarity.mjs.\n` +
      `import { format } from "${BAD_SPECIFIER}";\n` +
      `export const _ = format;\n`,
    "utf8",
  );

  // Minimal tsconfig: noEmit + bundler resolution to mirror project settings.
  // No "extends" — keeps the probe hermetic and immune to project config drift.
  writeFileSync(
    PROBE_TSCONFIG,
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
        include: ["probe.ts"],
      },
      null,
      2,
    ),
    "utf8",
  );
}

function runTsc() {
  // `--pretty false` → stable, grep-friendly output across tsc versions.
  const result = spawnSync(
    "bunx",
    ["tsc", "--noEmit", "--pretty", "false", "-p", PROBE_TSCONFIG],
    { cwd: ROOT, encoding: "utf8" },
  );
  // Combine stdout + stderr — tsc writes diagnostics to stdout, but some
  // wrappers (bunx, npx) shuffle that to stderr.
  return `${result.stdout || ""}${result.stderr || ""}`;
}

function main() {
  log(`creating probe → ${PROBE_FILE}`);
  setupProbe();

  let output = "";
  try {
    log("running: bunx tsc --noEmit --pretty false -p .ts2307-probe/tsconfig.probe.json");
    output = runTsc();

    // Assertion 1: tsc emitted TS2307 at all.
    if (!output.includes("TS2307")) {
      fail(
        "tsc did not emit TS2307. Either the bad specifier resolved (impossible — sanity check date-fns install) or tsc swallowed the error.",
        output,
      );
    }

    // Assertion 2: the diagnostic names the EXACT bad specifier (quoted).
    // tsc formats it as: ... Cannot find module 'date-fns/__ts2307_probe_missing__' ...
    if (!output.includes(`'${BAD_SPECIFIER}'`)) {
      fail(
        `TS2307 diagnostic does not include the exact bad specifier '${BAD_SPECIFIER}'. Docs would mislead users.`,
        output,
      );
    }

    // Assertion 3: a usable source location precedes the diagnostic.
    // Non-pretty tsc format is: <file>(<line>,<col>): error TS2307: ...
    // Match a line that contains BOTH "TS2307" and a "(line,col):" frame
    // pointing at probe.ts.
    const locRe = /probe\.ts\((\d+),(\d+)\):\s+error\s+TS2307:/;
    const m = output.match(locRe);
    if (!m) {
      fail(
        "TS2307 line is missing a 'probe.ts(line,col):' source frame. Without it, contributors can't jump to the bad import.",
        output,
      );
    }
    const [, line, col] = m;
    // Sanity: the import is on line 2 of the probe file.
    if (line !== "2") {
      fail(
        `TS2307 source frame points to probe.ts(${line},${col}) but the bad import is on line 2. Off-by-N regression in tsc?`,
        output,
      );
    }

    log("✓ TS2307 includes bad specifier");
    log(`✓ TS2307 includes source frame probe.ts(${line},${col})`);
    log("✓ all assertions passed");
  } finally {
    // ALWAYS clean up — leaving .ts2307-probe/ around would (a) confuse git
    // status and (b) eventually get picked up by a wider tsc include glob.
    if (existsSync(PROBE_DIR)) {
      rmSync(PROBE_DIR, { recursive: true, force: true });
      log(`cleaned up ${PROBE_DIR}`);
    }
  }
}

main();
