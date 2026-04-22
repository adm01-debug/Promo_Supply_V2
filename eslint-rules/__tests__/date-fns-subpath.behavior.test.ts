/**
 * Behavioral unit tests for the `local/date-fns-subpath` ESLint rule.
 *
 * These tests intentionally use ESLint's built-in `espree` parser (no
 * `@typescript-eslint/parser` dependency) because the rule only inspects
 * `ImportDeclaration` nodes — which espree handles natively when
 * `sourceType: "module"` is set. Keeping the test parser-light means these
 * tests run anywhere the project's `eslint` package is installed.
 *
 * Coverage matrix:
 *  - Autofix: simple barrel, multi-specifier barrel, locale barrel,
 *    aliased imports, all-locales spot check.
 *  - Report-only (no fix): default import, namespace import, mixed
 *    type+value specifiers, unknown locale identifier.
 *  - Idempotency: a second pass over autofixed output emits no new errors.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Linter } from "eslint";
// @ts-expect-error - plain JS rule, no type declarations
import { dateFnsSubpath } from "../date-fns-subpath.js";

const RULE_ID = "local/date-fns-subpath";

const CONFIG = {
  files: ["**/*.js"],
  plugins: {
    local: { rules: { "date-fns-subpath": dateFnsSubpath } },
  },
  languageOptions: {
    ecmaVersion: 2020 as const,
    sourceType: "module" as const,
  },
  rules: { [RULE_ID]: "error" as const },
};

function lint(src: string) {
  const linter = new Linter();
  return linter.verify(src, CONFIG as never, "x.js");
}

function fix(src: string) {
  const linter = new Linter();
  return linter.verifyAndFix(src, CONFIG as never, { filename: "x.js" });
}

describe("local/date-fns-subpath — autofix behavior", () => {
  it("rewrites a single-specifier barrel import to its subpath", () => {
    const src = `import { format } from "date-fns";\n`;
    const result = fix(src);
    expect(result.fixed).toBe(true);
    expect(result.output).toContain('from "date-fns/format"');
    expect(result.output).not.toMatch(/from "date-fns"\s*;/);
    expect(lint(result.output)).toHaveLength(0);
  });

  it("splits a multi-specifier barrel import into one line per subpath", () => {
    const src = `import { format, parseISO, addDays } from "date-fns";\n`;
    const result = fix(src);
    expect(result.fixed).toBe(true);
    expect(result.output).toContain('from "date-fns/format"');
    expect(result.output).toContain('from "date-fns/parseISO"');
    expect(result.output).toContain('from "date-fns/addDays"');
    expect(lint(result.output)).toHaveLength(0);
  });

  it("preserves `as` aliases when splitting", () => {
    const src = `import { format as fmt, addDays } from "date-fns";\n`;
    const result = fix(src);
    expect(result.fixed).toBe(true);
    expect(result.output).toContain('import { format as fmt } from "date-fns/format"');
    expect(result.output).toContain('import { addDays } from "date-fns/addDays"');
  });

  it("rewrites a locale barrel import to the kebab-case subpath", () => {
    const src = `import { ptBR } from "date-fns/locale";\n`;
    const result = fix(src);
    expect(result.fixed).toBe(true);
    expect(result.output).toContain('from "date-fns/locale/pt-BR"');
    expect(lint(result.output)).toHaveLength(0);
  });

  it("autofixes locales beyond the historical 10-locale shortlist", () => {
    // These were unsupported before the LOCALE_SUBPATHS expansion and
    // would have fallen back to "fix manually". Now they must autofix.
    const src = `import { frCA, zhTW, beTarask, srLatn, jaHira } from "date-fns/locale";\n`;
    const result = fix(src);
    expect(result.fixed).toBe(true);
    expect(result.output).toContain('from "date-fns/locale/fr-CA"');
    expect(result.output).toContain('from "date-fns/locale/zh-TW"');
    expect(result.output).toContain('from "date-fns/locale/be-tarask"');
    expect(result.output).toContain('from "date-fns/locale/sr-Latn"');
    expect(result.output).toContain('from "date-fns/locale/ja-Hira"');
    expect(lint(result.output)).toHaveLength(0);
  });

  it.each([
    { name: "enUS", subpath: "en-US" },
    { name: "ja", subpath: "ja" },
    { name: "ptBR", subpath: "pt-BR" },
    { name: "deAT", subpath: "de-AT" },
    { name: "uzCyrl", subpath: "uz-Cyrl" },
  ])(
    "autofixes locale `$name` to date-fns/locale/$subpath",
    ({ name, subpath }) => {
      const src = `import { ${name} } from "date-fns/locale";\n`;
      const result = fix(src);
      expect(result.fixed).toBe(true);
      // Exact target subpath — guards against regressions like emitting
      // `date-fns/locale/enUS` (camelCase) instead of the kebab subpath.
      expect(result.output).toContain(
        `import { ${name} } from "date-fns/locale/${subpath}";`,
      );
      // No remaining barrel violations.
      expect(lint(result.output)).toHaveLength(0);
    },
  );

  it("is idempotent — a second pass produces no further changes", () => {
    const src = `import { format, parseISO } from "date-fns";\n`;
    const first = fix(src);
    const second = fix(first.output);
    expect(second.fixed).toBe(false);
    expect(second.output).toBe(first.output);
  });
});

describe("local/date-fns-subpath — report-only safety nets", () => {
  it("reports but does NOT fix a default import (no subpath equivalent)", () => {
    const src = `import dateFns from "date-fns";\n`;
    const messages = lint(src);
    expect(messages).toHaveLength(1);
    expect(messages[0].ruleId).toBe(RULE_ID);
    expect(messages[0].messageId).toBe("unfixable");
    expect(messages[0].message).toMatch(/Default import/i);
    // Confirm fixer leaves the source untouched.
    const fixed = fix(src);
    expect(fixed.fixed).toBe(false);
    expect(fixed.output).toBe(src);
  });

  it("reports but does NOT fix a namespace import", () => {
    const src = `import * as df from "date-fns";\n`;
    const messages = lint(src);
    expect(messages).toHaveLength(1);
    expect(messages[0].messageId).toBe("unfixable");
    expect(messages[0].message).toMatch(/Namespace import/i);
    const fixed = fix(src);
    expect(fixed.fixed).toBe(false);
    expect(fixed.output).toBe(src);
  });

  it("reports the on-disk namespace-import fixture as unfixable", () => {
    // Pinned fixture: eslint-rules/__fixtures__/bad-date-fns-namespace-import.ts
    //
    // The fixture INTENTIONALLY violates `local/date-fns-subpath` to prove the
    // rule's report-only branch for namespace imports. To keep the repo-wide
    // lint gate green, the fixture carries an `eslint-disable-next-line`
    // comment on the offending import — that comment is the only reason CI
    // doesn't fail on it, and it MUST remain in place.
    //
    // This test strips the disable comment in-memory (so the linter sees the
    // raw violation) and asserts the rule still flags it as `unfixable`.
    // Guards against two regression classes:
    //   1. Someone "fixes" the rule to silently accept namespace imports.
    //   2. Someone removes the fixture's disable comment, breaking CI.
    const fixturePath = resolve(
      __dirname,
      "../__fixtures__/bad-date-fns-namespace-import.ts",
    );
    const raw = readFileSync(fixturePath, "utf8");
    // Strip the disable comment so the linter sees the raw violation.
    const src = raw.replace(/^\s*\/\/ eslint-disable-next-line[^\n]*\n/m, "");

    const messages = lint(src);
    const ruleHits = messages.filter((m) => m.ruleId === RULE_ID);
    expect(ruleHits).toHaveLength(1);
    expect(ruleHits[0].messageId).toBe("unfixable");
    expect(ruleHits[0].message).toMatch(/Namespace import/i);

    // Autofix must be a strict no-op for this pattern.
    const fixed = fix(src);
    expect(fixed.fixed).toBe(false);
    expect(fixed.output).toBe(src);
  });

  it("reports each barrel violation independently in a multi-import file", () => {
    const src = [
      `import { format } from "date-fns";`,
      `import { ptBR } from "date-fns/locale";`,
      `import { foo } from "lodash";`, // unrelated, must NOT report
      "",
    ].join("\n");
    const messages = lint(src);
    // Two reports: one `barrel`, one `barrelLocale`. Lodash is ignored.
    expect(messages).toHaveLength(2);
    const ids = messages.map((m) => m.messageId).sort();
    expect(ids).toEqual(["barrel", "barrelLocale"]);
  });

  it("reports but does NOT fix an unknown locale identifier", () => {
    const src = `import { totallyMadeUpLocale } from "date-fns/locale";\n`;
    const messages = lint(src);
    // Expect at least one unfixable report for the unknown specifier
    // plus the per-declaration barrel report.
    expect(messages.some((m) => m.messageId === "unfixable")).toBe(true);
    expect(
      messages.some((m) => /Unknown date-fns locale/i.test(m.message)),
    ).toBe(true);
    const fixed = fix(src);
    // Partial rewrites are not allowed — source must be untouched.
    expect(fixed.fixed).toBe(false);
    expect(fixed.output).toBe(src);
  });

  it("does NOT touch already-correct subpath imports", () => {
    const src = [
      `import { format } from "date-fns/format";`,
      `import { ptBR } from "date-fns/locale/pt-BR";`,
      "",
    ].join("\n");
    expect(lint(src)).toHaveLength(0);
    const fixed = fix(src);
    expect(fixed.fixed).toBe(false);
    expect(fixed.output).toBe(src);
  });

  it("ignores unrelated packages", () => {
    const src = `import { foo } from "some-other-pkg";\n`;
    expect(lint(src)).toHaveLength(0);
  });
});
