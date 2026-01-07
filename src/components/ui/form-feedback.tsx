import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// =============================================================================
// FORM FEEDBACK - Animated form feedback messages
// =============================================================================

interface FormFeedbackProps {
  type: 'error' | 'success' | 'warning' | 'info' | 'loading';
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
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-600 dark:text-green-400',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  loading: {
    icon: Loader2,
    bg: 'bg-muted',
    border: 'border-border',
    text: 'text-muted-foreground',
    iconColor: 'text-muted-foreground',
  },
};

export function FormFeedback({ type, message, title, onDismiss, className }: FormFeedbackProps) {
  const config = feedbackConfig[type];
  const Icon = config.icon;
  const isLoading = type === 'loading';

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
        <Icon className={cn(
          "w-5 h-5 flex-shrink-0 mt-0.5", 
          config.iconColor,
          isLoading && "animate-spin"
        )} />
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

// =============================================================================
// INLINE FIELD ERROR
// =============================================================================

export function FieldError({ error, className }: { error?: string; className?: string }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0, y: -5 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className={cn("text-xs text-destructive flex items-center gap-1 mt-1.5", className)}
          role="alert"
        >
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// FIELD SUCCESS - Shows field validation success
// =============================================================================

export function FieldSuccess({ show, message }: { show: boolean; message?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mt-1.5"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </motion.div>
          {message && <span>{message}</span>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// SAVING INDICATOR - Shows auto-save or save status
// =============================================================================

interface SavingIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
  lastSaved?: Date;
  className?: string;
}

export function SavingIndicator({
  status,
  lastSaved,
  className
}: SavingIndicatorProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className={cn("flex items-center gap-2 text-sm", className)}
      >
        {status === "saving" && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Salvando...</span>
          </>
        )}
        {status === "saved" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            </motion.div>
            <span className="text-green-600 dark:text-green-400">
              Salvo {lastSaved && `às ${formatTime(lastSaved)}`}
            </span>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-destructive">Erro ao salvar</span>
          </>
        )}
        {status === "idle" && lastSaved && (
          <span className="text-muted-foreground">
            Último salvamento: {formatTime(lastSaved)}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// CHARACTER COUNTER - Shows remaining characters
// =============================================================================

interface CharacterCounterProps {
  current: number;
  max: number;
  showWarningAt?: number;
  className?: string;
}

export function CharacterCounter({
  current,
  max,
  showWarningAt = 80,
  className
}: CharacterCounterProps) {
  const percentage = (current / max) * 100;
  const isWarning = percentage >= showWarningAt && percentage < 100;
  const isError = current > max;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "text-xs font-medium transition-colors",
        isError ? "text-destructive" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
        className
      )}
    >
      <span className={cn(isError && "animate-pulse")}>
        {current}
      </span>
      <span className="opacity-60">/{max}</span>
    </motion.div>
  );
}

// =============================================================================
// FORM SECTION HEADER - Section dividers with status
// =============================================================================

interface FormSectionHeaderProps {
  title: string;
  description?: string;
  status?: "complete" | "incomplete" | "error" | "optional";
  className?: string;
}

const sectionStatusConfig = {
  complete: { icon: CheckCircle2, color: "text-green-600 dark:text-green-400", label: "Completo" },
  incomplete: { icon: AlertCircle, color: "text-amber-600 dark:text-amber-400", label: "Incompleto" },
  error: { icon: AlertTriangle, color: "text-destructive", label: "Erro" },
  optional: { icon: Info, color: "text-muted-foreground", label: "Opcional" }
};

export function FormSectionHeader({
  title,
  description,
  status,
  className
}: FormSectionHeaderProps) {
  const statusInfo = status ? sectionStatusConfig[status] : null;
  const StatusIcon = statusInfo?.icon;

  return (
    <div className={cn("space-y-1 pb-4 border-b", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {statusInfo && StatusIcon && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn("flex items-center gap-1.5 text-sm", statusInfo.color)}
          >
            <StatusIcon className="h-4 w-4" />
            <span>{statusInfo.label}</span>
          </motion.div>
        )}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
