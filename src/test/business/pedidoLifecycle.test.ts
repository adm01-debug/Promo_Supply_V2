import { describe, it, expect } from "vitest";

describe("Pedido Lifecycle — Complete Order Flow", () => {
  const validTransitions: Record<string, string[]> = {
    pendente: ["aprovado", "cancelado"],
    aprovado: ["em_producao", "cancelado"],
    em_producao: ["enviado", "cancelado"],
    enviado: ["entregue", "devolvido"],
    entregue: ["concluido", "devolvido"],
    concluido: [],
    cancelado: [],
    devolvido: ["em_producao"],
  };

  const isValid = (from: string, to: string) => validTransitions[from]?.includes(to) ?? false;

  describe("Status transitions", () => {
    it("should follow happy path: pendente -> aprovado -> em_producao -> enviado -> entregue -> concluido", () => {
      expect(isValid("pendente", "aprovado")).toBe(true);
      expect(isValid("aprovado", "em_producao")).toBe(true);
      expect(isValid("em_producao", "enviado")).toBe(true);
      expect(isValid("enviado", "entregue")).toBe(true);
      expect(isValid("entregue", "concluido")).toBe(true);
    });

    it("should not skip steps", () => {
      expect(isValid("pendente", "enviado")).toBe(false);
      expect(isValid("aprovado", "entregue")).toBe(false);
    });

    it("should allow cancellation at most stages", () => {
      expect(isValid("pendente", "cancelado")).toBe(true);
      expect(isValid("aprovado", "cancelado")).toBe(true);
      expect(isValid("em_producao", "cancelado")).toBe(true);
    });

    it("should not allow cancellation after delivery", () => {
      expect(isValid("entregue", "cancelado")).toBe(false);
      expect(isValid("concluido", "cancelado")).toBe(false);
    });

    it("should allow return to production after devolvido", () => {
      expect(isValid("devolvido", "em_producao")).toBe(true);
    });

    it("should be terminal for concluido and cancelado", () => {
      expect(validTransitions["concluido"]).toHaveLength(0);
      expect(validTransitions["cancelado"]).toHaveLength(0);
    });
  });

  describe("Delivery SLA calculation", () => {
    const calcDeliverySLA = (dataEmissao: string, dataPrevisao: string | null, dataEntrega: string | null) => {
      if (!dataPrevisao) return { hasTarget: false, onTime: null, daysLate: 0 };
      const previsao = new Date(dataPrevisao);
      if (!dataEntrega) {
        const now = new Date("2026-03-15");
        const daysRemaining = Math.ceil((previsao.getTime() - now.getTime()) / 86400000);
        return { hasTarget: true, onTime: daysRemaining >= 0 ? null : false, daysLate: Math.max(0, -daysRemaining) };
      }
      const entrega = new Date(dataEntrega);
      const diff = Math.ceil((entrega.getTime() - previsao.getTime()) / 86400000);
      return { hasTarget: true, onTime: diff <= 0, daysLate: Math.max(0, diff) };
    };

    it("should detect on-time delivery", () => {
      const r = calcDeliverySLA("2026-03-01", "2026-03-20", "2026-03-18");
      expect(r.onTime).toBe(true);
      expect(r.daysLate).toBe(0);
    });

    it("should detect late delivery", () => {
      const r = calcDeliverySLA("2026-03-01", "2026-03-10", "2026-03-15");
      expect(r.onTime).toBe(false);
      expect(r.daysLate).toBe(5);
    });

    it("should handle exact date delivery", () => {
      const r = calcDeliverySLA("2026-03-01", "2026-03-15", "2026-03-15");
      expect(r.onTime).toBe(true);
    });

    it("should handle no previsao", () => {
      const r = calcDeliverySLA("2026-03-01", null, null);
      expect(r.hasTarget).toBe(false);
    });

    it("should detect overdue pending delivery", () => {
      const r = calcDeliverySLA("2026-03-01", "2026-03-10", null);
      expect(r.daysLate).toBe(5);
    });
  });

  describe("Order value calculations", () => {
    const calcOrderTotal = (
      items: { quantidade: number; valor_unitario: number }[],
      frete: number,
      desconto: number
    ) => {
      const subtotal = items.reduce((sum, i) => sum + i.quantidade * i.valor_unitario, 0);
      return { subtotal, frete, desconto, total: subtotal + frete - desconto };
    };

    it("should calculate with items, frete, and desconto", () => {
      const r = calcOrderTotal(
        [{ quantidade: 10, valor_unitario: 100 }, { quantidade: 5, valor_unitario: 200 }],
        150, 100
      );
      expect(r.subtotal).toBe(2000);
      expect(r.total).toBe(2050);
    });

    it("should handle empty items", () => {
      const r = calcOrderTotal([], 0, 0);
      expect(r.total).toBe(0);
    });

    it("should handle zero frete and desconto", () => {
      const r = calcOrderTotal([{ quantidade: 1, valor_unitario: 500 }], 0, 0);
      expect(r.total).toBe(500);
    });

    it("should handle desconto greater than subtotal", () => {
      const r = calcOrderTotal([{ quantidade: 1, valor_unitario: 100 }], 0, 200);
      expect(r.total).toBe(-100);
    });

    it("should handle fractional values", () => {
      const r = calcOrderTotal([{ quantidade: 3, valor_unitario: 9.99 }], 15.50, 0);
      expect(r.total).toBeCloseTo(45.47);
    });
  });

  describe("Receiving (recebimento) validation", () => {
    const validateReceiving = (
      items: { quantidade: number; quantidade_recebida: number | null }[]
    ) => {
      const total = items.reduce((s, i) => s + i.quantidade, 0);
      const received = items.reduce((s, i) => s + (i.quantidade_recebida ?? 0), 0);
      const allComplete = items.every(i => (i.quantidade_recebida ?? 0) >= i.quantidade);
      const hasPartial = items.some(i => {
        const rec = i.quantidade_recebida ?? 0;
        return rec > 0 && rec < i.quantidade;
      });
      return {
        totalOrdered: total,
        totalReceived: received,
        percentReceived: total > 0 ? Math.round((received / total) * 100) : 0,
        allComplete,
        hasPartial,
      };
    };

    it("should detect complete receiving", () => {
      const r = validateReceiving([
        { quantidade: 10, quantidade_recebida: 10 },
        { quantidade: 5, quantidade_recebida: 5 },
      ]);
      expect(r.allComplete).toBe(true);
      expect(r.percentReceived).toBe(100);
    });

    it("should detect partial receiving", () => {
      const r = validateReceiving([
        { quantidade: 10, quantidade_recebida: 7 },
        { quantidade: 5, quantidade_recebida: 5 },
      ]);
      expect(r.hasPartial).toBe(true);
      expect(r.percentReceived).toBe(80);
    });

    it("should handle null quantidade_recebida", () => {
      const r = validateReceiving([{ quantidade: 10, quantidade_recebida: null }]);
      expect(r.totalReceived).toBe(0);
      expect(r.percentReceived).toBe(0);
    });

    it("should handle over-receiving", () => {
      const r = validateReceiving([{ quantidade: 10, quantidade_recebida: 15 }]);
      expect(r.percentReceived).toBe(150);
      expect(r.allComplete).toBe(true);
    });
  });
});
