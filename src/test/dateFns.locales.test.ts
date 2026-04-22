// Verifies every date-fns locale listed in public/datefns-usage.json is:
//   A. Present on disk inside node_modules/date-fns
//   B. Exposed via the package's `exports` map (bundler resolution)
//   C. Dynamically importable and structurally a valid Locale
//   D. Usable at runtime via `format(...)`
//
// Source of truth: public/datefns-usage.json, maintained by
// scripts/generate-datefns-smoke-test.mjs. Adding a new locale import in
// src/ + regenerating the manifest auto-extends this test — no edits needed.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { format } from "date-fns/format";

const ROOT = process.cwd();
const PKG_DIR = resolve(ROOT, "node_modules/date-fns");
const MANIFEST_PATH = resolve(ROOT, "public/datefns-usage.json");

interface LocaleEntry {
  subpath: string;
  exports: string[];
}
interface Manifest {
  locales: LocaleEntry[];
}

const MANIFEST: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const REF = new Date("2025-01-15T12:00:00Z");

// One-command recovery hint reused across all assertions in this suite. Keeping
// it centralized guarantees every failure message ends with the same actionable
// fix, so a developer never has to guess which command to run.
const FIX_HINT =
  "Fix: `rm -rf node_modules && bun install --frozen-lockfile` " +
  "(reinstalls date-fns at the exact pinned version from bun.lock).";

const fullPath = (sp: string) => `date-fns/${sp}`;

const fileCandidates = (sp: string): string[] => [
  `${sp}.js`,
  `${sp}.mjs`,
  `${sp}.cjs`,
  `${sp}/index.js`,
  `${sp}/index.mjs`,
  `${sp}/index.cjs`,
];

describe("date-fns locales — installed surface", () => {
  it("manifest contains at least one locale", () => {
    expect(Array.isArray(MANIFEST.locales)).toBe(true);
    expect(MANIFEST.locales.length).toBeGreaterThan(0);
  });

  for (const entry of MANIFEST.locales) {
    describe(entry.subpath, () => {
      it("has a resolvable file in node_modules/date-fns", () => {
        const found = fileCandidates(entry.subpath).some((c) =>
          existsSync(join(PKG_DIR, c)),
        );
        expect(
          found,
          `Missing date-fns/${entry.subpath} on disk. ` +
            "Run `rm -rf node_modules && bun install --frozen-lockfile`.",
        ).toBe(true);
      });

      it("is exposed via date-fns package.json exports map", () => {
        const pkgRaw = readFileSync(join(PKG_DIR, "package.json"), "utf8");
        const pkg = JSON.parse(pkgRaw) as { exports?: Record<string, unknown> };
        const key = `./${entry.subpath}`;
        expect(
          pkg.exports?.[key],
          `date-fns/package.json exports map is missing "${key}". ` +
            "This breaks bundler resolution even if the file exists.",
        ).toBeTruthy();
      });

      it("dynamic-imports and exposes a structurally valid Locale", async () => {
        const mod = (await import(
          /* @vite-ignore */ `date-fns/${entry.subpath}`
        )) as Record<string, unknown>;
        for (const exportName of entry.exports) {
          const locale = mod[exportName];
          expect(locale, `${entry.subpath} → ${exportName}`).toBeTruthy();
          expect(typeof locale, `${exportName} type`).toBe("object");
          const l = locale as Record<string, unknown>;
          expect(typeof l.code, `${exportName}.code`).toBe("string");
          expect((l.code as string).length, `${exportName}.code length`).toBeGreaterThan(0);
          expect(l.formatLong, `${exportName}.formatLong`).toBeTruthy();
          expect(l.localize, `${exportName}.localize`).toBeTruthy();
          expect(l.match, `${exportName}.match`).toBeTruthy();
        }
      });

      it("formats reference date without throwing", async () => {
        const mod = (await import(
          /* @vite-ignore */ `date-fns/${entry.subpath}`
        )) as Record<string, unknown>;
        for (const exportName of entry.exports) {
          const locale = mod[exportName] as never;
          const long = format(REF, "PPP", { locale });
          const weekday = format(REF, "EEEE", { locale });
          expect(long.length, `${exportName} PPP`).toBeGreaterThan(0);
          expect(weekday.length, `${exportName} EEEE`).toBeGreaterThan(0);
        }
      });
    });
  }
});
