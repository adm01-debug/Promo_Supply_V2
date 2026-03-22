import { describe, it, expect } from "vitest";

describe("Multi-Level Approval — Business Logic", () => {
  describe("Value-based rule matching", () => {
    const rules = [
      { nome: 'Auto-aprovação', valor_min: 0, valor_max: 5000, niveis_aprovacao: 0 },
      { nome: 'Gerente', valor_min: 5000.01, valor_max: 50000, niveis_aprovacao: 1 },
      { nome: 'Diretoria', valor_min: 50000.01, valor_max: 500000, niveis_aprovacao: 2 },
      { nome: 'Comitê', valor_min: 500000.01, valor_max: 999999999, niveis_aprovacao: 3 },
    ];

    const findRule = (valor: number) =>
      rules.find(r => valor >= r.valor_min && valor <= r.valor_max) || null;

    it("should auto-approve under R$5k", () => {
      const rule = findRule(3000);
      expect(rule?.nome).toBe("Auto-aprovação");
      expect(rule?.niveis_aprovacao).toBe(0);
    });

    it("should require manager for R$10k", () => {
      const rule = findRule(10000);
      expect(rule?.nome).toBe("Gerente");
      expect(rule?.niveis_aprovacao).toBe(1);
    });

    it("should require director for R$100k", () => {
      const rule = findRule(100000);
      expect(rule?.nome).toBe("Diretoria");
      expect(rule?.niveis_aprovacao).toBe(2);
    });

    it("should require committee for R$1M", () => {
      const rule = findRule(1000000);
      expect(rule?.nome).toBe("Comitê");
      expect(rule?.niveis_aprovacao).toBe(3);
    });

    it("should handle boundary at R$5000", () => {
      const rule = findRule(5000);
      expect(rule?.nome).toBe("Auto-aprovação");
    });

    it("should handle boundary at R$5000.01", () => {
      const rule = findRule(5000.01);
      expect(rule?.nome).toBe("Gerente");
    });
  });

  describe("Delegation validation", () => {
    const isDelegationValid = (
      delegation: { data_inicio: string; data_fim: string; ativo: boolean },
      hoje: string
    ) => {
      if (!delegation.ativo) return false;
      const now = new Date(hoje);
      return now >= new Date(delegation.data_inicio) && now <= new Date(delegation.data_fim);
    };

    it("should accept active delegation within date range", () => {
      expect(isDelegationValid(
        { data_inicio: '2026-03-01', data_fim: '2026-04-01', ativo: true },
        '2026-03-22'
      )).toBe(true);
    });

    it("should reject inactive delegation", () => {
      expect(isDelegationValid(
        { data_inicio: '2026-03-01', data_fim: '2026-04-01', ativo: false },
        '2026-03-22'
      )).toBe(false);
    });

    it("should reject expired delegation", () => {
      expect(isDelegationValid(
        { data_inicio: '2026-01-01', data_fim: '2026-02-01', ativo: true },
        '2026-03-22'
      )).toBe(false);
    });

    it("should reject future delegation", () => {
      expect(isDelegationValid(
        { data_inicio: '2026-04-01', data_fim: '2026-05-01', ativo: true },
        '2026-03-22'
      )).toBe(false);
    });
  });

  describe("Escalation timing", () => {
    const shouldEscalate = (
      step: { status: string; prazo_limite: string | null },
      agora: string
    ) => {
      if (step.status !== 'pending' || !step.prazo_limite) return false;
      return new Date(agora) > new Date(step.prazo_limite);
    };

    it("should escalate expired pending step", () => {
      expect(shouldEscalate(
        { status: 'pending', prazo_limite: '2026-03-21T12:00:00Z' },
        '2026-03-22T12:00:00Z'
      )).toBe(true);
    });

    it("should not escalate step within deadline", () => {
      expect(shouldEscalate(
        { status: 'pending', prazo_limite: '2026-03-23T12:00:00Z' },
        '2026-03-22T12:00:00Z'
      )).toBe(false);
    });

    it("should not escalate approved step", () => {
      expect(shouldEscalate(
        { status: 'approved', prazo_limite: '2026-03-20T12:00:00Z' },
        '2026-03-22T12:00:00Z'
      )).toBe(false);
    });

    it("should not escalate step without deadline", () => {
      expect(shouldEscalate(
        { status: 'pending', prazo_limite: null },
        '2026-03-22T12:00:00Z'
      )).toBe(false);
    });
  });
});
