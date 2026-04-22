/**
 * Allowlist loader + matcher for tree-shaking offenders.
 *
 * Lets us mark known false positives (or knowingly-tolerated barrel
 * imports — e.g. a generated file we can't refactor right now) so
 * repeated scans stop flagging them. Each entry MUST carry a human
 * `reason` and SHOULD carry an `expiresAt` so debt doesn't accumulate
 * silently.
 *
 * On-disk shape — `.dependency-health-allowlist.json` at repo root:
 *
 *   {
 *     "version": 1,
 *     "entries": [
 *       {
 *         "package": "date-fns",                       // required
 *         "file": "src/legacy/dates.ts",               // optional, exact match
 *         "line": 42,                                  // optional, exact match
 *         "importPath": "date-fns/locale",             // optional, exact match
 *         "reason": "legacy locale shim, refactor #4521",
 *         "expiresAt": "2026-12-31"                    // optional ISO date
 *       }
 *     ]
 *   }
 *
 * Matching rules:
 *   • `package` is REQUIRED and must match the offender's package
 *     bucket (currently always "date-fns" — derived from importPath).
 *   • `file`, `line`, `importPath` are optional FILTERS — when present
 *     they must equal the offender field exactly. Omitted fields are
 *     wildcards. An entry with only `package` suppresses every offender
 *     in that package (use sparingly, document the reason).
 *   • Expired entries are NEVER matched. They're surfaced to the
 *     caller as `expired` so CI can warn / fail.
 *
 * The allowlist file itself is untrusted user input → all loads are
 * defensive (missing file → empty list, malformed → throws with a
 * clear message so CI fails loudly instead of silently un-suppressing).
 */
import { readFileSync, existsSync } from "node:fs";

export const ALLOWLIST_VERSION = 1;

/**
 * Parse + validate an allowlist payload (already-parsed JSON object).
 * Returns `{ entries, expired }` — `expired` is the subset whose
 * `expiresAt` is in the past relative to `now`.
 *
 * @param {unknown} payload
 * @param {{ now?: Date }} [opts]
 */
export function parseAllowlist(payload, opts = {}) {
  const now = opts.now ?? new Date();
  if (payload === null || typeof payload !== "object") {
    throw new Error("dependency-health allowlist: root must be an object");
  }
  const { version, entries } = /** @type {{version?:unknown, entries?:unknown}} */ (payload);
  if (version !== ALLOWLIST_VERSION) {
    throw new Error(
      `dependency-health allowlist: unsupported version ${String(version)} (expected ${ALLOWLIST_VERSION})`,
    );
  }
  if (!Array.isArray(entries)) {
    throw new Error("dependency-health allowlist: 'entries' must be an array");
  }

  const active = [];
  const expired = [];

  entries.forEach((raw, idx) => {
    if (raw === null || typeof raw !== "object") {
      throw new Error(`dependency-health allowlist: entries[${idx}] must be an object`);
    }
    const e = /** @type {Record<string, unknown>} */ (raw);
    if (typeof e.package !== "string" || e.package.length === 0) {
      throw new Error(`dependency-health allowlist: entries[${idx}].package is required`);
    }
    if (typeof e.reason !== "string" || e.reason.trim().length === 0) {
      throw new Error(
        `dependency-health allowlist: entries[${idx}] (${e.package}) must include a non-empty 'reason'`,
      );
    }
    if (e.file !== undefined && typeof e.file !== "string") {
      throw new Error(`dependency-health allowlist: entries[${idx}].file must be a string`);
    }
    if (e.line !== undefined && (typeof e.line !== "number" || !Number.isInteger(e.line) || e.line < 1)) {
      throw new Error(`dependency-health allowlist: entries[${idx}].line must be a positive integer`);
    }
    if (e.importPath !== undefined && typeof e.importPath !== "string") {
      throw new Error(`dependency-health allowlist: entries[${idx}].importPath must be a string`);
    }
    if (e.expiresAt !== undefined && typeof e.expiresAt !== "string") {
      throw new Error(`dependency-health allowlist: entries[${idx}].expiresAt must be an ISO date string`);
    }

    const normalized = {
      package: e.package,
      reason: e.reason.trim(),
      file: typeof e.file === "string" ? e.file.replace(/\\/g, "/") : undefined,
      line: typeof e.line === "number" ? e.line : undefined,
      importPath: typeof e.importPath === "string" ? e.importPath : undefined,
      expiresAt: typeof e.expiresAt === "string" ? e.expiresAt : undefined,
    };

    if (normalized.expiresAt) {
      const t = Date.parse(normalized.expiresAt);
      if (Number.isNaN(t)) {
        throw new Error(
          `dependency-health allowlist: entries[${idx}].expiresAt "${normalized.expiresAt}" is not a parseable date`,
        );
      }
      if (t < now.getTime()) {
        expired.push(normalized);
        return;
      }
    }
    active.push(normalized);
  });

  return { entries: active, expired };
}

/**
 * Load + parse the allowlist file. Missing file → empty list (no error
 * — projects without false positives shouldn't be required to commit
 * an empty allowlist). Malformed file → throws.
 *
 * @param {string} path
 * @param {{ now?: Date }} [opts]
 */
export function loadAllowlist(path, opts) {
  if (!existsSync(path)) return { entries: [], expired: [] };
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(`dependency-health allowlist: cannot read ${path}: ${err.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`dependency-health allowlist: invalid JSON in ${path}: ${err.message}`);
  }
  return parseAllowlist(parsed, opts);
}

/**
 * Returns true when an offender matches the allowlist entry. An
 * offender is `{ file, line, importPath }` (already normalized to
 * forward-slash paths by the scanner) plus an inferred `package`.
 *
 * Matching is conjunctive: every present filter on the entry must
 * equal the offender's value. Omitted filters are wildcards.
 *
 * @param {{file:string,line:number,importPath:string,package:string}} offender
 * @param {{package:string,file?:string,line?:number,importPath?:string}} entry
 */
export function matchesAllowlist(offender, entry) {
  if (entry.package !== offender.package) return false;
  if (entry.file !== undefined && entry.file !== offender.file) return false;
  if (entry.line !== undefined && entry.line !== offender.line) return false;
  if (entry.importPath !== undefined && entry.importPath !== offender.importPath) return false;
  return true;
}

/**
 * Infer the package bucket from a `from "<importPath>"` literal. The
 * scanner today only tracks date-fns barrels, so anything starting
 * with `date-fns` (the package name boundary is `/` or end-of-string)
 * → `"date-fns"`. Future packages: extend this map.
 *
 * @param {string} importPath
 */
export function inferPackageFromImportPath(importPath) {
  if (importPath === "date-fns" || importPath.startsWith("date-fns/")) return "date-fns";
  return importPath;
}

/**
 * Apply an allowlist to a list of offenders. Returns the surviving
 * (non-suppressed) offenders plus a `suppressed` array recording which
 * entry suppressed each one (for the snapshot, so reviewers can see
 * what's being hidden and why).
 *
 * @param {{file:string,line:number,importPath:string}[]} offenders
 * @param {{package:string,file?:string,line?:number,importPath?:string,reason:string}[]} entries
 */
export function applyAllowlist(offenders, entries) {
  if (entries.length === 0) {
    return { kept: offenders, suppressed: [] };
  }
  const kept = [];
  const suppressed = [];
  for (const off of offenders) {
    const enriched = { ...off, package: inferPackageFromImportPath(off.importPath) };
    const hit = entries.find((e) => matchesAllowlist(enriched, e));
    if (hit) {
      suppressed.push({ ...off, package: enriched.package, reason: hit.reason });
    } else {
      kept.push(off);
    }
  }
  return { kept, suppressed };
}
