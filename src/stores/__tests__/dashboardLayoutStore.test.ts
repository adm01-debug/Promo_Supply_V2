import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Mock zustand persist middleware to avoid localStorage in tests
vi.mock('zustand/middleware', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zustand/middleware')>();
  return {
    ...actual,
    persist: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

import { useDashboardLayoutStore, DashboardWidget } from '../dashboardLayoutStore';
import { supabase } from '@/integrations/supabase/client';

const getStore = () => useDashboardLayoutStore.getState();
const DEFAULT_WIDGET_COUNT = 18;

describe('dashboardLayoutStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useDashboardLayoutStore.setState({ widgets: useDashboardLayoutStore.getInitialState?.()?.widgets ?? (useDashboardLayoutStore as unknown as { getInitialState?: () => { widgets: unknown } }).getInitialState?.()?.widgets });
    // Reset by calling resetLayout
    act(() => {
      getStore().resetLayout();
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('has default widgets', () => {
      const { widgets } = getStore();
      expect(widgets.length).toBe(DEFAULT_WIDGET_COUNT);
    });

    it('all default widgets are visible', () => {
      const { widgets } = getStore();
      expect(widgets.every(w => w.visible)).toBe(true);
    });

    it('updatedAt is set after reset', () => {
      const { updatedAt } = getStore();
      expect(updatedAt).toBeTruthy();
    });
  });

  describe('setWidgets', () => {
    it('replaces widgets and bumps updatedAt', () => {
      const before = getStore().updatedAt;
      vi.advanceTimersByTime(1);
      const custom: DashboardWidget[] = [
        { id: 'w1', type: 'kpi', title: 'Test', visible: true, order: 0, size: 'small' },
      ];
      act(() => getStore().setWidgets(custom));
      const { widgets, updatedAt } = getStore();
      expect(widgets).toEqual(custom);
      expect(updatedAt).not.toBe(before);
    });
  });

  describe('toggleWidgetVisibility', () => {
    it('hides a visible widget', () => {
      const firstId = getStore().widgets[0].id;
      act(() => getStore().toggleWidgetVisibility(firstId));
      expect(getStore().widgets.find(w => w.id === firstId)?.visible).toBe(false);
    });

    it('shows a hidden widget', () => {
      const firstId = getStore().widgets[0].id;
      act(() => getStore().toggleWidgetVisibility(firstId));
      act(() => getStore().toggleWidgetVisibility(firstId));
      expect(getStore().widgets.find(w => w.id === firstId)?.visible).toBe(true);
    });

    it('does not affect other widgets', () => {
      const ids = getStore().widgets.map(w => w.id);
      act(() => getStore().toggleWidgetVisibility(ids[0]));
      const others = getStore().widgets.filter(w => w.id !== ids[0]);
      expect(others.every(w => w.visible)).toBe(true);
    });

    it('bumps updatedAt', () => {
      const before = getStore().updatedAt;
      vi.advanceTimersByTime(1);
      const firstId = getStore().widgets[0].id;
      act(() => getStore().toggleWidgetVisibility(firstId));
      expect(getStore().updatedAt).not.toBe(before);
    });
  });

  describe('reorderWidgets', () => {
    it('moves a widget from one position to another', () => {
      const originalFirst = getStore().widgets[0].id;
      const originalSecond = getStore().widgets[1].id;
      act(() => getStore().reorderWidgets(0, 1));
      const { widgets } = getStore();
      expect(widgets[0].id).toBe(originalSecond);
      expect(widgets[1].id).toBe(originalFirst);
    });

    it('reassigns order values to match array position', () => {
      act(() => getStore().reorderWidgets(0, 2));
      const { widgets } = getStore();
      widgets.forEach((w, i) => {
        expect(w.order).toBe(i);
      });
    });

    it('preserves widget count', () => {
      act(() => getStore().reorderWidgets(0, 5));
      expect(getStore().widgets.length).toBe(DEFAULT_WIDGET_COUNT);
    });

    it('bumps updatedAt', () => {
      const before = getStore().updatedAt;
      vi.advanceTimersByTime(1);
      act(() => getStore().reorderWidgets(0, 1));
      expect(getStore().updatedAt).not.toBe(before);
    });
  });

  describe('resizeWidget', () => {
    it('changes the size of the target widget', () => {
      const firstId = getStore().widgets[0].id;
      act(() => getStore().resizeWidget(firstId, 'large'));
      expect(getStore().widgets.find(w => w.id === firstId)?.size).toBe('large');
    });

    it('does not affect other widgets', () => {
      const [first, ...rest] = getStore().widgets;
      const originalSizes = rest.map(w => w.size);
      act(() => getStore().resizeWidget(first.id, 'full'));
      const afterSizes = getStore().widgets.filter(w => w.id !== first.id).map(w => w.size);
      expect(afterSizes).toEqual(originalSizes);
    });

    it('bumps updatedAt', () => {
      const before = getStore().updatedAt;
      vi.advanceTimersByTime(1);
      act(() => getStore().resizeWidget(getStore().widgets[0].id, 'medium'));
      expect(getStore().updatedAt).not.toBe(before);
    });
  });

  describe('resetLayout', () => {
    it('restores default widget count after custom setWidgets', () => {
      act(() => getStore().setWidgets([{ id: 'x', type: 'kpi', title: 'X', visible: false, order: 0, size: 'small' }]));
      act(() => getStore().resetLayout());
      expect(getStore().widgets.length).toBe(DEFAULT_WIDGET_COUNT);
    });

    it('restores all widgets to visible', () => {
      act(() => getStore().toggleWidgetVisibility(getStore().widgets[0].id));
      act(() => getStore().resetLayout());
      expect(getStore().widgets.every(w => w.visible)).toBe(true);
    });
  });

  describe('loadFromDb', () => {
    it('skips when no authenticated user', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { user: null } });
      await act(async () => getStore().loadFromDb('dash-1'));
      expect(getStore().widgets.length).toBe(DEFAULT_WIDGET_COUNT);
    });

    it('applies DB layout when DB timestamp is newer', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      const dbWidgets: DashboardWidget[] = [
        { id: 'kpi-aguardando', type: 'kpi', title: 'Modified', visible: false, order: 0, size: 'large' },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { layout: dbWidgets, updated_at: new Date(Date.now() + 10000).toISOString() },
          error: null,
        }),
      };
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);

      // Set local updatedAt to an older time
      useDashboardLayoutStore.setState({ updatedAt: new Date(Date.now() - 10000).toISOString() });

      await act(async () => getStore().loadFromDb('dash-1'));

      const modified = getStore().widgets.find(w => w.id === 'kpi-aguardando');
      expect(modified?.title).toBe('Modified');
      expect(modified?.visible).toBe(false);
    });

    it('adds missing default widgets when DB layout is a subset', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      const partialLayout: DashboardWidget[] = [
        { id: 'kpi-aguardando', type: 'kpi', title: 'Only One', visible: true, order: 0, size: 'small' },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { layout: partialLayout, updated_at: new Date(Date.now() + 10000).toISOString() },
          error: null,
        }),
      };
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);
      useDashboardLayoutStore.setState({ updatedAt: null });

      await act(async () => getStore().loadFromDb('dash-1'));

      expect(getStore().widgets.length).toBeGreaterThan(1);
    });
  });

  describe('saveToDb', () => {
    it('skips when no authenticated user', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { user: null } });
      await act(async () => getStore().saveToDb('dash-1'));
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('calls upsert with current widget state', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: 'user-99' } },
      });

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ upsert: mockUpsert });

      await act(async () => getStore().saveToDb('dash-main'));

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-99', dashboard_id: 'dash-main' }),
        { onConflict: 'user_id,dashboard_id' }
      );
    });
  });
});
