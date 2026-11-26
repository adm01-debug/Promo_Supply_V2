import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('zustand/middleware', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zustand/middleware')>();
  return {
    ...actual,
    persist: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

import {
  useBuyerAlertsStore,
  BuyerTarget,
  BuyerAlert,
  checkBuyerPerformance,
  getMetricLabel,
  formatMetricValue,
} from '../buyerAlertsStore';
import { supabase } from '@/integrations/supabase/client';

const getStore = () => useBuyerAlertsStore.getState();

const makeTarget = (overrides: Partial<BuyerTarget> = {}): BuyerTarget => ({
  buyerId: 'buyer-1',
  buyerName: 'Alice',
  economiaMensal: 1000,
  descontoMedio: 20,
  cotacoesMinimas: 5,
  warningThreshold: 15,
  criticalThreshold: 30,
  enabled: true,
  ...overrides,
});

const makeAlertPayload = (
  overrides: Partial<Omit<BuyerAlert, 'id' | 'timestamp' | 'read'>> = {}
): Omit<BuyerAlert, 'id' | 'timestamp' | 'read'> => ({
  buyerId: 'buyer-1',
  buyerName: 'Alice',
  metric: 'economia',
  metricLabel: 'Economia Mensal',
  type: 'warning',
  message: 'Below target',
  currentValue: 800,
  targetValue: 1000,
  percentage: 80,
  ...overrides,
});

describe('buyerAlertsStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useBuyerAlertsStore.setState({ targets: [], alerts: [] });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── initial state ──────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('starts with empty targets', () => {
      expect(getStore().targets).toHaveLength(0);
    });

    it('starts with empty alerts', () => {
      expect(getStore().alerts).toHaveLength(0);
    });
  });

  // ── setTargets ─────────────────────────────────────────────────────────────
  describe('setTargets', () => {
    it('replaces the targets list', () => {
      const targets = [makeTarget(), makeTarget({ buyerId: 'buyer-2', buyerName: 'Bob' })];
      act(() => getStore().setTargets(targets));
      expect(getStore().targets).toHaveLength(2);
      expect(getStore().targets[1].buyerName).toBe('Bob');
    });
  });

  // ── updateTarget ───────────────────────────────────────────────────────────
  describe('updateTarget', () => {
    it('updates matching target fields', () => {
      act(() => getStore().setTargets([makeTarget()]));
      act(() => getStore().updateTarget('buyer-1', { economiaMensal: 2000 }));
      expect(getStore().targets[0].economiaMensal).toBe(2000);
    });

    it('does not affect other targets', () => {
      const targets = [makeTarget(), makeTarget({ buyerId: 'buyer-2', buyerName: 'Bob' })];
      act(() => getStore().setTargets(targets));
      act(() => getStore().updateTarget('buyer-1', { economiaMensal: 5000 }));
      expect(getStore().targets[1].economiaMensal).toBe(1000);
    });

    it('is a no-op for unknown buyerId', () => {
      act(() => getStore().setTargets([makeTarget()]));
      act(() => getStore().updateTarget('unknown', { economiaMensal: 9999 }));
      expect(getStore().targets[0].economiaMensal).toBe(1000);
    });
  });

  // ── addAlert ───────────────────────────────────────────────────────────────
  describe('addAlert', () => {
    it('adds a new alert with id, timestamp, and read=false', () => {
      act(() => getStore().addAlert(makeAlertPayload()));
      const alerts = getStore().alerts;
      expect(alerts).toHaveLength(1);
      expect(alerts[0].read).toBe(false);
      expect(alerts[0].id).toBeTruthy();
      expect(alerts[0].timestamp).toBeInstanceOf(Date);
    });

    it('prepends new alerts (newest first)', () => {
      act(() => getStore().addAlert(makeAlertPayload({ message: 'first' })));
      vi.advanceTimersByTime(3700000); // advance past 1-hour dedup window
      act(() => getStore().addAlert(makeAlertPayload({ message: 'second' })));
      expect(getStore().alerts[0].message).toBe('second');
    });

    it('deduplicates alerts for same buyer/metric/type within 1 hour', () => {
      act(() => getStore().addAlert(makeAlertPayload()));
      vi.advanceTimersByTime(1800000); // 30 minutes — still within window
      act(() => getStore().addAlert(makeAlertPayload()));
      expect(getStore().alerts).toHaveLength(1);
    });

    it('allows same buyer/metric alert after 1 hour has elapsed', () => {
      act(() => getStore().addAlert(makeAlertPayload()));
      vi.advanceTimersByTime(3700000); // just over 1 hour
      act(() => getStore().addAlert(makeAlertPayload()));
      expect(getStore().alerts).toHaveLength(2);
    });

    it('allows same buyer but different metric without dedup', () => {
      act(() => getStore().addAlert(makeAlertPayload({ metric: 'economia' })));
      act(() => getStore().addAlert(makeAlertPayload({ metric: 'desconto' })));
      expect(getStore().alerts).toHaveLength(2);
    });

    it('caps alerts at 100', () => {
      for (let i = 0; i < 110; i++) {
        vi.advanceTimersByTime(3700000);
        act(() => getStore().addAlert(makeAlertPayload({ buyerId: `buyer-${i}` })));
      }
      expect(getStore().alerts).toHaveLength(100);
    });
  });

  // ── markAlertAsRead ────────────────────────────────────────────────────────
  describe('markAlertAsRead', () => {
    it('marks the targeted alert as read', () => {
      act(() => getStore().addAlert(makeAlertPayload()));
      const id = getStore().alerts[0].id;
      act(() => getStore().markAlertAsRead(id));
      expect(getStore().alerts[0].read).toBe(true);
    });

    it('does not affect other alerts', () => {
      act(() => getStore().addAlert(makeAlertPayload({ buyerId: 'buyer-a' })));
      vi.advanceTimersByTime(3700000);
      act(() => getStore().addAlert(makeAlertPayload({ buyerId: 'buyer-b' })));
      const idA = getStore().alerts.find(a => a.buyerId === 'buyer-a')!.id;
      act(() => getStore().markAlertAsRead(idA));
      const alertB = getStore().alerts.find(a => a.buyerId === 'buyer-b');
      expect(alertB?.read).toBe(false);
    });
  });

  // ── markAllAlertsAsRead ───────────────────────────────────────────────────
  describe('markAllAlertsAsRead', () => {
    it('marks every alert as read', () => {
      act(() => getStore().addAlert(makeAlertPayload({ buyerId: 'buyer-a' })));
      vi.advanceTimersByTime(3700000);
      act(() => getStore().addAlert(makeAlertPayload({ buyerId: 'buyer-b' })));
      act(() => getStore().markAllAlertsAsRead());
      expect(getStore().alerts.every(a => a.read)).toBe(true);
    });
  });

  // ── clearAlerts ───────────────────────────────────────────────────────────
  describe('clearAlerts', () => {
    it('empties the alerts list', () => {
      act(() => getStore().addAlert(makeAlertPayload()));
      act(() => getStore().clearAlerts());
      expect(getStore().alerts).toHaveLength(0);
    });
  });

  // ── clearBuyerAlerts ──────────────────────────────────────────────────────
  describe('clearBuyerAlerts', () => {
    it('removes only alerts for the given buyerId', () => {
      act(() => getStore().addAlert(makeAlertPayload({ buyerId: 'buyer-a' })));
      vi.advanceTimersByTime(3700000);
      act(() => getStore().addAlert(makeAlertPayload({ buyerId: 'buyer-b' })));
      act(() => getStore().clearBuyerAlerts('buyer-a'));
      expect(getStore().alerts).toHaveLength(1);
      expect(getStore().alerts[0].buyerId).toBe('buyer-b');
    });
  });

  // ── getUnreadCount ────────────────────────────────────────────────────────
  describe('getUnreadCount', () => {
    it('returns 0 when no alerts', () => {
      expect(getStore().getUnreadCount()).toBe(0);
    });

    it('counts only unread alerts', () => {
      act(() => getStore().addAlert(makeAlertPayload({ buyerId: 'buyer-a' })));
      vi.advanceTimersByTime(3700000);
      act(() => getStore().addAlert(makeAlertPayload({ buyerId: 'buyer-b' })));
      const idA = getStore().alerts.find(a => a.buyerId === 'buyer-a')!.id;
      act(() => getStore().markAlertAsRead(idA));
      expect(getStore().getUnreadCount()).toBe(1);
    });
  });

  // ── getAlertsByBuyer ──────────────────────────────────────────────────────
  describe('getAlertsByBuyer', () => {
    it('returns only alerts for the given buyer', () => {
      act(() => getStore().addAlert(makeAlertPayload({ buyerId: 'buyer-a' })));
      vi.advanceTimersByTime(3700000);
      act(() => getStore().addAlert(makeAlertPayload({ buyerId: 'buyer-b' })));
      const result = getStore().getAlertsByBuyer('buyer-a');
      expect(result).toHaveLength(1);
      expect(result[0].buyerId).toBe('buyer-a');
    });
  });

  // ── loadTargetsFromDb ─────────────────────────────────────────────────────
  describe('loadTargetsFromDb', () => {
    it('does nothing when DB returns empty data', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockChain.eq.mockImplementation(() => {
        return Promise.resolve({ data: [], error: null });
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);

      await act(async () => getStore().loadTargetsFromDb('org-1'));
      expect(getStore().targets).toHaveLength(0);
    });

    it('creates new targets from DB profiles', async () => {
      const profiles = [
        { id: 'buyer-1', full_name: 'Alice' },
        { id: 'buyer-2', full_name: 'Bob' },
      ];
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockChain.eq.mockImplementation(() => {
        return Promise.resolve({ data: profiles, error: null });
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);

      await act(async () => getStore().loadTargetsFromDb('org-1'));

      const targets = getStore().targets;
      expect(targets).toHaveLength(2);
      expect(targets[0].buyerName).toBe('Alice');
      expect(targets[0].warningThreshold).toBe(15);
      expect(targets[0].criticalThreshold).toBe(30);
      expect(targets[0].enabled).toBe(true);
    });

    it('preserves existing target thresholds when buyer already known', async () => {
      // Pre-load a target with custom thresholds
      act(() => getStore().setTargets([makeTarget({ buyerId: 'buyer-1', warningThreshold: 5, criticalThreshold: 10 })]));

      const profiles = [{ id: 'buyer-1', full_name: 'Alice Updated' }];
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockChain.eq.mockImplementation(() => {
        return Promise.resolve({ data: profiles, error: null });
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);

      await act(async () => getStore().loadTargetsFromDb('org-1'));

      const target = getStore().targets[0];
      expect(target.buyerName).toBe('Alice Updated');
      expect(target.warningThreshold).toBe(5);  // preserved
      expect(target.criticalThreshold).toBe(10); // preserved
    });

    it('silently handles DB errors and keeps existing targets', async () => {
      act(() => getStore().setTargets([makeTarget()]));

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockChain.eq.mockImplementation(() => {
        return Promise.resolve({ data: null, error: new Error('DB error') });
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);

      await act(async () => getStore().loadTargetsFromDb('org-1'));
      expect(getStore().targets).toHaveLength(1); // unchanged
    });
  });
});

// ── Pure helper functions ────────────────────────────────────────────────────
describe('checkBuyerPerformance', () => {
  const target = makeTarget({ warningThreshold: 15, criticalThreshold: 30 });

  it('returns success when value meets target', () => {
    const result = checkBuyerPerformance('b1', 'Alice', 1000, 1000, 'economia', target);
    expect(result.status).toBe('success');
    expect(result.shouldAlert).toBe(false);
    expect(result.percentage).toBe(100);
  });

  it('returns warning when deviation is within warning threshold', () => {
    // 80% of target → 20% deviation → warning (15–29%)
    const result = checkBuyerPerformance('b1', 'Alice', 800, 1000, 'economia', target);
    expect(result.status).toBe('warning');
    expect(result.shouldAlert).toBe(true);
  });

  it('returns critical when deviation meets critical threshold', () => {
    // 65% of target → 35% deviation → critical (≥30%)
    const result = checkBuyerPerformance('b1', 'Alice', 650, 1000, 'economia', target);
    expect(result.status).toBe('critical');
    expect(result.shouldAlert).toBe(true);
  });

  it('returns success without alerting when target is disabled', () => {
    const disabledTarget = makeTarget({ enabled: false });
    const result = checkBuyerPerformance('b1', 'Alice', 500, 1000, 'economia', disabledTarget);
    expect(result.status).toBe('success');
    expect(result.shouldAlert).toBe(false);
    expect(result.percentage).toBe(100);
  });
});

describe('getMetricLabel', () => {
  it('returns correct label for economia', () => {
    expect(getMetricLabel('economia')).toBe('Economia Mensal');
  });
  it('returns correct label for desconto', () => {
    expect(getMetricLabel('desconto')).toBe('Desconto Médio');
  });
  it('returns correct label for cotacoes', () => {
    expect(getMetricLabel('cotacoes')).toBe('Cotações Realizadas');
  });
});

describe('formatMetricValue', () => {
  it('formats economia as BRL currency', () => {
    expect(formatMetricValue('economia', 1234)).toContain('1.234');
  });
  it('formats desconto as percentage', () => {
    expect(formatMetricValue('desconto', 12.5)).toBe('12.5%');
  });
  it('formats cotacoes as plain number string', () => {
    expect(formatMetricValue('cotacoes', 7)).toBe('7');
  });
});
