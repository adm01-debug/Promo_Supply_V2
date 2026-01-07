import { useEffect, useCallback } from 'react';
import { useUndoStore } from '@/stores/undoStore';
import { toast } from 'sonner';
import { useHapticFeedback } from '@/hooks/useMobileGestures';

export function useGlobalUndo() {
  const { undo, redo, canUndo, canRedo, getLastAction, addAction } = useUndoStore();
  const haptic = useHapticFeedback();

  const handleUndo = useCallback(async () => {
    const lastAction = getLastAction();
    if (!lastAction) {
      toast.info('Nada para desfazer');
      return;
    }

    const success = await undo();
    if (success) {
      haptic.success();
      toast.success(`Desfeito: ${lastAction.description}`, {
        action: canRedo() ? {
          label: 'Refazer',
          onClick: handleRedo,
        } : undefined,
      });
    } else {
      haptic.error();
      toast.error('Não foi possível desfazer a ação');
    }
  }, [undo, getLastAction, haptic]);

  const handleRedo = useCallback(async () => {
    if (!canRedo()) {
      toast.info('Nada para refazer');
      return;
    }

    const success = await redo();
    if (success) {
      haptic.success();
      toast.success('Ação refeita');
    } else {
      haptic.error();
      toast.error('Não foi possível refazer a ação');
    }
  }, [redo, canRedo, haptic]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }

      // Ctrl+Y or Cmd+Y for redo (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return {
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
    addAction,
  };
}

// Hook for components to register undoable actions
export function useUndoableAction() {
  const { addAction } = useUndoStore();

  const registerAction = useCallback(
    <T extends any>(
      description: string,
      undoFn: () => Promise<void> | void,
      redoFn?: () => Promise<void> | void,
      data?: T
    ) => {
      return addAction({
        type: 'user-action',
        description,
        undo: undoFn,
        redo: redoFn,
        data,
      });
    },
    [addAction]
  );

  return { registerAction };
}
