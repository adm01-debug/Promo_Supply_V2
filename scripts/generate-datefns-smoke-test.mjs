#!/usr/bin/env node
/**
 * Scans src/ for `date-fns/<subpath>` imports and regenerates
 * src/test/dateFns.smoke.test.ts so the smoke test always reflects
 * actual usage. Pure Node, zero dependencies.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import {
  scanStaticDateFnsImports,
  detectUnsupportedDateFnsUsage,
  detectMalformedDateFnsImports,
} from "./lib/datefns-scan.mjs";

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.some((a) => a === "--dry-run" || a === "-n");
// --if-changed: skip regeneration when the set of discovered date-fns imports
// (subpath + named exports) hashes to the same signature stored in the
// existing manifest. Pure short-circuit — never writes, never fails.
const IF_CHANGED = ARGS.some((a) => a === "--if-changed");
// --verbose / -v: emit per-file trace of every detected import block, every
// skipped type-only import, and every unsupported-shape warning with its
// reason. Off by default to keep CI logs clean.
const VERBOSE = ARGS.some((a) => a === "--verbose" || a === "-v");
// --strict: turn malformed date-fns imports (zero usable specifiers after
// comment stripping) into a fatal error instead of a warning. Off by
// default so existing pipelines aren't broken; CI can opt in.
const STRICT = ARGS.some((a) => a === "--strict");
const vlog = (msg) => { if (VERBOSE) console.log(`  · ${msg}`); };
const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");
const OUT_FILE = join(SRC_DIR, "test", "dateFns.smoke.test.ts");
const MANIFEST_FILE = join(ROOT, "public", "datefns-usage.json");
const EXCLUDE_DIRS = new Set(["test", "node_modules", ".git", "dist", "build"]);
const FILE_EXT = /\.(ts|tsx)$/;

/** Recursively collect .ts/.tsx files under src/, excluding test dir. */
function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Exclude src/test/** so we don't recursively read what we generate.
      if (full === join(SRC_DIR, "test")) continue;
      if (EXCLUDE_DIRS.has(entry)) continue;
      walk(full, acc);
    } else if (FILE_EXT.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

// Map<subpath, Set<exportName>> — accumulated across every src/ file.
// Static-import scanning is delegated to scripts/lib/datefns-scan.mjs so the
// regexes have unit-test coverage (see scripts/lib/__tests__/datefns-scan.test.mjs).
const subpaths = new Map();

// Track CJS require destructures and dynamic import() calls so we can warn —
// the smoke generator can NOT see those, and a contributor accidentally using
// either shape would silently lose smoke-test coverage for that subpath.
const unsupportedFindings = [];

// Track malformed static date-fns imports (empty/comment-only braces) so we
// can warn — or, with --strict, fail. These never make it into the manifest
// either way, but contributors should know they wrote dead code.
const malformedFindings = [];

// Type-only static imports re-detected for verbose trace only (the main
// scanner correctly skips them, but in --verbose we surface what was skipped
// and why so contributors can audit the decision).
const TYPE_ONLY_RE =
  /import\s+type\s+\{([^{}]*)\}\s+from\s+["']date-fns\/([^"']+)["']/g;

const files = walk(SRC_DIR);
let scannedFileCount = 0;
let filesWithImports = 0;
for (const file of files) {
  scannedFileCount++;
  const src = readFileSync(file, "utf8");
  const fileMap = scanStaticDateFnsImports(src);
  const rel = relative(ROOT, file);
  if (fileMap.size > 0) {
    filesWithImports++;
    if (VERBOSE) {
      console.log(`◆ ${rel}`);
      for (const [subpath, names] of fileMap) {
        vlog(`detected → date-fns/${subpath}  { ${[...names].sort().join(", ")} }`);
      }
    }
  }
  for (const [subpath, names] of fileMap) {
    if (!subpaths.has(subpath)) subpaths.set(subpath, new Set());
    const set = subpaths.get(subpath);
    for (const n of names) set.add(n);
  }
  if (VERBOSE) {
    TYPE_ONLY_RE.lastIndex = 0;
    let m;
    let headerPrinted = fileMap.size > 0;
    while ((m = TYPE_ONLY_RE.exec(src)) !== null) {
      if (!headerPrinted) { console.log(`◆ ${rel}`); headerPrinted = true; }
      vlog(`skipped  → date-fns/${m[2]}  (reason: type-only import, not bundled at runtime)`);
    }
  }
  const findings = detectUnsupportedDateFnsUsage(src, rel);
  if (findings.length > 0) {
    unsupportedFindings.push(...findings);
    if (VERBOSE) {
      if (fileMap.size === 0) console.log(`◆ ${rel}`);
      for (const f of findings) {
        const reason = f.kind === "require-destructure"
          ? "CommonJS require() — invisible to the static scanner; convert to `import { … } from \"date-fns/…\"`"
          : "dynamic import() — invisible to the static scanner; convert to a static `import { … } from \"date-fns/…\"`";
        vlog(`skipped  → date-fns/${f.subpath} @ line ${f.line} [${f.kind}] (reason: ${reason})`);
      }
    }
  }
  const malformed = detectMalformedDateFnsImports(src, rel);
  if (malformed.length > 0) {
    malformedFindings.push(...malformed);
    if (VERBOSE) {
      if (fileMap.size === 0 && findings.length === 0) console.log(`◆ ${rel}`);
      for (const f of malformed) {
        vlog(`malformed → date-fns/${f.subpath} @ line ${f.line} (reason: zero usable specifiers after comment stripping)`);
      }
    }
  }
}

if (VERBOSE) {
  console.log(
    `\n· Scanned ${scannedFileCount} file(s); ${filesWithImports} contain date-fns imports.\n`,
  );
}

if (unsupportedFindings.length > 0) {
  console.warn(
    `⚠ Found ${unsupportedFindings.length} unsupported date-fns usage(s) — these are NOT covered by the smoke test:`,
  );
  for (const f of unsupportedFindings) {
    console.warn(`   ${f.file}:${f.line} [${f.kind}] → date-fns/${f.subpath}`);
  }
}

if (malformedFindings.length > 0) {
  const localeOnly = malformedFindings.filter((f) => f.isLocale);
  const label = `${malformedFindings.length} malformed date-fns import(s) (zero usable specifiers after comment stripping${localeOnly.length > 0 ? `; ${localeOnly.length} locale` : ""})`;
  const log = STRICT ? console.error : console.warn;
  log(`${STRICT ? "✗" : "⚠"} ${label}:`);
  for (const f of malformedFindings) {
    log(`   ${f.file}:${f.line} → date-fns/${f.subpath}${f.isLocale ? "  [locale]" : ""}`);
  }
  if (STRICT) {
    console.error(
      "  Hint: remove the empty import or add at least one named specifier. Re-run without --strict to downgrade to a warning.",
    );
    process.exit(1);
  }
}

if (subpaths.size === 0) {
  console.error(
    "✗ generate-datefns-smoke-test: no date-fns subpath imports found in src/. Aborting.",
  );
  process.exit(1);
}

// Sort subpaths and names for deterministic output.
const sortedSubpaths = [...subpaths.keys()].sort();

// Partition: locale subpaths (date-fns/locale/<x>) vs function subpaths.
const localeSubpaths = sortedSubpaths.filter((s) => s.startsWith("locale/"));
const fnSubpaths = sortedSubpaths.filter((s) => !s.startsWith("locale/"));

// Build flat list of all named function imports (for typeof === "function" check).
const allFnNames = [];
for (const sp of fnSubpaths) {
  for (const n of [...subpaths.get(sp)].sort()) allFnNames.push(n);
}

// Build flat list of all locale imports (objects, not functions).
const allLocaleNames = [];
for (const sp of localeSubpaths) {
  for (const n of [...subpaths.get(sp)].sort()) allLocaleNames.push(n);
}

// Ensure `format` is imported — required by the locale smoke test.
if (!allFnNames.includes("format")) {
  console.error(
    "✗ generate-datefns-smoke-test: `format` is not imported anywhere in src/, but the smoke test requires it. Aborting.",
  );
  process.exit(1);
}

// --- Render the test file ---
const importLines = sortedSubpaths.map((sp) => {
  const names = [...subpaths.get(sp)].sort().join(", ");
  return `import { ${names} } from "date-fns/${sp}";`;
});

const fnArrayLiteral =
  allFnNames.length > 0
    ? `[\n      ${allFnNames.join(",\n      ")},\n    ]`
    : "[]";

const localeArrayLiteral =
  allLocaleNames.length > 0
    ? `[\n      ${allLocaleNames.map((n) => `["${n}", ${n}]`).join(",\n      ")},\n    ] as const`
    : "[] as const";

const out = `// AUTO-GENERATED by scripts/generate-datefns-smoke-test.mjs — do not edit by hand.
// Run \`node scripts/generate-datefns-smoke-test.mjs\` to refresh.
// Source: every \`date-fns/*\` subpath import found under src/ (excluding src/test/).
//
// Compatible with tsconfig.app.json: module=ESNext, moduleResolution=bundler,
// resolvePackageJsonExports=true, resolveJsonModule=true, isolatedModules=true.
// Each \`date-fns/<subpath>\` import resolves via date-fns v3+ package exports map.
// No triple-slash refs, no side-effect imports — purely typed value imports below.
import { describe, it, expect, beforeAll } from "vitest";
${importLines.join("\n")}

describe("date-fns subpath imports smoke test (auto-generated)", () => {
  const ref = new Date("2025-01-15T12:00:00Z");

  // ── Versions log ──────────────────────────────────────────────────────
  // On suite startup, write a short versions block to ci-logs/vitest-smoke-versions.log
  // so CI artifacts always carry the spec/locked/installed triple that the suite
  // ran against — even when every assertion passes. Best-effort: any failure
  // here (fs not available, lockfile missing, etc.) is swallowed so the smoke
  // test itself never fails because of logging.
  beforeAll(async () => {
    try {
      const [{ writeFileSync, mkdirSync, readFileSync, existsSync }, path] = await Promise.all([
        import("node:fs"),
        import("node:path"),
      ]);
      const cwd = process.cwd();
      const pkgPath = path.join(cwd, "package.json");
      const lockPath = path.join(cwd, "bun.lock");
      const installedPath = path.join(cwd, "node_modules", "date-fns", "package.json");

      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      const spec =
        pkg.dependencies?.["date-fns"] ?? pkg.devDependencies?.["date-fns"] ?? "(absent)";
      const installed = existsSync(installedPath)
        ? JSON.parse(readFileSync(installedPath, "utf8")).version ?? "(unknown)"
        : "(not installed)";
      let locked = "(bun.lock not found)";
      if (existsSync(lockPath)) {
        const lockTxt = readFileSync(lockPath, "utf8");
        const m = lockTxt.match(/"date-fns@([^"]+)"/);
        locked = m ? m[1] : "(not in lockfile)";
      }

      const stamp = new Date().toISOString();
      const block = [
        "── date-fns smoke versions ──────────────────────────────",
        \`  generated: \${stamp}\`,
        \`  cwd:       \${cwd}\`,
        \`  node:      \${process.version}\`,
        \`  spec:      \${spec}\`,
        \`  locked:    \${locked}\`,
        \`  installed: \${installed}\`,
        "─────────────────────────────────────────────────────────",
        "",
      ].join("\\n");

      const outDir = path.join(cwd, "ci-logs");
      mkdirSync(outDir, { recursive: true });
      writeFileSync(path.join(outDir, "vitest-smoke-versions.log"), block, "utf8");
      // eslint-disable-next-line no-console
      console.log(block);
    } catch {
      // Best-effort — never fail the suite for logging.
    }
  });

  it("all imported function exports are callable", () => {
    const fns = ${fnArrayLiteral};
    for (const fn of fns) {
      expect(typeof fn).toBe("function");
    }
  });

  it("locales are structurally valid, format correctly, and produce distinct weekdays", () => {
    const locales = ${localeArrayLiteral};
    const weekdays: string[] = [];
    for (const [name, locale] of locales) {
      expect(locale, name).toBeDefined();
      expect(typeof locale, name).toBe("object");
      const l = locale as {
        code?: unknown;
        formatLong?: unknown;
        localize?: unknown;
        match?: unknown;
      };
      expect(typeof l.code, name).toBe("string");
      expect(l.formatLong, name).toBeTruthy();
      expect(l.localize, name).toBeTruthy();
      expect(l.match, name).toBeTruthy();

      const numeric = format(ref, "dd/MM/yyyy", { locale });
      expect(numeric, name).toMatch(/^\\d{2}\\/\\d{2}\\/\\d{4}$/);
      const longDate = format(ref, "PPP", { locale });
      expect(typeof longDate, name).toBe("string");
      expect(longDate.length, name).toBeGreaterThan(0);
      const weekday = format(ref, "EEEE", { locale });
      expect(typeof weekday, name).toBe("string");
      expect(weekday.length, name).toBeGreaterThan(0);
      weekdays.push(weekday);
    }
    if (weekdays.length >= 2) {
      expect(new Set(weekdays).size, "distinct weekday names").toBe(weekdays.length);
    }
  });

  it("ref date is stable", () => {
    expect(ref.toISOString()).toBe("2025-01-15T12:00:00.000Z");
  });

  it("installed date-fns version matches the pinned spec in package.json", async () => {
    let rootPkgMod: unknown;
    let installedPkgMod: unknown;
    try {
      [rootPkgMod, installedPkgMod] = await Promise.all([
        import("../../package.json"),
        import("date-fns/package.json"),
      ]);
    } catch (err) {
      throw new Error(
        \`Failed to dynamic-import package.json files. \` +
          \`Check tsconfig.app.json has resolveJsonModule:true and date-fns v3+ exposes ./package.json in its exports map. \` +
          \`Original: \${(err as Error).message}\`,
      );
    }
    const rootPkg = (rootPkgMod as { default: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } }).default;
    const installedPkg = (installedPkgMod as { default: { version: string } }).default;
    const spec =
      rootPkg.dependencies?.["date-fns"] ??
      rootPkg.devDependencies?.["date-fns"] ??
      "";
    const installed = installedPkg.version;

    // eslint-disable-next-line no-console
    console.log(\`[date-fns smoke] pinned spec="\${spec}" installed="\${installed}"\`);

    expect(spec, "date-fns must be listed in package.json").not.toBe("");
    expect(/^[0-9]/.test(spec), \`spec "\${spec}" must be exact-pinned (no ^ or ~)\`).toBe(true);
    expect(installed, \`installed \${installed} must match pinned \${spec}\`).toBe(spec);
  });
});
`;

// --- Emit machine-readable manifest for the admin panel ---
// importSignature is a stable hash of every (subpath → sorted exports) pair
// discovered in src/. It's the source of truth for `--if-changed`: if the
// stored signature matches the current scan, no regeneration is needed.
const signaturePayload = sortedSubpaths
  .map((sp) => `${sp}:${[...subpaths.get(sp)].sort().join(",")}`)
  .join("|");
const importSignature = createHash("sha256")
  .update(signaturePayload)
  .digest("hex");

// --- Short-circuit when --if-changed and signature unchanged ---
if (IF_CHANGED && existsSync(MANIFEST_FILE)) {
  try {
    const prev = JSON.parse(readFileSync(MANIFEST_FILE, "utf8"));
    if (prev.importSignature && prev.importSignature === importSignature) {
      console.log(
        `✓ date-fns imports unchanged (signature ${importSignature.slice(0, 12)}…) — skipping regeneration.`,
      );
      process.exit(0);
    }
  } catch {
    // Malformed manifest → fall through to regenerate.
  }
}

// Embed GitHub Actions run metadata so the UI can deep-link to the
// workflow run that produced this manifest. All env vars are GitHub-provided
// at CI time; locally they are simply absent.
const ghServer = process.env.GITHUB_SERVER_URL || "https://github.com";
const ghRepo = process.env.GITHUB_REPOSITORY || "";
const ghRunId = process.env.GITHUB_RUN_ID || "";
const ghRunAttempt = process.env.GITHUB_RUN_ATTEMPT || "";
const ghWorkflow = process.env.GITHUB_WORKFLOW || "";
const ci = ghRepo && ghRunId
  ? {
      provider: "github-actions",
      repository: ghRepo,
      workflow: ghWorkflow || null,
      runId: ghRunId,
      runAttempt: ghRunAttempt || null,
      runUrl: `${ghServer}/${ghRepo}/actions/runs/${ghRunId}${ghRunAttempt ? `/attempts/${ghRunAttempt}` : ""}`,
      latestRunsUrl: `${ghServer}/${ghRepo}/actions/workflows/dependency-health.yml`,
    }
  : null;

const manifest = {
  generatedAt: new Date().toISOString(),
  importSignature,
  totalSubpaths: sortedSubpaths.length,
  totalFunctions: allFnNames.length,
  totalLocales: allLocaleNames.length,
  functions: fnSubpaths.map((sp) => ({
    subpath: sp,
    exports: [...subpaths.get(sp)].sort(),
  })),
  locales: localeSubpaths.map((sp) => ({
    subpath: sp,
    exports: [...subpaths.get(sp)].sort(),
  })),
  ...(ci ? { ci } : {}),
};
const manifestText = JSON.stringify(manifest, null, 2) + "\n";

// --- Minimal unified-diff helper (no deps) ---
function unifiedDiff(oldStr, newStr, label) {
  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");
  let start = 0;
  while (
    start < oldLines.length &&
    start < newLines.length &&
    oldLines[start] === newLines[start]
  ) start++;
  let oldEnd = oldLines.length;
  let newEnd = newLines.length;
  while (
    oldEnd > start &&
    newEnd > start &&
    oldLines[oldEnd - 1] === newLines[newEnd - 1]
  ) { oldEnd--; newEnd--; }
  if (start === oldEnd && start === newEnd) return "";
  const out = [`--- a/${label}`, `+++ b/${label}`];
  const oldCount = oldEnd - start;
  const newCount = newEnd - start;
  out.push(`@@ -${start + 1},${oldCount} +${start + 1},${newCount} @@`);
  for (let i = start; i < oldEnd; i++) out.push(`-${oldLines[i]}`);
  for (let i = start; i < newEnd; i++) out.push(`+${newLines[i]}`);
  return out.join("\n");
}

function printSummary() {
  console.log(
    `Detected: ${sortedSubpaths.length} subpaths / ${allFnNames.length} function exports / ${allLocaleNames.length} locales\n`,
  );
  if (fnSubpaths.length > 0) {
    console.log("Functions:");
    const pad = Math.max(...fnSubpaths.map((s) => s.length));
    for (const sp of fnSubpaths) {
      console.log(`  ${sp.padEnd(pad)}  →  ${[...subpaths.get(sp)].sort().join(", ")}`);
    }
    console.log("");
  }
  if (localeSubpaths.length > 0) {
    console.log("Locales:");
    const pad = Math.max(...localeSubpaths.map((s) => s.length));
    for (const sp of localeSubpaths) {
      console.log(`  ${sp.padEnd(pad)}  →  ${[...subpaths.get(sp)].sort().join(", ")}`);
    }
    console.log("");
  }
}

function diffFile(path, newText) {
  const rel = relative(ROOT, path);
  if (!existsSync(path)) {
    console.log(`(new file) ${rel}`);
    console.log(newText);
    return true;
  }
  const current = readFileSync(path, "utf8");
  const diff = unifiedDiff(current, newText, rel);
  if (!diff) {
    console.log(`= ${rel} (no changes)`);
    return false;
  }
  console.log(diff);
  return true;
}

if (DRY_RUN) {
  printSummary();
  const a = diffFile(OUT_FILE, out);
  const b = diffFile(MANIFEST_FILE, manifestText);
  process.exit(a || b ? 1 : 0);
}

writeFileSync(OUT_FILE, out, "utf8");
writeFileSync(MANIFEST_FILE, manifestText, "utf8");

console.log(
  `✓ Generated smoke test for ${sortedSubpaths.length} subpaths, ${allFnNames.length} named function exports, ${allLocaleNames.length} locales.`,
);
console.log(`  → ${relative(ROOT, OUT_FILE)}`);
console.log(`  → ${relative(ROOT, MANIFEST_FILE)}`);

// Refresh the stored generator-input hash so the
// `verify-datefns-generator-input.mjs` CI guard passes on the next run.
// Best-effort: a failure here (e.g. date-fns not installed in a sandbox)
// must not fail the regen itself.
try {
  const { spawnSync } = await import("node:child_process");
  const refresh = spawnSync(
    process.execPath,
    [join(ROOT, "scripts", "verify-datefns-generator-input.mjs"), "--write", "--quiet"],
    { stdio: "inherit" },
  );
  if (refresh.status === 0) {
    console.log("  → public/datefns-generator-input.json (input hash refreshed)");
  } else {
    console.warn(
      `  ⚠ Could not refresh public/datefns-generator-input.json (exit ${refresh.status}). Run \`node scripts/verify-datefns-generator-input.mjs --write\` manually.`,
    );
  }
} catch (err) {
  console.warn(`  ⚠ Skipped input-hash refresh: ${err.message}`);
}
