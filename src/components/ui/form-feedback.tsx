import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFeedbackProps {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  title?: string;
  onDismiss?: () => void;
  className?: string;
}

const feedbackConfig = {
  error: {
    icon: AlertCircle,
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    text: 'text-destructive',
    iconColor: 'text-destructive',
  },
  success: {
    icon: CheckCircle2,
    bg: 'bg-[hsl(var(--success)/0.1)]',
    border: 'border-[hsl(var(--success)/0.3)]',
    text: 'text-[hsl(var(--success))]',
    iconColor: 'text-[hsl(var(--success))]',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-[hsl(var(--warning)/0.1)]',
    border: 'border-[hsl(var(--warning)/0.3)]',
    text: 'text-[hsl(var(--warning))]',
    iconColor: 'text-[hsl(var(--warning))]',
  },
  info: {
    icon: Info,
    bg: 'bg-[hsl(var(--info)/0.1)]',
    border: 'border-[hsl(var(--info)/0.3)]',
    text: 'text-[hsl(var(--info))]',
    iconColor: 'text-[hsl(var(--info))]',
  },
};

export function FormFeedback({ type, message, title, onDismiss, className }: FormFeedbackProps) {
  const config = feedbackConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative flex items-start gap-3 p-4 rounded-lg border",
        config.bg,
        config.border,
        className
      )}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
      >
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconColor)} />
      </motion.div>
      
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn("font-medium text-sm mb-1", config.text)}>
            {title}
          </p>
        )}
        <p className={cn("text-sm", config.text)}>
          {message}
        </p>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            "flex-shrink-0 p-1 rounded-md transition-colors",
            "hover:bg-foreground/10",
            config.text
          )}
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

// Animated form feedback wrapper
export function AnimatedFormFeedback({ show, ...props }: FormFeedbackProps & { show: boolean }) {
  return (
    <AnimatePresence>
      {show && <FormFeedback {...props} />}
    </AnimatePresence>
  );
}

// Inline field error for simple use cases
export function FieldError({ error, className }: { error?: string; className?: string }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0, y: -5 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className={cn("text-xs text-destructive flex items-center gap-1 mt-1", className)}
          role="alert"
        >
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

// Success checkmark animation for completed fields
export function FieldSuccess({ show, message }: { show: boolean; message?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex items-center gap-1 text-xs text-[hsl(var(--success))] mt-1"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <CheckCircle2 className="w-3 h-3" />
          </motion.div>
          {message && <span>{message}</span>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
