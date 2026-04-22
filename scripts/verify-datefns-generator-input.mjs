#!/usr/bin/env node
/**
 * Compute a stable hash of every input that feeds
 * scripts/generate-datefns-smoke-test.mjs:
 *
 *   1. The sorted list of every `date-fns/<subpath>` import path discovered
 *      under src/ (both static `from "date-fns/x"` and dynamic
 *      `import("date-fns/x")`). Paths only — not named exports — because
 *      this hash answers "did the set of subpaths the generator must
 *      process change?", which is the trigger for regeneration.
 *   2. The exact installed `date-fns` version (from
 *      node_modules/date-fns/package.json). A patch bump that adds or
 *      removes an export submodule needs a regen even if src/ is
 *      unchanged.
 *   3. The pinned spec from package.json (so pin drift between
 *      package.json and node_modules is caught too).
 *   4. A short fingerprint of the generator script itself, so editing the
 *      generator counts as an input change.
 *
 * Two modes (flags are mutually exclusive):
 *   --write   Compute the hash and write public/datefns-generator-input.json.
 *             Always exits 0 (used after a successful regeneration).
 *   --verify  Compute the hash and compare it to the stored value.
 *             Exits 0 on match, 2 on mismatch (= regeneration required),
 *             1 on hard error (missing files, invalid JSON, missing
 *             date-fns install).
 *   (default) Same as --verify but also prints the human-readable diff.
 *
 * Optional flags:
 *   --json    Emit machine-readable JSON on stdout (works with all modes).
 *   --quiet   Suppress the human summary.
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");
const STORE_FILE = join(ROOT, "public", "datefns-generator-input.json");
const PKG_FILE = join(ROOT, "package.json");
const INSTALLED_PKG_FILE = join(ROOT, "node_modules", "date-fns", "package.json");
const GENERATOR_FILE = join(ROOT, "scripts", "generate-datefns-smoke-test.mjs");

const EXCLUDE_DIRS = new Set(["test", "node_modules", ".git", "dist", "build"]);
const FILE_EXT = /\.(ts|tsx)$/;
// Capture every `date-fns/<subpath>` reference, both `from "..."` and
// `import("...")`. Group 1 is the subpath (no leading `date-fns/`).
const STATIC_RE = /from\s+["']date-fns\/([^"']+)["']/g;
const DYNAMIC_RE = /import\s*\(\s*["']date-fns\/([^"']+)["']\s*\)/g;

const HINT =
  "Run `node scripts/generate-datefns-smoke-test.mjs` and commit the " +
  "regenerated files (smoke test + manifest), then run " +
  "`node scripts/verify-datefns-generator-input.mjs --write` to refresh the " +
  "stored input hash.";

// ─── CLI ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let mode = "verify"; // 'verify' | 'write'
let asJson = false;
let quiet = false;
for (const a of args) {
  if (a === "--write") mode = "write";
  else if (a === "--verify") mode = "verify";
  else if (a === "--json") asJson = true;
  else if (a === "--quiet") quiet = true;
  else if (a === "--help" || a === "-h") {
    console.log(
      "Usage: node scripts/verify-datefns-generator-input.mjs [--verify|--write] [--json] [--quiet]",
    );
    process.exit(0);
  } else {
    console.error(`✗ Unknown argument: ${a}`);
    process.exit(1);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fail(msg) {
  console.error(`✗ ${msg}`);
  console.error(`  ${HINT}`);
  process.exit(1);
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (full === join(SRC_DIR, "test")) continue;
      if (EXCLUDE_DIRS.has(entry)) continue;
      walk(full, acc);
    } else if (FILE_EXT.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function collectSubpaths(src) {
  const out = new Set();
  for (const re of [STATIC_RE, DYNAMIC_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) out.add(m[1]);
  }
  return out;
}

function shortSha(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

// ─── 1. Scan src/ ───────────────────────────────────────────────────────────
if (!existsSync(SRC_DIR)) fail(`src/ directory missing at ${SRC_DIR}.`);

const subpaths = new Set();
for (const file of walk(SRC_DIR)) {
  const src = readFileSync(file, "utf8");
  for (const sp of collectSubpaths(src)) subpaths.add(sp);
}
const sortedSubpaths = [...subpaths].sort();

// ─── 2. Resolve date-fns version (installed + pinned spec) ─────────────────
let installedVersion = null;
if (existsSync(INSTALLED_PKG_FILE)) {
  try {
    installedVersion = JSON.parse(readFileSync(INSTALLED_PKG_FILE, "utf8")).version || null;
  } catch (err) {
    fail(`Cannot read installed date-fns package.json: ${err.message}`);
  }
} else if (mode === "write") {
  // For --write we hard-require the install (otherwise the stored hash is
  // meaningless).
  fail(`date-fns is not installed at ${INSTALLED_PKG_FILE}. Run \`bun install\` first.`);
}
// For --verify we tolerate a missing install (the verifier may run before
// `bun install` in some workflows) — record null and only compare what we have.

let pinnedSpec = null;
try {
  const pkg = JSON.parse(readFileSync(PKG_FILE, "utf8"));
  pinnedSpec =
    pkg.dependencies?.["date-fns"] ?? pkg.devDependencies?.["date-fns"] ?? null;
} catch (err) {
  fail(`Cannot read package.json: ${err.message}`);
}

// ─── 3. Generator fingerprint ──────────────────────────────────────────────
let generatorFingerprint = null;
if (existsSync(GENERATOR_FILE)) {
  generatorFingerprint = shortSha(readFileSync(GENERATOR_FILE, "utf8"));
} else {
  fail(`Generator script missing at ${relative(ROOT, GENERATOR_FILE)}.`);
}

// ─── 4. Compose the input hash ─────────────────────────────────────────────
const payloadObj = {
  schemaVersion: 1,
  subpaths: sortedSubpaths,
  installedDateFnsVersion: installedVersion,
  pinnedDateFnsSpec: pinnedSpec,
  generatorFingerprint,
};
const payload = JSON.stringify(payloadObj);
const inputHash = createHash("sha256").update(payload).digest("hex");

const computed = {
  schemaVersion: 1,
  computedAt: new Date().toISOString(),
  inputHash,
  inputs: payloadObj,
  totals: {
    subpaths: sortedSubpaths.length,
  },
};

// ─── 5. Mode dispatch ──────────────────────────────────────────────────────
if (mode === "write") {
  writeFileSync(STORE_FILE, JSON.stringify(computed, null, 2) + "\n");
  if (!quiet) {
    console.log(
      `✓ Wrote ${relative(ROOT, STORE_FILE)} ` +
        `(hash ${inputHash.slice(0, 12)}…, ${sortedSubpaths.length} subpaths, ` +
        `date-fns ${installedVersion ?? "?"}).`,
    );
  }
  if (asJson) process.stdout.write(JSON.stringify(computed, null, 2) + "\n");
  process.exit(0);
}

// verify mode
if (!existsSync(STORE_FILE)) {
  if (asJson) {
    process.stdout.write(
      JSON.stringify(
        { ...computed, status: "missing-store", regenerationRequired: true },
        null,
        2,
      ) + "\n",
    );
  }
  if (!quiet) {
    console.error(
      `✗ Stored generator-input file missing: ${relative(ROOT, STORE_FILE)}.`,
    );
    console.error(`  ${HINT}`);
  }
  process.exit(2);
}

let stored;
try {
  stored = JSON.parse(readFileSync(STORE_FILE, "utf8"));
} catch (err) {
  fail(`Stored generator-input is not valid JSON: ${err.message}`);
}

const matches = stored.inputHash === inputHash;
const diff = matches
  ? null
  : {
      subpaths: {
        added: sortedSubpaths.filter(
          (s) => !(stored.inputs?.subpaths || []).includes(s),
        ),
        removed: (stored.inputs?.subpaths || []).filter(
          (s) => !sortedSubpaths.includes(s),
        ),
      },
      installedDateFnsVersion: {
        previous: stored.inputs?.installedDateFnsVersion ?? null,
        current: installedVersion,
      },
      pinnedDateFnsSpec: {
        previous: stored.inputs?.pinnedDateFnsSpec ?? null,
        current: pinnedSpec,
      },
      generatorFingerprint: {
        previous: stored.inputs?.generatorFingerprint ?? null,
        current: generatorFingerprint,
      },
    };

const result = {
  ...computed,
  storedAt: stored.computedAt ?? null,
  storedHash: stored.inputHash ?? null,
  status: matches ? "match" : "mismatch",
  regenerationRequired: !matches,
  diff,
};

if (asJson) process.stdout.write(JSON.stringify(result, null, 2) + "\n");

if (!quiet) {
  if (matches) {
    console.log(
      `✓ Generator inputs unchanged (hash ${inputHash.slice(0, 12)}…, ` +
        `${sortedSubpaths.length} subpaths, date-fns ${installedVersion ?? "?"}).`,
    );
  } else {
    console.error("✗ Generator input hash mismatch — regeneration required.");
    console.error(`  stored : ${stored.inputHash?.slice(0, 12) ?? "?"}… (${stored.computedAt ?? "unknown"})`);
    console.error(`  current: ${inputHash.slice(0, 12)}… (${computed.computedAt})`);
    if (diff?.subpaths.added.length) {
      console.error(`  + added subpaths   : ${diff.subpaths.added.join(", ")}`);
    }
    if (diff?.subpaths.removed.length) {
      console.error(`  - removed subpaths : ${diff.subpaths.removed.join(", ")}`);
    }
    const v = diff?.installedDateFnsVersion;
    if (v && v.previous !== v.current) {
      console.error(`  ~ date-fns version : ${v.previous} → ${v.current}`);
    }
    const p = diff?.pinnedDateFnsSpec;
    if (p && p.previous !== p.current) {
      console.error(`  ~ pinned spec      : ${p.previous} → ${p.current}`);
    }
    const g = diff?.generatorFingerprint;
    if (g && g.previous !== g.current) {
      console.error(`  ~ generator script : ${g.previous} → ${g.current}`);
    }
    console.error(`  ${HINT}`);
  }
}

process.exit(matches ? 0 : 2);
