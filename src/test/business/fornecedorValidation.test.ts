import { describe, it, expect } from "vitest";

describe("Fornecedor — Validation & Business Rules", () => {
  describe("CNPJ full validation with checksum", () => {
    const validateCNPJ = (cnpj: string): boolean => {
      const clean = cnpj.replace(/\D/g, "");
      if (clean.length !== 14) return false;
      if (/^(\d)\1+$/.test(clean)) return false;
      const calc = (str: string, weights: number[]) =>
        str.split("").reduce((sum, d, i) => sum + parseInt(d) * weights[i], 0);
      const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const d1 = calc(clean.slice(0, 12), w1) % 11;
      const check1 = d1 < 2 ? 0 : 11 - d1;
      if (parseInt(clean[12]) !== check1) return false;
      const d2 = calc(clean.slice(0, 13), w2) % 11;
      const check2 = d2 < 2 ? 0 : 11 - d2;
      return parseInt(clean[13]) === check2;
    };

    it("should accept valid CNPJ 11.222.333/0001-81", () => expect(validateCNPJ("11.222.333/0001-81")).toBe(true));
    it("should accept unformatted valid CNPJ", () => expect(validateCNPJ("11222333000181")).toBe(true));
    it("should reject all-zeros", () => expect(validateCNPJ("00000000000000")).toBe(false));
    it("should reject all-ones", () => expect(validateCNPJ("11111111111111")).toBe(false));
    it("should reject wrong checksum", () => expect(validateCNPJ("11222333000199")).toBe(false));
    it("should reject short string", () => expect(validateCNPJ("1234")).toBe(false));
    it("should reject empty string", () => expect(validateCNPJ("")).toBe(false));
    it("should reject letters mixed in", () => expect(validateCNPJ("1122233300AB81")).toBe(false));
  });

  describe("Estado (UF) validation", () => {
    const UF_LIST = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
    const isValidUF = (uf: string | null) => uf !== null && UF_LIST.includes(uf.toUpperCase());

    it("should accept SP", () => expect(isValidUF("SP")).toBe(true));
    it("should accept lowercase rj", () => expect(isValidUF("rj")).toBe(true));
    it("should reject XX", () => expect(isValidUF("XX")).toBe(false));
    it("should reject null", () => expect(isValidUF(null)).toBe(false));
    it("should reject empty", () => expect(isValidUF("")).toBe(false));
    it("should accept all 27 UFs", () => expect(UF_LIST).toHaveLength(27));
  });

  describe("CEP formatting", () => {
    const formatCEP = (cep: string) => {
      const clean = cep.replace(/\D/g, "");
      if (clean.length !== 8) return null;
      return `${clean.slice(0, 5)}-${clean.slice(5)}`;
    };

    it("should format 01310100 -> 01310-100", () => expect(formatCEP("01310100")).toBe("01310-100"));
    it("should format with dashes already", () => expect(formatCEP("01310-100")).toBe("01310-100"));
    it("should return null for invalid length", () => expect(formatCEP("123")).toBeNull());
    it("should return null for empty", () => expect(formatCEP("")).toBeNull());
  });

  describe("Supplier rating aggregation", () => {
    const calcRating = (deliveries: { onTime: boolean; qualityScore: number }[]) => {
      if (deliveries.length === 0) return { avgQuality: 0, onTimeRate: 0, overall: 0 };
      const avgQuality = deliveries.reduce((s, d) => s + d.qualityScore, 0) / deliveries.length;
      const onTimeRate = (deliveries.filter(d => d.onTime).length / deliveries.length) * 100;
      const overall = avgQuality * 0.6 + (onTimeRate / 10) * 0.4;
      return {
        avgQuality: Math.round(avgQuality * 10) / 10,
        onTimeRate: Math.round(onTimeRate),
        overall: Math.round(overall * 10) / 10,
      };
    };

    it("should calculate perfect supplier", () => {
      const r = calcRating([{ onTime: true, qualityScore: 10 }, { onTime: true, qualityScore: 10 }]);
      expect(r.avgQuality).toBe(10);
      expect(r.onTimeRate).toBe(100);
      expect(r.overall).toBe(10);
    });

    it("should penalize late deliveries", () => {
      const r = calcRating([{ onTime: false, qualityScore: 10 }, { onTime: true, qualityScore: 10 }]);
      expect(r.onTimeRate).toBe(50);
      expect(r.overall).toBeLessThan(10);
    });

    it("should handle empty array", () => {
      const r = calcRating([]);
      expect(r.overall).toBe(0);
    });

    it("should weight quality higher than on-time (60/40)", () => {
      const highQuality = calcRating([{ onTime: false, qualityScore: 10 }]);
      const highOnTime = calcRating([{ onTime: true, qualityScore: 5 }]);
      expect(highQuality.overall).toBeGreaterThan(highOnTime.overall);
    });
  });

  describe("Duplicate detection", () => {
    const findDuplicates = (suppliers: { cnpj: string | null; razao_social: string }[]) => {
      const cnpjMap = new Map<string, number[]>();
      suppliers.forEach((s, i) => {
        if (s.cnpj) {
          const clean = s.cnpj.replace(/\D/g, "");
          if (!cnpjMap.has(clean)) cnpjMap.set(clean, []);
          cnpjMap.get(clean)!.push(i);
        }
      });
      return [...cnpjMap.entries()].filter(([, indices]) => indices.length > 1).map(([cnpj]) => cnpj);
    };

    it("should detect duplicate CNPJs", () => {
      const dups = findDuplicates([
        { cnpj: "11222333000181", razao_social: "A" },
        { cnpj: "11.222.333/0001-81", razao_social: "B" },
      ]);
      expect(dups).toHaveLength(1);
    });

    it("should not flag unique CNPJs", () => {
      const dups = findDuplicates([
        { cnpj: "11222333000181", razao_social: "A" },
        { cnpj: "99888777000166", razao_social: "B" },
      ]);
      expect(dups).toHaveLength(0);
    });

    it("should skip null CNPJs", () => {
      const dups = findDuplicates([
        { cnpj: null, razao_social: "A" },
        { cnpj: null, razao_social: "B" },
      ]);
      expect(dups).toHaveLength(0);
    });
  });
});
