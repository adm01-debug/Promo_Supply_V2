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

/**
 * Packages that MUST be exact-pinned. Add new entries as the project grows.
 * Each entry is a bare package name as it appears in dependencies /
 * devDependencies (e.g. "date-fns", "@date-fns/tz").
 */
const PINNED_PACKAGES: readonly string[] = [
  "date-fns",
  // Add additional date-fns ecosystem packages here as they're introduced,
  // e.g. "@date-fns/tz", "@date-fns/utc", "date-fns-tz".
];

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

      it(`spec in package.json (${found.bucket}) is exact-pinned`, () => {
        expect(
          EXACT_SEMVER_RE.test(found.spec),
          `package.json ${found.bucket}["${name}"] = "${found.spec}" — must be an exact semver (no ^, ~, >=, ranges, or tags). Use \`bun add ${name}@<exact-version>\`.`,
        ).toBe(true);
      });

      it(`installed version in node_modules matches the pinned spec exactly`, async () => {
        let mod: unknown;
        try {
          // Dynamic import works because date-fns v3+ exposes ./package.json
          // in its exports map. If a sibling package doesn't, this assertion
          // surfaces it as a clear error rather than a silent miss.
          mod = await import(/* @vite-ignore */ `${name}/package.json`);
        } catch (err) {
          throw new Error(
            `Failed to import "${name}/package.json": ${(err as Error).message}. ` +
              `Either the package isn't installed (run \`bun install --frozen-lockfile\`) ` +
              `or its exports map doesn't expose ./package.json.`,
          );
        }
        const installed = (mod as { default?: { version?: string }; version?: string }).default?.version
          ?? (mod as { version?: string }).version;
        expect(typeof installed, `"${name}" package.json must expose a string \`version\``).toBe("string");
        expect(
          installed,
          `Installed "${name}@${installed}" does NOT match pinned "${found.spec}" in package.json. ` +
            `Run \`bun install --frozen-lockfile\` to restore the pinned version, or update both together.`,
        ).toBe(found.spec);

        // eslint-disable-next-line no-console
        console.log(`[pin check] ${name}: pinned="${found.spec}" installed="${installed}" ✓`);
      });
    });
  }
});
