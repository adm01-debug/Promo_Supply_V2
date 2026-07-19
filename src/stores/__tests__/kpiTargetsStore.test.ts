import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useKPITargetsStore, checkKPIStatus, type KPITarget } from '../kpiTargetsStore';

vi.mock('zustand/middleware', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zustand/middleware')>();
  return {
    ...actual,
    persist: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

const getStore = () => useKPITargetsStore.getState();

const makeAlert = (overrides: Partial<Parameters<typeof getStore>['addAlert']> = {}) => ({
  kpiId: 'test-kpi',
  kpiName: 'Test KPI',
  type: 'warning' as const,
  message: 'Test alert',
  currentValue: 80,
  targetValue: 100,
  ...overrides,
});

describe('kpiTargetsStore', () => {
  beforeEach(() => {
    useKPITargetsStore.setState({
      targets: useKPITargetsStore.getState().targets.map(t => ({ ...t })),
      alerts: [],
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has 8 default targets', () => {
      expect(getStore().targets).toHaveLength(8);
    });

    it('all default targets are enabled', () => {
      expect(getStore().targets.every(t => t.enabled)).toBe(true);
    });

    it('starts with empty alerts', () => {
      expect(getStore().alerts).toEqual([]);
    });

    it('has expected default target IDs', () => {
      const ids = getStore().targets.map(t => t.id);
      expect(ids).toContain('procurement_roi');
      expect(ids).toContain('maverick_spend');
      expect(ids).toContain('contract_compliance');
      expect(ids).toContain('cost_avoidance');
      expect(ids).toContain('po_cycle_time');
      expect(ids).toContain('supplier_concentration');
      expect(ids).toContain('first_time_match');
      expect(ids).toContain('savings_realization');
    });
  });

  describe('updateTarget', () => {
    it('updates a specific target by id', () => {
      getStore().updateTarget('procurement_roi', { target: 7.5 });
      const target = getStore().targets.find(t => t.id === 'procurement_roi');
      expect(target?.target).toBe(7.5);
    });

    it('does not affect other targets', () => {
      const before = getStore().targets.find(t => t.id === 'maverick_spend')?.target;
      getStore().updateTarget('procurement_roi', { target: 99 });
      const after = getStore().targets.find(t => t.id === 'maverick_spend')?.target;
      expect(after).toBe(before);
    });

    it('can disable a target', () => {
      getStore().updateTarget('procurement_roi', { enabled: false });
      expect(getStore().targets.find(t => t.id === 'procurement_roi')?.enabled).toBe(false);
    });

    it('can update multiple fields at once', () => {
      getStore().updateTarget('contract_compliance', { target: 95, warningThreshold: 15, unit: 'pct' });
      const t = getStore().targets.find(t => t.id === 'contract_compliance');
      expect(t?.target).toBe(95);
      expect(t?.warningThreshold).toBe(15);
      expect(t?.unit).toBe('pct');
    });

    it('does nothing for nonexistent id', () => {
      const before = getStore().targets.length;
      getStore().updateTarget('nonexistent', { target: 999 });
      expect(getStore().targets.length).toBe(before);
    });
  });

  describe('addAlert', () => {
    it('adds alert to alerts array', () => {
      getStore().addAlert(makeAlert());
      expect(getStore().alerts).toHaveLength(1);
    });

    it('prepends new alerts', () => {
      getStore().addAlert(makeAlert({ message: 'first' }));
      getStore().addAlert(makeAlert({ message: 'second' }));
      expect(getStore().alerts[0].message).toBe('second');
      expect(getStore().alerts[1].message).toBe('first');
    });

    it('assigns id based on kpiId and timestamp', () => {
      getStore().addAlert(makeAlert({ kpiId: 'test-kpi' }));
      expect(getStore().alerts[0].id).toMatch(/^test-kpi-/);
    });

    it('sets read to false', () => {
      getStore().addAlert(makeAlert());
      expect(getStore().alerts[0].read).toBe(false);
    });

    it('sets timestamp as Date', () => {
      getStore().addAlert(makeAlert());
      expect(getStore().alerts[0].timestamp).toBeInstanceOf(Date);
    });

    it('caps alerts at 50', () => {
      for (let i = 0; i < 55; i++) {
        getStore().addAlert(makeAlert({ message: `alert-${i}` }));
      }
      expect(getStore().alerts).toHaveLength(50);
    });

    it('keeps newest alerts when capped', () => {
      for (let i = 0; i < 55; i++) {
        getStore().addAlert(makeAlert({ message: `alert-${i}` }));
      }
      expect(getStore().alerts[0].message).toBe('alert-54');
    });
  });

  describe('markAlertAsRead', () => {
    it('marks a specific alert as read', () => {
      getStore().addAlert(makeAlert());
      const id = getStore().alerts[0].id;
      getStore().markAlertAsRead(id);
      expect(getStore().alerts[0].read).toBe(true);
    });

    it('does not mark other alerts as read', () => {
      getStore().addAlert(makeAlert({ kpiId: 'kpi-a', message: 'a1' }));
      getStore().addAlert(makeAlert({ kpiId: 'kpi-b', message: 'a2' }));
      const id = getStore().alerts[0].id;
      getStore().markAlertAsRead(id);
      expect(getStore().alerts[1].read).toBe(false);
    });

    it('does nothing for nonexistent id', () => {
      getStore().addAlert(makeAlert());
      getStore().markAlertAsRead('nonexistent');
      expect(getStore().alerts[0].read).toBe(false);
    });
  });

  describe('markAllAlertsAsRead', () => {
    it('marks all alerts as read', () => {
      getStore().addAlert(makeAlert());
      getStore().addAlert(makeAlert({ type: 'critical' }));
      getStore().markAllAlertsAsRead();
      expect(getStore().alerts.every(a => a.read)).toBe(true);
    });

    it('works with empty alerts array', () => {
      expect(() => getStore().markAllAlertsAsRead()).not.toThrow();
    });
  });

  describe('clearAlerts', () => {
    it('empties the alerts array', () => {
      getStore().addAlert(makeAlert());
      getStore().addAlert(makeAlert());
      getStore().clearAlerts();
      expect(getStore().alerts).toEqual([]);
    });

    it('works when already empty', () => {
      expect(() => getStore().clearAlerts()).not.toThrow();
      expect(getStore().alerts).toEqual([]);
    });
  });

  describe('getUnreadCount', () => {
    it('returns 0 when no alerts', () => {
      expect(getStore().getUnreadCount()).toBe(0);
    });

    it('returns count of unread alerts', () => {
      getStore().addAlert(makeAlert());
      getStore().addAlert(makeAlert());
      expect(getStore().getUnreadCount()).toBe(2);
    });

    it('excludes read alerts from count', () => {
      getStore().addAlert(makeAlert({ kpiId: 'kpi-x' }));
      getStore().addAlert(makeAlert({ kpiId: 'kpi-y' }));
      const id = getStore().alerts[0].id;
      getStore().markAlertAsRead(id);
      expect(getStore().getUnreadCount()).toBe(1);
    });

    it('returns 0 after markAllAlertsAsRead', () => {
      getStore().addAlert(makeAlert());
      getStore().addAlert(makeAlert());
      getStore().markAllAlertsAsRead();
      expect(getStore().getUnreadCount()).toBe(0);
    });

    it('returns 0 after clearAlerts', () => {
      getStore().addAlert(makeAlert());
      getStore().clearAlerts();
      expect(getStore().getUnreadCount()).toBe(0);
    });
  });
});

describe('checkKPIStatus', () => {
  const makeTarget = (overrides: Partial<KPITarget> = {}): KPITarget => ({
    id: 'test',
    name: 'Test',
    target: 100,
    warningThreshold: 20,
    criticalThreshold: 40,
    unit: '%',
    enabled: true,
    ...overrides,
  });

  describe('disabled target', () => {
    it('always returns success with 100% when disabled', () => {
      const target = makeTarget({ enabled: false });
      expect(checkKPIStatus('id', 50, target)).toEqual({ status: 'success', percentage: 100 });
      expect(checkKPIStatus('id', 0, target)).toEqual({ status: 'success', percentage: 100 });
    });
  });

  describe('normal KPI (higher is better)', () => {
    it('returns success when at target', () => {
      const result = checkKPIStatus('id', 100, makeTarget());
      expect(result.status).toBe('success');
      expect(result.percentage).toBe(100);
    });

    it('returns success when above target', () => {
      const result = checkKPIStatus('id', 120, makeTarget());
      expect(result.status).toBe('success');
      expect(result.percentage).toBeCloseTo(120);
    });

    it('returns warning when deviation >= warningThreshold', () => {
      // target=100, warningThreshold=20 → 80% of target triggers warning
      const result = checkKPIStatus('id', 80, makeTarget());
      expect(result.status).toBe('warning');
      expect(result.percentage).toBe(80);
    });

    it('returns critical when deviation >= criticalThreshold', () => {
      // target=100, criticalThreshold=40 → 60% of target triggers critical
      const result = checkKPIStatus('id', 60, makeTarget());
      expect(result.status).toBe('critical');
      expect(result.percentage).toBe(60);
    });

    it('returns success just inside warning threshold', () => {
      // 81% → deviation = 19% < warningThreshold=20
      const result = checkKPIStatus('id', 81, makeTarget());
      expect(result.status).toBe('success');
    });

    it('returns warning just inside critical threshold', () => {
      // 61% → deviation = 39% < criticalThreshold=40
      const result = checkKPIStatus('id', 61, makeTarget());
      expect(result.status).toBe('warning');
    });

    it('computes percentage correctly', () => {
      const result = checkKPIStatus('id', 75, makeTarget());
      expect(result.percentage).toBe(75);
    });
  });

  describe('inverse KPI (lower is better)', () => {
    const inverseTarget = makeTarget({
      target: 10,
      warningThreshold: 30,
      criticalThreshold: 50,
    });

    it('returns 100% when at or below target', () => {
      const result = checkKPIStatus('id', 10, inverseTarget, true);
      expect(result.percentage).toBe(100);
      const result2 = checkKPIStatus('id', 5, inverseTarget, true);
      expect(result2.percentage).toBe(100);
    });

    it('returns success when below target', () => {
      const result = checkKPIStatus('id', 8, inverseTarget, true);
      expect(result.status).toBe('success');
      expect(result.percentage).toBe(100);
    });

    it('computes percentage as target/currentValue when above target', () => {
      // target=10, current=20 → percentage = 10/20*100 = 50%
      const result = checkKPIStatus('id', 20, inverseTarget, true);
      expect(result.percentage).toBe(50);
    });

    it('returns warning for moderate overrun', () => {
      // target=10, current=14 → percentage=71.4% → deviation=28.6% → warning(30%)? No, 28.6 < 30
      // current=15 → percentage=66.7% → deviation=33.3% → warning
      const result = checkKPIStatus('id', 15, inverseTarget, true);
      expect(result.status).toBe('warning');
    });

    it('returns critical for severe overrun', () => {
      // target=10, current=25 → percentage=40% → deviation=60% >= critical(50%)
      const result = checkKPIStatus('id', 25, inverseTarget, true);
      expect(result.status).toBe('critical');
    });
  });
});
