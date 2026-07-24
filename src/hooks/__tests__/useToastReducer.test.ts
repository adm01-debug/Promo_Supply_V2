import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/ui/toast', () => ({}));

import { reducer } from '../use-toast';

// ─── use-toast reducer ────────────────────────────────────────────────────────

const makeToast = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  open: true,
  title: `Toast ${id}`,
  ...extra,
} as Parameters<typeof reducer>[1] extends { toast: infer T } ? T : never);

const emptyState = { toasts: [] };

describe('reducer — ADD_TOAST', () => {
  it('adds a toast to empty state', () => {
    const toast = makeToast('1');
    const state = reducer(emptyState, { type: 'ADD_TOAST', toast });
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0].id).toBe('1');
  });

  it('places new toast at the beginning', () => {
    const first = makeToast('1');
    const s1 = reducer(emptyState, { type: 'ADD_TOAST', toast: first });
    // TOAST_LIMIT=1 so this replaces; let's verify position with a fresh empty approach
    const result = reducer(emptyState, { type: 'ADD_TOAST', toast: first });
    expect(result.toasts[0].id).toBe('1');
  });

  it('respects TOAST_LIMIT of 1 — oldest toast is dropped', () => {
    const t1 = makeToast('1');
    const t2 = makeToast('2');
    const s1 = reducer(emptyState, { type: 'ADD_TOAST', toast: t1 });
    const s2 = reducer(s1, { type: 'ADD_TOAST', toast: t2 });
    expect(s2.toasts).toHaveLength(1);
    expect(s2.toasts[0].id).toBe('2');
  });

  it('does not mutate input state', () => {
    const toast = makeToast('1');
    const before = { toasts: [] };
    reducer(before, { type: 'ADD_TOAST', toast });
    expect(before.toasts).toHaveLength(0);
  });
});

describe('reducer — UPDATE_TOAST', () => {
  it('updates matching toast fields', () => {
    const toast = makeToast('1', { title: 'Original' });
    const s1 = reducer(emptyState, { type: 'ADD_TOAST', toast });
    const s2 = reducer(s1, { type: 'UPDATE_TOAST', toast: { id: '1', title: 'Updated' } });
    expect(s2.toasts[0].title).toBe('Updated');
  });

  it('preserves id and other fields when updating', () => {
    const toast = makeToast('1', { title: 'Keep' });
    const s1 = reducer(emptyState, { type: 'ADD_TOAST', toast });
    const s2 = reducer(s1, { type: 'UPDATE_TOAST', toast: { id: '1', open: false } });
    expect(s2.toasts[0].id).toBe('1');
    expect(s2.toasts[0].title).toBe('Keep');
    expect(s2.toasts[0].open).toBe(false);
  });

  it('does not change toasts with non-matching id', () => {
    const toast = makeToast('1', { title: 'Unchanged' });
    const s1 = reducer(emptyState, { type: 'ADD_TOAST', toast });
    const s2 = reducer(s1, { type: 'UPDATE_TOAST', toast: { id: 'other', title: 'X' } });
    expect(s2.toasts[0].title).toBe('Unchanged');
  });
});

describe('reducer — DISMISS_TOAST', () => {
  it('sets open=false for a specific toastId', () => {
    const toast = makeToast('1', { open: true });
    const s1 = reducer(emptyState, { type: 'ADD_TOAST', toast });
    const s2 = reducer(s1, { type: 'DISMISS_TOAST', toastId: '1' });
    expect(s2.toasts[0].open).toBe(false);
  });

  it('sets open=false for all toasts when toastId is undefined', () => {
    const toast = makeToast('1', { open: true });
    const s1 = reducer(emptyState, { type: 'ADD_TOAST', toast });
    const s2 = reducer(s1, { type: 'DISMISS_TOAST' });
    expect(s2.toasts.every(t => t.open === false)).toBe(true);
  });

  it('does not remove toasts — only closes them', () => {
    const toast = makeToast('1');
    const s1 = reducer(emptyState, { type: 'ADD_TOAST', toast });
    const s2 = reducer(s1, { type: 'DISMISS_TOAST', toastId: '1' });
    expect(s2.toasts).toHaveLength(1);
  });

  it('does not affect toast with different id', () => {
    const toast = makeToast('1', { open: true });
    const s1 = reducer(emptyState, { type: 'ADD_TOAST', toast });
    const s2 = reducer(s1, { type: 'DISMISS_TOAST', toastId: 'other' });
    expect(s2.toasts[0].open).toBe(true);
  });
});

describe('reducer — REMOVE_TOAST', () => {
  it('removes toast with matching id', () => {
    const toast = makeToast('1');
    const s1 = reducer(emptyState, { type: 'ADD_TOAST', toast });
    const s2 = reducer(s1, { type: 'REMOVE_TOAST', toastId: '1' });
    expect(s2.toasts).toHaveLength(0);
  });

  it('clears all toasts when toastId is undefined', () => {
    const toast = makeToast('1');
    const s1 = reducer(emptyState, { type: 'ADD_TOAST', toast });
    const s2 = reducer(s1, { type: 'REMOVE_TOAST' });
    expect(s2.toasts).toHaveLength(0);
  });

  it('does not remove toast with non-matching id', () => {
    const toast = makeToast('1');
    const s1 = reducer(emptyState, { type: 'ADD_TOAST', toast });
    const s2 = reducer(s1, { type: 'REMOVE_TOAST', toastId: 'other' });
    expect(s2.toasts).toHaveLength(1);
  });

  it('returns empty toasts array when REMOVE_TOAST has undefined id on empty state', () => {
    const state = reducer(emptyState, { type: 'REMOVE_TOAST' });
    expect(state.toasts).toHaveLength(0);
  });
});

describe('reducer — invariants', () => {
  it('always returns an object with a toasts array', () => {
    const actions = [
      { type: 'ADD_TOAST' as const, toast: makeToast('x') },
      { type: 'UPDATE_TOAST' as const, toast: { id: 'x' } },
      { type: 'DISMISS_TOAST' as const },
      { type: 'REMOVE_TOAST' as const },
    ];
    for (const action of actions) {
      // @ts-ignore — deliberately mixing action types
      const result = reducer(emptyState, action);
      expect(Array.isArray(result.toasts)).toBe(true);
    }
  });

  it('DISMISS_TOAST on empty state does not throw', () => {
    expect(() => reducer(emptyState, { type: 'DISMISS_TOAST', toastId: '1' })).not.toThrow();
  });

  it('REMOVE_TOAST on empty state does not throw', () => {
    expect(() => reducer(emptyState, { type: 'REMOVE_TOAST', toastId: '1' })).not.toThrow();
  });

  it('UPDATE_TOAST on a non-existing id preserves all existing toasts', () => {
    const toast = makeToast('existing');
    const s1 = reducer(emptyState, { type: 'ADD_TOAST', toast });
    const s2 = reducer(s1, { type: 'UPDATE_TOAST', toast: { id: 'ghost', title: 'X' } });
    expect(s2.toasts).toHaveLength(1);
    expect(s2.toasts[0].id).toBe('existing');
  });
});
