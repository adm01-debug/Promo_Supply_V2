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
});
