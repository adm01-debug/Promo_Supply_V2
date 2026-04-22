/**
 * Loader for the configurable barrel-rules file
 * (`.dependency-health-rules.json` at repo root).
 *
 * Why this exists: `tree-shaking-risk.mjs` ships a `DEFAULT_RULES`
 * table that hard-codes the date-fns barrels we know about. Teams
 * that want to track other un-tree-shakable packages (e.g. lodash,
 * @mui/material, rxjs) shouldn't have to fork the script — they
 * commit a rules file at the repo root and the scanner picks it up.
 *
 * On-disk shape:
 *
 *   {
 *     "version": 1,
 *     "mode": "extend" | "replace",       // default: "extend"
 *     "rules": [
 *       {
 *         "package": "lodash",                          // required
 *         "barrelPaths": ["lodash"],                    // required, ≥1 entry
 *         "safeSubpathPattern": "^lodash/[^/]+$"        // optional regex source
 *       }
 *     ]
 *   }
 *
 *   • "extend"  → user rules are appended to DEFAULT_RULES (date-fns
 *                 stays flagged, plus whatever the user adds).
 *   • "replace" → user rules become the entire table (use when you
 *                 want full control, e.g. you DON'T care about
 *                 date-fns at all).
 *
 * Safety:
 *   • Missing file → returns DEFAULT_RULES (no opt-in needed).
 *   • Malformed file / invalid regex → throws with a clear message
 *     so CI fails loudly instead of silently un-flagging real bugs.
 *   • `barrelPaths` MUST start with `package` or `package + "/"` —
 *     otherwise `ruleOwnsSpecifier` would never match them and the
 *     rule would be silently dead. Caught at load time.
 */
import { readFileSync, existsSync } from "node:fs";
import { DEFAULT_RULES } from "./tree-shaking-risk.mjs";

export const RULES_VERSION = 1;

function compileSafeSubpath(source, idx, pkg) {
  if (source === undefined) return undefined;
  if (typeof source !== "string" || source.length === 0) {
    throw new Error(
      `dependency-health rules: rules[${idx}] (${pkg}).safeSubpathPattern must be a non-empty regex source string`,
    );
  }
  try {
    return new RegExp(source);
  } catch (err) {
    throw new Error(
      `dependency-health rules: rules[${idx}] (${pkg}).safeSubpathPattern is not a valid regex: ${err.message}`,
    );
  }
}

/**
 * Validate + normalize an already-parsed rules payload.
 * @param {unknown} payload
 * @returns {{ rules: Array, mode: "extend"|"replace" }}
 */
export function parseRules(payload) {
  if (payload === null || typeof payload !== "object") {
    throw new Error("dependency-health rules: root must be an object");
  }
  const { version, mode = "extend", rules } = /** @type {any} */ (payload);
  if (version !== RULES_VERSION) {
    throw new Error(
      `dependency-health rules: unsupported version ${String(version)} (expected ${RULES_VERSION})`,
    );
  }
  if (mode !== "extend" && mode !== "replace") {
    throw new Error(`dependency-health rules: 'mode' must be "extend" or "replace" (got ${JSON.stringify(mode)})`);
  }
  if (!Array.isArray(rules)) {
    throw new Error("dependency-health rules: 'rules' must be an array");
  }

  const compiled = rules.map((raw, idx) => {
    if (raw === null || typeof raw !== "object") {
      throw new Error(`dependency-health rules: rules[${idx}] must be an object`);
    }
    const r = /** @type {Record<string, unknown>} */ (raw);
    if (typeof r.package !== "string" || r.package.length === 0) {
      throw new Error(`dependency-health rules: rules[${idx}].package is required`);
    }
    if (!Array.isArray(r.barrelPaths) || r.barrelPaths.length === 0) {
      throw new Error(
        `dependency-health rules: rules[${idx}] (${r.package}).barrelPaths must be a non-empty array`,
      );
    }
    const pkg = r.package;
    const barrelPaths = r.barrelPaths.map((bp, j) => {
      if (typeof bp !== "string" || bp.length === 0) {
        throw new Error(
          `dependency-health rules: rules[${idx}] (${pkg}).barrelPaths[${j}] must be a non-empty string`,
        );
      }
      // Sanity: the barrel path must be owned by the rule's package.
      // Otherwise classifySpecifier would never reach the barrelPaths
      // check (ruleOwnsSpecifier would short-circuit) → silently dead.
      if (bp !== pkg && !bp.startsWith(pkg + "/")) {
        throw new Error(
          `dependency-health rules: rules[${idx}] (${pkg}).barrelPaths[${j}] = "${bp}" is not owned by package "${pkg}" (must equal it or start with "${pkg}/")`,
        );
      }
      return bp;
    });

    return {
      package: pkg,
      barrelPaths,
      safeSubpathRe: compileSafeSubpath(r.safeSubpathPattern, idx, pkg),
    };
  });

  return { rules: compiled, mode };
}

/**
 * Resolve the effective rules table for a scan.
 *   • No file → DEFAULT_RULES.
 *   • mode "extend" → DEFAULT_RULES followed by user rules. If a user
 *     rule shares a package with a default rule, the USER rule wins
 *     (last-match-loses-to-first-match in classifySpecifier? — no, it
 *     iterates in order; so we put user rules FIRST so they override).
 *   • mode "replace" → user rules only.
 *
 * Also returns a stable string fingerprint so callers can fold it
 * into their cache key (changing rules MUST invalidate the scan
 * cache, otherwise stale offenders would persist).
 *
 * @param {string} path absolute path to .dependency-health-rules.json
 * @returns {{ rules: Array, mode: "extend"|"replace"|"default", fingerprint: string, source: "default"|"file" }}
 */
export function loadRules(path) {
  if (!existsSync(path)) {
    return {
      rules: DEFAULT_RULES,
      mode: "default",
      fingerprint: "default",
      source: "default",
    };
  }
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(`dependency-health rules: cannot read ${path}: ${err.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`dependency-health rules: invalid JSON in ${path}: ${err.message}`);
  }
  const { rules: userRules, mode } = parseRules(parsed);

  const effective =
    mode === "replace"
      ? userRules
      : // user-first so user rules override defaults for shared packages
        [
          ...userRules,
          ...DEFAULT_RULES.filter(
            (d) => !userRules.some((u) => u.package === d.package),
          ),
        ];

  // Fingerprint: stable JSON of the effective table (regex → source).
  const fingerprint = JSON.stringify(
    effective.map((r) => ({
      package: r.package,
      barrelPaths: r.barrelPaths,
      safe: r.safeSubpathRe ? r.safeSubpathRe.source : null,
    })),
  );

  return { rules: effective, mode, fingerprint, source: "file" };
}
