/**
 * Pure helpers for tree-shaking risk scoring.
 *
 * Extracted from `scripts/generate-dependency-health.mjs` so the regex
 * (which decides "barrel" vs "safe subpath") and the risk-level
 * thresholds can be unit-tested in isolation. The generator imports
 * these constants/functions verbatim — there must be exactly one
 * source of truth for both, otherwise the dependency-health snapshot
 * and the tests can drift.
 *
 * Contract:
 *   • BARREL_IMPORT_RE matches `from 'date-fns'` and
 *     `from 'date-fns/locale'` (the two un-tree-shakable barrel
 *     entrypoints) and MUST NOT match deep subpaths like
 *     `date-fns/format`, `date-fns/parseISO`, or
 *     `date-fns/locale/pt-BR` (those tree-shake fine).
 *   • countBarrelImports(source) returns the number of regex matches
 *     in a single source string.
 *   • computeRiskLevel(n) maps a barrel-import count to a risk bucket:
 *        0      → "ok"
 *        1..4   → "warning"
 *        ≥ 5    → "critical"
 */

export const BARREL_IMPORT_RE = /from\s+['"](date-fns(?:\/locale)?)['"]/g;

export function countBarrelImports(source) {
  if (typeof source !== "string" || source.length === 0) return 0;
  // Always reset lastIndex — the regex is /g and shared across calls.
  BARREL_IMPORT_RE.lastIndex = 0;
  let n = 0;
  while (BARREL_IMPORT_RE.exec(source) !== null) n++;
  return n;
}

export function computeRiskLevel(barrelImportsFound) {
  if (!Number.isFinite(barrelImportsFound) || barrelImportsFound <= 0) return "ok";
  if (barrelImportsFound < 5) return "warning";
  return "critical";
}
