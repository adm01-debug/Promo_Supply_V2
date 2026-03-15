import { describe, it, expect } from "vitest";

// Test the KPI calculation logic directly (extracted from useDashboardKPIs)
describe("Dashboard KPI Calculations", () => {
  const startOfMonth = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };

  describe("startOfMonth", () => {
    it("should return first day of current month", () => {
      const result = new Date(startOfMonth());
      expect(result.getDate()).toBe(1);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });
  });

  describe("Status counting logic", () => {
    const countByStatus = <T extends { status: string }>(items: T[], statuses: string[]) =>
      items.filter(i => statuses.includes(i.status)).length;

    it("should count items matching single status", () => {
      const items = [
        { status: "pendente" },
        { status: "aprovado" },
        { status: "pendente" },
        { status: "cancelado" },
      ];
      expect(countByStatus(items, ["pendente"])).toBe(2);
    });

    it("should count items matching multiple statuses", () => {
      const items = [
        { status: "pendente" },
        { status: "em_cotacao" },
        { status: "aprovada" },
      ];
      expect(countByStatus(items, ["pendente", "em_cotacao"])).toBe(2);
    });

    it("should return 0 for empty array", () => {
      expect(countByStatus([], ["pendente"])).toBe(0);
    });

    it("should return 0 for non-matching statuses", () => {
      const items = [{ status: "aprovado" }, { status: "entregue" }];
      expect(countByStatus(items, ["cancelado"])).toBe(0);
    });
  });

  describe("Delivery rate calculation", () => {
    const calcDeliveryRate = (
      pedidos: { status: string; data_entrega?: string; data_previsao?: string }[]
    ) => {
      const entregues = pedidos.filter(p => p.status === "entregue");
      const noPrazo = entregues.filter(
        p => p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao
      ).length;
      return entregues.length > 0 ? Math.round((noPrazo / entregues.length) * 100) : 100;
    };

    it("should return 100% when no deliveries", () => {
      expect(calcDeliveryRate([])).toBe(100);
    });

    it("should return 100% when all on time", () => {
      const pedidos = [
        { status: "entregue", data_entrega: "2026-03-10", data_previsao: "2026-03-15" },
        { status: "entregue", data_entrega: "2026-03-12", data_previsao: "2026-03-12" },
      ];
      expect(calcDeliveryRate(pedidos)).toBe(100);
    });

    it("should return 50% when half late", () => {
      const pedidos = [
        { status: "entregue", data_entrega: "2026-03-10", data_previsao: "2026-03-15" },
        { status: "entregue", data_entrega: "2026-03-20", data_previsao: "2026-03-12" },
      ];
      expect(calcDeliveryRate(pedidos)).toBe(50);
    });

    it("should return 0% when all late", () => {
      const pedidos = [
        { status: "entregue", data_entrega: "2026-03-20", data_previsao: "2026-03-10" },
        { status: "entregue", data_entrega: "2026-03-25", data_previsao: "2026-03-15" },
      ];
      expect(calcDeliveryRate(pedidos)).toBe(0);
    });

    it("should ignore non-entregue items", () => {
      const pedidos = [
        { status: "entregue", data_entrega: "2026-03-10", data_previsao: "2026-03-15" },
        { status: "em_transito", data_entrega: undefined, data_previsao: "2026-03-01" },
      ];
      expect(calcDeliveryRate(pedidos)).toBe(100);
    });

    it("should handle missing dates", () => {
      const pedidos = [
        { status: "entregue", data_entrega: undefined, data_previsao: "2026-03-15" },
      ];
      expect(calcDeliveryRate(pedidos)).toBe(0);
    });
  });

  describe("Savings calculation", () => {
    const calcSavings = (
      solicitacoes: { valor_estimado?: number | null; valor_aprovado?: number | null }[]
    ) => {
      const totalEstimado = solicitacoes.reduce((sum, s) => sum + (Number(s.valor_estimado) || 0), 0);
      const totalAprovado = solicitacoes.reduce((sum, s) => sum + (Number(s.valor_aprovado) || 0), 0);
      const economiaGerada = totalEstimado > 0 ? totalEstimado - totalAprovado : 0;
      const economiaPercentual = totalEstimado > 0
        ? Math.round((economiaGerada / totalEstimado) * 1000) / 10
        : 0;
      return { economiaGerada, economiaPercentual };
    };

    it("should calculate savings when approved < estimated", () => {
      const result = calcSavings([
        { valor_estimado: 10000, valor_aprovado: 8000 },
        { valor_estimado: 5000, valor_aprovado: 4500 },
      ]);
      expect(result.economiaGerada).toBe(2500);
      expect(result.economiaPercentual).toBeCloseTo(16.7, 0);
    });

    it("should return 0 savings when no estimates", () => {
      const result = calcSavings([{ valor_estimado: null, valor_aprovado: null }]);
      expect(result.economiaGerada).toBe(0);
      expect(result.economiaPercentual).toBe(0);
    });

    it("should handle negative savings (overbudget)", () => {
      const result = calcSavings([{ valor_estimado: 1000, valor_aprovado: 1500 }]);
      expect(result.economiaGerada).toBe(-500);
    });

    it("should handle empty array", () => {
      const result = calcSavings([]);
      expect(result.economiaGerada).toBe(0);
      expect(result.economiaPercentual).toBe(0);
    });
  });

  describe("Overdue detection", () => {
    const findOverdue = (pedidos: { data_previsao?: string | null; status: string }[]) => {
      const now = new Date().toISOString().split("T")[0];
      return pedidos.filter(
        p => p.data_previsao && p.data_previsao < now && p.status !== "entregue" && p.status !== "cancelado"
      );
    };

    it("should detect overdue pedidos", () => {
      const overdue = findOverdue([
        { data_previsao: "2020-01-01", status: "pendente" },
        { data_previsao: "2030-01-01", status: "pendente" },
      ]);
      expect(overdue).toHaveLength(1);
    });

    it("should not flag delivered as overdue", () => {
      const overdue = findOverdue([
        { data_previsao: "2020-01-01", status: "entregue" },
      ]);
      expect(overdue).toHaveLength(0);
    });

    it("should not flag cancelled as overdue", () => {
      const overdue = findOverdue([
        { data_previsao: "2020-01-01", status: "cancelado" },
      ]);
      expect(overdue).toHaveLength(0);
    });

    it("should handle null data_previsao", () => {
      const overdue = findOverdue([{ data_previsao: null, status: "pendente" }]);
      expect(overdue).toHaveLength(0);
    });
  });

  describe("Pipeline stage counting", () => {
    it("should count items in each pipeline stage", () => {
      const sol = [
        { status: "pendente" },
        { status: "em_cotacao" },
        { status: "em_cotacao" },
        { status: "aprovada" },
      ];
      const ped = [
        { status: "pendente" },
        { status: "enviado" },
        { status: "entregue" },
        { status: "entregue" },
      ];

      expect(sol.filter(s => s.status === "pendente" || s.status === "em_cotacao").length).toBe(3);
      expect(ped.filter(p => p.status === "enviado").length).toBe(1);
      expect(ped.filter(p => p.status === "entregue").length).toBe(2);
    });
  });

  describe("Urgent items filter", () => {
    const findUrgent = (
      solicitacoes: { status: string; data_necessidade?: string | null }[],
      thresholdDays = 3
    ) => {
      const now = new Date();
      return solicitacoes.filter(s => {
        if (s.status === "concluida" || s.status === "cancelada") return false;
        if (!s.data_necessidade) return false;
        const diff = (new Date(s.data_necessidade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= thresholdDays;
      });
    };

    it("should find items due within 3 days", () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const result = findUrgent([
        { status: "pendente", data_necessidade: tomorrow },
        { status: "pendente", data_necessidade: "2030-12-31" },
      ]);
      expect(result).toHaveLength(1);
    });

    it("should include overdue items", () => {
      const result = findUrgent([
        { status: "pendente", data_necessidade: "2020-01-01" },
      ]);
      expect(result).toHaveLength(1);
    });

    it("should exclude completed items", () => {
      const result = findUrgent([
        { status: "concluida", data_necessidade: "2020-01-01" },
        { status: "cancelada", data_necessidade: "2020-01-01" },
      ]);
      expect(result).toHaveLength(0);
    });

    it("should exclude items without date", () => {
      const result = findUrgent([{ status: "pendente", data_necessidade: null }]);
      expect(result).toHaveLength(0);
    });
  });
});
