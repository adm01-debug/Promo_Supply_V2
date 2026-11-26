import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, X, Check, AlertCircle, CheckCircle2, XCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useMobileGestures";
import { create } from "zustand";

type ToastType = "default" | "success" | "error" | "warning" | "info";

interface UndoAction {
  id: string;
  message: string;
  onUndo: () => void;
  onConfirm?: () => void;
  duration?: number;
  type?: ToastType;
  description?: string;
}

interface UndoToastStore {
  actions: UndoAction[];
  addAction: (action: Omit<UndoAction, 'id'>) => string;
  removeAction: (id: string) => void;
}

const useUndoToastStore = create<UndoToastStore>((set) => ({
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

const typeConfig: Record<ToastType, {
  icon: typeof Undo2;
  bgClass: string;
  iconBgClass: string;
  progressClass: string;
  borderClass: string;
}> = {
  default: {
    icon: Undo2,
    bgClass: "bg-card",
    iconBgClass: "bg-warning/10 text-warning",
    progressClass: "bg-warning",
    borderClass: "border-border"
  },
  success: {
    icon: CheckCircle2,
    bgClass: "bg-card",
    iconBgClass: "bg-success/10 text-success",
    progressClass: "bg-success",
    borderClass: "border-green-500/20"
  },
  error: {
    icon: XCircle,
    bgClass: "bg-card",
    iconBgClass: "bg-destructive/10 text-destructive",
    progressClass: "bg-destructive",
    borderClass: "border-destructive/20"
  },
  warning: {
    icon: AlertCircle,
    bgClass: "bg-card",
    iconBgClass: "bg-warning/10 text-warning",
    progressClass: "bg-warning",
    borderClass: "border-warning/20"
  },
  info: {
    icon: Info,
    bgClass: "bg-card",
    iconBgClass: "bg-primary/10 text-primary",
    progressClass: "bg-primary",
    borderClass: "border-primary/20"
  }
};

function UndoToastItem({ action }: { action: UndoAction }) {
  const { removeAction } = useUndoToastStore();
  const { lightTap, success, error } = useHapticFeedback();
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const duration = action.duration || 5000;
  const type = action.type || "default";
  const config = typeConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (isPaused || isExiting) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 100));
        if (newProgress <= 0) {
          clearInterval(interval);
          setIsExiting(true);
          setTimeout(() => {
            action.onConfirm?.();
            removeAction(action.id);
          }, 200);
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [action, duration, isPaused, isExiting, removeAction]);

  const handleUndo = useCallback(() => {
    success();
    setIsExiting(true);
    setTimeout(() => {
      action.onUndo();
      removeAction(action.id);
    }, 200);
  }, [action, removeAction, success]);

  const handleDismiss = useCallback(() => {
    lightTap();
    setIsExiting(true);
    setTimeout(() => {
      action.onConfirm?.();
      removeAction(action.id);
    }, 200);
  }, [action, lightTap, removeAction]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ 
        opacity: isExiting ? 0 : 1, 
        y: isExiting ? 20 : 0, 
        scale: isExiting ? 0.9 : 1 
      }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30 
      }}
      className={cn(
        "relative overflow-hidden max-w-sm w-full",
        "rounded-xl border shadow-2xl shadow-black/10",
        "backdrop-blur-xl",
        config.bgClass,
        config.borderClass
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      role="alert"
      aria-live="polite"
    >
      {/* Glow effect */}
      <motion.div
        className={cn(
          "absolute -inset-px rounded-xl opacity-0",
          "bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        )}
        animate={{ opacity: isPaused ? 0.5 : 0 }}
        transition={{ duration: 0.2 }}
      />

      <div className="relative p-4">
        <div className="flex items-start gap-3">
          {/* Icon with animated background */}
          <motion.div 
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              config.iconBgClass
            )}
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Icon className="w-5 h-5" />
          </motion.div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground leading-tight">
              {action.message}
            </p>
            {action.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {action.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground/70">
              {isPaused ? "⏸ Pausado" : "Toque para pausar"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 px-3 gap-1.5 font-medium",
                "text-primary hover:text-primary hover:bg-primary/10",
                "transition-all duration-200"
              )}
              onClick={handleUndo}
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden sm:inline">Desfazer</span>
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-8 w-8",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted/50 transition-colors"
              )}
              onClick={handleDismiss}
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Progress bar with smooth animation */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
        <motion.div
          className={cn("h-full rounded-full", config.progressClass)}
          style={{ width: `${progress}%` }}
          animate={{ 
            opacity: isPaused ? 0.5 : 1,
            scaleX: isPaused ? 1 : 1 
          }}
          transition={{ duration: 0.1 }}
        />
        {/* Shimmer effect on progress */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}

export function UndoToastContainer() {
  const { actions } = useUndoToastStore();

  return (
    <div 
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 md:bottom-6 z-50",
        "flex flex-col gap-2 w-full max-w-sm px-4 md:px-0",
        "pointer-events-none"
      )}
      aria-label="Notificações"
    >
      <AnimatePresence mode="popLayout">
        {actions.map((action) => (
          <div key={action.id} className="pointer-events-auto">
            <UndoToastItem action={action} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Enhanced hook for showing undo toasts
export function useUndoToast() {
  const { addAction, removeAction } = useUndoToastStore();
  const { lightTap } = useHapticFeedback();

  const showUndo = useCallback((
    message: string,
    onUndo: () => void,
    options?: { 
      onConfirm?: () => void; 
      duration?: number;
      type?: ToastType;
      description?: string;
    }
  ) => {
    lightTap();
    return addAction({
      message,
      onUndo,
      onConfirm: options?.onConfirm,
      duration: options?.duration,
      type: options?.type,
      description: options?.description
    });
  }, [addAction, lightTap]);

  const cancelUndo = useCallback((id: string) => {
    removeAction(id);
  }, [removeAction]);

  // Convenience methods for different toast types
  const showSuccess = useCallback((message: string, onUndo: () => void, options?: Omit<Parameters<typeof showUndo>[2], 'type'>) => {
    return showUndo(message, onUndo, { ...options, type: "success" });
  }, [showUndo]);

  const showError = useCallback((message: string, onUndo: () => void, options?: Omit<Parameters<typeof showUndo>[2], 'type'>) => {
    return showUndo(message, onUndo, { ...options, type: "error" });
  }, [showUndo]);

  const showWarning = useCallback((message: string, onUndo: () => void, options?: Omit<Parameters<typeof showUndo>[2], 'type'>) => {
    return showUndo(message, onUndo, { ...options, type: "warning" });
  }, [showUndo]);

  const showInfo = useCallback((message: string, onUndo: () => void, options?: Omit<Parameters<typeof showUndo>[2], 'type'>) => {
    return showUndo(message, onUndo, { ...options, type: "info" });
  }, [showUndo]);

  return { showUndo, cancelUndo, showSuccess, showError, showWarning, showInfo };
}
