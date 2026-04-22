/**
 * Pure helpers for tree-shaking risk scoring.
 *
 * Scoped matching model (added so we can extend beyond date-fns without
 * regressing the existing regex-based contract):
 *
 *   A rule is `{ package, barrelPaths, safeSubpathRe? }`:
 *     • `package`           — npm name (exact, package-boundary aware).
 *     • `barrelPaths`       — exact import specifiers that are barrels
 *                             (un-tree-shakable). e.g. ["date-fns",
 *                             "date-fns/locale"]. Anything in this list
 *                             is ALWAYS flagged.
 *     • `safeSubpathRe`     — optional regex of subpaths that are
 *                             EXPLICITLY safe (tree-shakable) and must
 *                             never be flagged, even if a future broader
 *                             rule would otherwise catch them. e.g.
 *                             /^date-fns\/(?!locale$)[^/]+/ matches
 *                             `date-fns/format`, `date-fns/parseISO`,
 *                             `date-fns/locale/pt-BR`, etc.
 *
 * Matching algorithm (per import specifier `S`):
 *   1. Find the rule whose `package` owns `S` (exact match or `S`
 *      starts with `package + "/"` — never substring, so `date-fns-tz`
 *      ≠ `date-fns`).
 *   2. If `S` is in `barrelPaths` → BARREL (flag it).
 *   3. Else if `safeSubpathRe?.test(S)` → SAFE (skip).
 *   4. Else → SAFE by default (we only flag known-bad paths; unknown
 *      deep subpaths are assumed tree-shakable).
 *
 * Back-compat:
 *   • BARREL_IMPORT_RE and countBarrelImports preserve the original
 *     regex shape and counts. The HTML/snapshot pipeline still uses
 *     them. Do not change BARREL_IMPORT_RE.source without bumping
 *     SCAN_VERSION in generate-dependency-health.mjs (the cache key
 *     hashes on it — see the canary test).
 */

export const BARREL_IMPORT_RE = /from\s+['"](date-fns(?:\/locale)?)['"]/g;

/** Generic `from "..."` extractor used by the scoped matcher. The
 *  capture group is the bare specifier (no quotes). */
export const IMPORT_FROM_RE = /from\s+['"]([^'"]+)['"]/g;

/**
 * Default rules table. Keep this in sync with the regex above —
 * date-fns barrels must produce the same flagged set under both APIs.
 */
export const DEFAULT_RULES = [
  {
    package: "date-fns",
    barrelPaths: ["date-fns", "date-fns/locale"],
    // Anything under date-fns/* that ISN'T `date-fns/locale` exactly is
    // a tree-shakable subpath. `date-fns/locale/pt-BR` is also safe.
    safeSubpathRe: /^date-fns\/(?!locale$)[^/]+(?:\/[^/]+)*$/,
  },
];

export function countBarrelImports(source) {
  if (typeof source !== "string" || source.length === 0) return 0;
  // Always reset lastIndex — the regex is /g and shared across calls.
  BARREL_IMPORT_RE.lastIndex = 0;
  let n = 0;
  while (BARREL_IMPORT_RE.exec(source) !== null) n++;
  return n;
}

/**
 * Returns true iff `rule.package` "owns" the given import specifier.
 * Package-boundary aware: `date-fns` owns `date-fns` and `date-fns/x`
 * but NOT `date-fns-tz` (substring trap).
 */
export function ruleOwnsSpecifier(rule, specifier) {
  if (typeof specifier !== "string" || specifier.length === 0) return false;
  if (specifier === rule.package) return true;
  return specifier.startsWith(rule.package + "/");
}

/**
 * Classify a single import specifier against a rules table.
 * Returns `"barrel" | "safe" | "unrelated"`.
 *   • "barrel"    → matches `barrelPaths` of an owning rule.
 *   • "safe"      → owned by a rule but explicitly safe (or unknown
 *                    subpath, which we default to safe).
 *   • "unrelated" → no rule owns this specifier.
 */
export function classifySpecifier(specifier, rules = DEFAULT_RULES) {
  for (const rule of rules) {
    if (!ruleOwnsSpecifier(rule, specifier)) continue;
    if (rule.barrelPaths.includes(specifier)) return "barrel";
    if (rule.safeSubpathRe && rule.safeSubpathRe.test(specifier)) return "safe";
    return "safe"; // owned but no rule matched → assume tree-shakable
  }
  return "unrelated";
}

/**
 * Scan a source string and return every barrel offender it contains.
 * Each offender is `{ specifier, index, line }` (1-indexed line).
 * Use this when you need positions; use countBarrelImports when you
 * just need the count (back-compat path).
 */
export function findBarrelOffenders(source, rules = DEFAULT_RULES) {
  if (typeof source !== "string" || source.length === 0) return [];
  IMPORT_FROM_RE.lastIndex = 0;
  const out = [];
  let m;
  while ((m = IMPORT_FROM_RE.exec(source)) !== null) {
    const spec = m[1];
    if (classifySpecifier(spec, rules) !== "barrel") continue;
    // Compute 1-indexed line number from byte offset.
    const upTo = source.slice(0, m.index);
    const line = upTo.split("\n").length;
    out.push({ specifier: spec, index: m.index, line });
  }
  return out;
}

export function computeRiskLevel(barrelImportsFound) {
  if (!Number.isFinite(barrelImportsFound) || barrelImportsFound <= 0) return "ok";
  if (barrelImportsFound < 5) return "warning";
  return "critical";
}
