/**
 * Idempotence guarantee for the `local/date-fns-subpath` autofixer.
 *
 * Contract: running the autofix once produces a stable output that, when
 * fed back into the linter, triggers ZERO further mutations and ZERO
 * remaining rule reports. A non-idempotent fixer would oscillate or
 * progressively rewrite already-correct subpaths, corrupting the file.
 *
 * Each test case:
 *   1. Runs `verifyAndFix` once → asserts `fixed === true` (proving the
 *      input actually had something to fix; guards against a test
 *      trivially passing because the input was already clean).
 *   2. Runs `verifyAndFix` a second time on the first run's output →
 *      asserts `fixed === false`, byte-identical output, and zero
 *      remaining rule reports.
 *
 * Coverage spans every fix-emitting branch of the rule:
 *   • function barrel (single + multi specifier)
 *   • function barrel with `as` alias
 *   • locale barrel (single + multi + aliased)
 *   • mixed function + locale barrels in one file
 *   • file with a leading already-correct subpath import
 *     (asserts the fixer doesn't re-touch clean lines)
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

/**
 * Assert that `src` autofixes once and is then a fixed point of the
 * autofixer. Returns the (stable) output for any caller that wants to
 * make additional content-shape assertions on top.
 */
function expectIdempotent(src: string): string {
  const first = fix(src);
  expect(first.fixed, "first pass must mutate the input").toBe(true);

  const second = fix(first.output);
  expect(second.fixed, "second pass must NOT mutate output").toBe(false);
  expect(second.output, "second pass output must equal first").toBe(
    first.output,
  );

  // Belt-and-suspenders: third pass for the same reason — guards against
  // a fixer that converges only after N>2 iterations (which would still
  // be a bug, just a less obvious one).
  const third = fix(second.output);
  expect(third.fixed).toBe(false);
  expect(third.output).toBe(first.output);

  // No rule reports remain on the stable output.
  expect(
    lint(first.output).filter((m) => m.ruleId === RULE_ID),
  ).toHaveLength(0);

  return first.output;
}

describe("local/date-fns-subpath — autofix idempotence", () => {
  it("function barrel, single specifier", () => {
    expectIdempotent(`import { format } from "date-fns";\n`);
  });

  it("function barrel, multi specifier", () => {
    expectIdempotent(
      `import { format, parseISO, addDays, subWeeks } from "date-fns";\n`,
    );
  });

  it("function barrel with `as` alias", () => {
    const out = expectIdempotent(
      `import { format as fmt, addDays } from "date-fns";\n`,
    );
    // Sanity: the alias survived the round trip on the stable output.
    expect(out).toContain('import { format as fmt } from "date-fns/format"');
  });

  it("locale barrel, single specifier", () => {
    expectIdempotent(`import { ptBR } from "date-fns/locale";\n`);
  });

  it("locale barrel, multi specifier with kebab + script subtags", () => {
    expectIdempotent(
      `import { ptBR, enUS, srLatn, beTarask } from "date-fns/locale";\n`,
    );
  });

  it("locale barrel with `as` alias", () => {
    const out = expectIdempotent(
      `import { ptBR as brazilianPT } from "date-fns/locale";\n`,
    );
    expect(out).toContain(
      'import { ptBR as brazilianPT } from "date-fns/locale/pt-BR"',
    );
  });

  it("mixed function + locale barrels in one file", () => {
    expectIdempotent(
      [
        `import { format, parseISO } from "date-fns";`,
        `import { ptBR, frCA } from "date-fns/locale";`,
        "",
      ].join("\n"),
    );
  });

  it("file with a leading already-correct subpath import is not re-touched", () => {
    // The clean line at the top must survive untouched across passes;
    // only the barrel below it should be rewritten on pass 1, then the
    // whole file must be a fixed point.
    const src = [
      `import { format } from "date-fns/format";`, // already correct
      `import { ptBR } from "date-fns/locale";`,    // barrel → must rewrite
      "",
    ].join("\n");
    const out = expectIdempotent(src);
    expect(out).toContain(`import { format } from "date-fns/format";`);
    expect(out).toContain(`import { ptBR } from "date-fns/locale/pt-BR";`);
  });
});
