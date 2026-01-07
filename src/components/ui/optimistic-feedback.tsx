import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, AlertCircle, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type FeedbackState = 'idle' | 'pending' | 'success' | 'error';

interface OptimisticFeedbackProps {
  state: FeedbackState;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function OptimisticFeedback({ 
  state, 
  className, 
  showIcon = true,
  size = 'md' 
}: OptimisticFeedbackProps) {
  if (state === 'idle' || !showIcon) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.15 }}
        className={cn("flex items-center justify-center", className)}
      >
        {state === 'pending' && (
          <Loader2 className={cn(sizeClasses[size], "animate-spin text-muted-foreground")} />
        )}
        {state === 'success' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <Check className={cn(sizeClasses[size], "text-green-500")} />
          </motion.div>
        )}
        {state === 'error' && (
          <AlertCircle className={cn(sizeClasses[size], "text-destructive")} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Optimistic list item wrapper
interface OptimisticListItemProps {
  isPending?: boolean;
  isOptimistic?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function OptimisticListItem({ 
  isPending, 
  isOptimistic, 
  children, 
  className 
}: OptimisticListItemProps) {
  return (
    <motion.div
      layout
      initial={isOptimistic ? { opacity: 0, y: -10 } : false}
      animate={{ 
        opacity: isPending ? 0.6 : 1, 
        y: 0,
        scale: isPending ? 0.98 : 1,
      }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative",
        isPending && "pointer-events-none",
        className
      )}
    >
      {children}
      {isPending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-background/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center"
        >
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </motion.div>
      )}
    </motion.div>
  );
}

// Optimistic action button
interface OptimisticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isPending?: boolean;
  isSuccess?: boolean;
  children: React.ReactNode;
}

export function OptimisticButton({ 
  isPending, 
  isSuccess, 
  children, 
  className,
  disabled,
  ...props 
}: OptimisticButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isPending}
      className={cn(
        "relative inline-flex items-center justify-center transition-all",
        isPending && "opacity-70 cursor-wait",
        isSuccess && "bg-green-500 text-white",
        className
      )}
    >
      <span className={cn(isPending && "opacity-0")}>{children}</span>
      {isPending && (
        <Loader2 className="absolute w-4 h-4 animate-spin" />
      )}
      {isSuccess && !isPending && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute"
        >
          <Check className="w-4 h-4" />
        </motion.div>
      )}
    </button>
  );
}

// Inline save indicator
interface InlineSaveIndicatorProps {
  isSaving?: boolean;
  isSaved?: boolean;
  lastSaved?: Date;
  className?: string;
}

export function InlineSaveIndicator({ 
  isSaving, 
  isSaved, 
  lastSaved,
  className 
}: InlineSaveIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}
    >
      <AnimatePresence mode="wait">
        {isSaving ? (
          <motion.div
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Salvando...</span>
          </motion.div>
        ) : isSaved ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-green-600"
          >
            <Check className="w-3 h-3" />
            <span>Salvo</span>
          </motion.div>
        ) : lastSaved ? (
          <motion.span
            key="lastSaved"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Última atualização: {lastSaved.toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
