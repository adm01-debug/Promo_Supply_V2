#!/usr/bin/env node
/**
 * CI gate: verify the configurable list of critical dependencies in
 * `.github/critical-dependencies.json` is aligned across package.json,
 * bun.lock, and node_modules.
 *
 * Thin wrapper around scripts/verify-package-versions.mjs — reuses the same
 * side-by-side reporting (per-source values, pairwise diagnosis, fix
 * rationale) so failures look identical to the date-fns gate.
 *
 * Usage:
 *   node scripts/verify-critical-deps.mjs
 *   node scripts/verify-critical-deps.mjs --json
 *   node scripts/verify-critical-deps.mjs --config path/to/list.json
 *
 * Exit codes: forwarded from verify-package-versions.mjs (0 ok, 10-13 drift,
 * 20-23 missing, 30 mixed). 2 = bad config.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const argv = process.argv.slice(2);
const configIdx = argv.indexOf("--config");
const configPath =
  configIdx !== -1 && argv[configIdx + 1]
    ? resolve(ROOT, argv[configIdx + 1])
    : join(ROOT, ".github", "critical-dependencies.json");
const passthrough = argv.filter(
  (a, i) => a !== "--config" && argv[i - 1] !== "--config",
);

if (!existsSync(configPath)) {
  console.error(`✗ Critical dependencies config not found: ${configPath}`);
  console.error(`  Create it with a { "packages": ["pkg-a", ...] } shape.`);
  process.exit(2);
}

let config;
try {
  config = JSON.parse(readFileSync(configPath, "utf8"));
} catch (err) {
  console.error(`✗ Failed to parse ${configPath}: ${err.message}`);
  process.exit(2);
}

const packages = Array.isArray(config.packages) ? config.packages : [];
if (packages.length === 0) {
  console.error(`✗ ${configPath} has no "packages" array (or it's empty).`);
  process.exit(2);
}

const relConfig = configPath.startsWith(ROOT)
  ? configPath.slice(ROOT.length + 1)
  : configPath;
console.log(
  `→ Verifying ${packages.length} critical dependencies from ${relConfig}:`,
);
for (const p of packages) console.log(`  • ${p}`);
console.log("");

const verifier = join(ROOT, "scripts", "verify-package-versions.mjs");
const result = spawnSync(
  process.execPath,
  [verifier, ...packages, ...passthrough],
  { stdio: "inherit", cwd: ROOT },
);

if (result.error) {
  console.error(`✗ Failed to invoke verifier: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
