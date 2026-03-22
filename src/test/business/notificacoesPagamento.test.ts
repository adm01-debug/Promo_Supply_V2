import { describe, it, expect } from "vitest";

describe("Payment Notifications — Business Logic", () => {
  describe("Due date alerts", () => {
    const generateAlerts = (
      pagamentos: { id: string; numero: string; data_vencimento: string; valor: number; status: string }[],
      hoje: string
    ) => {
      const now = new Date(hoje);
      const pendentes = pagamentos.filter(p => !['pago', 'cancelado'].includes(p.status));
      const alerts: { type: string; message: string; count: number; valor: number }[] = [];

      const vencidos = pendentes.filter(p => new Date(p.data_vencimento) < now);
      if (vencidos.length > 0) {
        alerts.push({
          type: 'critical',
          message: `${vencidos.length} pagamento(s) vencido(s)`,
          count: vencidos.length,
          valor: vencidos.reduce((s, p) => s + p.valor, 0),
        });
      }

      const venceHoje = pendentes.filter(p => p.data_vencimento === hoje);
      if (venceHoje.length > 0) {
        alerts.push({
          type: 'warning',
          message: `${venceHoje.length} pagamento(s) vence(m) hoje`,
          count: venceHoje.length,
          valor: venceHoje.reduce((s, p) => s + p.valor, 0),
        });
      }

      const vence3d = pendentes.filter(p => {
        const d = Math.round((new Date(p.data_vencimento).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return d > 0 && d <= 3;
      });
      if (vence3d.length > 0) {
        alerts.push({
          type: 'info',
          message: `${vence3d.length} pagamento(s) vence(m) em 3 dias`,
          count: vence3d.length,
          valor: vence3d.reduce((s, p) => s + p.valor, 0),
        });
      }

      return alerts;
    };

    it("should generate critical alert for overdue", () => {
      const alerts = generateAlerts([
        { id: '1', numero: 'P1', data_vencimento: '2026-03-20', valor: 5000, status: 'pendente' },
      ], '2026-03-22');
      expect(alerts[0].type).toBe('critical');
      expect(alerts[0].count).toBe(1);
    });

    it("should generate warning for today", () => {
      const alerts = generateAlerts([
        { id: '1', numero: 'P1', data_vencimento: '2026-03-22', valor: 3000, status: 'pendente' },
      ], '2026-03-22');
      expect(alerts.some(a => a.type === 'warning')).toBe(true);
    });

    it("should generate info for 3-day window", () => {
      const alerts = generateAlerts([
        { id: '1', numero: 'P1', data_vencimento: '2026-03-24', valor: 2000, status: 'pendente' },
      ], '2026-03-22');
      expect(alerts.some(a => a.type === 'info')).toBe(true);
    });

    it("should skip paid payments", () => {
      const alerts = generateAlerts([
        { id: '1', numero: 'P1', data_vencimento: '2026-03-20', valor: 5000, status: 'pago' },
      ], '2026-03-22');
      expect(alerts.length).toBe(0);
    });

    it("should aggregate multiple overdue", () => {
      const alerts = generateAlerts([
        { id: '1', numero: 'P1', data_vencimento: '2026-03-18', valor: 5000, status: 'pendente' },
        { id: '2', numero: 'P2', data_vencimento: '2026-03-19', valor: 3000, status: 'pendente' },
      ], '2026-03-22');
      expect(alerts[0].count).toBe(2);
      expect(alerts[0].valor).toBe(8000);
    });

    it("should return empty for no pending", () => {
      expect(generateAlerts([], '2026-03-22').length).toBe(0);
    });
  });

  describe("Credit availability notification", () => {
    const checkCreditNotification = (
      fornecedorId: string,
      creditos: { fornecedor_id: string; saldo: number }[]
    ) => {
      const available = creditos.filter(c => c.fornecedor_id === fornecedorId && c.saldo > 0);
      const total = available.reduce((s, c) => s + c.saldo, 0);
      if (total > 0) {
        return { notify: true, message: `Crédito disponível: R$ ${total.toFixed(2)}`, total };
      }
      return { notify: false };
    };

    it("should notify when credits available", () => {
      const r = checkCreditNotification('f1', [{ fornecedor_id: 'f1', saldo: 2300 }]);
      expect(r.notify).toBe(true);
      expect(r.total).toBe(2300);
    });

    it("should not notify when no credits", () => {
      const r = checkCreditNotification('f1', []);
      expect(r.notify).toBe(false);
    });

    it("should not notify for other supplier's credits", () => {
      const r = checkCreditNotification('f1', [{ fornecedor_id: 'f2', saldo: 500 }]);
      expect(r.notify).toBe(false);
    });
  });
});
