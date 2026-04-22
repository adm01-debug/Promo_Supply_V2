// Pin-validation suite for date-fns and any sibling packages we want to keep
// exact-pinned. Lives next to dateFns.smoke.test.ts so it runs in the same
// vitest config and the same CI lane.
//
// What it checks, for every package in PINNED_PACKAGES:
//   1. The spec in package.json is EXACT (no `^`, `~`, `>=`, `*`, ranges, tags).
//   2. The version installed under node_modules/<pkg>/package.json EQUALS
//      that exact spec.
//
// How to extend:
//   Add an entry to PINNED_PACKAGES below. The test will pick it up
//   automatically and assert both invariants. Skips (with a clear message)
//   any package not present in package.json so adding optional deps is safe.
//
// Why a runtime test (not just a script): dynamic-importing each
// `<pkg>/package.json` proves both that the package resolves AND that its
// exports map exposes ./package.json — the same path the smoke test relies
// on for date-fns version verification.
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import rootPkg from "../../package.json";
import pinnedManifest from "./datefns-pinned-packages.json";

/**
 * Trace where a package's installed version came from in bun.lock.
 *
 * Bun's text lockfile stores resolution entries in this shape:
 *   "<name>": ["<name>@<version>", "<resolved-url>", { ... }, "<integrity>"],
 * (See bun.lock around the `"date-fns": [...]` line for an example.)
 *
 * We deliberately match on `"<name>": [` so we never confuse a resolution
 * entry with a transitive `peerDependencies` declaration like
 *   "date-fns": "^2.28.0 || ^3.0.0"
 * which appears INSIDE another package's metadata object and isn't a
 * resolution at all.
 *
 * Returns absolute path + 1-based line number + the verbatim line + the
 * extracted version, so a failure report can render the exact provenance.
 */
interface LockTrace {
  path: string;
  lineNumber: number | null;
  lineText: string | null;
  resolvedVersion: string | null;
  /** Compact summary used in the per-test audit log. */
  summary: string;
}

function traceLockfileEntry(name: string): LockTrace {
  const lockPath = resolve(process.cwd(), "bun.lock");
  if (!existsSync(lockPath)) {
    return {
      path: lockPath,
      lineNumber: null,
      lineText: null,
      resolvedVersion: null,
      summary: "<bun.lock not found>",
    };
  }
  const lines = readFileSync(lockPath, "utf8").split("\n");
  // Anchor: optional whitespace, then `"<escaped-name>":` followed by ` [`.
  // The leading-whitespace check (`^\s*`) prevents matches inside string
  // values; the `[` after the colon is the resolution-entry signature.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^\\s*"${escaped}":\\s*\\[`);
  for (let i = 0; i < lines.length; i++) {
    if (!re.test(lines[i])) continue;
    const lineText = lines[i].trim();
    // Extract `<name>@<version>` from the first array element.
    const versionMatch = lineText.match(
      new RegExp(`"${escaped}@([^"]+)"`),
    );
    const resolvedVersion = versionMatch ? versionMatch[1] : null;
    return {
      path: lockPath,
      lineNumber: i + 1,
      lineText,
      resolvedVersion,
      summary: resolvedVersion
        ? `${resolvedVersion}@bun.lock:${i + 1}`
        : `<unparseable>@bun.lock:${i + 1}`,
    };
  }
  return {
    path: lockPath,
    lineNumber: null,
    lineText: null,
    resolvedVersion: null,
    summary: "<no resolution entry>",
  };
}


/**
 * Packages that MUST be exact-pinned. Sourced from
 * `src/test/datefns-pinned-packages.json` so the list can be extended
 * without editing test code. Schema:
 *   { "packages": string[] }
 * The JSON file is the single source of truth — see its `description`
 * field and the companion JSON-schema for usage notes.
 */
const PINNED_PACKAGES: readonly string[] = (() => {
  const raw = (pinnedManifest as { packages?: unknown }).packages;
  if (!Array.isArray(raw)) {
    throw new Error(
      `src/test/datefns-pinned-packages.json must contain a "packages" array. Got: ${typeof raw}.`,
    );
  }
  const cleaned = raw.filter((x): x is string => typeof x === "string" && x.length > 0);
  if (cleaned.length !== raw.length) {
    throw new Error(
      `src/test/datefns-pinned-packages.json: every entry in "packages" must be a non-empty string.`,
    );
  }
  // Dedupe while preserving order — duplicate entries would just produce
  // duplicate test cases, which is noise.
  return Array.from(new Set(cleaned));
})();

const EXACT_SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

type PkgManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
type Bucket = "dependencies" | "devDependencies";
type Scope = "all" | "dependencies" | "devDependencies";

/**
 * Optional scope filter via env var. Aliases (case-insensitive):
 *   DATEFNS_PIN_SCOPE=deps  | dep  | dependencies      → dependencies only
 *   DATEFNS_PIN_SCOPE=dev   | devDeps | devDependencies → devDependencies only
 *   DATEFNS_PIN_SCOPE=all   (default, or unset)        → both buckets
 *
 * Use cases:
 *   - Run only the runtime-critical pin checks in a fast PR lane:
 *       DATEFNS_PIN_SCOPE=deps bun run test src/test/datefnsPins.test.ts
 *   - Validate dev-time tooling pins separately in a nightly job:
 *       DATEFNS_PIN_SCOPE=dev  bun run test src/test/datefnsPins.test.ts
 *
 * Packages found only in the OTHER bucket are reported as `it.skip` with a
 * clear "skipped: scope=… but found in …" message so the run output is
 * unambiguous about why a package was excluded.
 */
function resolveScope(): Scope {
  const raw = (typeof process !== "undefined" ? process.env?.DATEFNS_PIN_SCOPE : undefined) ?? "";
  switch (raw.trim().toLowerCase()) {
    case "":
    case "all":
    case "both":
      return "all";
    case "dep":
    case "deps":
    case "dependencies":
    case "prod":
    case "runtime":
      return "dependencies";
    case "dev":
    case "devdep":
    case "devdeps":
    case "devdependencies":
      return "devDependencies";
    default:
      throw new Error(
        `DATEFNS_PIN_SCOPE="${raw}" is not a recognized value. ` +
          `Use one of: all, dependencies (deps), devDependencies (dev). Unset to default to "all".`,
      );
  }
}

const SCOPE: Scope = resolveScope();

function lookupSpec(name: string): { spec: string; bucket: Bucket } | null {
  const pkg = rootPkg as PkgManifest;
  if (pkg.dependencies?.[name]) return { spec: pkg.dependencies[name], bucket: "dependencies" };
  if (pkg.devDependencies?.[name]) return { spec: pkg.devDependencies[name], bucket: "devDependencies" };
  return null;
}

describe(`date-fns ecosystem: exact-pin enforcement (scope=${SCOPE})`, () => {
  it("PINNED_PACKAGES list is non-empty (guard against accidental clearing)", () => {
    expect(PINNED_PACKAGES.length, "PINNED_PACKAGES must list at least one package").toBeGreaterThan(0);
  });


  for (const name of PINNED_PACKAGES) {
    describe(name, () => {
      const found = lookupSpec(name);

      if (!found) {
        it.skip(`is not declared in package.json — skipping pin check for "${name}"`, () => {
          // Intentionally skipped: the package isn't installed in this project.
          // Remove from PINNED_PACKAGES if it's permanently gone.
        });
        return;
      }

      // Apply scope filter: skip (with a clear reason) when the package
      // lives in the bucket the current scope excludes.
      if (SCOPE !== "all" && found.bucket !== SCOPE) {
        it.skip(
          `skipped: scope=${SCOPE} but "${name}" is declared in ${found.bucket} (set DATEFNS_PIN_SCOPE=all to include)`,
          () => {
            // No-op: scoped out of this run.
          },
        );
        return;
      }

      it("is exact-pinned in package.json AND installed version matches", async () => {
        const spec = found.spec;
        const bucket = found.bucket;
        const isExact = EXACT_SEMVER_RE.test(spec);

        // Resolve the installed version (best-effort — surface as "<not
        // installed>" so the consolidated report stays informative even when
        // the import fails).
        let installed: string | "<not installed>" | "<malformed package.json>" = "<not installed>";
        let importError: string | null = null;
        try {
          const mod = (await import(/* @vite-ignore */ `${name}/package.json`)) as {
            default?: { version?: string };
            version?: string;
          };
          const v = mod.default?.version ?? mod.version;
          installed = typeof v === "string" && v.length > 0 ? v : "<malformed package.json>";
        } catch (err) {
          importError = (err as Error).message;
        }

        // Trace the version source in bun.lock so a mismatch report tells the
        // contributor exactly WHERE the resolved version came from. We read
        // bun.lock lazily (synchronously, once per failing test) because:
        //   - It's only needed when we want to render the failure report.
        //   - bun.lock is a YAML-ish text file; we don't need a parser, just
        //     a line-locator. The matched line is shown verbatim in the report.
        // Format we look for (per `grep -n '"date-fns'` examples):
        //     934:    "date-fns": ["date-fns@3.6.0", "", {}, "sha512-…"],
        // Matching is anchored on `"<name>": [` so we never match a transitive
        // peerDependencies entry like `"date-fns": "^2.28.0 || ^3.0.0"`.
        const lockTrace = traceLockfileEntry(name);

        const matches = installed === spec;
        const ok = isExact && matches;

        // Always log a one-line audit trail for every package, pass or fail.
        // Includes the lockfile line number when available so CI scrollback
        // lets you jump straight to the source even on green runs.
        // eslint-disable-next-line no-console
        console.log(
          `[pin check] ${name}: declared="${spec}" (${bucket}) installed="${installed}" ` +
            `lockfile=${lockTrace.summary} ` +
            `exact=${isExact ? "✓" : "✗"} matches=${matches ? "✓" : "✗"} ${ok ? "✓ OK" : "✗ FAIL"}`,
        );

        // Build a single, multi-line error report covering every relevant fact
        // so the contributor never has to cross-reference two failed assertions.
        const report = [
          ``,
          `── date-fns pin check failed for "${name}" ──`,
          `  package          : ${name}`,
          `  declared spec    : ${spec}     (package.json → ${bucket})`,
          `  installed version: ${installed}`,
          `  exact-pinned?    : ${isExact ? "yes ✓" : `no ✗  (must be plain semver, got "${spec}")`}`,
          `  versions match?  : ${matches ? "yes ✓" : `no ✗  (declared "${spec}" ≠ installed "${installed}")`}`,
          `  lockfile source  : ${lockTrace.path}${
            lockTrace.lineNumber ? ` (line ${lockTrace.lineNumber})` : ""
          }`,
          ...(lockTrace.lineText
            ? [
                `  lockfile entry   : ${lockTrace.lineText}`,
                `  lockfile-resolved: ${lockTrace.resolvedVersion ?? "<not parseable>"}`,
              ]
            : [
                `  lockfile entry   : <no resolution entry found for "${name}">`,
                `                     (the package may be listed only as a peer dep, or`,
                `                      the lockfile is out of date — run \`bun install\`)`,
              ]),
          ...(importError
            ? [
                `  import error     : ${importError}`,
                `                     (package may not be installed, or its exports map`,
                `                      doesn't expose ./package.json)`,
              ]
            : []),
          ``,
          `  Fix:`,
          ...(!isExact
            ? [`    bun add ${name}@<exact-version>           # re-pin (drop ^/~/range/tag)`]
            : []),
          ...(!matches
            ? [`    bun install --frozen-lockfile             # restore install to match lockfile`]
            : []),
          ...(importError
            ? [`    bun install --frozen-lockfile             # ensure ${name} is installed`]
            : []),
          ``,
        ].join("\n");

        expect(ok, report).toBe(true);
      });
    });
  }
});
