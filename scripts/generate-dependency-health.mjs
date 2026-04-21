#!/usr/bin/env node
/**
 * Generates public/dependency-health.json from package.json + bun.lock.
 * Reusable by CI workflows or local invocation via `bun run deps:health`.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, relative, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveLockedVersion } from "./lib/resolve-locked-version.mjs";

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SCAN_SKIP_DIRS = new Set(["node_modules", "dist", "build", ".next", "coverage"]);
const BARREL_IMPORT_RE = /from\s+['"](date-fns(?:\/locale)?)['"]/g;
const OFFENDERS_CAP = 50;

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

function scanTreeShaking(rootDir) {
  const srcDir = resolve(rootDir, "src");
  const offenders = [];
  let filesScanned = 0;
  let barrelImportsFound = 0;
  let truncated = false;

  if (existsSync(srcDir)) {
    const files = walkSourceFiles(srcDir);
    for (const file of files) {
      filesScanned++;
      let content;
      try {
        content = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      BARREL_IMPORT_RE.lastIndex = 0;
      let match;
      while ((match = BARREL_IMPORT_RE.exec(content)) !== null) {
        barrelImportsFound++;
        if (offenders.length >= OFFENDERS_CAP) {
          truncated = true;
          continue;
        }
        const line = content.slice(0, match.index).split("\n").length;
        offenders.push({
          file: relative(rootDir, file).replace(/\\/g, "/"),
          line,
          importPath: match[1],
        });
      }
    }
  }

  const riskLevel = barrelImportsFound === 0 ? "ok" : barrelImportsFound < 5 ? "warning" : "critical";
  return {
    scannedAt: new Date().toISOString(),
    filesScanned,
    barrelImportsFound,
    offenders,
    truncated,
    riskLevel,
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
  const treeShaking = scanTreeShaking(root);

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

  // Preserve any existing dateFns.subpaths block written by verify-datefns-files --write-health
  if (existsSync(outPath)) {
    try {
      const existing = JSON.parse(readFileSync(outPath, "utf8"));
      if (existing?.dateFns?.subpaths) {
        snapshot.dateFns.subpaths = existing.dateFns.subpaths;
      }
    } catch {
      // ignore parse errors — generator is source of truth for the rest
    }
  }

  writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  console.log(`✓ Wrote ${outPath}`);
  for (const p of packages) {
    console.log(
      `  ${p.label.padEnd(34)} spec=${p.spec || "—"} locked=${p.locked || "—"} installed=${p.installed || "—"} drift=${p.driftDetected}`,
    );
  }
  console.log(
    `  tree-shaking: scanned=${treeShaking.filesScanned} barrelImports=${treeShaking.barrelImportsFound} risk=${treeShaking.riskLevel}`,
  );
}

main();
