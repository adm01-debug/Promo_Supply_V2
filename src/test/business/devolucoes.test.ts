import { describe, it, expect } from "vitest";

describe("Devoluções — Business Logic", () => {
  describe("Return status transitions", () => {
    const validTransitions: Record<string, string[]> = {
      rascunho: ['solicitada', 'cancelada'],
      solicitada: ['aprovada', 'rejeitada', 'cancelada'],
      aprovada: ['em_transito', 'cancelada'],
      em_transito: ['recebida_fornecedor'],
      recebida_fornecedor: ['credito_emitido', 'troca_enviada', 'finalizada'],
      credito_emitido: ['finalizada'],
      troca_enviada: ['finalizada'],
      rejeitada: [],
      cancelada: [],
      finalizada: [],
    };

    const isValid = (from: string, to: string) => validTransitions[from]?.includes(to) ?? false;

    it("should allow rascunho -> solicitada", () => {
      expect(isValid("rascunho", "solicitada")).toBe(true);
    });

    it("should allow solicitada -> aprovada", () => {
      expect(isValid("solicitada", "aprovada")).toBe(true);
    });

    it("should allow aprovada -> em_transito", () => {
      expect(isValid("aprovada", "em_transito")).toBe(true);
    });

    it("should allow em_transito -> recebida_fornecedor", () => {
      expect(isValid("em_transito", "recebida_fornecedor")).toBe(true);
    });

    it("should allow recebida_fornecedor -> credito_emitido", () => {
      expect(isValid("recebida_fornecedor", "credito_emitido")).toBe(true);
    });

    it("should not allow finalizada -> any", () => {
      expect(isValid("finalizada", "solicitada")).toBe(false);
      expect(isValid("finalizada", "cancelada")).toBe(false);
    });

    it("should not allow cancelada -> any", () => {
      expect(isValid("cancelada", "solicitada")).toBe(false);
    });

    it("should not allow rejeitada -> any", () => {
      expect(isValid("rejeitada", "aprovada")).toBe(false);
    });

    it("should not allow skipping steps", () => {
      expect(isValid("rascunho", "em_transito")).toBe(false);
      expect(isValid("solicitada", "finalizada")).toBe(false);
    });
  });

  describe("Return value calculation", () => {
    const calcReturnValue = (
      itens: { quantidade: number; valor_unitario: number; quantidade_aceita?: number | null }[]
    ) => {
      const valorSolicitado = itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0);
      const valorAceito = itens.reduce((s, i) => s + (i.quantidade_aceita ?? i.quantidade) * i.valor_unitario, 0);
      return { valorSolicitado, valorAceito, diferenca: valorSolicitado - valorAceito };
    };

    it("should calculate total when all accepted", () => {
      const r = calcReturnValue([
        { quantidade: 10, valor_unitario: 50, quantidade_aceita: 10 },
      ]);
      expect(r.valorSolicitado).toBe(500);
      expect(r.valorAceito).toBe(500);
      expect(r.diferenca).toBe(0);
    });

    it("should calculate partial acceptance", () => {
      const r = calcReturnValue([
        { quantidade: 10, valor_unitario: 100, quantidade_aceita: 7 },
      ]);
      expect(r.valorSolicitado).toBe(1000);
      expect(r.valorAceito).toBe(700);
      expect(r.diferenca).toBe(300);
    });

    it("should default to full quantity when quantidade_aceita is null", () => {
      const r = calcReturnValue([
        { quantidade: 5, valor_unitario: 200, quantidade_aceita: null },
      ]);
      expect(r.valorAceito).toBe(1000);
    });

    it("should handle multiple items", () => {
      const r = calcReturnValue([
        { quantidade: 10, valor_unitario: 50, quantidade_aceita: 10 },
        { quantidade: 5, valor_unitario: 100, quantidade_aceita: 3 },
      ]);
      expect(r.valorSolicitado).toBe(1000);
      expect(r.valorAceito).toBe(800);
    });

    it("should handle empty items", () => {
      const r = calcReturnValue([]);
      expect(r.valorSolicitado).toBe(0);
      expect(r.valorAceito).toBe(0);
    });

    it("should handle zero quantity accepted", () => {
      const r = calcReturnValue([
        { quantidade: 10, valor_unitario: 100, quantidade_aceita: 0 },
      ]);
      expect(r.valorAceito).toBe(0);
      expect(r.diferenca).toBe(1000);
    });
  });

  describe("Credit generation from return", () => {
    const generateCredit = (
      devolucao: { fornecedor_id: string; valor_total: number; status: string },
      itensAceitos: { quantidade_aceita: number; valor_unitario: number }[]
    ) => {
      if (devolucao.status !== 'recebida_fornecedor') {
        return { success: false, reason: 'status_invalido' };
      }
      const valorCredito = itensAceitos.reduce((s, i) => s + i.quantidade_aceita * i.valor_unitario, 0);
      if (valorCredito <= 0) return { success: false, reason: 'valor_zero' };
      return {
        success: true,
        credit: {
          fornecedor_id: devolucao.fornecedor_id,
          valor: valorCredito,
          saldo: valorCredito,
          tipo: 'credito_devolucao',
          status: 'ativo',
        },
      };
    };

    it("should generate credit for received return", () => {
      const r = generateCredit(
        { fornecedor_id: 'f1', valor_total: 1000, status: 'recebida_fornecedor' },
        [{ quantidade_aceita: 5, valor_unitario: 100 }]
      );
      expect(r.success).toBe(true);
      expect(r.credit?.valor).toBe(500);
    });

    it("should reject non-received status", () => {
      const r = generateCredit(
        { fornecedor_id: 'f1', valor_total: 1000, status: 'solicitada' },
        [{ quantidade_aceita: 5, valor_unitario: 100 }]
      );
      expect(r.success).toBe(false);
      expect(r.reason).toBe('status_invalido');
    });

    it("should reject zero value credit", () => {
      const r = generateCredit(
        { fornecedor_id: 'f1', valor_total: 1000, status: 'recebida_fornecedor' },
        [{ quantidade_aceita: 0, valor_unitario: 100 }]
      );
      expect(r.success).toBe(false);
      expect(r.reason).toBe('valor_zero');
    });
  });

  describe("Return reason categorization", () => {
    const categorize = (motivo: string) => {
      const map: Record<string, string> = {
        defeito: 'qualidade',
        avariado: 'qualidade',
        errado: 'logistica',
        excesso: 'planejamento',
        vencido: 'qualidade',
        fora_especificacao: 'qualidade',
        atraso: 'logistica',
      };
      return map[motivo] || 'outros';
    };

    it("should categorize defeito as qualidade", () => {
      expect(categorize("defeito")).toBe("qualidade");
    });

    it("should categorize errado as logistica", () => {
      expect(categorize("errado")).toBe("logistica");
    });

    it("should categorize excesso as planejamento", () => {
      expect(categorize("excesso")).toBe("planejamento");
    });

    it("should categorize unknown as outros", () => {
      expect(categorize("desconhecido")).toBe("outros");
    });
  });

  describe("Return rate per supplier", () => {
    const calcReturnRate = (
      totalPedidos: number,
      totalDevolucoes: number
    ) => {
      if (totalPedidos === 0) return { rate: 0, classification: 'sem_dados' };
      const rate = (totalDevolucoes / totalPedidos) * 100;
      let classification: string;
      if (rate <= 2) classification = 'excelente';
      else if (rate <= 5) classification = 'bom';
      else if (rate <= 10) classification = 'atencao';
      else classification = 'critico';
      return { rate: Math.round(rate * 100) / 100, classification };
    };

    it("should classify 1% as excelente", () => {
      expect(calcReturnRate(100, 1).classification).toBe("excelente");
    });

    it("should classify 4% as bom", () => {
      expect(calcReturnRate(100, 4).classification).toBe("bom");
    });

    it("should classify 8% as atencao", () => {
      expect(calcReturnRate(100, 8).classification).toBe("atencao");
    });

    it("should classify 15% as critico", () => {
      expect(calcReturnRate(100, 15).classification).toBe("critico");
    });

    it("should handle zero pedidos", () => {
      expect(calcReturnRate(0, 0).classification).toBe("sem_dados");
    });
  });
});
