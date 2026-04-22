#!/usr/bin/env node
/**
 * Generates public/dependency-health.json from package.json + bun.lock.
 * Reusable by CI workflows or local invocation via `bun run deps:health`.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, relative, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { resolveLockedVersion } from "./lib/resolve-locked-version.mjs";
import { validateSnapshot, failOnInvalid } from "./lib/validate-dependency-health.mjs";
import {
  BARREL_IMPORT_RE,
  computeRiskLevel,
  findBarrelOffenders,
  DEFAULT_RULES,
} from "./lib/tree-shaking-risk.mjs";
import { loadAllowlist, applyAllowlist } from "./lib/dependency-health-allowlist.mjs";
import { loadRules } from "./lib/dependency-health-rules.mjs";

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SCAN_SKIP_DIRS = new Set(["node_modules", "dist", "build", ".next", "coverage"]);
const OFFENDERS_CAP = 50;
// Bump when scan logic/regex changes to invalidate stale caches.
const SCAN_VERSION = "1";

function walkSourceFiles(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SCAN_SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      // Skip intentional ESLint fixtures (they contain deliberate violations)
      if (full.includes(`${"eslint-rules"}/__fixtures__`) || full.endsWith("__fixtures__")) continue;
      walkSourceFiles(full, out);
    } else if (st.isFile()) {
      const dot = name.lastIndexOf(".");
      if (dot !== -1 && SCAN_EXTENSIONS.has(name.slice(dot))) out.push(full);
    }
  }
  return out;
}

function scanTreeShaking(rootDir, previous, rulesCtx) {
  const srcDir = resolve(rootDir, "src");
  const offenders = [];
  let filesScanned = 0;
  let barrelImportsFound = 0;
  let truncated = false;
  const rules = rulesCtx?.rules ?? DEFAULT_RULES;
  const rulesFingerprint = rulesCtx?.fingerprint ?? "default";

  if (!existsSync(srcDir)) {
    return {
      scannedAt: new Date().toISOString(),
      filesScanned: 0,
      barrelImportsFound: 0,
      offenders: [],
      truncated: false,
      riskLevel: "ok",
      cacheKey: createHash("sha256").update(`v${SCAN_VERSION}|${rulesFingerprint}|empty`).digest("hex"),
      cacheHit: false,
      rulesSource: rulesCtx?.source ?? "default",
    };
  }

  // Build deterministic cache key from file paths + mtime + size + scan config + rules.
  const files = walkSourceFiles(srcDir).sort();
  const hash = createHash("sha256");
  hash.update(`v${SCAN_VERSION}|${BARREL_IMPORT_RE.source}|${rulesFingerprint}|`);
  for (const file of files) {
    let st;
    try {
      st = statSync(file);
    } catch {
      continue;
    }
    hash.update(`${relative(rootDir, file)}|${st.size}|${st.mtimeMs}\n`);
  }
  const cacheKey = hash.digest("hex");

  // Cache hit: reuse previous tree-shaking result without re-reading files.
  if (previous && previous.cacheKey === cacheKey) {
    return {
      ...previous,
      cacheHit: true,
      rulesSource: rulesCtx?.source ?? "default",
    };
  }

  for (const file of files) {
    filesScanned++;
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const hits = findBarrelOffenders(content, rules);
    for (const hit of hits) {
      barrelImportsFound++;
      if (offenders.length >= OFFENDERS_CAP) {
        truncated = true;
        continue;
      }
      offenders.push({
        file: relative(rootDir, file).replace(/\\/g, "/"),
        line: hit.line,
        importPath: hit.specifier,
      });
    }
  }

  const riskLevel = computeRiskLevel(barrelImportsFound);
  return {
    scannedAt: new Date().toISOString(),
    filesScanned,
    barrelImportsFound,
    offenders,
    truncated,
    riskLevel,
    cacheKey,
    cacheHit: false,
    rulesSource: rulesCtx?.source ?? "default",
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Compute health record for a single package.
 * @param {object} pkg package.json contents
 * @param {string} lockText raw bun.lock contents
 * @param {{name:string,label:string,npmName:string,location:"dependencies"|"devDependencies"}} entry
 */
function computePackageHealth(pkg, lockText, entry) {
  const spec = pkg?.[entry.location]?.[entry.npmName] ?? "";
  const locked = resolveLockedVersion(lockText, entry.npmName) ?? "";

  let installed = locked;
  const installedPkgPath = resolve(root, `node_modules/${entry.npmName}/package.json`);
  if (existsSync(installedPkgPath)) {
    try {
      installed = readJson(installedPkgPath).version ?? locked;
    } catch {
      installed = locked;
    }
  }

  const exactPinned = /^\d+\.\d+\.\d+$/.test(spec);
  const normalizedSpec = spec.replace(/^[\^~]/, "");
  const driftDetected = Boolean(spec && locked && normalizedSpec !== locked);

  return {
    name: entry.name,
    label: entry.label,
    spec,
    installed,
    locked,
    exactPinned,
    driftDetected,
  };
}

const TRACKED = [
  { name: "date-fns", label: "date-fns", npmName: "date-fns", location: "dependencies" },
  { name: "react", label: "React", npmName: "react", location: "dependencies" },
  { name: "vite", label: "Vite", npmName: "vite", location: "devDependencies" },
  { name: "typescript", label: "TypeScript", npmName: "typescript", location: "devDependencies" },
  {
    name: "shadcn-ui",
    label: "shadcn/ui (radix-dialog proxy)",
    npmName: "@radix-ui/react-dialog",
    location: "dependencies",
  },
];

function main() {
  const pkgPath = resolve(root, "package.json");
  const lockPath = resolve(root, "bun.lock");
  const outDir = resolve(root, "public");
  const outPath = resolve(outDir, "dependency-health.json");

  if (!existsSync(pkgPath)) {
    console.error(`✗ package.json not found at ${pkgPath}`);
    process.exit(1);
  }
  if (!existsSync(lockPath)) {
    console.error(`✗ bun.lock not found at ${lockPath}`);
    process.exit(1);
  }

  const pkg = readJson(pkgPath);
  const lockText = readFileSync(lockPath, "utf8");

  // Try both locations for shadcn proxy in case it lives in devDependencies in some forks.
  const packages = TRACKED.map((entry) => {
    const primary = computePackageHealth(pkg, lockText, entry);
    if (!primary.spec && entry.location === "dependencies") {
      const alt = computePackageHealth(pkg, lockText, { ...entry, location: "devDependencies" });
      if (alt.spec) return alt;
    }
    return primary;
  });

  const dateFnsEntry = packages.find((p) => p.name === "date-fns") ?? {
    spec: "",
    installed: "",
    locked: "",
    exactPinned: false,
  };

  const aggregateDrift = packages.some((p) => p.driftDetected);
  const now = new Date().toISOString();

  // Load + validate the previous snapshot ONCE so we can (a) reuse the
  // tree-shaking cache and (b) preserve the dateFns.subpaths block written
  // by `verify-datefns-files --write-health`. A malformed previous snapshot
  // is fatal: silently overwriting it would erase whatever sibling tools
  // (verifier, smoke runner) had stored, and silently ignoring it would
  // hand out a stale tree-shaking cache. Fail fast with a fix recipe.
  let existing;
  if (existsSync(outPath)) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(outPath, "utf8"));
    } catch (err) {
      failOnInvalid(err, { sourcePath: relative(root, outPath), role: "generate-dependency-health" });
    }
    try {
      existing = validateSnapshot(parsed);
    } catch (err) {
      failOnInvalid(err, { sourcePath: relative(root, outPath), role: "generate-dependency-health" });
    }
  }
  const previousTreeShaking = existing?.treeShaking;
  const rawTreeShaking = scanTreeShaking(root, previousTreeShaking);

  // Apply the per-package allowlist of known false positives. The raw
  // scan result is cached as-is (so toggling an allowlist entry doesn't
  // re-read every file); suppression is applied on top here. Expired
  // entries are surfaced in the snapshot so reviewers can prune them.
  const allowlistPath = resolve(root, ".dependency-health-allowlist.json");
  let allowlist;
  try {
    allowlist = loadAllowlist(allowlistPath);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
  const { kept, suppressed } = applyAllowlist(rawTreeShaking.offenders ?? [], allowlist.entries);
  const suppressedCount = (rawTreeShaking.barrelImportsFound ?? 0) - kept.length;
  const treeShaking = {
    ...rawTreeShaking,
    offenders: kept,
    barrelImportsFound: Math.max(0, (rawTreeShaking.barrelImportsFound ?? 0) - suppressedCount),
    riskLevel: computeRiskLevel(Math.max(0, (rawTreeShaking.barrelImportsFound ?? 0) - suppressedCount)),
    suppressed,
    suppressedCount,
    expiredAllowlistEntries: allowlist.expired,
  };

  const snapshot = {
    generatedAt: now,
    dateFns: {
      spec: dateFnsEntry.spec,
      installed: dateFnsEntry.installed,
      locked: dateFnsEntry.locked,
      exactPinned: dateFnsEntry.exactPinned,
    },
    packages,
    lockfileDrift: {
      detected: aggregateDrift,
      lastCheckedAt: now,
      source: "scripts/generate-dependency-health.mjs",
    },
    treeShaking,
  };

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  // Preserve the dateFns.subpaths block written by --write-health. Schema
  // already validated above, so we can graft it on without re-checking.
  if (existing?.dateFns?.subpaths) {
    snapshot.dateFns.subpaths = existing.dateFns.subpaths;
  }

  // Pre-write guard: the bytes we're about to commit must round-trip AND
  // match the schema. Catches programmer errors in this generator before
  // they corrupt the on-disk file.
  try {
    validateSnapshot(snapshot);
  } catch (err) {
    failOnInvalid(err, { sourcePath: relative(root, outPath), role: "generate-dependency-health (pre-write)" });
  }

  writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  console.log(`✓ Wrote ${outPath}`);
  for (const p of packages) {
    console.log(
      `  ${p.label.padEnd(34)} spec=${p.spec || "—"} locked=${p.locked || "—"} installed=${p.installed || "—"} drift=${p.driftDetected}`,
    );
  }
  console.log(
    `  tree-shaking: scanned=${treeShaking.filesScanned} barrelImports=${treeShaking.barrelImportsFound} suppressed=${treeShaking.suppressedCount} risk=${treeShaking.riskLevel} cache=${treeShaking.cacheHit ? "HIT" : "MISS"}`,
  );
  if (treeShaking.expiredAllowlistEntries.length > 0) {
    console.warn(
      `  ⚠ ${treeShaking.expiredAllowlistEntries.length} allowlist entr${treeShaking.expiredAllowlistEntries.length === 1 ? "y has" : "ies have"} expired — review .dependency-health-allowlist.json`,
    );
  }
}

main();
