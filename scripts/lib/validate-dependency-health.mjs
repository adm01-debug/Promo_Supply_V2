#!/usr/bin/env node
/**
 * Lightweight, dependency-free JSON-shape validator for
 * public/dependency-health.json. Lives in scripts/lib/ so both the generator
 * (`generate-dependency-health.mjs`) and the diff (`diff-dependency-health.mjs`)
 * can refuse to operate on a malformed snapshot — failing fast with a
 * pinpointed path (e.g. `dateFns.subpaths.entries[3].subpath`) instead of
 * crashing later in some downstream `.map(...)` call.
 *
 * Why a hand-rolled schema instead of ajv/zod?
 *   1. These scripts are bun/node-only build tooling; we don't want to drag
 *      a runtime validator into devDependencies just for one file.
 *   2. The schema is small and stable — see `validateSnapshot` below.
 *   3. Error messages can be tuned to recommend the exact fix recipe
 *      (regenerate with --write-health, restore from git, etc.).
 *
 * Subpaths block: tolerates BOTH the rich `entries[]` shape (current writer)
 * AND the legacy `list[]` shape (older snapshots / external tooling).
 * If `entries[]` is present it MUST be well-formed; `list[]` alone is OK.
 */

const TYPE = (v) =>
  v === null ? "null" : Array.isArray(v) ? "array" : typeof v;

class ValidationError extends Error {
  constructor(path, expected, actual, hint) {
    super(
      `${path}: expected ${expected}, got ${actual === undefined ? "undefined" : TYPE(actual)}` +
        (hint ? `\n  hint: ${hint}` : ""),
    );
    this.name = "ValidationError";
    this.path = path;
    this.expected = expected;
    this.actualType = TYPE(actual);
  }
}

function requireType(v, type, path, hint) {
  if (TYPE(v) !== type) throw new ValidationError(path, type, v, hint);
}
function requireOneOf(v, types, path, hint) {
  if (!types.includes(TYPE(v))) {
    throw new ValidationError(path, types.join(" | "), v, hint);
  }
}
function optionalType(v, type, path, hint) {
  if (v === undefined || v === null) return;
  if (TYPE(v) !== type) throw new ValidationError(path, type, v, hint);
}

function validateEntry(e, path) {
  requireType(e, "object", path, "each entry must be an object");
  requireType(e.subpath, "string", `${path}.subpath`);
  requireType(e.exists, "boolean", `${path}.exists`);
  // resolvedFile may be string (when exists) or null (when missing)
  requireOneOf(e.resolvedFile, ["string", "null"], `${path}.resolvedFile`);
  optionalType(e.fileCount, "number", `${path}.fileCount`);
  if (e.files !== undefined) {
    requireType(e.files, "array", `${path}.files`);
    e.files.forEach((f, i) =>
      requireType(f, "string", `${path}.files[${i}]`),
    );
  }
}

function validateScanInput(s, path) {
  requireType(s, "object", path);
  requireType(s.roots, "array", `${path}.roots`, "expected scanned root dirs");
  s.roots.forEach((r, i) => requireType(r, "string", `${path}.roots[${i}]`));
  optionalType(s.rootsSource, "string", `${path}.rootsSource`);
  if (s.excludeDirs !== undefined) {
    requireType(s.excludeDirs, "array", `${path}.excludeDirs`);
  }
  optionalType(s.excludeFilePattern, "string", `${path}.excludeFilePattern`);
  optionalType(s.fileExtensions, "string", `${path}.fileExtensions`);
  optionalType(s.fileCount, "number", `${path}.fileCount`);
  optionalType(s.fileHash, "string", `${path}.fileHash`);
  if (s.files !== undefined) {
    requireType(s.files, "array", `${path}.files`);
    s.files.forEach((f, i) => requireType(f, "string", `${path}.files[${i}]`));
  }
}

function validateSubpaths(sp, path) {
  requireType(sp, "object", path);
  // Must carry at least one of entries[] / list[] — both forms acceptable.
  const hasEntries = sp.entries !== undefined;
  const hasList = sp.list !== undefined;
  if (!hasEntries && !hasList) {
    throw new ValidationError(
      `${path}`,
      "object containing 'entries' (preferred) or 'list'",
      sp,
      "regenerate with: bun run verify:datefns-files -- --write-health",
    );
  }
  if (hasEntries) {
    requireType(sp.entries, "array", `${path}.entries`);
    sp.entries.forEach((e, i) => validateEntry(e, `${path}.entries[${i}]`));
  }
  if (hasList) {
    requireType(sp.list, "array", `${path}.list`);
    sp.list.forEach((s, i) => requireType(s, "string", `${path}.list[${i}]`));
  }
  optionalType(sp.count, "number", `${path}.count`);
  optionalType(sp.missingCount, "number", `${path}.missingCount`);
  optionalType(sp.scannedAt, "string", `${path}.scannedAt`);
  if (sp.scanInput !== undefined) validateScanInput(sp.scanInput, `${path}.scanInput`);
}

function validatePackage(p, path) {
  requireType(p, "object", path);
  requireType(p.name, "string", `${path}.name`);
  optionalType(p.label, "string", `${path}.label`);
  optionalType(p.spec, "string", `${path}.spec`);
  optionalType(p.installed, "string", `${path}.installed`);
  optionalType(p.locked, "string", `${path}.locked`);
  optionalType(p.exactPinned, "boolean", `${path}.exactPinned`);
  optionalType(p.driftDetected, "boolean", `${path}.driftDetected`);
}

/**
 * Validate a parsed snapshot object. Throws ValidationError on the FIRST
 * structural problem with a path-qualified message. Returns the snapshot
 * untouched on success so callers can chain.
 */
export function validateSnapshot(snapshot) {
  requireType(snapshot, "object", "<root>", "snapshot must be a JSON object");

  // dateFns block (optional at top level — older snapshots may omit, but if
  // present it MUST have a recognisable shape).
  if (snapshot.dateFns !== undefined) {
    requireType(snapshot.dateFns, "object", "dateFns");
    optionalType(snapshot.dateFns.spec, "string", "dateFns.spec");
    optionalType(snapshot.dateFns.installed, "string", "dateFns.installed");
    optionalType(snapshot.dateFns.locked, "string", "dateFns.locked");
    optionalType(snapshot.dateFns.exactPinned, "boolean", "dateFns.exactPinned");
    if (snapshot.dateFns.subpaths !== undefined) {
      validateSubpaths(snapshot.dateFns.subpaths, "dateFns.subpaths");
    }
  }

  if (snapshot.packages !== undefined) {
    requireType(snapshot.packages, "array", "packages");
    snapshot.packages.forEach((p, i) => validatePackage(p, `packages[${i}]`));
  }

  if (snapshot.lockfileDrift !== undefined) {
    requireType(snapshot.lockfileDrift, "object", "lockfileDrift");
    optionalType(snapshot.lockfileDrift.detected, "boolean", "lockfileDrift.detected");
  }

  if (snapshot.treeShaking !== undefined) {
    requireType(snapshot.treeShaking, "object", "treeShaking");
    optionalType(snapshot.treeShaking.barrelImportsFound, "number", "treeShaking.barrelImportsFound");
    optionalType(snapshot.treeShaking.riskLevel, "string", "treeShaking.riskLevel");
    if (snapshot.treeShaking.offenders !== undefined) {
      requireType(snapshot.treeShaking.offenders, "array", "treeShaking.offenders");
    }
  }

  return snapshot;
}

/**
 * Convenience: print a friendly failure block and exit(1). Centralised so
 * generator + diff produce identical, copy-pasteable recovery hints.
 */
export function failOnInvalid(err, { sourcePath, role }) {
  const msg = String(err?.message ?? err);
  process.stderr.write(
    [
      "",
      `✗ ${role}: ${sourcePath} failed schema validation.`,
      `  ${msg.split("\n").join("\n  ")}`,
      "",
      "  ▶ Recover (in order):",
      "    1. Inspect the file: cat " + sourcePath + " | head -60",
      "    2. Restore from git: git checkout HEAD -- " + sourcePath,
      "    3. Regenerate fresh: bun run verify:datefns-files -- --write-health",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

export { ValidationError };
