#!/usr/bin/env node
/**
 * Shared semver diff helpers for date-fns version mismatch reporting.
 * Used by verify-datefns-versions.mjs, verify-package-versions.mjs,
 * and install-report.mjs.
 */

/** Split a semver string into its components, or null if malformed. */
export function splitSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.exec(v);
  if (!m) return null;
  return { major: m[1], minor: m[2], patch: m[3], pre: m[4] ?? "", build: m[5] ?? "" };
}

/**
 * Classify how two semver strings differ.
 * @returns {{ level: "major"|"minor"|"patch"|"prerelease"|"build"|"unknown", caretCol: number }}
 */
export function classifyDiff(a, b) {
  const sa = splitSemver(a);
  const sb = splitSemver(b);
  if (!sa || !sb) return { level: "unknown", caretCol: 0 };
  const segs = ["major", "minor", "patch", "pre", "build"];
  const labelMap = { pre: "prerelease" };
  let col = 0;
  for (const seg of segs) {
    if (sa[seg] !== sb[seg]) {
      const offset = [...sb[seg]].findIndex((c, i) => sa[seg][i] !== c);
      return {
        level: labelMap[seg] ?? seg,
        caretCol: col + Math.max(0, offset),
      };
    }
    col += sb[seg].length + 1; // +1 for "." / "-" / "+" delimiter
  }
  return { level: "unknown", caretCol: 0 };
}

/**
 * Render a 5-line mismatch block:
 *   line 1: "[case] spec↔locked" header (when `caseLabel` provided)
 *   lines 2–3: the two version rows, label-padded
 *   line 4: caret pointing at the first differing column
 *   line 5: "→ <level> version drift (v1 → v2)"
 *
 * If `caseLabel` is omitted (legacy callers/tests), the header line is
 * skipped and the block stays 4 lines tall — preserving back-compat.
 *
 * @param {string} label1
 * @param {string} v1
 * @param {string} label2
 * @param {string} v2
 * @param {{ caseLabel?: string }} [opts]
 */
export function renderMismatch(label1, v1, label2, v2, opts = {}) {
  const { caseLabel } = opts;
  const { level, caretCol } = classifyDiff(v1, v2);
  const labelW = Math.max(label1.length, label2.length);
  const pad = (s) => s + " ".repeat(labelW - s.length);
  const caretIndent = " ".repeat(labelW + 2 + caretCol);
  const lines = [];
  if (caseLabel) {
    lines.push(`    [${caseLabel}] ${label1} ↔ ${label2}`);
  }
  lines.push(
    `    ${pad(label1)}  ${v1}`,
    `    ${pad(label2)}  ${v2}`,
    `    ${caretIndent}^`,
    `    → ${level} version drift (${v1} → ${v2})`,
  );
  return lines.join("\n");
}

/**
 * Render BOTH labeled drift cases (spec↔locked AND locked↔installed) plus a
 * one-line summary describing the full triple mismatch. Use when all three
 * versions (spec, locked, installed) differ — reading two separate blocks
 * without context makes it easy to miss that the install is doubly drifted.
 *
 * Output shape (returned as a single \n-joined string):
 *   ── triple mismatch: spec ≠ locked ≠ installed ──
 *   summary: spec=X  locked=Y  installed=Z   (drift: <l1>, then <l2>)
 *
 *   <renderMismatch("spec", X, "locked", Y, { caseLabel: "spec↔locked" })>
 *
 *   <renderMismatch("locked", Y, "installed", Z, { caseLabel: "locked↔installed" })>
 */
export function renderTripleMismatch(spec, locked, installed) {
  const { level: l1 } = classifyDiff(spec, locked);
  const { level: l2 } = classifyDiff(locked, installed);
  const summary =
    `    summary: spec=${spec}  locked=${locked}  installed=${installed}` +
    `   (drift: spec→locked is ${l1}, then locked→installed is ${l2})`;
  return [
    "    ── triple mismatch: spec ≠ locked ≠ installed ──",
    summary,
    "",
    renderMismatch("spec", spec, "locked", locked, { caseLabel: "spec↔locked" }),
    "",
    renderMismatch("locked", locked, "installed", installed, {
      caseLabel: "locked↔installed",
    }),
  ].join("\n");
}

// ── ANSI color helpers ──────────────────────────────────────────────────
//
// Decide ONCE per process whether to colorize. Honor the conventions every
// well-behaved CLI follows:
//   - NO_COLOR (any value)        → never colorize       https://no-color.org
//   - FORCE_COLOR (truthy)        → always colorize      (npm/chalk convention)
//   - otherwise: colorize only when stdout is a TTY      (CI logs stay clean)
//
// Callers can also override per-call via `renderUnifiedDiff(..., { color: bool })`
// — useful in tests and when piping to a file but still wanting color (e.g.
// `less -R`).
const ENV_NO_COLOR =
  typeof process !== "undefined" && process.env && "NO_COLOR" in process.env;
const ENV_FORCE_COLOR =
  typeof process !== "undefined" &&
  process.env &&
  process.env.FORCE_COLOR &&
  process.env.FORCE_COLOR !== "0" &&
  process.env.FORCE_COLOR !== "false";
const STDOUT_IS_TTY =
  typeof process !== "undefined" && process.stdout && process.stdout.isTTY === true;

export function shouldColor(override) {
  if (override === true) return true;
  if (override === false) return false;
  if (ENV_NO_COLOR) return false;
  if (ENV_FORCE_COLOR) return true;
  return STDOUT_IS_TTY;
}

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function paint(text, codes, on) {
  return on ? `${codes}${text}${ANSI.reset}` : text;
}

/**
 * Render a unified-diff-style block for two semver strings.
 *
 * Output mirrors `git diff --no-color` so contributors who already read
 * patches every day instantly recognize the shape:
 *
 *     --- spec       3.6.0
 *     +++ installed  3.7.1
 *     @@ patch version drift @@
 *     - 3.6.0
 *     + 3.7.1
 *           ^
 *
 * Padding rules:
 *   - The two LABEL columns (`spec`, `installed`) are right-padded to the
 *     longer label so the version columns line up vertically in the
 *     `---`/`+++` headers.
 *   - The caret column reuses the same `classifyDiff().caretCol` math as
 *     `renderMismatch` — it points at the first differing character of v2,
 *     measured from the start of v2 on the `+` line.
 *
 * Colors (when enabled):
 *   - `---` header → dim
 *   - `+++` header → dim
 *   - `@@ … @@`    → cyan + bold
 *   - `-` line     → red
 *   - `+` line     → green
 *   - caret `^`    → yellow + bold
 *
 * @param {string} label1   "spec" / "declared" / "locked" / etc.
 * @param {string} v1       version on the `-` line
 * @param {string} label2   "installed" / "locked" / etc.
 * @param {string} v2       version on the `+` line
 * @param {{ color?: boolean, indent?: string }} [opts]
 *   - color:  override TTY/NO_COLOR detection (default: auto-detect)
 *   - indent: leading whitespace prefix on every line (default: "    ")
 */
export function renderUnifiedDiff(label1, v1, label2, v2, opts = {}) {
  const { color: colorOverride, indent = "    " } = opts;
  const on = shouldColor(colorOverride);
  const { level, caretCol } = classifyDiff(v1, v2);

  const labelW = Math.max(label1.length, label2.length);
  const padLabel = (s) => s + " ".repeat(labelW - s.length);

  const minusHeader = `${indent}${paint(`--- ${padLabel(label1)}  ${v1}`, ANSI.dim, on)}`;
  const plusHeader = `${indent}${paint(`+++ ${padLabel(label2)}  ${v2}`, ANSI.dim, on)}`;
  const hunkHeader = `${indent}${paint(`@@ ${level} version drift @@`, ANSI.bold + ANSI.cyan, on)}`;
  const minusLine = `${indent}${paint(`- ${v1}`, ANSI.red, on)}`;
  const plusLine = `${indent}${paint(`+ ${v2}`, ANSI.green, on)}`;
  // Caret indent: indent + "+ " (2 chars) + caretCol — points at the first
  // differing char of v2 on the `+` line above.
  const caretLine = `${indent}  ${" ".repeat(caretCol)}${paint("^", ANSI.bold + ANSI.yellow, on)}`;

  return [minusHeader, plusHeader, hunkHeader, minusLine, plusLine, caretLine].join("\n");
}
