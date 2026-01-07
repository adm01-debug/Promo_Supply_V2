import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ValidatedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  success?: boolean;
  successMessage?: string;
  validating?: boolean;
  showValidationOnChange?: boolean;
  validateOnBlur?: boolean;
  onValidate?: (value: string) => Promise<string | undefined> | string | undefined;
  debounceMs?: number;
}

const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ 
    className, 
    type, 
    label, 
    error: externalError, 
    helperText, 
    icon, 
    rightIcon, 
    success: externalSuccess, 
    successMessage,
    validating: externalValidating,
    showValidationOnChange = true,
    validateOnBlur = true,
    onValidate,
    debounceMs = 300,
    id, 
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue);
    const [shake, setShake] = React.useState(false);
    const [internalError, setInternalError] = React.useState<string | undefined>();
    const [internalSuccess, setInternalSuccess] = React.useState(false);
    const [internalValidating, setInternalValidating] = React.useState(false);
    const [touched, setTouched] = React.useState(false);
    const inputId = id || React.useId();
    const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();

    // Use external values if provided, otherwise use internal state
    const error = externalError ?? internalError;
    const success = externalSuccess ?? internalSuccess;
    const validating = externalValidating ?? internalValidating;

    // Shake animation when error appears
    React.useEffect(() => {
      if (error && touched) {
        setShake(true);
        const timer = setTimeout(() => setShake(false), 500);
        return () => clearTimeout(timer);
      }
    }, [error, touched]);

    const runValidation = React.useCallback(async (value: string) => {
      if (!onValidate) return;
      
      setInternalValidating(true);
      try {
        const result = await onValidate(value);
        if (result) {
          setInternalError(result);
          setInternalSuccess(false);
        } else {
          setInternalError(undefined);
          setInternalSuccess(true);
        }
      } catch (e) {
        setInternalError('Validation error');
        setInternalSuccess(false);
      } finally {
        setInternalValidating(false);
      }
    }, [onValidate]);

    const debouncedValidation = React.useCallback((value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        runValidation(value);
      }, debounceMs);
    }, [runValidation, debounceMs]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
      setTouched(true);
      
      if (validateOnBlur && onValidate) {
        runValidation(e.target.value);
      }
      
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setHasValue(!!value);
      
      if (showValidationOnChange && touched && onValidate) {
        debouncedValidation(value);
      }
      
      props.onChange?.(e);
    };

    // Cleanup debounce
    React.useEffect(() => {
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }, []);

    const isFloating = isFocused || hasValue || !!props.value || !!props.defaultValue;

    // Determine status icon
    const statusIcon = validating ? (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: 360 }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
        className="text-muted-foreground"
      >
        <Loader2 className="w-4 h-4" />
      </motion.div>
    ) : error && touched ? (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        className="text-destructive"
      >
        <AlertCircle className="w-4 h-4" />
      </motion.div>
    ) : success && touched ? (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-[hsl(var(--success))]"
      >
        <CheckCircle2 className="w-4 h-4" />
      </motion.div>
    ) : null;

    // Progress indicator for password strength or other metrics
    const showProgress = type === 'password' && hasValue && touched;

    return (
      <motion.div 
        className="relative w-full"
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {/* Icon on the left */}
        {icon && (
          <div className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 transition-colors z-10",
            error && touched ? "text-destructive" : success && touched ? "text-[hsl(var(--success))]" : isFocused ? "text-primary" : "text-muted-foreground"
          )}>
            {icon}
          </div>
        )}

        {/* Input */}
        <input
          type={type}
          id={inputId}
          className={cn(
            "peer flex h-12 w-full rounded-lg border bg-background px-4 pt-4 pb-1 text-sm transition-all duration-200",
            "placeholder:text-transparent",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            icon && "pl-10",
            (rightIcon || statusIcon) && "pr-10",
            error && touched
              ? "border-destructive bg-destructive/5 focus:ring-destructive/20 focus:border-destructive" 
              : success && touched
                ? "border-[hsl(var(--success))] bg-[hsl(var(--success)/0.05)] focus:ring-[hsl(var(--success)/0.2)] focus:border-[hsl(var(--success))]"
                : "border-input focus:ring-primary/20 focus:border-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          placeholder={label}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          aria-invalid={!!(error && touched)}
          aria-describedby={error && touched ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />

        {/* Floating Label */}
        <label
          htmlFor={inputId}
          className={cn(
            "absolute left-0 transition-all duration-200 pointer-events-none origin-left",
            icon ? "left-10" : "left-4",
            isFloating
              ? "top-1.5 text-[10px] font-medium"
              : "top-1/2 -translate-y-1/2 text-sm",
            error && touched
              ? "text-destructive" 
              : success && touched
                ? "text-[hsl(var(--success))]"
                : isFocused 
                  ? "text-primary" 
                  : "text-muted-foreground"
          )}
        >
          {label}
          {props.required && <span className="text-destructive ml-0.5">*</span>}
        </label>

        {/* Right Icon / Status Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {statusIcon}
          {rightIcon && !statusIcon && (
            <div className="text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Error/Success Message with Animation */}
        <AnimatePresence mode="wait">
          {error && touched && (
            <motion.p 
              key="error"
              id={`${inputId}-error`}
              className="mt-1.5 text-xs text-destructive flex items-center gap-1"
              role="alert"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {error}
            </motion.p>
          )}
          {successMessage && success && touched && !error && (
            <motion.p 
              key="success"
              className="mt-1.5 text-xs text-[hsl(var(--success))] flex items-center gap-1"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              {successMessage}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Helper Text */}
        {helperText && !error && !(successMessage && success) && (
          <p 
            id={`${inputId}-helper`}
            className="mt-1.5 text-xs text-muted-foreground"
          >
            {helperText}
          </p>
        )}

        {/* Validating indicator line */}
        {validating && (
          <motion.div
            className="absolute bottom-0 left-0 h-0.5 bg-primary rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: ["0%", "100%", "0%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Error glow effect */}
        {error && touched && (
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-destructive/30 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";

export { ValidatedInput };
