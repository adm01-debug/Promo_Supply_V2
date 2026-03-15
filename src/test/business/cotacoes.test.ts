import { describe, it, expect } from "vitest";

describe("Cotações — Business Logic", () => {
  describe("Score calculation", () => {
    const calcScores = (
      cotacoes: { valor_total: number; prazo_entrega: number; qualidadeBase?: number }[],
      weights = { preco: 0.4, prazo: 0.3, qualidade: 0.3 }
    ) => {
      if (cotacoes.length === 0) return [];

      const minPreco = Math.min(...cotacoes.map(c => c.valor_total));
      const maxPreco = Math.max(...cotacoes.map(c => c.valor_total));
      const minPrazo = Math.min(...cotacoes.map(c => c.prazo_entrega));
      const maxPrazo = Math.max(...cotacoes.map(c => c.prazo_entrega));

      return cotacoes.map(c => {
        const scorePreco = maxPreco === minPreco ? 10 : 10 * (1 - (c.valor_total - minPreco) / (maxPreco - minPreco));
        const scorePrazo = maxPrazo === minPrazo ? 10 : 10 * (1 - (c.prazo_entrega - minPrazo) / (maxPrazo - minPrazo));
        const scoreQualidade = c.qualidadeBase ?? 7;
        const total = scorePreco * weights.preco + scorePrazo * weights.prazo + scoreQualidade * weights.qualidade;
        return { scorePreco: Math.round(scorePreco * 10) / 10, scorePrazo: Math.round(scorePrazo * 10) / 10, scoreTotal: Math.round(total * 10) / 10 };
      });
    };

    it("should give best price score to cheapest", () => {
      const result = calcScores([
        { valor_total: 1000, prazo_entrega: 10 },
        { valor_total: 2000, prazo_entrega: 10 },
        { valor_total: 3000, prazo_entrega: 10 },
      ]);
      expect(result[0].scorePreco).toBe(10);
      expect(result[2].scorePreco).toBe(0);
    });

    it("should give best prazo score to fastest", () => {
      const result = calcScores([
        { valor_total: 1000, prazo_entrega: 5 },
        { valor_total: 1000, prazo_entrega: 15 },
      ]);
      expect(result[0].scorePrazo).toBe(10);
      expect(result[1].scorePrazo).toBe(0);
    });

    it("should handle single cotacao (equal scores)", () => {
      const result = calcScores([{ valor_total: 1000, prazo_entrega: 10 }]);
      expect(result[0].scorePreco).toBe(10);
      expect(result[0].scorePrazo).toBe(10);
    });

    it("should handle empty array", () => {
      expect(calcScores([])).toHaveLength(0);
    });

    it("should rank correctly with custom quality", () => {
      const result = calcScores([
        { valor_total: 1000, prazo_entrega: 10, qualidadeBase: 10 },
        { valor_total: 1000, prazo_entrega: 10, qualidadeBase: 5 },
      ]);
      expect(result[0].scoreTotal).toBeGreaterThan(result[1].scoreTotal);
    });
  });

  describe("Best cotacao selection", () => {
    const selectBest = (cotacoes: { id: string; score_total: number; status: string }[]) => {
      const eligible = cotacoes.filter(c => !["rejeitada", "expirada"].includes(c.status));
      if (eligible.length === 0) return null;
      return eligible.reduce((best, curr) => curr.score_total > best.score_total ? curr : best);
    };

    it("should select highest score", () => {
      const result = selectBest([
        { id: "1", score_total: 7, status: "pendente" },
        { id: "2", score_total: 9, status: "pendente" },
        { id: "3", score_total: 6, status: "pendente" },
      ]);
      expect(result?.id).toBe("2");
    });

    it("should exclude rejected cotacoes", () => {
      const result = selectBest([
        { id: "1", score_total: 10, status: "rejeitada" },
        { id: "2", score_total: 5, status: "pendente" },
      ]);
      expect(result?.id).toBe("2");
    });

    it("should exclude expired cotacoes", () => {
      const result = selectBest([
        { id: "1", score_total: 10, status: "expirada" },
        { id: "2", score_total: 3, status: "analisando" },
      ]);
      expect(result?.id).toBe("2");
    });

    it("should return null when all ineligible", () => {
      const result = selectBest([
        { id: "1", score_total: 10, status: "rejeitada" },
        { id: "2", score_total: 8, status: "expirada" },
      ]);
      expect(result).toBeNull();
    });

    it("should return null for empty array", () => {
      expect(selectBest([])).toBeNull();
    });
  });

  describe("Cotação expiry check", () => {
    const isExpired = (validadeStr: string | null, now = new Date()) => {
      if (!validadeStr) return false;
      return new Date(validadeStr) < now;
    };

    it("should detect expired cotação", () => {
      expect(isExpired("2020-01-01")).toBe(true);
    });

    it("should not flag future cotação", () => {
      expect(isExpired("2030-12-31")).toBe(false);
    });

    it("should handle null validade", () => {
      expect(isExpired(null)).toBe(false);
    });
  });

  describe("Discount calculation", () => {
    const applyDiscount = (valorUnitario: number, quantidade: number, descontoPercentual: number, frete: number) => {
      const subtotal = valorUnitario * quantidade;
      const desconto = subtotal * (descontoPercentual / 100);
      return subtotal - desconto + frete;
    };

    it("should calculate total with discount and freight", () => {
      expect(applyDiscount(100, 10, 10, 50)).toBe(950);
    });

    it("should handle 0% discount", () => {
      expect(applyDiscount(100, 10, 0, 0)).toBe(1000);
    });

    it("should handle 100% discount", () => {
      expect(applyDiscount(100, 10, 100, 50)).toBe(50);
    });

    it("should handle fractional quantities", () => {
      expect(applyDiscount(10.50, 3, 0, 0)).toBeCloseTo(31.50);
    });
  });
});
