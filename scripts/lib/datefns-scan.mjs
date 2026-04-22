/**
 * Pure helpers for discovering `date-fns` usage in source code.
 *
 * Exported so unit tests can verify the scanner against fixtures without
 * spawning the full generator script. The main script
 * (scripts/generate-datefns-smoke-test.mjs) is the single consumer.
 *
 * Currently supported import shapes:
 *   ✓ Static ES imports:        import { format } from "date-fns/format";
 *   ✓ Multi-line static imports
 *   ✓ Type-only imports are SKIPPED (not bundled at runtime)
 *
 * NOT currently supported (the generator can't see them):
 *   ✗ CommonJS require destructuring: const { format } = require("date-fns/format");
 *   ✗ Dynamic ESM imports:            const { format } = await import("date-fns/format");
 *
 * The two unsupported shapes are exposed via `detectUnsupportedDateFnsUsage()`
 * so callers (and tests) can warn when they slip into the codebase.
 */

// Match: import [type] { a, b as c } from "date-fns/<subpath>"
// Brace contents use [^{}]* — allows newlines (multi-line imports) but
// forbids nested braces, preventing the match from spanning across adjacent
// import statements.
// Captures: 1=isType, 2=names, 3=subpath
export const STATIC_IMPORT_RE =
  /import\s+(type\s+)?\{([^{}]*)\}\s+from\s+["']date-fns\/([^"']+)["']/g;

// Match: const|let|var { a, b: c } = require("date-fns/<subpath>")
// Captures: 1=names, 2=subpath
export const REQUIRE_DESTRUCTURE_RE =
  /(?:const|let|var)\s*\{([^{}]*)\}\s*=\s*require\(\s*["']date-fns\/([^"']+)["']\s*\)/g;

// Match: await? import("date-fns/<subpath>") — bare or destructured.
// Captures: 1=subpath
export const DYNAMIC_IMPORT_RE =
  /(?:await\s+)?import\(\s*["']date-fns\/([^"']+)["']\s*\)/g;

/** Strip /* ... *\/ and // ... comments from a specifier blob. */
export function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Parse the raw text inside `{ ... }` of an import/require destructure into
 * a sorted, deduped array of imported export names. Strips inline `type`,
 * `as` aliases, comments, and empty entries.
 */
export function parseSpecifiers(namesRaw) {
  return [
    ...new Set(
      stripComments(namesRaw)
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => n.replace(/^type\s+/, "")) // inline `type` keyword
        .map((n) => n.split(/\s+as\s+/)[0].trim()) // strip aliases (`a as b`)
        .map((n) => n.split(/\s*:\s*/)[0].trim()) // strip CJS rename (`a: b`)
        .filter(Boolean),
    ),
  ].sort();
}

/**
 * Scan a single source file's text for **statically** imported date-fns
 * subpaths. Returns Map<subpath, Set<exportName>>.
 *
 * Type-only imports are skipped (they don't survive to runtime, so the
 * smoke test should not assert on them).
 */
export function scanStaticDateFnsImports(src) {
  const out = new Map();
  // Reset regex state — RE has /g flag and is module-scoped.
  STATIC_IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = STATIC_IMPORT_RE.exec(src)) !== null) {
    const [, isType, namesRaw, subpath] = m;
    if (isType) continue;
    const names = parseSpecifiers(namesRaw);
    if (names.length === 0) continue;
    if (!out.has(subpath)) out.set(subpath, new Set());
    const set = out.get(subpath);
    for (const n of names) set.add(n);
  }
  return out;
}

/**
 * Detect import shapes that the generator's static scanner can NOT see.
 * Returns an array of `{ kind, subpath, line, snippet }` records, one per
 * occurrence. Useful for tests and for surfacing CI warnings.
 *
 * @param {string} src     File contents.
 * @param {string} [file]  Optional file path for richer warnings.
 */
export function detectUnsupportedDateFnsUsage(src, file = "<inline>") {
  const findings = [];
  const lines = src.split("\n");
  const lineFor = (idx) => {
    // idx is char offset; convert to 1-based line number.
    let pos = 0;
    for (let i = 0; i < lines.length; i++) {
      pos += lines[i].length + 1; // +1 for the \n
      if (idx < pos) return i + 1;
    }
    return lines.length;
  };

  REQUIRE_DESTRUCTURE_RE.lastIndex = 0;
  let m;
  while ((m = REQUIRE_DESTRUCTURE_RE.exec(src)) !== null) {
    findings.push({
      kind: "require-destructure",
      subpath: m[2],
      names: parseSpecifiers(m[1]),
      line: lineFor(m.index),
      snippet: m[0],
      file,
    });
  }

  DYNAMIC_IMPORT_RE.lastIndex = 0;
  while ((m = DYNAMIC_IMPORT_RE.exec(src)) !== null) {
    findings.push({
      kind: "dynamic-import",
      subpath: m[1],
      line: lineFor(m.index),
      snippet: m[0],
      file,
    });
  }

  return findings;
}
