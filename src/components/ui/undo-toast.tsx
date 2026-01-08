import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useMobileGestures";
import { create } from "zustand";

interface UndoAction {
  id: string;
  message: string;
  onUndo: () => void;
  onConfirm?: () => void;
  duration?: number;
}

interface UndoStore {
  actions: UndoAction[];
  addAction: (action: Omit<UndoAction, 'id'>) => string;
  removeAction: (id: string) => void;
}

export const useUndoStore = create<UndoStore>((set, get) => ({
  actions: [],
  addAction: (action) => {
    const id = Math.random().toString(36).slice(2, 11);
    set((state) => ({
      actions: [...state.actions, { ...action, id }]
    }));
    return id;
  },
  removeAction: (id) => {
    set((state) => ({
      actions: state.actions.filter((a) => a.id !== id)
    }));
  }
}));

function UndoToastItem({ action }: { action: UndoAction }) {
  const { removeAction } = useUndoStore();
  const { lightTap, success, error } = useHapticFeedback();
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const duration = action.duration || 5000;

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 100));
        if (newProgress <= 0) {
          clearInterval(interval);
          action.onConfirm?.();
          removeAction(action.id);
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [action, duration, isPaused, removeAction]);

  const handleUndo = () => {
    success();
    action.onUndo();
    removeAction(action.id);
  };

  const handleDismiss = () => {
    lightTap();
    action.onConfirm?.();
    removeAction(action.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="relative bg-card border border-border rounded-xl shadow-xl overflow-hidden max-w-sm"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
            <Undo2 className="w-5 h-5 text-warning" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {action.message}
            </p>
            <p className="text-xs text-muted-foreground">
              Clique para desfazer
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-primary hover:text-primary hover:bg-primary/10"
              onClick={handleUndo}
            >
              <Undo2 className="w-4 h-4 mr-1" />
              Desfazer
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
        <motion.div
          className="h-full bg-warning"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </motion.div>
  );
}

export function UndoToastContainer() {
  const { actions } = useUndoStore();

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 md:bottom-6 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {actions.map((action) => (
          <UndoToastItem key={action.id} action={action} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Hook for showing undo toasts
export function useUndoToast() {
  const { addAction, removeAction } = useUndoStore();
  const { lightTap } = useHapticFeedback();

  const showUndo = useCallback((
    message: string,
    onUndo: () => void,
    options?: { onConfirm?: () => void; duration?: number }
  ) => {
    lightTap();
    return addAction({
      message,
      onUndo,
      onConfirm: options?.onConfirm,
      duration: options?.duration
    });
  }, [addAction, lightTap]);

  const cancelUndo = useCallback((id: string) => {
    removeAction(id);
  }, [removeAction]);

  return { showUndo, cancelUndo };
}
