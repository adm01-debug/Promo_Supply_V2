import { describe, it, expect } from "vitest";

describe("Créditos Fornecedor — Business Logic", () => {
  describe("Credit lifecycle", () => {
    const validTransitions: Record<string, string[]> = {
      ativo: ['utilizado', 'parcial', 'expirado', 'cancelado'],
      parcial: ['utilizado', 'expirado'],
      utilizado: [],
      expirado: [],
      cancelado: [],
    };

    const isValid = (from: string, to: string) => validTransitions[from]?.includes(to) ?? false;

    it("should allow ativo -> utilizado", () => {
      expect(isValid("ativo", "utilizado")).toBe(true);
    });

    it("should allow ativo -> parcial", () => {
      expect(isValid("ativo", "parcial")).toBe(true);
    });

    it("should allow parcial -> utilizado", () => {
      expect(isValid("parcial", "utilizado")).toBe(true);
    });

    it("should not allow utilizado -> any", () => {
      expect(isValid("utilizado", "ativo")).toBe(false);
    });

    it("should not allow expirado -> any", () => {
      expect(isValid("expirado", "ativo")).toBe(false);
    });
  });

  describe("Credit balance management", () => {
    const useCredit = (credit: { valor: number; valor_utilizado: number; saldo: number }, amount: number) => {
      if (amount <= 0) return { success: false, reason: 'valor_invalido' };
      if (amount > credit.saldo) return { success: false, reason: 'saldo_insuficiente' };
      const newValorUtilizado = credit.valor_utilizado + amount;
      const newSaldo = credit.valor - newValorUtilizado;
      const isFullyUsed = Math.abs(newSaldo) < 0.01;
      return {
        success: true,
        valor_utilizado: newValorUtilizado,
        saldo: newSaldo,
        status: isFullyUsed ? 'utilizado' : 'parcial',
      };
    };

    it("should fully use credit", () => {
      const r = useCredit({ valor: 1000, valor_utilizado: 0, saldo: 1000 }, 1000);
      expect(r.success).toBe(true);
      expect(r.status).toBe("utilizado");
      expect(r.saldo).toBe(0);
    });

    it("should partially use credit", () => {
      const r = useCredit({ valor: 1000, valor_utilizado: 0, saldo: 1000 }, 300);
      expect(r.success).toBe(true);
      expect(r.status).toBe("parcial");
      expect(r.saldo).toBe(700);
    });

    it("should reject amount exceeding saldo", () => {
      const r = useCredit({ valor: 1000, valor_utilizado: 500, saldo: 500 }, 600);
      expect(r.success).toBe(false);
      expect(r.reason).toBe("saldo_insuficiente");
    });

    it("should reject zero amount", () => {
      const r = useCredit({ valor: 1000, valor_utilizado: 0, saldo: 1000 }, 0);
      expect(r.success).toBe(false);
    });

    it("should reject negative amount", () => {
      const r = useCredit({ valor: 1000, valor_utilizado: 0, saldo: 1000 }, -100);
      expect(r.success).toBe(false);
    });

    it("should handle floating point precision", () => {
      const r = useCredit({ valor: 99.99, valor_utilizado: 0, saldo: 99.99 }, 99.99);
      expect(r.success).toBe(true);
      expect(r.status).toBe("utilizado");
    });
  });

  describe("Credit expiry check", () => {
    const isExpired = (dataValidade: string | null, hoje: string) => {
      if (!dataValidade) return false;
      return new Date(dataValidade) < new Date(hoje);
    };

    it("should detect expired credit", () => {
      expect(isExpired("2026-01-01", "2026-03-22")).toBe(true);
    });

    it("should not flag future credit", () => {
      expect(isExpired("2026-12-31", "2026-03-22")).toBe(false);
    });

    it("should not flag null validade", () => {
      expect(isExpired(null, "2026-03-22")).toBe(false);
    });
  });

  describe("Available credits for supplier", () => {
    const getAvailableCredits = (
      creditos: { fornecedor_id: string; saldo: number; status: string; data_validade: string | null }[],
      fornecedorId: string,
      hoje: string
    ) => {
      return creditos.filter(c =>
        c.fornecedor_id === fornecedorId &&
        c.status === 'ativo' &&
        c.saldo > 0 &&
        (!c.data_validade || new Date(c.data_validade) >= new Date(hoje))
      );
    };

    it("should filter by fornecedor", () => {
      const creditos = [
        { fornecedor_id: 'f1', saldo: 100, status: 'ativo', data_validade: null },
        { fornecedor_id: 'f2', saldo: 200, status: 'ativo', data_validade: null },
      ];
      expect(getAvailableCredits(creditos, 'f1', '2026-03-22').length).toBe(1);
    });

    it("should exclude expired credits", () => {
      const creditos = [
        { fornecedor_id: 'f1', saldo: 100, status: 'ativo', data_validade: '2026-01-01' },
      ];
      expect(getAvailableCredits(creditos, 'f1', '2026-03-22').length).toBe(0);
    });

    it("should exclude used credits", () => {
      const creditos = [
        { fornecedor_id: 'f1', saldo: 0, status: 'utilizado', data_validade: null },
      ];
      expect(getAvailableCredits(creditos, 'f1', '2026-03-22').length).toBe(0);
    });

    it("should include credits without expiry", () => {
      const creditos = [
        { fornecedor_id: 'f1', saldo: 500, status: 'ativo', data_validade: null },
      ];
      expect(getAvailableCredits(creditos, 'f1', '2026-03-22').length).toBe(1);
    });
  });
});
