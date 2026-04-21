import { describe, it, expect } from "vitest";
import { Linter } from "eslint";
import { readFileSync } from "node:fs";
import path from "node:path";
// @ts-expect-error - plain JS rule, no type declarations
import { dateFnsSubpath } from "../date-fns-subpath.js";

const FIXTURE = path.resolve(
  __dirname,
  "../__fixtures__/bad-date-fns-import.ts",
);

const CONFIG = {
  plugins: {
    local: { rules: { "date-fns-subpath": dateFnsSubpath } },
  },
  languageOptions: {
    ecmaVersion: 2020 as const,
    sourceType: "module" as const,
  },
  rules: { "local/date-fns-subpath": "error" as const },
};

describe("local/date-fns-subpath", () => {
  const src = readFileSync(FIXTURE, "utf8");

  it("reports both barrel imports on the fixture", () => {
    const linter = new Linter();
    const msgs = linter.verify(src, CONFIG as never, FIXTURE);
    expect(msgs).toHaveLength(2);
    expect(msgs.every((m) => m.ruleId === "local/date-fns-subpath")).toBe(true);
    expect(msgs.map((m) => m.messageId).sort()).toEqual([
      "barrel",
      "barrelLocale",
    ]);
  });

  it("autofix rewrites to subpath imports", () => {
    const linter = new Linter();
    const result = linter.verifyAndFix(src, CONFIG as never, {
      filename: FIXTURE,
    });
    expect(result.fixed).toBe(true);
    expect(result.output).toContain('from "date-fns/format"');
    expect(result.output).toContain('from "date-fns/locale/pt-BR"');
    expect(result.output).not.toMatch(/from "date-fns"\s*;/);
    expect(result.output).not.toMatch(/from "date-fns\/locale"\s*;/);
  });
});
