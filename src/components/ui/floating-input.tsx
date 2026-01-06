import * as React from "react";
import { cn } from "@/lib/utils";

export interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, type, label, error, helperText, icon, rightIcon, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);
    const inputId = id || React.useId();

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

    return (
      <div className="relative w-full">
        {/* Icon on the left */}
        {icon && (
          <div className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors z-10",
            isFocused && "text-primary",
            error && "text-destructive"
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
            rightIcon && "pr-10",
            error 
              ? "border-destructive focus:ring-destructive/20 focus:border-destructive" 
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
              : isFocused 
                ? "text-primary" 
                : "text-muted-foreground"
          )}
        >
          {label}
        </label>

        {/* Right Icon */}
        {rightIcon && (
          <div className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          )}>
            {rightIcon}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p 
            id={`${inputId}-error`}
            className="mt-1.5 text-xs text-destructive animate-slide-up"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p 
            id={`${inputId}-helper`}
            className="mt-1.5 text-xs text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
