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
