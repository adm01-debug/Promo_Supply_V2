
## Plan: Verify date-fns subpath files exist on disk

### Goal
Add a script that checks `node_modules/date-fns` actually contains the subpath files our code imports (`format`, `locale/pt-BR`, plus every other detected subpath). Fails fast with a clear message if any are missing — catches broken installs, partial extractions, or upstream package restructures before they show up as cryptic vitest errors.

### Change — new file `scripts/verify-datefns-files.mjs`

Pure Node, zero deps. Reuses the same scan logic as the smoke-test generator so the verification stays in sync with actual usage.

```js
#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");
const PKG_DIR = join(ROOT, "node_modules", "date-fns");
const EXCLUDE_DIRS = new Set(["test", "node_modules", ".git", "dist", "build"]);
const FILE_EXT = /\.(ts|tsx)$/;
const IMPORT_RE = /import\s+(type\s+)?\{[^{}]*\}\s+from\s+["']date-fns\/([^"']+)["']/g;

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (full === join(SRC_DIR, "test")) continue;
      if (EXCLUDE_DIRS.has(entry)) continue;
      walk(full, acc);
    } else if (FILE_EXT.test(entry)) acc.push(full);
  }
  return acc;
}

// Collect subpaths
const subpaths = new Set();
for (const file of walk(SRC_DIR)) {
  const src = readFileSync(file, "utf8");
  let m;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    if (m[1]) continue; // skip type-only
    subpaths.add(m[2]);
  }
}

// Verify package root exists
if (!existsSync(PKG_DIR)) {
  console.error(`✗ ${relative(ROOT, PKG_DIR)} not found. Run \`bun install\`.`);
  process.exit(1);
}

// For each subpath, check that ONE of: <sp>.js, <sp>.mjs, <sp>/index.js, <sp>/index.mjs exists
const missing = [];
for (const sp of [...subpaths].sort()) {
  const candidates = [
    `${sp}.js`, `${sp}.mjs`, `${sp}.cjs`,
    `${sp}/index.js`, `${sp}/index.mjs`, `${sp}/index.cjs`,
  ];
  const found = candidates.some((c) => existsSync(join(PKG_DIR, c)));
  if (!found) missing.push(sp);
}

if (missing.length > 0) {
  console.error(`✗ Missing date-fns subpath files (${missing.length}):`);
  for (const sp of missing) console.error(`  - date-fns/${sp}`);
  console.error(`\nChecked under: ${relative(ROOT, PKG_DIR)}`);
  console.error(`Run \`rm -rf node_modules && bun install --frozen-lockfile\` to repair.`);
  process.exit(1);
}

console.log(`✓ Verified ${subpaths.size} date-fns subpath(s) exist on disk.`);
```

### Wire into CI — `scripts/ci-check.sh`

Insert as a new step between install (2/7) and source typecheck (3/7), promoting the pipeline to 8 steps:

```text
[1/8] rm -rf node_modules
[2/8] bun install --frozen-lockfile
[3/8] node scripts/verify-datefns-files.mjs        ← NEW
[4/8] npx tsc --noEmit -p tsconfig.app.json
[5/8] node scripts/generate-datefns-smoke-test.mjs
[6/8] npx tsc --noEmit -p tsconfig.app.json
[7/8] npx vitest run src/test/dateFns.smoke.test.ts --reporter=verbose
[8/8] write public/dependency-health.json snapshot
```

Also wire into `scripts/ci-smoke.sh` (becomes 4 steps): install → verify-files → vitest.

### Why this shape
- **Disk-level check, not module-resolver check.** Catches half-extracted tarballs, missing `locale/pt-BR/` directory, ENOENT before tsc/vitest reports a confusing module-resolution error.
- **Same scan algorithm as the smoke-test generator** — single source of truth for "what subpaths do we use". If the generator finds it, the verifier checks it.
- **Multi-extension tolerant.** date-fns v3 ships `.js` files at subpath roots (e.g. `node_modules/date-fns/format.js`, `node_modules/date-fns/locale/pt-BR.js`); the candidate list covers `.js`/`.mjs`/`.cjs` and index variants to remain robust across patch versions.
- **Fast.** Pure `existsSync` calls — runs in <100ms even for ~25 subpaths.

### Verification
1. `node scripts/verify-datefns-files.mjs` → prints `✓ Verified N date-fns subpath(s) exist on disk.`
2. Sanity check: temporarily rename `node_modules/date-fns/locale/pt-BR.js` → rerun → fails with `Missing date-fns subpath files (1): - date-fns/locale/pt-BR`. Restore.
3. `bash scripts/ci-smoke.sh` → 4 steps green.
4. `bash scripts/ci-check.sh` → 8 steps green, snapshot written.

### Risk / scope
- One new file (~50 lines). Two CI scripts gain one extra step each. No source, dependency, route, schema, or runtime changes.
- Adds <200ms to CI.
