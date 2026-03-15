import { describe, it, expect } from "vitest";

describe("Approval Workflow — Business Logic", () => {
  describe("Rule matching", () => {
    interface SimpleRule {
      id: string;
      nome: string;
      valor_min: number;
      valor_max: number;
      categoria_id?: string;
      prioridade: number;
      ativo: boolean;
    }

    const findRule = (rules: SimpleRule[], valor: number, categoriaId?: string): SimpleRule | null => {
      return rules
        .filter(r => r.ativo && valor >= r.valor_min && valor <= r.valor_max
          && (!r.categoria_id || r.categoria_id === categoriaId))
        .sort((a, b) => {
          if (a.categoria_id && !b.categoria_id) return -1;
          if (!a.categoria_id && b.categoria_id) return 1;
          return b.prioridade - a.prioridade;
        })[0] || null;
    };

    const rules: SimpleRule[] = [
      { id: "1", nome: "Low", valor_min: 0, valor_max: 1000, prioridade: 1, ativo: true },
      { id: "2", nome: "Medium", valor_min: 1001, valor_max: 10000, prioridade: 2, ativo: true },
      { id: "3", nome: "High", valor_min: 10001, valor_max: 100000, prioridade: 3, ativo: true },
      { id: "4", nome: "Cat-specific", valor_min: 0, valor_max: 5000, prioridade: 1, ativo: true, categoria_id: "cat-1" },
      { id: "5", nome: "Inactive", valor_min: 0, valor_max: 99999, prioridade: 99, ativo: false },
    ];

    it("should match low value rule", () => {
      expect(findRule(rules, 500)?.nome).toBe("Low");
    });

    it("should match medium value rule", () => {
      expect(findRule(rules, 5000)?.nome).toBe("Medium");
    });

    it("should match high value rule", () => {
      expect(findRule(rules, 50000)?.nome).toBe("High");
    });

    it("should prefer category-specific rule", () => {
      expect(findRule(rules, 500, "cat-1")?.nome).toBe("Cat-specific");
    });

    it("should fall back to generic when category doesnt match", () => {
      expect(findRule(rules, 500, "cat-999")?.nome).toBe("Low");
    });

    it("should ignore inactive rules", () => {
      expect(findRule(rules, 50000)?.nome).not.toBe("Inactive");
    });

    it("should return null for out-of-range values", () => {
      expect(findRule(rules, 999999)).toBeNull();
    });

    it("should handle exact boundary values", () => {
      expect(findRule(rules, 0)?.nome).toBe("Low");
      expect(findRule(rules, 1000)?.nome).toBe("Low");
      expect(findRule(rules, 1001)?.nome).toBe("Medium");
    });
  });

  describe("Delegation check", () => {
    interface SimpleDelegation {
      delegante_id: string;
      delegado_id: string;
      data_inicio: string;
      data_fim: string;
      ativo: boolean;
      valor_maximo?: number;
    }

    const getEffectiveApprover = (
      approverId: string,
      delegations: SimpleDelegation[],
      valor?: number
    ): string => {
      const now = new Date().toISOString();
      const active = delegations.find(
        d => d.delegante_id === approverId
          && d.ativo
          && now >= d.data_inicio
          && now <= d.data_fim
          && (!d.valor_maximo || !valor || valor <= d.valor_maximo)
      );
      return active ? active.delegado_id : approverId;
    };

    it("should return original approver when no delegation", () => {
      expect(getEffectiveApprover("user-1", [])).toBe("user-1");
    });

    it("should return delegate when active delegation exists", () => {
      const delegations: SimpleDelegation[] = [{
        delegante_id: "user-1",
        delegado_id: "user-2",
        data_inicio: "2020-01-01",
        data_fim: "2030-12-31",
        ativo: true,
      }];
      expect(getEffectiveApprover("user-1", delegations)).toBe("user-2");
    });

    it("should return original when delegation expired", () => {
      const delegations: SimpleDelegation[] = [{
        delegante_id: "user-1",
        delegado_id: "user-2",
        data_inicio: "2020-01-01",
        data_fim: "2020-12-31",
        ativo: true,
      }];
      expect(getEffectiveApprover("user-1", delegations)).toBe("user-1");
    });

    it("should return original when delegation inactive", () => {
      const delegations: SimpleDelegation[] = [{
        delegante_id: "user-1",
        delegado_id: "user-2",
        data_inicio: "2020-01-01",
        data_fim: "2030-12-31",
        ativo: false,
      }];
      expect(getEffectiveApprover("user-1", delegations)).toBe("user-1");
    });

    it("should respect valor_maximo constraint", () => {
      const delegations: SimpleDelegation[] = [{
        delegante_id: "user-1",
        delegado_id: "user-2",
        data_inicio: "2020-01-01",
        data_fim: "2030-12-31",
        ativo: true,
        valor_maximo: 5000,
      }];
      expect(getEffectiveApprover("user-1", delegations, 3000)).toBe("user-2");
      expect(getEffectiveApprover("user-1", delegations, 10000)).toBe("user-1");
    });
  });

  describe("Escalation detection", () => {
    it("should detect workflows past deadline", () => {
      const workflows = [
        { id: "1", status: "pending", prazo_limite: "2020-01-01T00:00:00Z", escalado_em: null },
        { id: "2", status: "pending", prazo_limite: "2030-01-01T00:00:00Z", escalado_em: null },
        { id: "3", status: "approved", prazo_limite: "2020-01-01T00:00:00Z", escalado_em: null },
      ];

      const now = new Date();
      const needsEscalation = workflows.filter(
        w => w.status === "pending" && w.prazo_limite && new Date(w.prazo_limite) < now && !w.escalado_em
      );
      expect(needsEscalation).toHaveLength(1);
      expect(needsEscalation[0].id).toBe("1");
    });
  });

  describe("Sequential number generation", () => {
    const generateNumber = (prefix: string, lastNumber: number): string => {
      return `${prefix}-${String(lastNumber + 1).padStart(6, "0")}`;
    };

    it("should generate first number", () => {
      expect(generateNumber("SOL", 0)).toBe("SOL-000001");
    });

    it("should increment correctly", () => {
      expect(generateNumber("PED", 461)).toBe("PED-000462");
    });

    it("should handle large numbers", () => {
      expect(generateNumber("COT", 999999)).toBe("COT-1000000");
    });

    it("should work with different prefixes", () => {
      expect(generateNumber("PAG", 10)).toBe("PAG-000011");
      expect(generateNumber("CTR", 100)).toBe("CTR-000101");
    });
  });
});
