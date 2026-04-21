#!/usr/bin/env node
/**
 * Shared semver diff helpers for date-fns version mismatch reporting.
 * Used by verify-datefns-versions.mjs and install-report.mjs.
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

/** Render a 4-line mismatch block with a caret pointing at the differing segment. */
export function renderMismatch(label1, v1, label2, v2) {
  const { level, caretCol } = classifyDiff(v1, v2);
  const labelW = Math.max(label1.length, label2.length);
  const pad = (s) => s + " ".repeat(labelW - s.length);
  const caretIndent = " ".repeat(labelW + 2 + caretCol);
  return [
    `    ${pad(label1)}  ${v1}`,
    `    ${pad(label2)}  ${v2}`,
    `    ${caretIndent}^`,
    `    → ${level} version drift (${v1} → ${v2})`,
  ].join("\n");
}
