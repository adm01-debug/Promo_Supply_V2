import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useUndoStore } from '../undoStore';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { logger } from '@/lib/logger';

const getStore = () => useUndoStore.getState();

const makeAction = (overrides: Record<string, unknown> = {}) => ({
  type: 'test',
  description: 'Test action',
  undo: vi.fn().mockResolvedValue(undefined),
  redo: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('undoStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUndoStore.setState({ actions: [], redoStack: [], maxActions: 10 });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts with empty stacks', () => {
      const { actions, redoStack } = getStore();
      expect(actions).toEqual([]);
      expect(redoStack).toEqual([]);
    });

    it('has maxActions = 10', () => {
      expect(getStore().maxActions).toBe(10);
    });

    it('canUndo returns false when empty', () => {
      expect(getStore().canUndo()).toBe(false);
    });

    it('canRedo returns false when empty', () => {
      expect(getStore().canRedo()).toBe(false);
    });

    it('getLastAction returns null when empty', () => {
      expect(getStore().getLastAction()).toBeNull();
    });
  });

  describe('addAction', () => {
    it('returns a unique string id', () => {
      const id = getStore().addAction(makeAction());
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^undo-/);
    });

    it('prepends new action to actions array', () => {
      getStore().addAction(makeAction({ type: 'first' }));
      getStore().addAction(makeAction({ type: 'second' }));
      const { actions } = getStore();
      expect(actions[0].type).toBe('second');
      expect(actions[1].type).toBe('first');
    });

    it('assigns id and timestamp', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const id = getStore().addAction(makeAction());
      const { actions } = getStore();
      expect(actions[0].id).toBe(id);
      expect(actions[0].timestamp).toBe(new Date('2024-01-01T00:00:00Z').getTime());
    });

    it('clears redoStack when new action added', () => {
      useUndoStore.setState({
        actions: [],
        redoStack: [{ id: 'r1', type: 't', description: 'd', timestamp: Date.now(), undo: vi.fn() }],
        maxActions: 10,
      });
      getStore().addAction(makeAction());
      expect(getStore().redoStack).toEqual([]);
    });

    it('respects maxActions limit', () => {
      useUndoStore.setState({ actions: [], redoStack: [], maxActions: 3 });
      getStore().addAction(makeAction({ type: 'a1' }));
      getStore().addAction(makeAction({ type: 'a2' }));
      getStore().addAction(makeAction({ type: 'a3' }));
      getStore().addAction(makeAction({ type: 'a4' }));
      expect(getStore().actions.length).toBe(3);
      expect(getStore().actions[0].type).toBe('a4');
      expect(getStore().actions[2].type).toBe('a2');
    });

    it('enables canUndo after adding action', () => {
      getStore().addAction(makeAction());
      expect(getStore().canUndo()).toBe(true);
    });

    it('getLastAction returns most recent after add', () => {
      getStore().addAction(makeAction({ type: 'recent' }));
      expect(getStore().getLastAction()?.type).toBe('recent');
    });
  });

  describe('undo', () => {
    it('returns false when no actions', async () => {
      const result = await getStore().undo();
      expect(result).toBe(false);
    });

    it('calls the undo callback', async () => {
      const undoFn = vi.fn().mockResolvedValue(undefined);
      getStore().addAction(makeAction({ undo: undoFn }));
      await getStore().undo();
      expect(undoFn).toHaveBeenCalledOnce();
    });

    it('removes action from actions stack', async () => {
      getStore().addAction(makeAction({ type: 'to-undo' }));
      await getStore().undo();
      expect(getStore().actions).toHaveLength(0);
    });

    it('pushes undone action to redoStack', async () => {
      getStore().addAction(makeAction({ type: 'undo-me' }));
      await getStore().undo();
      expect(getStore().redoStack).toHaveLength(1);
      expect(getStore().redoStack[0].type).toBe('undo-me');
    });

    it('returns true on success', async () => {
      getStore().addAction(makeAction());
      const result = await getStore().undo();
      expect(result).toBe(true);
    });

    it('only undoes the most recent action', async () => {
      getStore().addAction(makeAction({ type: 'first' }));
      getStore().addAction(makeAction({ type: 'second' }));
      await getStore().undo();
      expect(getStore().actions).toHaveLength(1);
      expect(getStore().actions[0].type).toBe('first');
    });

    it('handles synchronous undo callbacks', async () => {
      const syncUndo = vi.fn();
      getStore().addAction({ type: 't', description: 'd', undo: syncUndo });
      const result = await getStore().undo();
      expect(result).toBe(true);
      expect(syncUndo).toHaveBeenCalledOnce();
    });

    it('returns false and logs error when undo throws', async () => {
      const failingUndo = vi.fn().mockRejectedValue(new Error('undo failed'));
      getStore().addAction(makeAction({ undo: failingUndo }));
      const result = await getStore().undo();
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Undo failed', expect.any(Object));
    });

    it('does not move action to redoStack when undo fails', async () => {
      const failingUndo = vi.fn().mockRejectedValue(new Error('fail'));
      getStore().addAction(makeAction({ undo: failingUndo }));
      await getStore().undo();
      expect(getStore().redoStack).toHaveLength(0);
    });

    describe('TTL expiry', () => {
      it('discards expired action and returns false', async () => {
        getStore().addAction(makeAction({ ttl: 1000 }));
        vi.advanceTimersByTime(2000);
        const result = await getStore().undo();
        expect(result).toBe(false);
        expect(getStore().actions).toHaveLength(0);
      });

      it('logs warn when action expired', async () => {
        getStore().addAction(makeAction({ type: 'expired-action', ttl: 500 }));
        vi.advanceTimersByTime(1000);
        await getStore().undo();
        expect(logger.warn).toHaveBeenCalledWith(
          'Undo action expired and was discarded',
          expect.objectContaining({ type: 'expired-action' })
        );
      });

      it('does not discard action within TTL', async () => {
        getStore().addAction(makeAction({ ttl: 60000 }));
        vi.advanceTimersByTime(30000);
        const result = await getStore().undo();
        expect(result).toBe(true);
      });

      it('uses default TTL of 5 minutes when ttl not set', async () => {
        getStore().addAction(makeAction());
        vi.advanceTimersByTime(4 * 60 * 1000); // 4 minutes — still valid
        const result = await getStore().undo();
        expect(result).toBe(true);
      });

      it('expires with default TTL after 5 minutes', async () => {
        getStore().addAction(makeAction());
        vi.advanceTimersByTime(5 * 60 * 1000 + 1); // 5 min + 1ms
        const result = await getStore().undo();
        expect(result).toBe(false);
      });
    });
  });

  describe('redo', () => {
    it('returns false when redoStack is empty', async () => {
      const result = await getStore().redo();
      expect(result).toBe(false);
    });

    it('calls the redo callback', async () => {
      const redoFn = vi.fn().mockResolvedValue(undefined);
      getStore().addAction(makeAction({ redo: redoFn }));
      await getStore().undo();
      vi.clearAllMocks();
      await getStore().redo();
      expect(redoFn).toHaveBeenCalledOnce();
    });

    it('returns false when action has no redo function', async () => {
      const actionNoRedo = { type: 't', description: 'd', undo: vi.fn() };
      getStore().addAction(actionNoRedo);
      await getStore().undo();
      const result = await getStore().redo();
      expect(result).toBe(false);
    });

    it('moves action from redoStack back to actions', async () => {
      getStore().addAction(makeAction({ type: 're-doable' }));
      await getStore().undo();
      await getStore().redo();
      expect(getStore().actions).toHaveLength(1);
      expect(getStore().actions[0].type).toBe('re-doable');
      expect(getStore().redoStack).toHaveLength(0);
    });

    it('returns true on success', async () => {
      getStore().addAction(makeAction());
      await getStore().undo();
      const result = await getStore().redo();
      expect(result).toBe(true);
    });

    it('returns false and logs error when redo throws', async () => {
      const failingRedo = vi.fn().mockRejectedValue(new Error('redo failed'));
      getStore().addAction(makeAction({ redo: failingRedo }));
      await getStore().undo();
      vi.clearAllMocks();
      const result = await getStore().redo();
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Redo failed', expect.any(Object));
    });

    describe('TTL expiry', () => {
      it('discards expired redo action and returns false', async () => {
        getStore().addAction(makeAction({ ttl: 1000 }));
        await getStore().undo();
        vi.advanceTimersByTime(2000);
        const result = await getStore().redo();
        expect(result).toBe(false);
        expect(getStore().redoStack).toHaveLength(0);
      });

      it('logs warn when redo action expired', async () => {
        getStore().addAction(makeAction({ type: 'expired-redo', ttl: 500 }));
        await getStore().undo();
        vi.advanceTimersByTime(1000);
        await getStore().redo();
        expect(logger.warn).toHaveBeenCalledWith(
          'Redo action expired and was discarded',
          expect.objectContaining({ type: 'expired-redo' })
        );
      });
    });
  });

  describe('undo/redo sequence', () => {
    it('supports multiple undo/redo cycles', async () => {
      const undo1 = vi.fn();
      const redo1 = vi.fn();
      getStore().addAction({ type: 'op', description: 'd', undo: undo1, redo: redo1 });

      await getStore().undo();
      expect(getStore().canUndo()).toBe(false);
      expect(getStore().canRedo()).toBe(true);

      await getStore().redo();
      expect(getStore().canUndo()).toBe(true);
      expect(getStore().canRedo()).toBe(false);

      await getStore().undo();
      expect(undo1).toHaveBeenCalledTimes(2);
      expect(redo1).toHaveBeenCalledTimes(1);
    });

    it('adding new action clears redo stack after undo', async () => {
      getStore().addAction(makeAction({ type: 'original' }));
      await getStore().undo();
      expect(getStore().canRedo()).toBe(true);

      getStore().addAction(makeAction({ type: 'new' }));
      expect(getStore().canRedo()).toBe(false);
      expect(getStore().redoStack).toHaveLength(0);
    });
  });

  describe('canUndo / canRedo', () => {
    it('canUndo is true when actions has entries', () => {
      getStore().addAction(makeAction());
      expect(getStore().canUndo()).toBe(true);
    });

    it('canRedo is true when redoStack has entries', async () => {
      getStore().addAction(makeAction());
      await getStore().undo();
      expect(getStore().canRedo()).toBe(true);
    });
  });

  describe('clearHistory', () => {
    it('empties both stacks', async () => {
      getStore().addAction(makeAction({ type: 'a' }));
      getStore().addAction(makeAction({ type: 'b' }));
      await getStore().undo();
      getStore().clearHistory();
      expect(getStore().actions).toEqual([]);
      expect(getStore().redoStack).toEqual([]);
    });

    it('canUndo and canRedo return false after clear', async () => {
      getStore().addAction(makeAction());
      await getStore().undo();
      getStore().clearHistory();
      expect(getStore().canUndo()).toBe(false);
      expect(getStore().canRedo()).toBe(false);
    });
  });

  describe('removeAction', () => {
    it('removes action by id', () => {
      const id1 = getStore().addAction(makeAction({ type: 'first' }));
      getStore().addAction(makeAction({ type: 'second' }));
      getStore().removeAction(id1);
      const { actions } = getStore();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('second');
    });

    it('does nothing if id not found', () => {
      getStore().addAction(makeAction());
      getStore().removeAction('nonexistent-id');
      expect(getStore().actions).toHaveLength(1);
    });

    it('does not affect redoStack', async () => {
      getStore().addAction(makeAction());
      await getStore().undo();
      const redoId = getStore().redoStack[0].id;
      getStore().removeAction(redoId);
      // removeAction only filters actions, not redoStack
      expect(getStore().redoStack).toHaveLength(1);
    });
  });

  describe('getLastAction', () => {
    it('returns null when empty', () => {
      expect(getStore().getLastAction()).toBeNull();
    });

    it('returns most recently added action', () => {
      getStore().addAction(makeAction({ type: 'first' }));
      getStore().addAction(makeAction({ type: 'second' }));
      expect(getStore().getLastAction()?.type).toBe('second');
    });

    it('returns null after all undone and history cleared', async () => {
      getStore().addAction(makeAction());
      await getStore().undo();
      expect(getStore().getLastAction()).toBeNull();
    });
  });
});
