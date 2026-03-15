import { describe, it, expect } from "vitest";

describe("Approval Escalation — Advanced Workflow", () => {
  describe("Escalation timing", () => {
    const shouldEscalate = (
      prazoLimite: string | null,
      escalacaoAutomatica: boolean,
      escaladoEm: string | null,
      status: string,
      now = new Date("2026-03-15T12:00:00Z")
    ) => {
      if (!escalacaoAutomatica || !prazoLimite) return false;
      if (status !== "pending") return false;
      if (escaladoEm) return false;
      return new Date(prazoLimite) < now;
    };

    it("should escalate overdue pending workflow", () => {
      expect(shouldEscalate("2026-03-14T00:00:00Z", true, null, "pending")).toBe(true);
    });

    it("should not escalate if auto-escalation disabled", () => {
      expect(shouldEscalate("2026-03-14T00:00:00Z", false, null, "pending")).toBe(false);
    });

    it("should not escalate already escalated", () => {
      expect(shouldEscalate("2026-03-14T00:00:00Z", true, "2026-03-14T10:00:00Z", "pending")).toBe(false);
    });

    it("should not escalate approved workflow", () => {
      expect(shouldEscalate("2026-03-14T00:00:00Z", true, null, "approved")).toBe(false);
    });

    it("should not escalate if no prazo", () => {
      expect(shouldEscalate(null, true, null, "pending")).toBe(false);
    });

    it("should not escalate future prazo", () => {
      expect(shouldEscalate("2026-03-20T00:00:00Z", true, null, "pending")).toBe(false);
    });
  });

  describe("Delegation validity", () => {
    const isDelegationValid = (
      dataInicio: string,
      dataFim: string,
      ativo: boolean,
      categoriasPerm: string[],
      categoriaId: string | null,
      valorMaximo: number | null,
      valor: number,
      now = new Date("2026-03-15T12:00:00Z")
    ) => {
      if (!ativo) return false;
      if (now < new Date(dataInicio) || now > new Date(dataFim)) return false;
      if (categoriasPerm.length > 0 && categoriaId && !categoriasPerm.includes(categoriaId)) return false;
      if (valorMaximo !== null && valor > valorMaximo) return false;
      return true;
    };

    it("should accept valid delegation", () => {
      expect(isDelegationValid("2026-03-01", "2026-03-31", true, [], null, null, 1000)).toBe(true);
    });

    it("should reject inactive delegation", () => {
      expect(isDelegationValid("2026-03-01", "2026-03-31", false, [], null, null, 1000)).toBe(false);
    });

    it("should reject expired delegation", () => {
      expect(isDelegationValid("2026-02-01", "2026-02-28", true, [], null, null, 1000)).toBe(false);
    });

    it("should reject future delegation", () => {
      expect(isDelegationValid("2026-04-01", "2026-04-30", true, [], null, null, 1000)).toBe(false);
    });

    it("should reject wrong category", () => {
      expect(isDelegationValid("2026-03-01", "2026-03-31", true, ["cat-a"], "cat-b", null, 1000)).toBe(false);
    });

    it("should accept matching category", () => {
      expect(isDelegationValid("2026-03-01", "2026-03-31", true, ["cat-a", "cat-b"], "cat-b", null, 1000)).toBe(true);
    });

    it("should reject over value limit", () => {
      expect(isDelegationValid("2026-03-01", "2026-03-31", true, [], null, 5000, 10000)).toBe(false);
    });

    it("should accept under value limit", () => {
      expect(isDelegationValid("2026-03-01", "2026-03-31", true, [], null, 5000, 3000)).toBe(true);
    });
  });

  describe("Rule matching priority", () => {
    interface Rule {
      id: string;
      valor_min: number;
      valor_max: number;
      categoria_id: string | null;
      prioridade: number;
      ativo: boolean;
    }

    const findRule = (rules: Rule[], valor: number, categoriaId: string | null) => {
      return rules
        .filter(r => r.ativo && valor >= r.valor_min && valor <= r.valor_max)
        .filter(r => r.categoria_id === null || r.categoria_id === categoriaId)
        .sort((a, b) => {
          if (a.categoria_id && !b.categoria_id) return -1;
          if (!a.categoria_id && b.categoria_id) return 1;
          return b.prioridade - a.prioridade;
        })[0] ?? null;
    };

    const rules: Rule[] = [
      { id: "general", valor_min: 0, valor_max: 50000, categoria_id: null, prioridade: 1, ativo: true },
      { id: "specific", valor_min: 0, valor_max: 50000, categoria_id: "cat-tech", prioridade: 2, ativo: true },
      { id: "high-value", valor_min: 50001, valor_max: 999999, categoria_id: null, prioridade: 3, ativo: true },
      { id: "inactive", valor_min: 0, valor_max: 999999, categoria_id: null, prioridade: 10, ativo: false },
    ];

    it("should prefer category-specific rule", () => {
      const r = findRule(rules, 10000, "cat-tech");
      expect(r?.id).toBe("specific");
    });

    it("should fall back to general rule", () => {
      const r = findRule(rules, 10000, "cat-office");
      expect(r?.id).toBe("general");
    });

    it("should match high-value rule", () => {
      const r = findRule(rules, 60000, null);
      expect(r?.id).toBe("high-value");
    });

    it("should skip inactive rules", () => {
      const r = findRule(rules, 500, null);
      expect(r?.id).not.toBe("inactive");
    });

    it("should return null if no match", () => {
      const r = findRule(rules, 1000000, null);
      expect(r).toBeNull();
    });
  });

  describe("Multi-step approval tracking", () => {
    const getWorkflowProgress = (etapaAtual: number, totalEtapas: number, status: string) => {
      const percentage = totalEtapas > 0 ? Math.round((etapaAtual / totalEtapas) * 100) : 0;
      return {
        percentage: status === "approved" ? 100 : status === "rejected" ? percentage : percentage,
        isComplete: status === "approved" || status === "rejected",
        currentStep: etapaAtual,
        totalSteps: totalEtapas,
        remaining: Math.max(0, totalEtapas - etapaAtual),
      };
    };

    it("should show 50% for step 1 of 2", () => {
      expect(getWorkflowProgress(1, 2, "pending").percentage).toBe(50);
    });

    it("should show 100% when approved", () => {
      expect(getWorkflowProgress(2, 3, "approved").percentage).toBe(100);
    });

    it("should calculate remaining steps", () => {
      expect(getWorkflowProgress(1, 4, "pending").remaining).toBe(3);
    });

    it("should handle single-step workflow", () => {
      const r = getWorkflowProgress(1, 1, "pending");
      expect(r.percentage).toBe(100);
      expect(r.remaining).toBe(0);
    });
  });
});
