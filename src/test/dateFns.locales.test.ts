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
        const candidates = fileCandidates(entry.subpath);
        const found = candidates.some((c) => existsSync(join(PKG_DIR, c)));
        expect(
          found,
          [
            `Missing locale on disk: ${fullPath(entry.subpath)}`,
            `  Looked for any of:`,
            ...candidates.map((c) => `    • node_modules/date-fns/${c}`),
            `  ${FIX_HINT}`,
          ].join("\n"),
        ).toBe(true);
      });

      it("is exposed via date-fns package.json exports map", () => {
        const pkgRaw = readFileSync(join(PKG_DIR, "package.json"), "utf8");
        const pkg = JSON.parse(pkgRaw) as { exports?: Record<string, unknown> };
        const key = `./${entry.subpath}`;
        expect(
          pkg.exports?.[key],
          [
            `Missing exports entry for ${fullPath(entry.subpath)}`,
            `  Expected key in node_modules/date-fns/package.json → exports: "${key}"`,
            `  Without this entry, bundlers (Vite/Rollup/esbuild) cannot resolve the import even if the file exists on disk.`,
            `  ${FIX_HINT}`,
          ].join("\n"),
        ).toBeTruthy();
      });

      it("dynamic-imports and exposes a structurally valid Locale", async () => {
        const importPath = fullPath(entry.subpath);
        const mod = (await import(/* @vite-ignore */ importPath)) as Record<string, unknown>;
        for (const exportName of entry.exports) {
          const ctx = `${importPath} (named export "${exportName}")`;
          const locale = mod[exportName];
          expect(
            locale,
            `Missing named export from ${ctx}\n  ${FIX_HINT}`,
          ).toBeTruthy();
          expect(typeof locale, `${ctx}: expected typeof === "object"`).toBe("object");
          const l = locale as Record<string, unknown>;
          expect(typeof l.code, `${ctx}: \`code\` must be a string`).toBe("string");
          expect((l.code as string).length, `${ctx}: \`code\` must be non-empty`).toBeGreaterThan(0);
          expect(l.formatLong, `${ctx}: missing \`formatLong\``).toBeTruthy();
          expect(l.localize, `${ctx}: missing \`localize\``).toBeTruthy();
          expect(l.match, `${ctx}: missing \`match\``).toBeTruthy();
        }
      });

      it("formats reference date without throwing", async () => {
        const importPath = fullPath(entry.subpath);
        const mod = (await import(/* @vite-ignore */ importPath)) as Record<string, unknown>;
        for (const exportName of entry.exports) {
          const ctx = `${importPath} (named export "${exportName}")`;
          const locale = mod[exportName] as never;
          const long = format(REF, "PPP", { locale });
          const weekday = format(REF, "EEEE", { locale });
          expect(
            long.length,
            `${ctx}: format(REF, "PPP") returned empty string\n  ${FIX_HINT}`,
          ).toBeGreaterThan(0);
          expect(
            weekday.length,
            `${ctx}: format(REF, "EEEE") returned empty string\n  ${FIX_HINT}`,
          ).toBeGreaterThan(0);
        }
      });
    });
  }
});
