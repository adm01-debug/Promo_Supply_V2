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
import rootPkg from "../../package.json";
import pinnedManifest from "./datefns-pinned-packages.json";

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

function lookupSpec(name: string): { spec: string; bucket: "dependencies" | "devDependencies" } | null {
  const pkg = rootPkg as PkgManifest;
  if (pkg.dependencies?.[name]) return { spec: pkg.dependencies[name], bucket: "dependencies" };
  if (pkg.devDependencies?.[name]) return { spec: pkg.devDependencies[name], bucket: "devDependencies" };
  return null;
}

describe("date-fns ecosystem: exact-pin enforcement", () => {
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

        const matches = installed === spec;
        const ok = isExact && matches;

        // Always log a one-line audit trail for every package, pass or fail.
        // eslint-disable-next-line no-console
        console.log(
          `[pin check] ${name}: declared="${spec}" (${bucket}) installed="${installed}" ` +
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
