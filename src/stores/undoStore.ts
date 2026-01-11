import { create } from 'zustand';

export interface UndoAction {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  undo: () => Promise<void> | void;
  redo?: () => Promise<void> | void;
  data?: unknown;
}

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
    
    try {
      await lastAction.undo();
      
      set({
        actions: remainingActions,
        redoStack: [lastAction, ...redoStack],
      });
      
      return true;
    } catch (error) {
      console.error('Undo failed:', error);
      return false;
    }
  },

  redo: async () => {
    const { actions, redoStack } = get();
    if (redoStack.length === 0) return false;

    const [lastRedo, ...remainingRedos] = redoStack;
    
    if (!lastRedo.redo) return false;

    try {
      await lastRedo.redo();
      
      set({
        actions: [lastRedo, ...actions],
        redoStack: remainingRedos,
      });
      
      return true;
    } catch (error) {
      console.error('Redo failed:', error);
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
