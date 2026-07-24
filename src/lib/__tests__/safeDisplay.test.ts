import { describe, it, expect } from "vitest";
import { safeDisplay } from "@/lib/safeDisplay";

describe("safeDisplay", () => {
  it("retorna string original quando cabe no limite", () => {
    expect(safeDisplay("hello", 10)).toBe("hello");
  });

  it("trunca com ellipsis padrão respeitando o limite total", () => {
    const out = safeDisplay("abcdefghij", 5);
    expect(out).toBe("abcd…");
    expect(out.length).toBe(5);
  });

  it("aceita ellipsis customizado", () => {
    const out = safeDisplay("abcdefghij", 6, { ellipsis: "..." });
    expect(out).toBe("abc...");
    expect(out.length).toBe(6);
  });

  it("retorna fallback para null/undefined", () => {
    expect(safeDisplay(null, 5)).toBe("");
    expect(safeDisplay(undefined, 5, { fallback: "—" })).toBe("—");
  });

  it("retorna vazio para maxUnits <= 0", () => {
    expect(safeDisplay("abc", 0)).toBe("");
    expect(safeDisplay("abc", -1)).toBe("");
  });

  it("nunca deixa lone surrogate ao truncar entre um surrogate pair", () => {
    const s = "a" + "😀".repeat(20);
    for (let cap = 2; cap <= s.length; cap++) {
      const out = safeDisplay(s, cap);
      expect(out.length).toBeLessThanOrEqual(cap);
      const last = out.charCodeAt(out.length - 1);
      // Último code unit não pode ser lone high surrogate
      expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
      // Round-trip JSON não introduz U+FFFD
      expect(JSON.parse(JSON.stringify(out))).toBe(out);
      expect(out.includes("\uFFFD")).toBe(false);
    }
  });

  it("preserva encoding UTF-8 válido para CJK, RTL e combining marks", () => {
    const samples = [
      "日本語のテスト文字列です",
      "مرحبا بالعالم من اختبار",
      "e\u0301\u0301\u0301 combinado",
      "👨‍👩‍👧‍👦 família ZWJ",
    ];
    for (const s of samples) {
      const out = safeDisplay(s, Math.max(2, s.length - 2));
      // TextEncoder não deve produzir sequências de substituição
      const encoded = new TextEncoder().encode(out);
      expect(encoded.byteLength).toBeGreaterThan(0);
      expect(out.includes("\uFFFD")).toBe(false);
      expect(JSON.parse(JSON.stringify(out))).toBe(out);
    }
  });

  it("cai para truncamento puro quando ellipsis não cabe no limite", () => {
    const out = safeDisplay("abcdef", 2, { ellipsis: "..." });
    expect(out.length).toBe(2);
    expect(out).toBe("ab");
  });

  it("property test: comprimento final sempre <= maxUnits", () => {
    const chars = ["a", "日", "😀", "\u0301", "👨‍👩‍👧"];
    for (let i = 0; i < 200; i++) {
      const len = 1 + Math.floor(Math.random() * 50);
      let s = "";
      for (let j = 0; j < len; j++) s += chars[Math.floor(Math.random() * chars.length)];
      const cap = 1 + Math.floor(Math.random() * (s.length + 5));
      const out = safeDisplay(s, cap);
      expect(out.length).toBeLessThanOrEqual(cap);
      expect(out.includes("\uFFFD")).toBe(false);
    }
  });

  it("retorna sempre typeof string", () => {
    expect(typeof safeDisplay("abc", 5)).toBe("string");
    expect(typeof safeDisplay(null, 5)).toBe("string");
    expect(typeof safeDisplay(undefined, 5, { fallback: "x" })).toBe("string");
    expect(typeof safeDisplay("", 0)).toBe("string");
  });

  it("string vazia nao recebe ellipsis mesmo abaixo do limite", () => {
    expect(safeDisplay("", 5)).toBe("");
  });

  it("nao acrescenta ellipsis quando string cabe exatamente no limite", () => {
    const out = safeDisplay("abc", 3);
    expect(out).toBe("abc");
    expect(out).not.toContain("\u2026");
  });

  it("ellipsis vazio equivale a truncamento puro", () => {
    const out = safeDisplay("abcdefgh", 4, { ellipsis: "" });
    expect(out).toBe("abcd");
    expect(out.length).toBe(4);
  });

  it("ellipsis customizado multi-char nao excede o limite", () => {
    const out = safeDisplay("abcdefghij", 8, { ellipsis: " [+]" });
    expect(out.length).toBeLessThanOrEqual(8);
    expect(out.endsWith(" [+]")).toBe(true);
  });

  it("null com fallback customizado retorna o fallback exato", () => {
    expect(safeDisplay(null, 100, { fallback: "N/A" })).toBe("N/A");
    expect(safeDisplay(undefined, 100, { fallback: "\u2014" })).toBe("\u2014");
  });
});
