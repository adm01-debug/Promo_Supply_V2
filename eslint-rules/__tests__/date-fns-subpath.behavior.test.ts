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
import { createHash } from "node:crypto";
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

  it("reports the on-disk default-import fixture as unfixable", () => {
    // Pinned fixture: eslint-rules/__fixtures__/bad-date-fns-default-import.ts
    //
    // The fixture INTENTIONALLY violates `local/date-fns-subpath` to prove the
    // rule's report-only branch for default imports (`import X from "date-fns"`).
    // There is no canonical subpath replacement for a default import — the
    // rule must report-but-skip-fix. The fixture carries an
    // `eslint-disable-next-line` comment so the repo-wide lint gate stays
    // green; this test strips it in-memory and asserts the violation is
    // still reported as `unfixable` with no source mutation.
    const fixturePath = resolve(
      __dirname,
      "../__fixtures__/bad-date-fns-default-import.ts",
    );
    const raw = readFileSync(fixturePath, "utf8");
    // Strip the disable comment so the linter sees the raw violation.
    const src = raw.replace(/^\s*\/\/ eslint-disable-next-line[^\n]*\n/m, "");

    const messages = lint(src);
    const ruleHits = messages.filter((m) => m.ruleId === RULE_ID);
    expect(ruleHits).toHaveLength(1);
    expect(ruleHits[0].messageId).toBe("unfixable");
    expect(ruleHits[0].message).toMatch(/Default import/i);

    // Autofix must be a strict no-op for this pattern.
    const fixed = fix(src);
    expect(fixed.fixed).toBe(false);
    expect(fixed.output).toBe(src);
  });

  it("partitions a mixed namespace + named barrel fixture: fixes named, leaves namespace", () => {
    // Pinned fixture: eslint-rules/__fixtures__/bad-date-fns-mixed-imports.ts
    //
    // Two violations in one file:
    //   1. `import * as dateFns from "date-fns"` — namespace, UNFIXABLE
    //   2. `import { format } from "date-fns"`   — named barrel, FIXABLE
    //
    // The rule must report both, autofix only #2 into `date-fns/format`,
    // and leave the namespace import byte-for-byte unchanged. This guards
    // against two regression classes:
    //   a) silently rewriting a namespace import (would corrupt the file)
    //   b) skipping the fixable named import because a sibling violation
    //      in the same file is unfixable
    const fixturePath = resolve(
      __dirname,
      "../__fixtures__/bad-date-fns-mixed-imports.ts",
    );
    const raw = readFileSync(fixturePath, "utf8");
    // Strip ALL disable comments so the linter sees both raw violations.
    const src = raw.replace(/^\s*\/\/ eslint-disable-next-line[^\n]*\n/gm, "");

    // ── Pre-fix: both violations reported, exactly one fixable ──────────
    const messages = lint(src);
    const ruleHits = messages.filter((m) => m.ruleId === RULE_ID);
    expect(ruleHits).toHaveLength(2);
    const ids = ruleHits.map((m) => m.messageId).sort();
    expect(ids).toEqual(["barrel", "unfixable"]);
    const unfixableMsg = ruleHits.find((m) => m.messageId === "unfixable")!;
    expect(unfixableMsg.message).toMatch(/Namespace import/i);
    // ESLint attaches a `fix` descriptor only to autofixable messages.
    const fixableCount = ruleHits.filter((m) => m.fix).length;
    expect(fixableCount).toBe(1);

    // ── Post-fix: named import rewritten, namespace import preserved ────
    const fixed = fix(src);
    expect(fixed.fixed).toBe(true);
    // Named barrel was rewritten to its subpath.
    expect(fixed.output).toContain('import { format } from "date-fns/format"');
    // Namespace import survived verbatim — no rewrite, no deletion.
    expect(fixed.output).toContain('import * as dateFns from "date-fns"');
    // No bare-barrel `from "date-fns"` remains for the named import line
    // (the namespace line legitimately keeps it; assert via count).
    const bareBarrelMatches = fixed.output.match(/from "date-fns"/g) ?? [];
    expect(bareBarrelMatches).toHaveLength(1);

    // ── Residual: only the namespace `unfixable` report remains ─────────
    const residual = lint(fixed.output).filter((m) => m.ruleId === RULE_ID);
    expect(residual).toHaveLength(1);
    expect(residual[0].messageId).toBe("unfixable");
    expect(residual[0].message).toMatch(/Namespace import/i);
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

  it("autofix is byte-for-byte identical on the raw namespace-import fixture", () => {
    // Stricter sibling of the test above. Where that test strips the
    // disable comment to exercise the rule's report path, THIS test
    // feeds the fixture verbatim — disable comment included, exactly
    // as it lives on disk — and asserts the autofixer's output is
    // byte-for-byte identical to the input.
    //
    // Why a separate test:
    //   • Pins the contract that ESLint's autofix loop never mutates a
    //     file containing only unfixable violations, even when those
    //     violations are silenced by a disable directive.
    //   • Catches whitespace / newline / BOM regressions that a
    //     `toBe(src)` string compare would technically catch but a
    //     reader of the failure message wouldn't immediately diagnose.
    //     We assert byte length and a content hash so the failure
    //     message points at the exact divergence class.
    //   • Guards against a future "helpful" rule change that rewrites
    //     `import * as X from "date-fns"` into something else.
    const fixturePath = resolve(
      __dirname,
      "../__fixtures__/bad-date-fns-namespace-import.ts",
    );
    const raw = readFileSync(fixturePath, "utf8");
    const rawBytes = Buffer.from(raw, "utf8");
    const rawHash = createHash("sha256").update(rawBytes).digest("hex");

    // Sanity: the on-disk fixture really does contain the namespace
    // import we're testing — guards against a rename / accidental edit
    // making this test trivially pass.
    expect(raw).toMatch(/import \* as \w+ from "date-fns"/);

    const fixed = fix(raw);

    // The disable directive suppresses the report, so ESLint reports
    // nothing fixable AND nothing actionable — the source is returned
    // unchanged.
    expect(fixed.fixed).toBe(false);

    // Primary assertion: identical string.
    expect(fixed.output).toBe(raw);

    // Belt-and-suspenders: identical byte length and hash. If these
    // ever drift while the string compare somehow passes (encoding
    // shenanigans), the failure message will name the exact dimension
    // that diverged instead of dumping a multi-KB diff.
    const outBytes = Buffer.from(fixed.output, "utf8");
    expect(outBytes.length).toBe(rawBytes.length);
    expect(createHash("sha256").update(outBytes).digest("hex")).toBe(rawHash);
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
