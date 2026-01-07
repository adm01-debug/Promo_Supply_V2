import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  success?: boolean;
  successMessage?: string;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, type, label, error, helperText, icon, rightIcon, success, successMessage, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);
    const [shake, setShake] = React.useState(false);
    const inputId = id || React.useId();

    // Shake animation when error appears
    React.useEffect(() => {
      if (error) {
        setShake(true);
        const timer = setTimeout(() => setShake(false), 500);
        return () => clearTimeout(timer);
      }
    }, [error]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    const isFloating = isFocused || hasValue || !!props.value || !!props.defaultValue;

    // Determine status icon
    const statusIcon = error ? (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        className="text-destructive"
      >
        <AlertCircle className="w-4 h-4" />
      </motion.div>
    ) : success ? (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-[hsl(var(--success))]"
      >
        <CheckCircle2 className="w-4 h-4" />
      </motion.div>
    ) : null;

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
            error ? "text-destructive" : success ? "text-[hsl(var(--success))]" : isFocused ? "text-primary" : "text-muted-foreground"
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
            error 
              ? "border-destructive bg-destructive/5 focus:ring-destructive/20 focus:border-destructive" 
              : success 
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
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
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
            error 
              ? "text-destructive" 
              : success
                ? "text-[hsl(var(--success))]"
                : isFocused 
                  ? "text-primary" 
                  : "text-muted-foreground"
          )}
        >
          {label}
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
          {error && (
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
          {successMessage && success && !error && (
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
        {helperText && !error && !successMessage && (
          <p 
            id={`${inputId}-helper`}
            className="mt-1.5 text-xs text-muted-foreground"
          >
            {helperText}
          </p>
        )}

        {/* Error glow effect */}
        {error && (
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

FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
