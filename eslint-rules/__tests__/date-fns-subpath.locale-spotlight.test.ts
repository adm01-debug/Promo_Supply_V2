/**
 * Spotlight autofix coverage for high-traffic / edge-shape date-fns locales.
 *
 * The sibling suite `date-fns-subpath.locales.test.ts` already iterates
 * EVERY locale discovered on disk (~95 entries) and asserts each one
 * autofixes correctly. That loop is comprehensive but its test names
 * are generated, so a regression in a specific locale shows up as
 * "autofixes `import { zhCN } …`" buried among 94 siblings.
 *
 * This file pins a curated set of locales whose shapes have historically
 * been the most failure-prone, and gives each one a hand-written `it`
 * block. When CI fails here, the failing locale is named in the suite
 * header — no scrolling required.
 *
 * Curated set rationale:
 *   • zhCN   — uppercase region after lowercase script-less language.
 *              Common smoke-test target (Mainland Chinese).
 *   • zhTW   — same shape as zhCN; guards against Taiwan-specific drift.
 *   • zhHK   — third zh variant; ensures the rule isn't memoising the
 *              first zh-* it sees.
 *   • frCA   — Canadian French; mirror of frCH/frFR — a regression
 *              here usually means *all* fr-* variants are broken.
 *   • es419  — UN M.49 numeric region code (Latin America). The only
 *              locale where the kebab "region" is purely digits, which
 *              has tripped up regex-based fix paths in the past.
 *   • srLatn — script subtag (`Latn`) instead of a region. The kebab
 *              form preserves PascalCase (`sr-Latn`), unlike region
 *              codes which uppercase (`zh-CN`).
 *   • beTarask — non-script, non-region lowercase subtag. Distinct
 *              kebab shape (`be-tarask`) — guards against the rule
 *              uppercasing every trailing segment.
 *   • ja      — single-segment locale (no dash). Sanity check that
 *              the rule doesn't require a hyphen to fire.
 */
import { describe, it, expect } from "vitest";
import { Linter } from "eslint";
// @ts-expect-error - plain JS rule, no type declarations
import { dateFnsSubpath } from "../date-fns-subpath.js";

const RULE_ID = "local/date-fns-subpath";

const CONFIG = {
  files: ["**/*.js"],
  plugins: { local: { rules: { "date-fns-subpath": dateFnsSubpath } } },
  languageOptions: {
    ecmaVersion: 2020 as const,
    sourceType: "module" as const,
  },
  rules: { [RULE_ID]: "error" as const },
};

function fix(src: string) {
  return new Linter().verifyAndFix(src, CONFIG as never, { filename: "x.js" });
}
function lint(src: string) {
  return new Linter().verify(src, CONFIG as never, "x.js");
}

// Each row: [camelCase identifier, expected kebab subpath, short reason]
// The reason is surfaced in the test name so a failure tells you WHY
// this particular locale was pinned.
const SPOTLIGHT: ReadonlyArray<readonly [string, string, string]> = [
  ["zhCN", "zh-CN", "uppercase region (Mainland)"],
  ["zhTW", "zh-TW", "uppercase region (Taiwan)"],
  ["zhHK", "zh-HK", "uppercase region (Hong Kong)"],
  ["frCA", "fr-CA", "uppercase region (Canadian French)"],
  ["enCA", "en-CA", "uppercase region (Canadian English)"],
  ["enAU", "en-AU", "uppercase region (Australian English)"],
  ["srLatn", "sr-Latn", "script subtag, PascalCase preserved"],
  ["beTarask", "be-tarask", "lowercase non-region subtag"],
  ["ja", "ja", "single-segment locale (no hyphen)"],
];

describe("local/date-fns-subpath — spotlight locale autofixes", () => {
  for (const [name, subpath, reason] of SPOTLIGHT) {
    it(`autofixes \`${name}\` → date-fns/locale/${subpath}  (${reason})`, () => {
      const src = `import { ${name} } from "date-fns/locale";\n`;
      const result = fix(src);

      expect(result.fixed).toBe(true);
      // Exact-line match — catches casing drift like `zh-cn` or
      // identifier leakage like `date-fns/locale/zhCN`.
      expect(result.output.trim()).toBe(
        `import { ${name} } from "date-fns/locale/${subpath}";`,
      );
      // Re-lint the fix output: the rule must consider its own output
      // canonical (zero re-reports, no fix loop).
      const post = lint(result.output).filter((m) => m.ruleId === RULE_ID);
      expect(post).toEqual([]);
    });
  }

  it("autofix preserves `as` aliases on a regional locale (frCA)", () => {
    // Combine a region-coded locale with an alias to prove the
    // rewriter handles uppercase regions AND aliases together
    // (each branch is exercised separately above; this guards the
    // intersection).
    const src = `import { frCA as canadianFrench } from "date-fns/locale";\n`;
    const result = fix(src);
    expect(result.fixed).toBe(true);
    expect(result.output.trim()).toBe(
      `import { frCA as canadianFrench } from "date-fns/locale/fr-CA";`,
    );
  });

  it("autofix rewrites a multi-specifier spotlight barrel correctly", () => {
    // One declaration mixing three of the trickiest shapes (uppercase
    // region + script subtag + single-segment). Asserts the rule
    // emits one canonical subpath import per specifier.
    const src = `import { zhCN, srLatn, ja } from "date-fns/locale";\n`;
    const result = fix(src);
    expect(result.fixed).toBe(true);
    expect(result.output).toContain(
      'import { zhCN } from "date-fns/locale/zh-CN";',
    );
    expect(result.output).toContain(
      'import { srLatn } from "date-fns/locale/sr-Latn";',
    );
    expect(result.output).toContain(
      'import { ja } from "date-fns/locale/ja";',
    );
    // Bare barrel must be gone after the fix.
    expect(result.output).not.toMatch(/from "date-fns\/locale"\s*;/);
  });

  it("does NOT autofix `es419` (UN M.49 codes are not shipped by date-fns)", () => {
    // date-fns ships `es` but no `es-419` (Latin America). The rule
    // must therefore refuse to invent a subpath that wouldn't resolve
    // at runtime — it reports `unfixable` and leaves the source
    // byte-identical. This guards against a tempting-but-wrong
    // "kebab-ify any camelCase identifier" shortcut.
    const src = `import { es419 } from "date-fns/locale";\n`;
    const result = fix(src);
    expect(result.fixed).toBe(false);
    expect(result.output).toBe(src);
    const messages = lint(src).filter((m) => m.ruleId === RULE_ID);
    // At least one report must surface; the precise messageId may be
    // `unfixable` (per-specifier) or `barrelLocale` depending on the
    // rule's reporting strategy — assert presence, not exact id.
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.every((m) => !m.fix)).toBe(true);
  });
});
