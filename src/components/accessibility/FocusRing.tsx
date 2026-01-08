import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface FocusRingProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  offset?: "none" | "sm" | "md" | "lg";
  color?: "primary" | "accent" | "warning" | "destructive";
}

const offsetClasses = {
  none: "focus-within:ring-offset-0",
  sm: "focus-within:ring-offset-1",
  md: "focus-within:ring-offset-2",
  lg: "focus-within:ring-offset-4",
};

const colorClasses = {
  primary: "focus-within:ring-primary/50",
  accent: "focus-within:ring-accent/50",
  warning: "focus-within:ring-warning/50",
  destructive: "focus-within:ring-destructive/50",
};

export const FocusRing = forwardRef<HTMLDivElement, FocusRingProps>(
  ({ children, className, offset = "md", color = "primary", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg transition-all duration-200",
          "focus-within:ring-2 focus-within:ring-offset-background",
          offsetClasses[offset],
          colorClasses[color],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FocusRing.displayName = "FocusRing";

// High contrast focus indicator for critical actions
export const HighContrastFocus = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }
>(({ children, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg transition-all duration-200",
        "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2",
        "focus-within:outline-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

HighContrastFocus.displayName = "HighContrastFocus";
