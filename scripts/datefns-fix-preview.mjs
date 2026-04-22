#!/usr/bin/env node
/**
 * CLI: print the date-fns auto-fix preview.
 *
 *   node scripts/datefns-fix-preview.mjs                   # default packages
 *   node scripts/datefns-fix-preview.mjs --pkg date-fns    # custom subset
 *   node scripts/datefns-fix-preview.mjs --json            # machine-readable
 *   node scripts/datefns-fix-preview.mjs --no-color
 *
 * Always exits 0 — this is a preview, not a verification gate.
 */
import { buildFixPreview, renderFixPreview } from "./lib/datefns-fix-preview.mjs";

const args = process.argv.slice(2);
const wantJson = args.includes("--json");
const noColor = args.includes("--no-color") || !process.stdout.isTTY;
const pkgArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--pkg" && args[i + 1]) {
    pkgArgs.push(args[++i]);
  }
}

const preview = buildFixPreview({
  rootDir: process.cwd(),
  packages: pkgArgs.length ? pkgArgs : undefined,
});

if (wantJson) {
  process.stdout.write(JSON.stringify(preview, null, 2) + "\n");
} else {
  process.stdout.write(renderFixPreview(preview, { color: !noColor }) + "\n");
}
