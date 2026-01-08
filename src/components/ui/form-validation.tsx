import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Eye,
  EyeOff,
  Loader2,
  X
} from "lucide-react";
import { Input } from "./input";
import { Label } from "./label";
import { useHapticFeedback } from "@/hooks/useMobileGestures";

// ============================================
// VALIDATION STATUS INDICATOR
// ============================================

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'warning';

interface ValidationStatusIndicatorProps {
  status: ValidationStatus;
  message?: string;
  className?: string;
}

const statusConfig = {
  idle: { icon: null, color: '', bgColor: '' },
  validating: { icon: Loader2, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  valid: { icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/10' },
  invalid: { icon: AlertCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  warning: { icon: AlertTriangle, color: 'text-warning', bgColor: 'bg-warning/10' },
};

export function ValidationStatusIndicator({ 
  status, 
  message, 
  className 
}: ValidationStatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  if (status === 'idle' || !Icon) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -5, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -5, height: 0 }}
        className={cn("flex items-center gap-2 mt-1.5", className)}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          <Icon 
            className={cn(
              "h-4 w-4",
              config.color,
              status === 'validating' && "animate-spin"
            )} 
          />
        </motion.div>
        {message && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn("text-sm", config.color)}
          >
            {message}
          </motion.span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// VALIDATED INPUT FIELD
// ============================================

interface ValidatedInputProps extends React.ComponentProps<typeof Input> {
  label?: string;
  status?: ValidationStatus;
  validationMessage?: string;
  hint?: string;
  required?: boolean;
  showPasswordToggle?: boolean;
  showClearButton?: boolean;
  onClear?: () => void;
}

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(({
  label,
  status = 'idle',
  validationMessage,
  hint,
  required,
  showPasswordToggle,
  showClearButton,
  onClear,
  className,
  type,
  value,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const { lightTap } = useHapticFeedback();
  
  const config = statusConfig[status];
  const inputType = showPasswordToggle && type === 'password' 
    ? (showPassword ? 'text' : 'password')
    : type;

  const handleTogglePassword = () => {
    lightTap();
    setShowPassword(!showPassword);
  };

  const handleClear = () => {
    lightTap();
    onClear?.();
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={ref}
          type={inputType}
          value={value}
          className={cn(
            "pr-10 transition-all duration-200",
            status === 'valid' && "border-success focus:ring-success/30",
            status === 'invalid' && "border-destructive focus:ring-destructive/30",
            status === 'warning' && "border-warning focus:ring-warning/30",
            className
          )}
          {...props}
        />
        
        {/* Right side icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Validation status icon */}
          <AnimatePresence mode="wait">
            {status !== 'idle' && (
              <motion.div
                key={status}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                {status === 'validating' ? (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                ) : status === 'valid' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : status === 'invalid' ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : status === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-warning" />
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clear button */}
          {showClearButton && value && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </motion.button>
          )}

          {/* Password toggle */}
          {showPasswordToggle && type === 'password' && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={handleTogglePassword}
              className="p-1 rounded-full hover:bg-muted transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* Hint text */}
      {hint && status === 'idle' && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Info className="h-3.5 w-3.5" />
          {hint}
        </p>
      )}

      {/* Validation message */}
      <ValidationStatusIndicator 
        status={status} 
        message={validationMessage}
      />
    </div>
  );
});

ValidatedInput.displayName = "ValidatedInput";

// ============================================
// INLINE VALIDATION BADGE
// ============================================

interface InlineValidationBadgeProps {
  status: ValidationStatus;
  message: string;
  className?: string;
}

export function InlineValidationBadge({ 
  status, 
  message, 
  className 
}: InlineValidationBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  if (status === 'idle' || !Icon) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        config.bgColor,
        config.color,
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", status === 'validating' && "animate-spin")} />
      {message}
    </motion.div>
  );
}

// ============================================
// FORM FIELD GROUP WITH ANIMATION
// ============================================

interface FormFieldGroupProps {
  children: React.ReactNode;
  error?: string;
  touched?: boolean;
  className?: string;
}

export function FormFieldGroup({ 
  children, 
  error, 
  touched,
  className 
}: FormFieldGroupProps) {
  const hasError = touched && error;

  return (
    <motion.div
      className={cn("space-y-2", className)}
      animate={{
        x: hasError ? [0, -4, 4, -4, 4, 0] : 0,
      }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      {children}
      <AnimatePresence>
        {hasError && (
          <motion.p
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="text-sm text-destructive flex items-center gap-1.5"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// PASSWORD STRENGTH METER
// ============================================

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  requirements: { label: string; met: boolean }[];
} {
  const requirements = [
    { label: "Mínimo 8 caracteres", met: password.length >= 8 },
    { label: "Letra maiúscula", met: /[A-Z]/.test(password) },
    { label: "Letra minúscula", met: /[a-z]/.test(password) },
    { label: "Número", met: /[0-9]/.test(password) },
    { label: "Caractere especial", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const metCount = requirements.filter(r => r.met).length;
  const score = metCount / requirements.length;

  let label = "Muito fraca";
  let color = "bg-destructive";

  if (score >= 0.8) {
    label = "Muito forte";
    color = "bg-success";
  } else if (score >= 0.6) {
    label = "Forte";
    color = "bg-emerald-500";
  } else if (score >= 0.4) {
    label = "Média";
    color = "bg-warning";
  } else if (score >= 0.2) {
    label = "Fraca";
    color = "bg-orange-500";
  }

  return { score, label, color, requirements };
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const { score, label, color, requirements } = getPasswordStrength(password);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Força da senha</span>
          <motion.span
            key={label}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-medium"
          >
            {label}
          </motion.span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", color)}
            initial={{ width: 0 }}
            animate={{ width: `${score * 100}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-1.5">
        {requirements.map((req, i) => (
          <motion.div
            key={req.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-1.5 text-xs"
          >
            <motion.div
              animate={{ 
                scale: req.met ? [1, 1.2, 1] : 1,
                transition: { duration: 0.2 }
              }}
            >
              {req.met ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
              )}
            </motion.div>
            <span className={req.met ? "text-foreground" : "text-muted-foreground"}>
              {req.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// CHARACTER COUNTER
// ============================================

interface CharacterCounterProps {
  current: number;
  max: number;
  showWarning?: boolean;
  warningThreshold?: number;
  className?: string;
}

export function CharacterCounter({
  current,
  max,
  showWarning = true,
  warningThreshold = 0.8,
  className,
}: CharacterCounterProps) {
  const percentage = current / max;
  const isWarning = showWarning && percentage >= warningThreshold && percentage < 1;
  const isExceeded = current > max;

  return (
    <motion.div
      className={cn(
        "text-xs text-right",
        isExceeded ? "text-destructive" : isWarning ? "text-warning" : "text-muted-foreground",
        className
      )}
      animate={{
        scale: isExceeded ? [1, 1.1, 1] : 1,
      }}
      transition={{ duration: 0.2 }}
    >
      <span className="font-medium">{current}</span>
      <span>/{max}</span>
    </motion.div>
  );
}

// ============================================
// ASYNC VALIDATION HOOK
// ============================================

interface UseAsyncValidationOptions {
  debounceMs?: number;
  validate: (value: string) => Promise<{ valid: boolean; message?: string }>;
}

export function useAsyncValidation({ 
  debounceMs = 300, 
  validate 
}: UseAsyncValidationOptions) {
  const [status, setStatus] = React.useState<ValidationStatus>('idle');
  const [message, setMessage] = React.useState<string>();
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const validateValue = React.useCallback(async (value: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!value) {
      setStatus('idle');
      setMessage(undefined);
      return;
    }

    setStatus('validating');

    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await validate(value);
        setStatus(result.valid ? 'valid' : 'invalid');
        setMessage(result.message);
      } catch {
        setStatus('invalid');
        setMessage('Erro ao validar');
      }
    }, debounceMs);
  }, [debounceMs, validate]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { status, message, validateValue };
}
