import { describe, it, expect } from "vitest";

describe("Pagamentos — Business Logic", () => {
  describe("Payment status transitions", () => {
    const validTransitions: Record<string, string[]> = {
      pendente: ["aprovado", "cancelado", "atrasado"],
      aprovado: ["agendado", "pago", "cancelado", "atrasado"],
      agendado: ["pago", "cancelado", "atrasado"],
      pago: ["parcial"],
      parcial: ["pago"],
      cancelado: [],
      atrasado: ["pago", "cancelado", "aprovado"],
    };

    const isValid = (from: string, to: string) => validTransitions[from]?.includes(to) ?? false;

    it("should allow pendente -> aprovado", () => {
      expect(isValid("pendente", "aprovado")).toBe(true);
    });

    it("should allow aprovado -> pago (direct payment)", () => {
      expect(isValid("aprovado", "pago")).toBe(true);
    });

    it("should allow partial -> pago (complete)", () => {
      expect(isValid("parcial", "pago")).toBe(true);
    });

    it("should not allow cancelado -> any", () => {
      expect(isValid("cancelado", "pago")).toBe(false);
      expect(isValid("cancelado", "pendente")).toBe(false);
    });

    it("should not allow pago -> pendente", () => {
      expect(isValid("pago", "pendente")).toBe(false);
    });

    it("should allow atrasado -> pago", () => {
      expect(isValid("atrasado", "pago")).toBe(true);
    });
  });

  describe("Overdue detection", () => {
    const isOverdue = (dataVencimento: string, status: string, now = new Date()) => {
      if (["pago", "cancelado"].includes(status)) return false;
      return new Date(dataVencimento) < now;
    };

    it("should detect overdue pending payment", () => {
      expect(isOverdue("2020-01-01", "pendente")).toBe(true);
    });

    it("should not flag future payment as overdue", () => {
      expect(isOverdue("2030-12-31", "pendente")).toBe(false);
    });

    it("should not flag paid as overdue even if past due", () => {
      expect(isOverdue("2020-01-01", "pago")).toBe(false);
    });

    it("should not flag cancelled as overdue", () => {
      expect(isOverdue("2020-01-01", "cancelado")).toBe(false);
    });
  });

  describe("Partial payment tracking", () => {
    const calcRemaining = (valor: number, valorPago: number) => ({
      remaining: valor - valorPago,
      percentage: valor > 0 ? Math.round((valorPago / valor) * 100) : 0,
      isComplete: Math.abs(valor - valorPago) < 0.01,
    });

    it("should calculate remaining for partial payment", () => {
      const result = calcRemaining(10000, 6000);
      expect(result.remaining).toBe(4000);
      expect(result.percentage).toBe(60);
      expect(result.isComplete).toBe(false);
    });

    it("should detect complete payment", () => {
      const result = calcRemaining(5000, 5000);
      expect(result.isComplete).toBe(true);
      expect(result.percentage).toBe(100);
    });

    it("should handle overpayment", () => {
      const result = calcRemaining(1000, 1200);
      expect(result.remaining).toBe(-200);
    });

    it("should handle zero valor", () => {
      const result = calcRemaining(0, 0);
      expect(result.percentage).toBe(0);
      expect(result.isComplete).toBe(true);
    });

    it("should handle floating point precision", () => {
      const result = calcRemaining(99.99, 99.99);
      expect(result.isComplete).toBe(true);
    });
  });

  describe("Nota Fiscal validation", () => {
    const validateNF = (numero: string | null, chave: string | null) => ({
      hasNumero: !!numero && numero.trim().length > 0,
      hasChave: !!chave && chave.trim().length === 44,
      isComplete: !!numero && !!chave && chave.trim().length === 44,
    });

    it("should validate complete NF data", () => {
      const result = validateNF("12345", "1".repeat(44));
      expect(result.isComplete).toBe(true);
    });

    it("should detect missing chave", () => {
      const result = validateNF("12345", null);
      expect(result.hasNumero).toBe(true);
      expect(result.hasChave).toBe(false);
      expect(result.isComplete).toBe(false);
    });

    it("should detect invalid chave length", () => {
      const result = validateNF("12345", "123");
      expect(result.hasChave).toBe(false);
    });

    it("should handle null numero", () => {
      const result = validateNF(null, "1".repeat(44));
      expect(result.hasNumero).toBe(false);
      expect(result.isComplete).toBe(false);
    });

    it("should handle empty strings", () => {
      const result = validateNF("", "");
      expect(result.hasNumero).toBe(false);
      expect(result.hasChave).toBe(false);
    });
  });

  describe("Cash flow projection", () => {
    const projectCashFlow = (
      pagamentos: { data_vencimento: string; valor: number; status: string }[],
      startDate: string,
      endDate: string
    ) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const pending = pagamentos.filter(p => 
        !["pago", "cancelado"].includes(p.status) &&
        new Date(p.data_vencimento) >= start &&
        new Date(p.data_vencimento) <= end
      );

      return {
        totalProjected: pending.reduce((sum, p) => sum + p.valor, 0),
        count: pending.length,
      };
    };

    it("should sum pending payments in range", () => {
      const pagamentos = [
        { data_vencimento: "2026-03-20", valor: 5000, status: "pendente" },
        { data_vencimento: "2026-03-25", valor: 3000, status: "aprovado" },
        { data_vencimento: "2026-04-10", valor: 2000, status: "pendente" },
      ];
      const result = projectCashFlow(pagamentos, "2026-03-01", "2026-03-31");
      expect(result.totalProjected).toBe(8000);
      expect(result.count).toBe(2);
    });

    it("should exclude paid and cancelled", () => {
      const pagamentos = [
        { data_vencimento: "2026-03-20", valor: 5000, status: "pago" },
        { data_vencimento: "2026-03-25", valor: 3000, status: "cancelado" },
      ];
      const result = projectCashFlow(pagamentos, "2026-03-01", "2026-03-31");
      expect(result.totalProjected).toBe(0);
      expect(result.count).toBe(0);
    });

    it("should handle empty array", () => {
      const result = projectCashFlow([], "2026-03-01", "2026-03-31");
      expect(result.totalProjected).toBe(0);
    });
  });
});
