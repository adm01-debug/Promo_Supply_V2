import { describe, it, expect } from "vitest";
import { safeTruncate } from "@/lib/safeTruncate";

describe("safeTruncate (frontend)", () => {
  it("retorna a string original quando cabe no limite", () => {
    expect(safeTruncate("hello", 10)).toBe("hello");
  });

  it("respeita o limite em ASCII", () => {
    const out = safeTruncate("abcdefghij", 5);
    expect(out).toBe("abcde");
    expect(out.length).toBe(5);
  });

  it("nunca deixa lone high surrogate ao cortar entre surrogate pair", () => {
    // "😀" ocupa 2 code units (D83D DE00)
    const s = "a" + "😀".repeat(10);
    for (let cap = 1; cap <= s.length; cap++) {
      const out = safeTruncate(s, cap);
      expect(out.length).toBeLessThanOrEqual(cap);
      const last = out.charCodeAt(out.length - 1);
      expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
      // Round-trip JSON não introduz U+FFFD
      expect(JSON.parse(JSON.stringify(out))).toBe(out);
      expect(out.includes("\uFFFD")).toBe(false);
    }
  });

  it("preserva encoding UTF-8 para CJK / RTL / combining marks", () => {
    const samples = ["日本語テスト", "مرحبا بالعالم", "e\u0301\u0301\u0301"];
    for (const s of samples) {
      const out = safeTruncate(s, Math.max(1, s.length - 1));
      expect(new TextEncoder().encode(out).byteLength).toBeGreaterThan(0);
      expect(JSON.parse(JSON.stringify(out))).toBe(out);
    }
  });

  it("retorna vazio para maxUnits <= 0", () => {
    expect(safeTruncate("abc", 0)).toBe("");
    expect(safeTruncate("abc", -5)).toBe("");
  });

  it("retorna string vazia para input vazio", () => {
    expect(safeTruncate("", 10)).toBe("");
    expect(safeTruncate("", 0)).toBe("");
  });

  it("retorna string intacta quando maxUnits é exatamente igual ao comprimento", () => {
    expect(safeTruncate("hello", 5)).toBe("hello");
    expect(safeTruncate("ab", 2)).toBe("ab");
  });

  it("maxUnits muito grande não altera a string", () => {
    expect(safeTruncate("abc", 9999)).toBe("abc");
    expect(safeTruncate("x", 1000000)).toBe("x");
  });

  it("string de um único char com maxUnits=1 retorna o char", () => {
    expect(safeTruncate("a", 1)).toBe("a");
    expect(safeTruncate("€", 1)).toBe("€");
  });

  it("retorna string vazia para string de 1 char com maxUnits=0", () => {
    expect(safeTruncate("a", 0)).toBe("");
  });

  it("recua um code unit quando maxUnits cai sobre high surrogate", () => {
    // "a😀" = [a, D83D, DE00] — length 3
    // maxUnits=2 deve recuar para 1 pois pos 1 é high surrogate (D83D)
    const s = "a😀";
    const out = safeTruncate(s, 2);
    expect(out).toBe("a");
    expect(out.length).toBe(1);
  });

  it("não recua quando maxUnits cai sobre low surrogate (posição 0 do par)", () => {
    // "a😀b" = [a, D83D, DE00, b] — com maxUnits=3 o último é DE00 (low), não high
    const s = "a😀b";
    const out = safeTruncate(s, 3);
    expect(out.length).toBeLessThanOrEqual(3);
    const last = out.charCodeAt(out.length - 1);
    expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
  });

  it("resultado é sempre typeof string", () => {
    expect(typeof safeTruncate("qualquer", 3)).toBe("string");
    expect(typeof safeTruncate("", 10)).toBe("string");
    expect(typeof safeTruncate("abc", 0)).toBe("string");
  });

  it("result.length é sempre <= maxUnits (propriedade fundamental)", () => {
    const inputs = ["hello world", "😀😁😂", "日本語", "abc", ""];
    const limits = [0, 1, 2, 5, 100];
    for (const s of inputs) {
      for (const limit of limits) {
        expect(safeTruncate(s, limit).length).toBeLessThanOrEqual(limit);
      }
    }
  });

  it("resultado é sempre um prefixo da string original", () => {
    const s = "abc😀def";
    for (let cap = 0; cap <= s.length + 2; cap++) {
      const out = safeTruncate(s, cap);
      expect(s.startsWith(out)).toBe(true);
    }
  });

  it("nenhum high surrogate isolado no final do resultado", () => {
    const s = "ab😀cd😁ef";
    for (let cap = 0; cap <= s.length; cap++) {
      const out = safeTruncate(s, cap);
      if (out.length > 0) {
        const last = out.charCodeAt(out.length - 1);
        expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
      }
    }
  });

  it("strings grandes truncam eficientemente sem erro", () => {
    const big = "x".repeat(100_000);
    expect(() => safeTruncate(big, 50_000)).not.toThrow();
    expect(safeTruncate(big, 50_000).length).toBe(50_000);
  });
});
