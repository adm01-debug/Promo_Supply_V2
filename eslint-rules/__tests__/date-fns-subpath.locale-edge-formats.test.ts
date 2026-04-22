/**
 * Edge-format locale tests for `local/date-fns-subpath`.
 *
 * The rule's locale handling depends on TWO independent surfaces:
 *
 *   1. The **named import identifier** (`{ ptBR }`) is matched against
 *      `LOCALE_SUBPATHS` by exact key. date-fns ships its locales as
 *      camelCase exports, so `ptBR` is the only spelling that resolves
 *      — `PtBr`, `ptbr`, `PTBR`, `pt_BR`, etc. are all genuine bugs.
 *   2. The **import source string** (`"date-fns/locale/pt-BR"`) is
 *      matched against the kebab-cased on-disk subpath. The typo branch
 *      catches casing/separator mistakes here (`PT-BR`, `pt_BR`) and
 *      offers the canonical kebab as an ESLint `suggest`.
 *
 * Both surfaces have historically been a source of "looks right but
 * silently breaks at runtime" bugs (e.g. `import { ptBR } from
 * "date-fns/locale/pt_BR"` resolves nothing in date-fns v3+). These
 * tests pin the rule's behaviour for each edge format so a regression
 * — silently autofixing an invalid identifier, or NOT suggesting the
 * kebab fix — surfaces immediately.
 *
 * Coverage matrix (one `it` per row):
 *   Identifier shape        | Source shape                    | Expected outcome
 *   ------------------------|---------------------------------|---------------------------
 *   exact camelCase (valid) | "date-fns/locale" (barrel)      | autofix → kebab subpath
 *   wrong-case camelCase    | "date-fns/locale" (barrel)      | report unfixable (bailed)
 *   underscore separator    | "date-fns/locale" (barrel)      | report unfixable (bailed)
 *   any identifier          | "date-fns/locale/PT-BR" (typo)  | report typoLocale + suggest
 *   any identifier          | "date-fns/locale/pt_BR" (typo)  | report typoLocale + suggest
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

function lint(src: string) {
  return new Linter().verify(src, CONFIG as never, "x.js");
}
function fix(src: string) {
  return new Linter().verifyAndFix(src, CONFIG as never, { filename: "x.js" });
}

describe("local/date-fns-subpath — locale edge formats: valid camelCase autofixes", () => {
  // Spot-check that the canonical camelCase identifiers — across
  // every casing pattern date-fns uses — autofix to their kebab
  // subpath. Guards against a regression where, say, a refactor
  // breaks `Latn`/`Hira`/`tarask` mixed-case kebabs.
  it.each([
    { name: "ptBR", subpath: "pt-BR", note: "two-letter region uppercased" },
    { name: "enUS", subpath: "en-US", note: "common Latin region" },
    { name: "frCA", subpath: "fr-CA", note: "francophone region" },
    { name: "zhTW", subpath: "zh-TW", note: "CJK region" },
    { name: "deAT", subpath: "de-AT", note: "European region" },
    { name: "nlBE", subpath: "nl-BE", note: "European region #2" },
    { name: "itCH", subpath: "it-CH", note: "European region #3" },
    { name: "faIR", subpath: "fa-IR", note: "RTL with region" },
    // Mixed-case kebab subpaths — `Latn`, `Hira`, `tarask`, `Cyrl`
    // are the trickiest because the kebab segment isn't simply the
    // identifier suffix lowercased.
    { name: "srLatn", subpath: "sr-Latn", note: "script subtag (Latin)" },
    { name: "uzCyrl", subpath: "uz-Cyrl", note: "script subtag (Cyrillic)" },
    { name: "jaHira", subpath: "ja-Hira", note: "script subtag (Hiragana)" },
    { name: "beTarask", subpath: "be-tarask", note: "lowercase variant subtag" },
  ])("autofixes valid `$name` ($note) → date-fns/locale/$subpath", ({ name, subpath }) => {
    const src = `import { ${name} } from "date-fns/locale";\n`;
    const result = fix(src);
    expect(result.fixed).toBe(true);
    // Exact target — guards against camelCase leaking into the subpath
    // (e.g. `date-fns/locale/srLatn` instead of `sr-Latn`).
    expect(result.output).toContain(
      `import { ${name} } from "date-fns/locale/${subpath}";`,
    );
    expect(lint(result.output)).toHaveLength(0);
  });
});

describe("local/date-fns-subpath — locale edge formats: invalid identifier shapes", () => {
  // For each invalid identifier shape we assert the rule:
  //   1. Emits a per-specifier `unfixable` report whose message names
  //      the bad identifier (so contributors can see WHICH locale
  //      the rule rejected).
  //   2. Emits a per-declaration `barrelLocale` report (the rule
  //      reports the barrel even though it can't auto-split it).
  //   3. Refuses to autofix — partial rewrites are forbidden, so the
  //      source must be returned unchanged.
  it.each([
    { variant: "all-lowercase", id: "ptbr" },
    { variant: "all-uppercase", id: "PTBR" },
    { variant: "PascalCase region", id: "PtBr" },
    { variant: "lowercase prefix + uppercase region", id: "PtBR" },
    { variant: "kebab-cased identifier", id: "pt-BR" },
    { variant: "underscore separator", id: "pt_BR" },
    { variant: "snake_case lowercase", id: "pt_br" },
    { variant: "uppercase first letter only", id: "Ptbr" },
  ])(
    "rejects invalid locale identifier `$id` ($variant) as unfixable",
    ({ id }) => {
      const src = `import { ${id} } from "date-fns/locale";\n`;
      const messages = lint(src);
      const ruleHits = messages.filter((m) => m.ruleId === RULE_ID);
      // One per-specifier unfixable + one per-declaration barrelLocale.
      const ids = ruleHits.map((m) => m.messageId).sort();
      expect(ids).toEqual(["barrelLocale", "unfixable"]);
      const unfixable = ruleHits.find((m) => m.messageId === "unfixable")!;
      // The unfixable message must name the rejected identifier so the
      // log points at the exact bug instead of "something went wrong".
      expect(unfixable.message).toContain(id);
      expect(unfixable.message).toMatch(/Unknown date-fns locale/i);

      // No partial rewrites — source returned unchanged.
      const fixed = fix(src);
      expect(fixed.fixed).toBe(false);
      expect(fixed.output).toBe(src);
    },
  );

  it("partitions a mixed-validity locale barrel: rejects without rewriting any", () => {
    // One valid identifier next to one invalid casing variant. The
    // rule's "all-or-nothing" guarantee means the valid `ptBR`
    // specifier must NOT be silently rewritten while its sibling is
    // rejected — partial rewrites would leave a half-broken file.
    const src = `import { ptBR, EnUs } from "date-fns/locale";\n`;
    const messages = lint(src);
    const ruleHits = messages.filter((m) => m.ruleId === RULE_ID);
    // Per-specifier unfixable for `EnUs` + per-declaration barrelLocale.
    expect(ruleHits.map((m) => m.messageId).sort()).toEqual([
      "barrelLocale",
      "unfixable",
    ]);
    const unfixable = ruleHits.find((m) => m.messageId === "unfixable")!;
    expect(unfixable.message).toContain("EnUs");

    // Critical: source is unchanged — `ptBR` was NOT extracted.
    const fixed = fix(src);
    expect(fixed.fixed).toBe(false);
    expect(fixed.output).toBe(src);
    // Defence-in-depth: the rewritten subpath form must NOT appear.
    expect(fixed.output).not.toContain("date-fns/locale/pt-BR");
  });
});

describe("local/date-fns-subpath — locale edge formats: invalid SOURCE-string shapes (typo branch)", () => {
  // The typo branch fires when the import source already targets a
  // locale subpath but the segment doesn't match a known kebab. These
  // tests assert the branch:
  //   1. Reports `typoLocale` (with close matches) or
  //      `typoLocaleNoMatch` (without).
  //   2. Offers the canonical kebab as an ESLint `suggest` entry —
  //      NOT as `fix`, because picking the wrong locale silently
  //      would be worse than the original error.
  //   3. Does NOT autofix — `fix()` returns the source unchanged.
  it.each([
    { variant: "uppercase region", source: "date-fns/locale/PT-BR", expected: "pt-BR" },
    { variant: "all-uppercase", source: "date-fns/locale/PTBR", expected: "pt-BR" },
    { variant: "underscore separator", source: "date-fns/locale/pt_BR", expected: "pt-BR" },
    { variant: "lowercase region", source: "date-fns/locale/pt-br", expected: "pt-BR" },
    { variant: "uppercase script tag", source: "date-fns/locale/sr-LATN", expected: "sr-Latn" },
  ])(
    "reports typo source `$source` ($variant) and suggests `$expected`",
    ({ source, expected }) => {
      const src = `import { ptBR } from "${source}";\n`;
      const messages = lint(src);
      const ruleHits = messages.filter((m) => m.ruleId === RULE_ID);
      // Single typo report — no barrel report, because we're not
      // importing from the bare `date-fns/locale` barrel.
      expect(ruleHits).toHaveLength(1);
      const hit = ruleHits[0];
      // Either typoLocale (with suggestions) or typoLocaleNoMatch.
      // We expect the former because `closestMatches` is generous.
      expect(hit.messageId).toBe("typoLocale");
      // The canonical kebab must appear in the suggestion list shown
      // to the contributor.
      expect(hit.message).toContain(`"${expected}"`);
      // ESLint exposes suggestions via the `suggestions` array.
      const suggestions = (hit as { suggestions?: Array<{ desc?: string }> })
        .suggestions ?? [];
      expect(suggestions.length).toBeGreaterThan(0);
      const descs = suggestions.map((s) => s.desc ?? "");
      expect(descs.some((d) => d.includes(expected))).toBe(true);

      // Critical: no autofix — typos go through `suggest`, not `fix`.
      const fixed = fix(src);
      expect(fixed.fixed).toBe(false);
      expect(fixed.output).toBe(src);
    },
  );

  it("reports a totally invented locale source with no autofix", () => {
    // Far enough from any real locale that `closestMatches` returns
    // an empty list → `typoLocaleNoMatch` branch.
    const src = `import { x } from "date-fns/locale/xyzzy-NOTREAL-1234567890";\n`;
    const messages = lint(src);
    const ruleHits = messages.filter((m) => m.ruleId === RULE_ID);
    expect(ruleHits).toHaveLength(1);
    expect(ruleHits[0].messageId).toBe("typoLocaleNoMatch");
    // No autofix — there's nothing safe to fix to.
    const fixed = fix(src);
    expect(fixed.fixed).toBe(false);
    expect(fixed.output).toBe(src);
  });
});
