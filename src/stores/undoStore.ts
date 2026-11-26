import { create } from 'zustand';
import { logger } from '@/lib/logger';

export interface UndoAction {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  /** Max age in ms before this action expires. Defaults to 5 minutes. */
  ttl?: number;
  /**
   * Undo callback. Avoid closing over component state — pass snapshot data via
   * the `data` field and read it inside this function via `action.data` to
   * prevent stale closures from operating on outdated values.
   */
  undo: () => Promise<void> | void;
  redo?: () => Promise<void> | void;
  /** Snapshot of relevant data at action creation time — use this inside undo/redo
   *  callbacks instead of captured component state to avoid stale closure bugs. */
  data?: unknown;
}

const DEFAULT_TTL_MS = 5 * 60_000;

interface UndoStore {
  actions: UndoAction[];
  redoStack: UndoAction[];
  maxActions: number;
  addAction: (action: Omit<UndoAction, 'id' | 'timestamp'>) => string;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getLastAction: () => UndoAction | null;
  clearHistory: () => void;
  removeAction: (id: string) => void;
}

export const useUndoStore = create<UndoStore>((set, get) => ({
  actions: [],
  redoStack: [],
  maxActions: 10,

  addAction: (action) => {
    const id = `undo-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const newAction: UndoAction = {
      ...action,
      id,
      timestamp: Date.now(),
    };

    set((state) => ({
      actions: [newAction, ...state.actions].slice(0, state.maxActions),
      redoStack: [], // Clear redo stack when new action is added
    }));

    return id;
  },

  undo: async () => {
    const { actions, redoStack } = get();
    if (actions.length === 0) return false;

    const [lastAction, ...remainingActions] = actions;

    // Discard expired actions silently to avoid executing stale closures
    const ttl = lastAction.ttl ?? DEFAULT_TTL_MS;
    if (Date.now() - lastAction.timestamp > ttl) {
      set({ actions: remainingActions });
      logger.warn('Undo action expired and was discarded', { type: lastAction.type });
      return false;
    }

    try {
      await lastAction.undo();
      set({
        actions: remainingActions,
        redoStack: [lastAction, ...redoStack],
      });
      return true;
    } catch (error) {
      logger.error('Undo failed', { error });
      return false;
    }
  },

  redo: async () => {
    const { actions, redoStack } = get();
    if (redoStack.length === 0) return false;

    const [lastRedo, ...remainingRedos] = redoStack;

    if (!lastRedo.redo) return false;

    const ttl = lastRedo.ttl ?? DEFAULT_TTL_MS;
    if (Date.now() - lastRedo.timestamp > ttl) {
      set({ redoStack: remainingRedos });
      logger.warn('Redo action expired and was discarded', { type: lastRedo.type });
      return false;
    }

    try {
      await lastRedo.redo();
      set({
        actions: [lastRedo, ...actions],
        redoStack: remainingRedos,
      });
      return true;
    } catch (error) {
      logger.error('Redo failed', { error });
      return false;
    }
  },

  canUndo: () => get().actions.length > 0,
  canRedo: () => get().redoStack.length > 0,
  
  getLastAction: () => {
    const { actions } = get();
    return actions.length > 0 ? actions[0] : null;
  },

  clearHistory: () => set({ actions: [], redoStack: [] }),

  removeAction: (id) => set((state) => ({
    actions: state.actions.filter(a => a.id !== id),
  })),
}));
