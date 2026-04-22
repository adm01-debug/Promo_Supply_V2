/**
 * Reinstall-fix preview generator (shared library).
 *
 * Given the project root, computes what `rm -rf node_modules && bun install
 * --frozen-lockfile` WOULD do, without actually touching the user's
 * node_modules or bun.lock. Used by:
 *
 *   - scripts/datefns-fix-preview.mjs       — CLI surface.
 *   - src/test/reporters/datefnsFixPreview.ts — Vitest reporter that appends
 *     the preview to failing date-fns / pin tests.
 *
 * Strategy:
 *   1. Snapshot package.json + bun.lock into a temp dir (no node_modules copy).
 *   2. Run `bun install --frozen-lockfile` inside the temp dir. Because we
 *      copied the SAME bun.lock, this is a deterministic resolution — it
 *      reports exactly what versions would land in node_modules on the user's
 *      machine after the same command.
 *   3. Read every installed `<pkg>/package.json` for the packages of interest
 *      and produce a "currently installed → would install" diff.
 *   4. Unified-diff the temp bun.lock against the live one. With
 *      --frozen-lockfile the two SHOULD be byte-identical; any diff means
 *      the local lockfile has drifted (e.g. someone hand-edited it) and is
 *      itself a fixable failure mode the preview surfaces clearly.
 *
 * Pure ESM, no third-party deps. Safe to import from both Node scripts and
 * Vitest reporters.
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const DEFAULT_PACKAGES = [
  "date-fns",
  "date-fns-tz",
  "react-day-picker",
];

/**
 * @typedef {Object} PackageDelta
 * @property {string} name
 * @property {string|null} installed   Currently installed version (live node_modules).
 * @property {string|null} wouldInstall Version that would be installed.
 * @property {string|null} declared    Spec from package.json (or null if absent).
 * @property {"unchanged"|"would-change"|"missing-locally"|"would-be-removed"|"missing-from-lockfile"} status
 */

/**
 * @typedef {Object} FixPreview
 * @property {string} command         The fix command this preview describes.
 * @property {PackageDelta[]} packages
 * @property {string} lockfileDiff    Unified diff of bun.lock (empty if identical).
 * @property {boolean} lockfileChanged
 * @property {string[]} warnings
 * @property {number} elapsedMs
 */

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readInstalledVersion(nodeModulesDir, pkgName) {
  const pkgJson = readJsonSafe(join(nodeModulesDir, pkgName, "package.json"));
  return pkgJson && typeof pkgJson.version === "string" ? pkgJson.version : null;
}

function readDeclaredSpec(rootPkg, pkgName) {
  return (
    rootPkg?.dependencies?.[pkgName] ??
    rootPkg?.devDependencies?.[pkgName] ??
    rootPkg?.peerDependencies?.[pkgName] ??
    null
  );
}

/**
 * Minimal unified diff between two strings. We intentionally avoid pulling a
 * diff lib — the reporter must stay zero-dep so it can't cause its own
 * install failures.
 */
function unifiedDiff(aText, bText, aLabel, bLabel, context = 3) {
  const a = aText.split("\n");
  const b = bText.split("\n");
  if (aText === bText) return "";

  // LCS table — fine for bun.lock sized files (typically <2MB, <50k lines).
  const m = a.length;
  const n = b.length;
  // Cap to keep memory bounded; if the file is enormous, fall back to a naive
  // per-line "changed" diff.
  if (m * n > 5_000_000) {
    const out = [`--- ${aLabel}`, `+++ ${bLabel}`, "@@ (diff truncated: file too large for full LCS) @@"];
    const max = Math.max(m, n);
    for (let i = 0; i < max; i++) {
      if (a[i] !== b[i]) {
        if (a[i] !== undefined) out.push(`-${a[i]}`);
        if (b[i] !== undefined) out.push(`+${b[i]}`);
      }
    }
    return out.join("\n");
  }

  const lcs = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  // Walk the LCS to produce ops: ' ', '-', '+'
  /** @type {{op:string, text:string, ai:number, bi:number}[]} */
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      ops.push({ op: " ", text: a[i], ai: i, bi: j });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ op: "-", text: a[i], ai: i, bi: j });
      i++;
    } else {
      ops.push({ op: "+", text: b[j], ai: i, bi: j });
      j++;
    }
  }
  while (i < m) ops.push({ op: "-", text: a[i], ai: i, bi: j }), i++;
  while (j < n) ops.push({ op: "+", text: b[j], ai: i, bi: j }), j++;

  // Group into hunks with `context` lines of surrounding ' ' ops.
  const hunks = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k].op === " ") {
      k++;
      continue;
    }
    const start = Math.max(0, k - context);
    let end = k;
    while (end < ops.length) {
      if (ops[end].op !== " ") {
        end++;
        continue;
      }
      // Look ahead: if the next change is within 2*context lines, keep going.
      let nextChange = -1;
      for (let p = end; p < Math.min(ops.length, end + context * 2); p++) {
        if (ops[p].op !== " ") {
          nextChange = p;
          break;
        }
      }
      if (nextChange === -1) break;
      end = nextChange;
    }
    end = Math.min(ops.length, end + context);
    hunks.push(ops.slice(start, end));
    k = end;
  }

  const out = [`--- ${aLabel}`, `+++ ${bLabel}`];
  for (const hunk of hunks) {
    const aStart = hunk.find((o) => o.op !== "+")?.ai ?? 0;
    const bStart = hunk.find((o) => o.op !== "-")?.bi ?? 0;
    const aLen = hunk.filter((o) => o.op !== "+").length;
    const bLen = hunk.filter((o) => o.op !== "-").length;
    out.push(`@@ -${aStart + 1},${aLen} +${bStart + 1},${bLen} @@`);
    for (const o of hunk) out.push(`${o.op}${o.text}`);
  }
  return out.join("\n");
}

/**
 * Compute the fix preview. Throws on unrecoverable setup errors (missing
 * package.json, no bun on PATH); per-package issues are surfaced via the
 * `warnings` array and appropriate `status` values so the caller can render
 * a partial report.
 *
 * @param {{ rootDir?: string, packages?: string[], timeoutMs?: number }} [opts]
 * @returns {FixPreview}
 */
export function buildFixPreview(opts = {}) {
  const startedAt = Date.now();
  const rootDir = resolve(opts.rootDir ?? process.cwd());
  const packages = opts.packages?.length ? opts.packages : DEFAULT_PACKAGES;
  const timeoutMs = opts.timeoutMs ?? 120_000;

  const livePkgPath = join(rootDir, "package.json");
  const liveLockPath = join(rootDir, "bun.lock");
  if (!existsSync(livePkgPath)) {
    throw new Error(`buildFixPreview: package.json not found at ${livePkgPath}`);
  }
  const rootPkg = readJsonSafe(livePkgPath);
  const liveLock = existsSync(liveLockPath) ? readFileSync(liveLockPath, "utf8") : "";

  const warnings = [];

  // Snapshot into a temp dir.
  const tmp = mkdtempSync(join(tmpdir(), "datefns-fix-preview-"));
  let tempLock = liveLock;
  let lockfileChanged = false;
  let lockfileDiff = "";

  try {
    // Copy ONLY package.json and bun.lock — node_modules would defeat the
    // purpose (we want to see what a fresh install produces) and would also
    // make the preview painfully slow.
    cpSync(livePkgPath, join(tmp, "package.json"));
    if (liveLock) cpSync(liveLockPath, join(tmp, "bun.lock"));

    // Some projects keep .npmrc / bunfig.toml at the root that affect resolution.
    for (const optional of [".npmrc", "bunfig.toml", ".bun-version"]) {
      const src = join(rootDir, optional);
      if (existsSync(src) && statSync(src).isFile()) {
        cpSync(src, join(tmp, optional));
      }
    }

    // Run the install. We use `bun install --frozen-lockfile` because that's
    // exactly the command the fix hint suggests — no surprises.
    try {
      execFileSync("bun", ["install", "--frozen-lockfile"], {
        cwd: tmp,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: timeoutMs,
        env: { ...process.env, CI: "1" },
      });
    } catch (err) {
      const stderr = err?.stderr?.toString?.() ?? String(err?.message ?? err);
      warnings.push(
        `bun install --frozen-lockfile FAILED inside the preview sandbox.\n` +
          `This usually means bun.lock has drifted from package.json — the same fix command would also fail locally.\n` +
          `bun stderr (tail):\n${stderr.split("\n").slice(-10).join("\n")}`,
      );
    }

    if (existsSync(join(tmp, "bun.lock"))) {
      tempLock = readFileSync(join(tmp, "bun.lock"), "utf8");
    }
    lockfileChanged = tempLock !== liveLock;
    lockfileDiff = lockfileChanged
      ? unifiedDiff(liveLock, tempLock, "a/bun.lock (current)", "b/bun.lock (after fix)")
      : "";

    // Read what each tracked package would resolve to in the temp install.
    const tempNodeModules = join(tmp, "node_modules");
    const liveNodeModules = join(rootDir, "node_modules");

    /** @type {PackageDelta[]} */
    const deltas = packages.map((name) => {
      const declared = readDeclaredSpec(rootPkg, name);
      const installed = existsSync(liveNodeModules)
        ? readInstalledVersion(liveNodeModules, name)
        : null;
      const wouldInstall = existsSync(tempNodeModules)
        ? readInstalledVersion(tempNodeModules, name)
        : null;

      let status;
      if (!declared) {
        status = "missing-from-lockfile";
      } else if (!wouldInstall) {
        status = "would-be-removed";
      } else if (!installed) {
        status = "missing-locally";
      } else if (installed === wouldInstall) {
        status = "unchanged";
      } else {
        status = "would-change";
      }

      return { name, installed, wouldInstall, declared, status };
    });

    // Surface any installed packages outside the tracked list that ALSO
    // changed — keeps the preview honest if a transitive bumps.
    if (existsSync(tempNodeModules) && existsSync(liveNodeModules)) {
      const extraChanged = [];
      for (const dep of readdirSync(tempNodeModules)) {
        if (dep.startsWith(".") || packages.includes(dep)) continue;
        if (dep.startsWith("@")) continue; // skip scoped roots; rare for date-fns ecosystem
        const a = readInstalledVersion(liveNodeModules, dep);
        const b = readInstalledVersion(tempNodeModules, dep);
        if (a && b && a !== b) extraChanged.push(`${dep}: ${a} → ${b}`);
      }
      if (extraChanged.length) {
        warnings.push(
          `Other (non-tracked) packages would also change:\n  - ` +
            extraChanged.slice(0, 10).join("\n  - ") +
            (extraChanged.length > 10 ? `\n  …and ${extraChanged.length - 10} more` : ""),
        );
      }
    }

    return {
      command: "rm -rf node_modules && bun install --frozen-lockfile",
      packages: deltas,
      lockfileDiff,
      lockfileChanged,
      warnings,
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Render a FixPreview as a single human-friendly string. Used by the CLI
 * and the Vitest reporter so the format stays consistent.
 */
export function renderFixPreview(preview, { color = false, maxDiffLines = 80 } = {}) {
  const c = color
    ? {
        bold: (s) => `\x1b[1m${s}\x1b[0m`,
        dim: (s) => `\x1b[2m${s}\x1b[0m`,
        green: (s) => `\x1b[32m${s}\x1b[0m`,
        red: (s) => `\x1b[31m${s}\x1b[0m`,
        yellow: (s) => `\x1b[33m${s}\x1b[0m`,
        cyan: (s) => `\x1b[36m${s}\x1b[0m`,
      }
    : { bold: (s) => s, dim: (s) => s, green: (s) => s, red: (s) => s, yellow: (s) => s, cyan: (s) => s };

  const lines = [];
  lines.push(c.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  lines.push(c.bold(" 🔍 Auto-fix preview (no changes applied)"));
  lines.push(c.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  lines.push(`  Command : ${c.cyan(preview.command)}`);
  lines.push(`  Elapsed : ${preview.elapsedMs}ms`);
  lines.push("");

  // Per-package table.
  const w = (s, n) => (s.length >= n ? s : s + " ".repeat(n - s.length));
  lines.push(`  ${c.bold(w("Package", 22))} ${c.bold(w("Installed", 14))} ${c.bold(w("After fix", 14))} ${c.bold("Status")}`);
  lines.push(`  ${"─".repeat(22)} ${"─".repeat(14)} ${"─".repeat(14)} ${"─".repeat(20)}`);
  for (const p of preview.packages) {
    const installed = p.installed ?? "—";
    const after = p.wouldInstall ?? "—";
    let status;
    switch (p.status) {
      case "unchanged":
        status = c.dim("unchanged");
        break;
      case "would-change":
        status = c.yellow(`would change (${installed} → ${after})`);
        break;
      case "missing-locally":
        status = c.green(`would be installed (${after})`);
        break;
      case "would-be-removed":
        status = c.red("would be removed");
        break;
      case "missing-from-lockfile":
        status = c.dim("not in package.json — skipped");
        break;
      default:
        status = p.status;
    }
    lines.push(`  ${w(p.name, 22)} ${w(installed, 14)} ${w(after, 14)} ${status}`);
  }
  lines.push("");

  // Lockfile diff.
  if (preview.lockfileChanged) {
    lines.push(c.yellow(`  bun.lock would CHANGE. Unified diff (truncated to ${maxDiffLines} lines):`));
    const diffLines = preview.lockfileDiff.split("\n");
    const shown = diffLines.slice(0, maxDiffLines);
    for (const dl of shown) {
      let line = dl;
      if (color) {
        if (dl.startsWith("+") && !dl.startsWith("+++")) line = c.green(dl);
        else if (dl.startsWith("-") && !dl.startsWith("---")) line = c.red(dl);
        else if (dl.startsWith("@@")) line = c.cyan(dl);
      }
      lines.push(`    ${line}`);
    }
    if (diffLines.length > maxDiffLines) {
      lines.push(c.dim(`    … (${diffLines.length - maxDiffLines} more lines elided)`));
    }
  } else {
    lines.push(c.green("  bun.lock would NOT change (frozen lockfile install is idempotent)."));
  }

  if (preview.warnings.length) {
    lines.push("");
    lines.push(c.yellow("  Warnings:"));
    for (const w of preview.warnings) {
      for (const l of w.split("\n")) lines.push(`    ${l}`);
    }
  }

  lines.push("");
  lines.push(c.dim("  This is a PREVIEW only — nothing was modified. Run the command above to apply."));
  lines.push(c.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  return lines.join("\n");
}
