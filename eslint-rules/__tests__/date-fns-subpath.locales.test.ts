/**
 * Per-locale autofix coverage for the `local/date-fns-subpath` rule.
 *
 * Iterates every camelCase locale identifier exported by date-fns
 * (sourced from `node_modules/date-fns/locale/`) and asserts that
 *
 *     import { <name> } from "date-fns/locale";
 *
 * autofixes to the canonical
 *
 *     import { <name> } from "date-fns/locale/<subpath>";
 *
 * The rule's internal `LOCALE_SUBPATHS` map is the single source of
 * truth for the camelCase → kebab mapping (`ptBR` → `pt-BR`,
 * `beTarask` → `be-tarask`, etc.). We re-derive the expected mapping
 * here from disk and cross-check it against the rule's behaviour, so
 * any drift between the on-disk locale list and the rule's hardcoded
 * map fails this test loudly instead of silently shipping a wrong fix.
 */
import { describe, it, expect } from "vitest";
import { Linter } from "eslint";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
// @ts-expect-error - plain JS rule, no type declarations
import { dateFnsSubpath } from "../date-fns-subpath.js";

// Espree (eslint's bundled parser) handles plain ESM `import` statements
// without any TS-specific syntax — which is all we generate in the
// fixtures below — so we deliberately do NOT pull in
// @typescript-eslint/parser here. Keeping this test parser-free means it
// runs identically under bun/npm and doesn't depend on optional dev-deps.
const CONFIG = {
  files: ["**/*.js"],
  plugins: {
    local: { rules: { "date-fns-subpath": dateFnsSubpath } },
  },
  languageOptions: {
    ecmaVersion: 2020 as const,
    sourceType: "module" as const,
  },
  rules: { "local/date-fns-subpath": "error" as const },
};

/**
 * Convert a kebab/lowercase locale subpath (`pt-BR`, `be-tarask`,
 * `ja-Hira`) into its camelCase export identifier (`ptBR`,
 * `beTarask`, `jaHira`). Mirrors the convention date-fns uses for
 * its locale exports.
 */
function kebabToCamel(kebab: string): string {
  return kebab
    .split("-")
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

const LOCALE_DIR = path.resolve(__dirname, "../../node_modules/date-fns/locale");

/**
 * Discover every locale subpath from disk. Each entry yields the
 * kebab subpath (`pt-BR`) and its camelCase export name (`ptBR`).
 * Filters to directories only — date-fns ships each locale as a
 * folder under `locale/`.
 */
function discoverLocales(): Array<{ subpath: string; name: string }> {
  if (!existsSync(LOCALE_DIR)) return [];
  const out: Array<{ subpath: string; name: string }> = [];
  for (const entry of readdirSync(LOCALE_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    // Skip internal folders (date-fns ships a `_lib/` helper dir).
    if (entry.name.startsWith("_")) continue;
    out.push({ subpath: entry.name, name: kebabToCamel(entry.name) });
  }
  return out;
}

const LOCALES = discoverLocales();

describe("local/date-fns-subpath — per-locale autofix coverage", () => {
  it("discovers at least 50 locales on disk (sanity check)", () => {
    // date-fns v3+ ships ~95 locales. If this drops below 50 the
    // resolver is almost certainly pointing at the wrong directory.
    expect(LOCALES.length).toBeGreaterThanOrEqual(50);
  });

  // One test per locale — keeps failures attributable to the exact
  // locale that regressed instead of a single mega-assertion that
  // hides 94 passes behind 1 failure.
  for (const { subpath, name } of LOCALES) {
    it(`autofixes \`import { ${name} } from "date-fns/locale"\` → "date-fns/locale/${subpath}"`, () => {
      const linter = new Linter();
      const src = `import { ${name} } from "date-fns/locale";\n`;
      const result = linter.verifyAndFix(src, CONFIG as never, {
        filename: "test.ts",
      });

      expect(result.fixed).toBe(true);
      // The fix must produce the canonical single-line subpath import.
      // Trailing whitespace varies by ESLint version, so match the
      // semantically meaningful prefix.
      expect(result.output.trim()).toBe(
        `import { ${name} } from "date-fns/locale/${subpath}";`,
      );
      // And the rewritten file must itself be lint-clean.
      const post = linter.verify(result.output, CONFIG as never, "test.ts");
      expect(post).toEqual([]);
    });
  }

  it("preserves `as` aliases through the autofix", () => {
    // Spot-check: aliases are a common real-world pattern and the
    // rule has dedicated handling for them. Use ptBR since it's the
    // most exercised locale in this codebase.
    const linter = new Linter();
    const src = `import { ptBR as defaultLocale } from "date-fns/locale";\n`;
    const result = linter.verifyAndFix(src, CONFIG as never, {
      filename: "test.ts",
    });
    expect(result.fixed).toBe(true);
    expect(result.output.trim()).toBe(
      `import { ptBR as defaultLocale } from "date-fns/locale/pt-BR";`,
    );
  });
});
