import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  haptic?: boolean;
}

const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ 
    className, 
    variant = "default", 
    size = "default", 
    loading = false,
    icon,
    haptic = true,
    children,
    onClick,
    disabled,
    ...props 
  }, ref) => {
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const combinedRef = useCombinedRefs(ref, buttonRef);

    // Touch feedback with ripple effect
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;

      // Haptic feedback (if supported)
      if (haptic && "vibrate" in navigator) {
        navigator.vibrate(10);
      }

      // Create ripple effect
      const button = buttonRef.current;
      if (button) {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = document.createElement("span");
        ripple.className = "touch-ripple";
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
      }

      onClick?.(e);
    };

    const variants = {
      default: "bg-card border border-border text-foreground hover:bg-accent active:bg-accent/80",
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
      ghost: "hover:bg-accent active:bg-accent/80 text-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
    };

    const sizes = {
      sm: "min-h-[44px] px-4 text-sm",
      default: "min-h-[48px] px-6 text-base",
      lg: "min-h-[56px] px-8 text-lg",
    };

    return (
      <button
        ref={combinedRef}
        className={cn(
          // Base styles
          "relative inline-flex items-center justify-center gap-2 rounded-xl font-medium",
          "transition-all duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "overflow-hidden",
          // Touch-friendly styles
          "touch-manipulation select-none",
          // Active state with scale
          "active:scale-[0.97]",
          // Variants and sizes
          variants[variant],
          sizes[size],
          // Disabled state
          (disabled || loading) && "opacity-50 cursor-not-allowed active:scale-100",
          className
        )}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

TouchButton.displayName = "TouchButton";

// Utility hook to combine refs
function useCombinedRefs<T>(...refs: (React.Ref<T> | null)[]) {
  const targetRef = React.useRef<T>(null);

  React.useEffect(() => {
    refs.forEach((ref) => {
      if (!ref) return;

      if (typeof ref === "function") {
        ref(targetRef.current);
      } else {
        (ref as React.MutableRefObject<T | null>).current = targetRef.current;
      }
    });
  }, [refs]);

  return targetRef;
}

// Swipeable component for touch gestures
interface SwipeableProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
}

export const Swipeable = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className,
}: SwipeableProps) => {
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > threshold && absX > absY) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else if (absY > threshold && absY > absX) {
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }

    touchStart.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={cn("touch-manipulation", className)}
    >
      {children}
    </div>
  );
};

export { TouchButton };
