// Smoke tests for the typo-detection branch of local/date-fns-subpath.
// Uses ESLint's built-in `espree` parser so the suite has zero extra deps
// (the existing barrel test pulls in @typescript-eslint/parser which is a
// devDep — keeping this file parser-agnostic means it runs on a fresh
// checkout too).

import { describe, it, expect } from "vitest";
import { Linter } from "eslint";
// @ts-expect-error - plain JS rule, no type declarations
import { dateFnsSubpath } from "../date-fns-subpath.js";

const CONFIG = {
  plugins: { local: { rules: { "date-fns-subpath": dateFnsSubpath } } },
  rules: { "local/date-fns-subpath": "error" as const },
  languageOptions: { ecmaVersion: 2022 as const, sourceType: "module" as const },
};

const lint = (src: string) => new Linter().verify(src, CONFIG as never);

describe("local/date-fns-subpath — typo detection", () => {
  it("suggests the closest function subpath for a one-char typo", () => {
    const [msg, ...rest] = lint(`import { format } from "date-fns/formt";`);
    expect(rest).toHaveLength(0);
    expect(msg.messageId).toBe("typoFunction");
    expect(msg.message).toMatch(/"format"/);
    expect(msg.suggestions?.[0]?.desc).toBe('Replace with "date-fns/format"');
  });

  it("offers up to 3 ranked suggestions for ambiguous typos", () => {
    const [msg] = lint(`import { x } from "date-fns/parselSO";`);
    expect(msg.messageId).toBe("typoFunction");
    expect(msg.suggestions?.length).toBeGreaterThanOrEqual(1);
    expect(msg.suggestions?.length).toBeLessThanOrEqual(3);
    // parseISO must be among the candidates for this typo.
    expect(msg.suggestions?.some((s) => s.desc.includes("parseISO"))).toBe(true);
  });

  it("suggests kebab locale subpath for camelCase typo", () => {
    const [msg] = lint(`import { ptBR } from "date-fns/locale/ptBR";`);
    expect(msg.messageId).toBe("typoLocale");
    expect(msg.suggestions?.[0]?.desc).toBe(
      'Replace with "date-fns/locale/pt-BR"',
    );
  });

  it("falls back to no-match message when nothing is close", () => {
    const [msg] = lint(`import { x } from "date-fns/zzzzzzzzzzzzzz";`);
    expect(msg.messageId).toBe("typoFunctionNoMatch");
    expect(msg.suggestions ?? []).toHaveLength(0);
  });

  it("does not flag valid function or locale subpaths", () => {
    expect(lint(`import { format } from "date-fns/format";`)).toHaveLength(0);
    expect(lint(`import { ptBR } from "date-fns/locale/pt-BR";`)).toHaveLength(0);
  });

  it("does not double-report on barrel imports (typo branch returns early)", () => {
    const msgs = lint(`import { format } from "date-fns";`);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].messageId).toBe("barrel");
  });

  it("preserves single-quote style in the suggested fix", () => {
    const [msg] = lint(`import { format } from 'date-fns/formt';`);
    const fixed = msg.suggestions?.[0]?.fix;
    expect(fixed).toBeDefined();
    // The fix replaces the string-literal node verbatim — single quotes preserved.
    expect(fixed?.text).toBe("'date-fns/format'");
  });
});
