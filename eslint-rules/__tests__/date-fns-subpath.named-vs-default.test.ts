/**
 * Pins the rule's contract for **named** vs **default** import shapes
 * targeting `date-fns/locale`. Asserts:
 *   • Named locale barrels autofix to the EXACT canonical kebab subpath.
 *   • Default imports of the locale barrel are reported `unfixable` and
 *     never mutated (date-fns ships no default export from the locale
 *     barrel — there is no canonical replacement).
 *
 * Path-correctness assertions use `toBe` on extracted lines (not
 * `toContain`) so any drift in casing (`pt-br`, `PT-BR`), separator
 * (`pt_BR`), or identifier leakage (`date-fns/locale/ptBR`) fails loudly
 * with the wrong path named in the diff.
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

/** Pull the import line that ends with the given subpath (exact match). */
function lineEndingWith(output: string, subpath: string): string | undefined {
  return output
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.endsWith(`from "${subpath}";`));
}

describe("named locale imports — autofix to canonical subpath", () => {
  it("single named: { ptBR } → date-fns/locale/pt-BR (exact line)", () => {
    const src = `import { ptBR } from "date-fns/locale";\n`;
    const result = fix(src);
    expect(result.fixed).toBe(true);
    expect(lineEndingWith(result.output, "date-fns/locale/pt-BR")).toBe(
      `import { ptBR } from "date-fns/locale/pt-BR";`,
    );
    expect(lint(result.output)).toHaveLength(0);
  });

  it("multi named: splits into 3 lines with exact canonical subpaths", () => {
    const src = `import { ptBR, enUS, frCA } from "date-fns/locale";\n`;
    const result = fix(src);
    expect(result.fixed).toBe(true);
    expect(lineEndingWith(result.output, "date-fns/locale/pt-BR")).toBe(
      `import { ptBR } from "date-fns/locale/pt-BR";`,
    );
    expect(lineEndingWith(result.output, "date-fns/locale/en-US")).toBe(
      `import { enUS } from "date-fns/locale/en-US";`,
    );
    expect(lineEndingWith(result.output, "date-fns/locale/fr-CA")).toBe(
      `import { frCA } from "date-fns/locale/fr-CA";`,
    );
    // Exactly 3 subpath import lines emitted, no stray duplicates.
    const subpathLines = result.output
      .split("\n")
      .filter((l) => /from "date-fns\/locale\/[A-Za-z-]+";\s*$/.test(l));
    expect(subpathLines).toHaveLength(3);
    expect(lint(result.output)).toHaveLength(0);
  });

  it("aliased named: preserves `as` alias on canonical subpath", () => {
    const src = `import { ptBR as brazilianPT } from "date-fns/locale";\n`;
    const result = fix(src);
    expect(result.fixed).toBe(true);
    expect(lineEndingWith(result.output, "date-fns/locale/pt-BR")).toBe(
      `import { ptBR as brazilianPT } from "date-fns/locale/pt-BR";`,
    );
    expect(lint(result.output)).toHaveLength(0);
  });

  it("idempotent: a second fix pass over rewritten output is a no-op", () => {
    const src = `import { ptBR, enUS, jaHira } from "date-fns/locale";\n`;
    const first = fix(src);
    expect(first.fixed).toBe(true);
    const second = fix(first.output);
    expect(second.fixed).toBe(false);
    expect(second.output).toBe(first.output);
    expect(lint(first.output)).toHaveLength(0);
  });

  it("does NOT touch an already-correct named subpath import", () => {
    const src = `import { ptBR } from "date-fns/locale/pt-BR";\n`;
    expect(lint(src)).toHaveLength(0);
    const result = fix(src);
    expect(result.fixed).toBe(false);
    expect(result.output).toBe(src);
  });
});

describe("default locale imports — report unfixable, never autofix", () => {
  it("default from the locale barrel: reported, source byte-identical", () => {
    // `date-fns/locale` exposes no default export, so there is no
    // canonical subpath replacement. The rule must report and refuse
    // to mutate the source.
    const src = `import ptBR from "date-fns/locale";\n`;
    const messages = lint(src);
    const ruleHits = messages.filter((m) => m.ruleId === RULE_ID);
    expect(ruleHits.length).toBeGreaterThanOrEqual(1);
    expect(ruleHits.some((m) => m.messageId === "unfixable")).toBe(true);
    // None of the reports for this declaration are auto-applicable.
    expect(ruleHits.every((m) => !m.fix)).toBe(true);
    const fixed = fix(src);
    expect(fixed.fixed).toBe(false);
    expect(fixed.output).toBe(src);
  });

  it("default from a real subpath: rule pins current behaviour as a no-op", () => {
    // `date-fns/locale/pt-BR` IS a canonical subpath; the rule has no
    // reason to flag a default-shape import of it (the package may or
    // may not expose a default — that's a TS / runtime concern, not a
    // tree-shaking concern). Whatever the rule decides today, pin it.
    const src = `import locale from "date-fns/locale/pt-BR";\n`;
    const ruleHits = lint(src).filter((m) => m.ruleId === RULE_ID);
    // Discovered behaviour: subpath default imports are NOT flagged.
    expect(ruleHits).toHaveLength(0);
    const fixed = fix(src);
    expect(fixed.fixed).toBe(false);
    expect(fixed.output).toBe(src);
  });

  it("mixed file: rewrites named, leaves default verbatim, one residual", () => {
    const src = [
      `import defaultLocale from "date-fns/locale";`,
      `import { ptBR } from "date-fns/locale";`,
      "",
    ].join("\n");

    // Pre-fix: at least 2 rule hits (default = unfixable, named = barrelLocale).
    const pre = lint(src).filter((m) => m.ruleId === RULE_ID);
    expect(pre.some((m) => m.messageId === "unfixable")).toBe(true);
    expect(pre.some((m) => m.messageId === "barrelLocale")).toBe(true);

    const fixed = fix(src);
    expect(fixed.fixed).toBe(true);

    // Named line was rewritten to its exact canonical subpath.
    expect(lineEndingWith(fixed.output, "date-fns/locale/pt-BR")).toBe(
      `import { ptBR } from "date-fns/locale/pt-BR";`,
    );
    // Default line survived byte-for-byte.
    expect(fixed.output).toContain(`import defaultLocale from "date-fns/locale"`);

    // Residual: only the default-import unfixable report remains.
    const residual = lint(fixed.output).filter((m) => m.ruleId === RULE_ID);
    expect(residual).toHaveLength(1);
    expect(residual[0].messageId).toBe("unfixable");
  });
});
