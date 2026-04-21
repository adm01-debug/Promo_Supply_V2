#!/usr/bin/env node
/**
 * Generates public/dependency-health.json from package.json + bun.lock.
 * Reusable by CI workflows or local invocation via `bun run deps:health`.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveLockedVersion } from "./lib/resolve-locked-version.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

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

  const spec = pkg?.dependencies?.["date-fns"] ?? "";
  const locked = resolveLockedVersion(lockText, "date-fns") ?? "";

  let installed = locked;
  const installedPkgPath = resolve(root, "node_modules/date-fns/package.json");
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
  const now = new Date().toISOString();

  const snapshot = {
    generatedAt: now,
    dateFns: { spec, installed, locked, exactPinned },
    lockfileDrift: {
      detected: driftDetected,
      lastCheckedAt: now,
      source: "scripts/generate-dependency-health.mjs",
    },
  };

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  console.log(`✓ Wrote ${outPath}`);
  console.log(`  date-fns spec=${spec} locked=${locked} installed=${installed}`);
  console.log(`  exactPinned=${exactPinned} drift=${driftDetected}`);
}

main();
