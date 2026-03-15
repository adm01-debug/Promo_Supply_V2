import { describe, it, expect } from "vitest";

describe("Data Integrity — Business rule validations", () => {
  describe("Pedido value calculations", () => {
    const calcTotal = (subtotal: number, frete: number, desconto: number) =>
      subtotal + frete - desconto;

    it("should calculate total correctly", () => {
      expect(calcTotal(10000, 150, 500)).toBe(9650);
    });

    it("should handle zero freight and discount", () => {
      expect(calcTotal(5000, 0, 0)).toBe(5000);
    });

    it("should allow discount > subtotal (negative total)", () => {
      expect(calcTotal(100, 0, 200)).toBe(-100);
    });

    it("should handle very large values", () => {
      expect(calcTotal(999999.99, 500, 1000)).toBe(999499.99);
    });
  });

  describe("Cotação scoring", () => {
    const calcScore = (
      preco: number,
      prazo: number,
      qualidade: number,
      weights = { preco: 0.4, prazo: 0.3, qualidade: 0.3 }
    ): number => {
      return Number(
        (preco * weights.preco + prazo * weights.prazo + qualidade * weights.qualidade).toFixed(2)
      );
    };

    it("should calculate weighted score", () => {
      expect(calcScore(8, 7, 9)).toBe(8.0);
    });

    it("should handle perfect scores", () => {
      expect(calcScore(10, 10, 10)).toBe(10);
    });

    it("should handle zero scores", () => {
      expect(calcScore(0, 0, 0)).toBe(0);
    });

    it("should weight price highest by default", () => {
      const highPrice = calcScore(10, 5, 5);
      const lowPrice = calcScore(5, 10, 10);
      expect(highPrice).toBeGreaterThan(lowPrice);
    });
  });

  describe("Status transitions", () => {
    const validTransitions: Record<string, string[]> = {
      pendente: ["em_cotacao", "aprovada", "cancelada"],
      em_cotacao: ["aprovada", "rejeitada", "cancelada"],
      aprovada: ["em_andamento", "cancelada"],
      em_andamento: ["concluida", "cancelada"],
      rejeitada: ["pendente"],
      concluida: [],
      cancelada: [],
    };

    const isValidTransition = (from: string, to: string): boolean => {
      return validTransitions[from]?.includes(to) ?? false;
    };

    it("should allow pendente -> em_cotacao", () => {
      expect(isValidTransition("pendente", "em_cotacao")).toBe(true);
    });

    it("should allow pendente -> cancelada", () => {
      expect(isValidTransition("pendente", "cancelada")).toBe(true);
    });

    it("should not allow concluida -> anything", () => {
      expect(isValidTransition("concluida", "pendente")).toBe(false);
      expect(isValidTransition("concluida", "cancelada")).toBe(false);
    });

    it("should not allow cancelada -> anything", () => {
      expect(isValidTransition("cancelada", "pendente")).toBe(false);
    });

    it("should allow rejeitada -> pendente (rework)", () => {
      expect(isValidTransition("rejeitada", "pendente")).toBe(true);
    });

    it("should not allow backward transitions", () => {
      expect(isValidTransition("em_andamento", "pendente")).toBe(false);
      expect(isValidTransition("aprovada", "em_cotacao")).toBe(false);
    });

    it("should not allow skip transitions", () => {
      expect(isValidTransition("pendente", "concluida")).toBe(false);
    });
  });

  describe("Currency formatting (BRL)", () => {
    const formatBRL = (value: number): string =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

    it("should format positive values", () => {
      expect(formatBRL(1234.56)).toContain("1.234,56");
    });

    it("should format zero", () => {
      expect(formatBRL(0)).toContain("0,00");
    });

    it("should format large values", () => {
      expect(formatBRL(1000000)).toContain("1.000.000");
    });

    it("should format negative values", () => {
      const result = formatBRL(-500);
      expect(result).toContain("500");
    });
  });

  describe("Date validation for procurement", () => {
    it("should reject data_necessidade in the past for new solicitacoes", () => {
      const isValid = (dateStr: string) => new Date(dateStr) > new Date();
      expect(isValid("2020-01-01")).toBe(false);
    });

    it("should accept future dates", () => {
      const isValid = (dateStr: string) => new Date(dateStr) > new Date();
      expect(isValid("2030-12-31")).toBe(true);
    });

    it("should validate end_date > start_date for contracts", () => {
      const isValid = (start: string, end: string) => new Date(end) > new Date(start);
      expect(isValid("2026-01-01", "2026-12-31")).toBe(true);
      expect(isValid("2026-12-31", "2026-01-01")).toBe(false);
    });
  });

  describe("Supplier qualification scoring", () => {
    const calcQualScore = (docs: { status: string; weight: number; expired: boolean }[]) => {
      const totalWeight = docs.filter(d => d.weight > 0).reduce((sum, d) => sum + d.weight, 0);
      const achievedWeight = docs
        .filter(d => d.status === "approved" && !d.expired)
        .reduce((sum, d) => sum + d.weight, 0);
      return totalWeight > 0 ? (achievedWeight / totalWeight) * 100 : 0;
    };

    it("should return 100% when all docs approved", () => {
      const docs = [
        { status: "approved", weight: 10, expired: false },
        { status: "approved", weight: 20, expired: false },
      ];
      expect(calcQualScore(docs)).toBe(100);
    });

    it("should return 0% when no docs approved", () => {
      const docs = [
        { status: "pending", weight: 10, expired: false },
        { status: "rejected", weight: 20, expired: false },
      ];
      expect(calcQualScore(docs)).toBe(0);
    });

    it("should exclude expired docs from achieved", () => {
      const docs = [
        { status: "approved", weight: 10, expired: true },
        { status: "approved", weight: 10, expired: false },
      ];
      expect(calcQualScore(docs)).toBe(50);
    });

    it("should handle empty docs array", () => {
      expect(calcQualScore([])).toBe(0);
    });
  });
});
