import { describe, it, expect } from "vitest";

describe("Fiscal Reconciliation — Business Logic", () => {
  describe("NF-e chave validation", () => {
    const validateChave = (chave: string | null) => {
      if (!chave) return { valid: false, reason: 'empty' };
      const clean = chave.replace(/\s/g, '');
      if (clean.length !== 44) return { valid: false, reason: 'length' };
      if (!/^\d+$/.test(clean)) return { valid: false, reason: 'format' };
      return { valid: true, uf: clean.substring(0, 2), cnpj: clean.substring(6, 20) };
    };

    it("should validate correct 44-digit key", () => {
      const r = validateChave("1".repeat(44));
      expect(r.valid).toBe(true);
    });

    it("should reject short key", () => {
      const r = validateChave("123");
      expect(r.valid).toBe(false);
      expect(r.reason).toBe("length");
    });

    it("should reject null", () => {
      expect(validateChave(null).valid).toBe(false);
    });

    it("should reject non-numeric", () => {
      const r = validateChave("a".repeat(44));
      expect(r.valid).toBe(false);
      expect(r.reason).toBe("format");
    });

    it("should extract UF from chave", () => {
      const chave = "35" + "0".repeat(42);
      const r = validateChave(chave);
      expect(r.uf).toBe("35");
    });
  });

  describe("Value reconciliation", () => {
    const reconcile = (
      pedidoValor: number | null,
      nfValor: number | null,
      pagamentoValor: number,
      tolerancePercent: number = 1
    ) => {
      const valores = [pedidoValor, nfValor, pagamentoValor].filter((v): v is number => v !== null);
      if (valores.length < 2) return { status: 'incompleto', divergences: [] };

      const divergences: { pair: string; diff: number; percentDiff: number }[] = [];

      if (pedidoValor !== null) {
        const diff = Math.abs(pedidoValor - pagamentoValor);
        const pct = (diff / pedidoValor) * 100;
        if (pct > tolerancePercent) divergences.push({ pair: 'PO-PAG', diff, percentDiff: pct });
      }
      if (nfValor !== null) {
        const diff = Math.abs(nfValor - pagamentoValor);
        const pct = nfValor > 0 ? (diff / nfValor) * 100 : 0;
        if (pct > tolerancePercent) divergences.push({ pair: 'NF-PAG', diff, percentDiff: pct });
      }
      if (pedidoValor !== null && nfValor !== null) {
        const diff = Math.abs(pedidoValor - nfValor);
        const pct = pedidoValor > 0 ? (diff / pedidoValor) * 100 : 0;
        if (pct > tolerancePercent) divergences.push({ pair: 'PO-NF', diff, percentDiff: pct });
      }

      return {
        status: divergences.length === 0 ? 'reconciliado' : 'divergente',
        divergences,
      };
    };

    it("should reconcile matching values", () => {
      const r = reconcile(1000, 1000, 1000);
      expect(r.status).toBe("reconciliado");
    });

    it("should detect NF-PAG divergence", () => {
      const r = reconcile(1000, 1050, 1000);
      expect(r.status).toBe("divergente");
      expect(r.divergences.some(d => d.pair === 'NF-PAG')).toBe(true);
    });

    it("should accept within tolerance", () => {
      const r = reconcile(1000, 1005, 1000, 1);
      expect(r.status).toBe("reconciliado");
    });

    it("should return incompleto with only payment", () => {
      const r = reconcile(null, null, 1000);
      expect(r.status).toBe("incompleto");
    });

    it("should work with PO + Payment only", () => {
      const r = reconcile(1000, null, 1000);
      expect(r.status).toBe("reconciliado");
    });

    it("should detect large divergence", () => {
      const r = reconcile(1000, 500, 1000);
      expect(r.status).toBe("divergente");
      expect(r.divergences.length).toBeGreaterThan(0);
    });
  });
});
