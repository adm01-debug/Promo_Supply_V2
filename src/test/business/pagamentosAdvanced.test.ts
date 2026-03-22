import { describe, it, expect } from "vitest";

// ===== PAGAMENTOS ADVANCED KPIs BUSINESS LOGIC =====
describe("Pagamentos Advanced KPIs — Business Logic", () => {
  const makePagamento = (overrides: Partial<{
    status: string; valor: number; valor_pago: number;
    data_vencimento: string; data_pagamento: string | null;
    fornecedor: { razao_social: string } | null;
    numero_nf: string | null; pedido_id: string | null;
  }> = {}) => ({
    id: crypto.randomUUID(),
    numero: 'PAG-001',
    status: 'pendente',
    valor: 1000,
    valor_pago: 0,
    data_vencimento: '2026-04-15',
    data_pagamento: null,
    fornecedor: { razao_social: 'Fornecedor A' },
    numero_nf: null,
    pedido_id: null,
    ...overrides,
  });

  describe("DPO (Days Payable Outstanding)", () => {
    const calcDPO = (pagamentos: { data_vencimento: string; data_pagamento: string | null; status: string }[]) => {
      const pagos = pagamentos.filter(p => p.status === 'pago' && p.data_pagamento);
      if (pagos.length === 0) return 0;
      const total = pagos.reduce((sum, p) => {
        const venc = new Date(p.data_vencimento);
        const pgto = new Date(p.data_pagamento!);
        return sum + Math.round((pgto.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      return Math.round(total / pagos.length);
    };

    it("should return 0 for no paid payments", () => {
      expect(calcDPO([makePagamento()])).toBe(0);
    });

    it("should calculate positive DPO for late payments", () => {
      const p = makePagamento({ status: 'pago', data_vencimento: '2026-03-01', data_pagamento: '2026-03-11' });
      expect(calcDPO([p])).toBe(10);
    });

    it("should calculate negative DPO for early payments", () => {
      const p = makePagamento({ status: 'pago', data_vencimento: '2026-03-15', data_pagamento: '2026-03-10' });
      expect(calcDPO([p])).toBe(-5);
    });

    it("should average DPO across multiple payments", () => {
      const payments = [
        makePagamento({ status: 'pago', data_vencimento: '2026-03-01', data_pagamento: '2026-03-11' }), // +10
        makePagamento({ status: 'pago', data_vencimento: '2026-03-01', data_pagamento: '2026-03-01' }), // 0
      ];
      expect(calcDPO(payments)).toBe(5);
    });

    it("should ignore cancelled payments", () => {
      const payments = [
        makePagamento({ status: 'pago', data_vencimento: '2026-03-01', data_pagamento: '2026-03-11' }),
        makePagamento({ status: 'cancelado', data_vencimento: '2026-03-01', data_pagamento: null }),
      ];
      expect(calcDPO(payments)).toBe(10);
    });
  });

  describe("On-Time Rate", () => {
    const calcOnTimeRate = (pagamentos: { data_vencimento: string; data_pagamento: string | null; status: string }[]) => {
      const pagos = pagamentos.filter(p => p.status === 'pago' && p.data_pagamento);
      if (pagos.length === 0) return 100;
      const onTime = pagos.filter(p => p.data_pagamento! <= p.data_vencimento).length;
      return Math.round((onTime / pagos.length) * 100);
    };

    it("should return 100% for no payments", () => {
      expect(calcOnTimeRate([])).toBe(100);
    });

    it("should return 100% when all on time", () => {
      const payments = [
        makePagamento({ status: 'pago', data_vencimento: '2026-03-15', data_pagamento: '2026-03-10' }),
        makePagamento({ status: 'pago', data_vencimento: '2026-03-20', data_pagamento: '2026-03-20' }),
      ];
      expect(calcOnTimeRate(payments)).toBe(100);
    });

    it("should return 50% when half late", () => {
      const payments = [
        makePagamento({ status: 'pago', data_vencimento: '2026-03-15', data_pagamento: '2026-03-10' }),
        makePagamento({ status: 'pago', data_vencimento: '2026-03-15', data_pagamento: '2026-03-20' }),
      ];
      expect(calcOnTimeRate(payments)).toBe(50);
    });

    it("should return 0% when all late", () => {
      const payments = [
        makePagamento({ status: 'pago', data_vencimento: '2026-03-01', data_pagamento: '2026-03-15' }),
      ];
      expect(calcOnTimeRate(payments)).toBe(0);
    });
  });

  describe("Aging Report Buckets", () => {
    const calcAging = (pagamentos: { data_vencimento: string; valor: number; valor_pago: number; status: string }[], hoje: Date) => {
      const vencidos = pagamentos.filter(p =>
        !['pago', 'cancelado'].includes(p.status) && new Date(p.data_vencimento) < hoje
      );
      const getDays = (p: { data_vencimento: string }) =>
        Math.abs(Math.round((hoje.getTime() - new Date(p.data_vencimento).getTime()) / (1000 * 60 * 60 * 24)));
      const saldo = (p: { valor: number; valor_pago: number }) => p.valor - p.valor_pago;

      return {
        d0_7: vencidos.filter(p => getDays(p) <= 7).reduce((s, p) => s + saldo(p), 0),
        d8_15: vencidos.filter(p => { const d = getDays(p); return d > 7 && d <= 15; }).reduce((s, p) => s + saldo(p), 0),
        d16_30: vencidos.filter(p => { const d = getDays(p); return d > 15 && d <= 30; }).reduce((s, p) => s + saldo(p), 0),
        d31_60: vencidos.filter(p => { const d = getDays(p); return d > 30 && d <= 60; }).reduce((s, p) => s + saldo(p), 0),
        d60plus: vencidos.filter(p => getDays(p) > 60).reduce((s, p) => s + saldo(p), 0),
      };
    };

    it("should categorize 5-day overdue as 0-7d", () => {
      const hoje = new Date('2026-03-22');
      const p = makePagamento({ status: 'pendente', data_vencimento: '2026-03-17', valor: 1000, valor_pago: 0 });
      const aging = calcAging([p], hoje);
      expect(aging.d0_7).toBe(1000);
      expect(aging.d8_15).toBe(0);
    });

    it("should categorize 10-day overdue as 8-15d", () => {
      const hoje = new Date('2026-03-22');
      const p = makePagamento({ status: 'pendente', data_vencimento: '2026-03-12', valor: 2000, valor_pago: 500 });
      const aging = calcAging([p], hoje);
      expect(aging.d8_15).toBe(1500);
    });

    it("should categorize 45-day overdue as 31-60d", () => {
      const hoje = new Date('2026-03-22');
      const p = makePagamento({ status: 'pendente', data_vencimento: '2026-02-05', valor: 5000, valor_pago: 0 });
      const aging = calcAging([p], hoje);
      expect(aging.d31_60).toBe(5000);
    });

    it("should categorize 90-day overdue as 60d+", () => {
      const hoje = new Date('2026-03-22');
      const p = makePagamento({ status: 'pendente', data_vencimento: '2025-12-22', valor: 3000, valor_pago: 0 });
      const aging = calcAging([p], hoje);
      expect(aging.d60plus).toBe(3000);
    });

    it("should exclude paid from aging", () => {
      const hoje = new Date('2026-03-22');
      const p = makePagamento({ status: 'pago', data_vencimento: '2026-01-01', valor: 5000, valor_pago: 5000 });
      const aging = calcAging([p], hoje);
      expect(aging.d0_7 + aging.d8_15 + aging.d16_30 + aging.d31_60 + aging.d60plus).toBe(0);
    });

    it("should handle empty array", () => {
      const aging = calcAging([], new Date());
      expect(aging.d0_7).toBe(0);
    });
  });

  describe("Forecast 30/60/90 dias", () => {
    const calcForecast = (
      pagamentos: { data_vencimento: string; valor: number; valor_pago: number; status: string }[],
      hoje: Date
    ) => {
      const pendentes = pagamentos.filter(p => !['pago', 'cancelado'].includes(p.status));
      const getDays = (p: { data_vencimento: string }) =>
        Math.round((new Date(p.data_vencimento).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      const saldo = (p: { valor: number; valor_pago: number }) => p.valor - p.valor_pago;

      return {
        f30: pendentes.filter(p => { const d = getDays(p); return d >= 0 && d <= 30; }).reduce((s, p) => s + saldo(p), 0),
        f60: pendentes.filter(p => { const d = getDays(p); return d > 30 && d <= 60; }).reduce((s, p) => s + saldo(p), 0),
        f90: pendentes.filter(p => { const d = getDays(p); return d > 60 && d <= 90; }).reduce((s, p) => s + saldo(p), 0),
      };
    };

    it("should project payment in 15d into 30-day forecast", () => {
      const hoje = new Date('2026-03-22');
      const p = makePagamento({ status: 'pendente', data_vencimento: '2026-04-06', valor: 5000, valor_pago: 0 });
      const f = calcForecast([p], hoje);
      expect(f.f30).toBe(5000);
      expect(f.f60).toBe(0);
    });

    it("should project payment in 45d into 60-day forecast", () => {
      const hoje = new Date('2026-03-22');
      const p = makePagamento({ status: 'pendente', data_vencimento: '2026-05-06', valor: 3000, valor_pago: 0 });
      const f = calcForecast([p], hoje);
      expect(f.f30).toBe(0);
      expect(f.f60).toBe(3000);
    });

    it("should subtract valor_pago from forecast", () => {
      const hoje = new Date('2026-03-22');
      const p = makePagamento({ status: 'parcial', data_vencimento: '2026-04-01', valor: 10000, valor_pago: 6000 });
      const f = calcForecast([p], hoje);
      expect(f.f30).toBe(4000);
    });

    it("should exclude cancelled from forecast", () => {
      const hoje = new Date('2026-03-22');
      const p = makePagamento({ status: 'cancelado', data_vencimento: '2026-04-01', valor: 10000, valor_pago: 0 });
      const f = calcForecast([p], hoje);
      expect(f.f30).toBe(0);
    });
  });

  describe("Supplier Concentration Risk", () => {
    const calcConcentracao = (pagamentos: { fornecedor: { razao_social: string } | null; valor: number; status: string }[]) => {
      const ativos = pagamentos.filter(p => p.status !== 'cancelado');
      const map = new Map<string, number>();
      ativos.forEach(p => {
        const nome = p.fornecedor?.razao_social || 'Outros';
        map.set(nome, (map.get(nome) || 0) + p.valor);
      });
      const total = ativos.reduce((s, p) => s + p.valor, 0);
      const entries = Array.from(map.entries()).map(([nome, valor]) => ({
        nome, valor, percent: total > 0 ? (valor / total) * 100 : 0,
      }));
      const maxPercent = Math.max(...entries.map(e => e.percent), 0);
      return { entries, maxPercent, isConcentrated: maxPercent > 50 };
    };

    it("should detect high concentration (>50%) as risk", () => {
      const pagamentos = [
        makePagamento({ valor: 8000, fornecedor: { razao_social: 'Fornecedor A' } }),
        makePagamento({ valor: 2000, fornecedor: { razao_social: 'Fornecedor B' } }),
      ];
      const result = calcConcentracao(pagamentos);
      expect(result.isConcentrated).toBe(true);
      expect(result.maxPercent).toBe(80);
    });

    it("should not flag even distribution as risk", () => {
      const pagamentos = [
        makePagamento({ valor: 3000, fornecedor: { razao_social: 'A' } }),
        makePagamento({ valor: 3000, fornecedor: { razao_social: 'B' } }),
        makePagamento({ valor: 3000, fornecedor: { razao_social: 'C' } }),
      ];
      const result = calcConcentracao(pagamentos);
      expect(result.isConcentrated).toBe(false);
    });

    it("should exclude cancelled from concentration", () => {
      const pagamentos = [
        makePagamento({ valor: 10000, fornecedor: { razao_social: 'A' }, status: 'cancelado' }),
        makePagamento({ valor: 2000, fornecedor: { razao_social: 'B' }, status: 'pendente' }),
      ];
      const result = calcConcentracao(pagamentos);
      expect(result.entries.length).toBe(1);
    });

    it("should handle empty array", () => {
      const result = calcConcentracao([]);
      expect(result.isConcentrated).toBe(false);
      expect(result.maxPercent).toBe(0);
    });
  });
});

// ===== THREE-WAY MATCH LOGIC =====
describe("Three-Way Match — Reconciliation Logic", () => {
  const calcMatch = (
    pedidoValor: number | null,
    nfValor: number | null,
    pagamentoValor: number
  ) => {
    const valores = [pedidoValor, nfValor, pagamentoValor].filter((v): v is number => v !== null);
    const allMatch = valores.length > 1 && valores.every(v => Math.abs(v - valores[0]) < 0.01);
    const hasDivergence = valores.length > 1 && !allMatch;
    const matchCount = valores.length;
    const maxDivergence = valores.length > 1
      ? Math.max(...valores) - Math.min(...valores)
      : 0;
    return { allMatch, hasDivergence, matchCount, maxDivergence };
  };

  it("should match when all 3 values are equal", () => {
    const r = calcMatch(1000, 1000, 1000);
    expect(r.allMatch).toBe(true);
    expect(r.hasDivergence).toBe(false);
    expect(r.matchCount).toBe(3);
  });

  it("should detect divergence when NF differs", () => {
    const r = calcMatch(1000, 1050, 1000);
    expect(r.hasDivergence).toBe(true);
    expect(r.maxDivergence).toBe(50);
  });

  it("should work with only payment (no PO, no NF)", () => {
    const r = calcMatch(null, null, 1000);
    expect(r.matchCount).toBe(1);
    expect(r.hasDivergence).toBe(false);
  });

  it("should handle PO + Payment without NF", () => {
    const r = calcMatch(1000, null, 1000);
    expect(r.allMatch).toBe(true);
    expect(r.matchCount).toBe(2);
  });

  it("should handle floating point precision", () => {
    const r = calcMatch(99.99, 99.99, 99.99);
    expect(r.allMatch).toBe(true);
  });

  it("should detect large divergence", () => {
    const r = calcMatch(1000, 500, 1000);
    expect(r.hasDivergence).toBe(true);
    expect(r.maxDivergence).toBe(500);
  });
});

// ===== SUPPLIER CREDITS APPLICATION =====
describe("Supplier Credits — Application Logic", () => {
  const applyCredits = (
    saldoRestante: number,
    creditos: { id: string; saldo: number }[]
  ) => {
    let remaining = saldoRestante;
    const applications: { creditId: string; valorAplicado: number }[] = [];
    for (const c of creditos.sort((a, b) => a.saldo - b.saldo)) {
      if (remaining <= 0) break;
      const aplicar = Math.min(c.saldo, remaining);
      applications.push({ creditId: c.id, valorAplicado: aplicar });
      remaining -= aplicar;
    }
    return { applications, totalAplicado: saldoRestante - remaining, saldoFinal: remaining };
  };

  it("should fully cover payment with sufficient credits", () => {
    const r = applyCredits(1000, [{ id: 'c1', saldo: 1500 }]);
    expect(r.saldoFinal).toBe(0);
    expect(r.totalAplicado).toBe(1000);
    expect(r.applications[0].valorAplicado).toBe(1000);
  });

  it("should partially cover with insufficient credits", () => {
    const r = applyCredits(1000, [{ id: 'c1', saldo: 300 }]);
    expect(r.saldoFinal).toBe(700);
    expect(r.totalAplicado).toBe(300);
  });

  it("should combine multiple credits", () => {
    const r = applyCredits(1000, [
      { id: 'c1', saldo: 400 },
      { id: 'c2', saldo: 800 },
    ]);
    expect(r.saldoFinal).toBe(0);
    expect(r.totalAplicado).toBe(1000);
    expect(r.applications.length).toBe(2);
  });

  it("should handle zero saldo", () => {
    const r = applyCredits(0, [{ id: 'c1', saldo: 500 }]);
    expect(r.saldoFinal).toBe(0);
    expect(r.applications.length).toBe(0);
  });

  it("should handle no credits available", () => {
    const r = applyCredits(1000, []);
    expect(r.saldoFinal).toBe(1000);
    expect(r.totalAplicado).toBe(0);
  });

  it("should handle credits with zero saldo", () => {
    const r = applyCredits(1000, [{ id: 'c1', saldo: 0 }]);
    expect(r.saldoFinal).toBe(1000);
  });
});

// ===== PAYMENT SCHEDULING LOGIC =====
describe("Payment Scheduling — Business Logic", () => {
  const validateScheduleDate = (dateStr: string, hoje: string) => {
    const date = new Date(dateStr);
    const now = new Date(hoje);
    if (isNaN(date.getTime())) return { valid: false, reason: 'data_invalida' };
    if (date <= now) return { valid: false, reason: 'data_passada' };
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return { valid: true, isWeekend, reason: null };
  };

  it("should accept future date", () => {
    const r = validateScheduleDate('2026-04-15', '2026-03-22');
    expect(r.valid).toBe(true);
  });

  it("should reject past date", () => {
    const r = validateScheduleDate('2026-03-01', '2026-03-22');
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('data_passada');
  });

  it("should detect weekend dates", () => {
    // 2026-03-28 is a Saturday
    const r = validateScheduleDate('2026-03-28', '2026-03-22');
    expect(r.valid).toBe(true);
    expect(r.isWeekend).toBe(true);
  });

  it("should detect weekday dates", () => {
    // 2026-03-25 is a Wednesday
    const r = validateScheduleDate('2026-03-25', '2026-03-22');
    expect(r.valid).toBe(true);
    expect(r.isWeekend).toBe(false);
  });

  it("should reject invalid date string", () => {
    const r = validateScheduleDate('not-a-date', '2026-03-22');
    expect(r.valid).toBe(false);
  });

  describe("Batch scheduling", () => {
    const batchSchedule = (ids: string[], date: string) => {
      if (ids.length === 0) return { success: false, reason: 'nenhum_selecionado' };
      if (ids.length > 100) return { success: false, reason: 'limite_excedido' };
      return { success: true, count: ids.length, date };
    };

    it("should accept valid batch", () => {
      const r = batchSchedule(['id1', 'id2'], '2026-04-01');
      expect(r.success).toBe(true);
      expect(r.count).toBe(2);
    });

    it("should reject empty batch", () => {
      const r = batchSchedule([], '2026-04-01');
      expect(r.success).toBe(false);
    });

    it("should reject batch over 100", () => {
      const ids = Array.from({ length: 101 }, (_, i) => `id${i}`);
      const r = batchSchedule(ids, '2026-04-01');
      expect(r.success).toBe(false);
    });
  });
});

// ===== BANK DATA VALIDATION =====
describe("Bank Data — Validation Logic", () => {
  const validateBankData = (dados: Record<string, string> | null) => {
    if (!dados) return { valid: false, fields: [] };
    const fields = [];
    if (dados.banco) fields.push('banco');
    if (dados.agencia) fields.push('agencia');
    if (dados.conta) fields.push('conta');
    if (dados.pix) fields.push('pix');
    const hasBankAccount = fields.includes('banco') && fields.includes('agencia') && fields.includes('conta');
    const hasPix = fields.includes('pix');
    return { valid: hasBankAccount || hasPix, fields, hasBankAccount, hasPix };
  };

  it("should validate complete bank data", () => {
    const r = validateBankData({ banco: '001', agencia: '1234', conta: '56789-0' });
    expect(r.valid).toBe(true);
    expect(r.hasBankAccount).toBe(true);
  });

  it("should validate PIX key", () => {
    const r = validateBankData({ pix: 'email@test.com' });
    expect(r.valid).toBe(true);
    expect(r.hasPix).toBe(true);
  });

  it("should reject null data", () => {
    const r = validateBankData(null);
    expect(r.valid).toBe(false);
  });

  it("should reject incomplete bank data (missing conta)", () => {
    const r = validateBankData({ banco: '001', agencia: '1234' });
    expect(r.valid).toBe(false);
  });

  it("should accept bank + pix combined", () => {
    const r = validateBankData({ banco: '001', agencia: '1234', conta: '56789', pix: 'chave' });
    expect(r.valid).toBe(true);
    expect(r.hasBankAccount).toBe(true);
    expect(r.hasPix).toBe(true);
  });
});

// ===== URGENCY COLOR CODING =====
describe("UX — Urgency Color Coding", () => {
  const getUrgencyColor = (dataVencimento: string, status: string, hoje: string) => {
    if (['pago', 'cancelado'].includes(status)) return 'neutral';
    const venc = new Date(dataVencimento);
    const now = new Date(hoje);
    const diffDays = Math.round((venc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'red'; // vencido
    if (diffDays === 0) return 'orange'; // vence hoje
    if (diffDays <= 3) return 'yellow'; // vence em 3 dias
    return 'green';
  };

  it("should return red for overdue", () => {
    expect(getUrgencyColor('2026-03-20', 'pendente', '2026-03-22')).toBe('red');
  });

  it("should return orange for due today", () => {
    expect(getUrgencyColor('2026-03-22', 'pendente', '2026-03-22')).toBe('orange');
  });

  it("should return yellow for due in 2 days", () => {
    expect(getUrgencyColor('2026-03-24', 'pendente', '2026-03-22')).toBe('yellow');
  });

  it("should return green for due in 10 days", () => {
    expect(getUrgencyColor('2026-04-01', 'pendente', '2026-03-22')).toBe('green');
  });

  it("should return neutral for paid", () => {
    expect(getUrgencyColor('2026-01-01', 'pago', '2026-03-22')).toBe('neutral');
  });

  it("should return neutral for cancelled", () => {
    expect(getUrgencyColor('2026-01-01', 'cancelado', '2026-03-22')).toBe('neutral');
  });
});

// ===== EXPORT LOGIC =====
describe("Export — CSV/JSON Generation", () => {
  const generateCSV = (pagamentos: { numero: string; valor: number; status: string }[]) => {
    const headers = ['Número', 'Valor', 'Status'];
    const rows = pagamentos.map(p => [p.numero, p.valor.toFixed(2), p.status]);
    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  };

  it("should generate CSV with headers", () => {
    const csv = generateCSV([{ numero: 'PAG-001', valor: 1000, status: 'pendente' }]);
    expect(csv).toContain('Número;Valor;Status');
    expect(csv).toContain('PAG-001;1000.00;pendente');
  });

  it("should handle empty array", () => {
    const csv = generateCSV([]);
    expect(csv).toBe('Número;Valor;Status');
  });

  it("should handle multiple rows", () => {
    const csv = generateCSV([
      { numero: 'PAG-001', valor: 100, status: 'pago' },
      { numero: 'PAG-002', valor: 200, status: 'pendente' },
    ]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(3);
  });
});

// ===== SEGREGATION OF DUTIES =====
describe("Segregation of Duties (SoD)", () => {
  const checkSoD = (
    action: 'create' | 'approve' | 'pay',
    userId: string,
    createdBy: string | null,
    approvedBy: string | null
  ) => {
    if (action === 'approve' && userId === createdBy) {
      return { allowed: false, reason: 'criador_nao_pode_aprovar' };
    }
    if (action === 'pay' && (userId === createdBy || userId === approvedBy)) {
      return { allowed: false, reason: 'mesmo_usuario_nao_pode_pagar' };
    }
    return { allowed: true, reason: null };
  };

  it("should block creator from approving", () => {
    const r = checkSoD('approve', 'user1', 'user1', null);
    expect(r.allowed).toBe(false);
  });

  it("should allow different user to approve", () => {
    const r = checkSoD('approve', 'user2', 'user1', null);
    expect(r.allowed).toBe(true);
  });

  it("should block creator from paying", () => {
    const r = checkSoD('pay', 'user1', 'user1', 'user2');
    expect(r.allowed).toBe(false);
  });

  it("should block approver from paying", () => {
    const r = checkSoD('pay', 'user2', 'user1', 'user2');
    expect(r.allowed).toBe(false);
  });

  it("should allow third user to pay", () => {
    const r = checkSoD('pay', 'user3', 'user1', 'user2');
    expect(r.allowed).toBe(true);
  });

  it("should always allow create", () => {
    const r = checkSoD('create', 'user1', null, null);
    expect(r.allowed).toBe(true);
  });
});

// ===== EARLY PAYMENT DISCOUNT =====
describe("Early Payment Discount Calculation", () => {
  const calcEarlyDiscount = (
    valor: number,
    dataVencimento: string,
    dataPagamento: string,
    taxaDiaria: number = 0.05
  ) => {
    const venc = new Date(dataVencimento);
    const pgto = new Date(dataPagamento);
    const diasAntecipados = Math.max(0, Math.round((venc.getTime() - pgto.getTime()) / (1000 * 60 * 60 * 24)));
    const desconto = valor * (taxaDiaria / 100) * diasAntecipados;
    return { diasAntecipados, desconto: Math.round(desconto * 100) / 100, valorFinal: Math.round((valor - desconto) * 100) / 100 };
  };

  it("should calculate discount for 10 days early", () => {
    const r = calcEarlyDiscount(10000, '2026-04-01', '2026-03-22');
    expect(r.diasAntecipados).toBe(10);
    expect(r.desconto).toBe(50); // 10000 * 0.05% * 10
  });

  it("should return zero discount for same-day payment", () => {
    const r = calcEarlyDiscount(10000, '2026-03-22', '2026-03-22');
    expect(r.diasAntecipados).toBe(0);
    expect(r.desconto).toBe(0);
  });

  it("should return zero discount for late payment", () => {
    const r = calcEarlyDiscount(10000, '2026-03-20', '2026-03-22');
    expect(r.diasAntecipados).toBe(0);
    expect(r.desconto).toBe(0);
  });

  it("should apply custom rate", () => {
    const r = calcEarlyDiscount(10000, '2026-04-01', '2026-03-22', 0.1);
    expect(r.desconto).toBe(100); // 10000 * 0.1% * 10
  });
});
