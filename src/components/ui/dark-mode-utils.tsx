import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================
// DARK MODE REFINED CSS VARIABLES
// ============================================

/**
 * Dark Mode Refinements Configuration
 * 
 * This file provides utilities and components for enhanced dark mode experience.
 * The actual CSS variables should be applied in index.css
 */

// Dark mode specific styles for common elements
export const darkModeStyles = {
  // Cards with subtle glow in dark mode
  card: {
    base: "bg-card border rounded-xl transition-all duration-200",
    hover: "hover:shadow-md hover:border-primary/20",
    dark: "dark:bg-card/95 dark:border-border/50 dark:hover:border-primary/30 dark:hover:shadow-primary/5",
  },
  
  // Inputs with better visibility
  input: {
    base: "border bg-background transition-colors",
    focus: "focus:border-primary focus:ring-2 focus:ring-primary/20",
    dark: "dark:bg-background/50 dark:border-border/60 dark:focus:border-primary dark:focus:ring-primary/30",
  },
  
  // Subtle glass effect for overlays
  glass: {
    light: "bg-background/80 backdrop-blur-md border border-border/50",
    dark: "dark:bg-background/70 dark:backdrop-blur-xl dark:border-border/30",
  },
  
  // Elevated surfaces
  elevated: {
    level1: "bg-card shadow-sm dark:bg-card/80 dark:shadow-black/20",
    level2: "bg-card shadow-md dark:bg-card/90 dark:shadow-black/30",
    level3: "bg-card shadow-lg dark:bg-card/95 dark:shadow-black/40",
  },
  
  // Text with better contrast
  text: {
    primary: "text-foreground",
    secondary: "text-muted-foreground dark:text-muted-foreground/90",
    muted: "text-muted-foreground/70 dark:text-muted-foreground/60",
  },
  
  // Interactive elements
  interactive: {
    base: "transition-all duration-200",
    hover: "hover:bg-muted/50 dark:hover:bg-muted/30",
    active: "active:bg-muted dark:active:bg-muted/50",
    focus: "focus-visible:ring-2 focus-visible:ring-primary/50",
  },
};

// Helper function to combine dark mode styles
export function withDarkMode(...styles: (keyof typeof darkModeStyles | string)[]) {
  return styles
    .map((style) => {
      if (typeof style === "string") return style;
      const config = darkModeStyles[style];
      if (!config) return "";
      return Object.values(config).join(" ");
    })
    .join(" ");
}

// ============================================
// DARK MODE AWARE COMPONENTS
// ============================================

interface DarkModeCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "elevated";
  level?: 1 | 2 | 3;
  glow?: boolean;
  children: React.ReactNode;
}

export function DarkModeCard({
  variant = "default",
  level = 1,
  glow = false,
  className,
  children,
  ...props
}: DarkModeCardProps) {
  const baseStyles = "rounded-xl border transition-all duration-200";
  
  const variantStyles = {
    default: cn(
      "bg-card",
      "dark:bg-card/95 dark:border-border/50",
      glow && "dark:hover:shadow-lg dark:hover:shadow-primary/10"
    ),
    glass: cn(
      "bg-background/80 backdrop-blur-md border-border/50",
      "dark:bg-background/60 dark:backdrop-blur-xl dark:border-border/30"
    ),
    elevated: cn(
      darkModeStyles.elevated[`level${level}` as keyof typeof darkModeStyles.elevated]
    ),
  };

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface DarkModeSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  blur?: "sm" | "md" | "lg" | "xl";
  opacity?: number;
  children: React.ReactNode;
}

export function DarkModeSurface({
  blur = "md",
  opacity = 80,
  className,
  children,
  ...props
}: DarkModeSurfaceProps) {
  const blurValues = {
    sm: "backdrop-blur-sm",
    md: "backdrop-blur-md",
    lg: "backdrop-blur-lg",
    xl: "backdrop-blur-xl",
  };

  return (
    <div
      className={cn(
        "border border-border/50 rounded-xl transition-colors",
        blurValues[blur],
        `bg-background/${opacity}`,
        `dark:bg-background/${Math.max(opacity - 20, 40)}`,
        "dark:border-border/30",
        className
      )}
      style={{
        backgroundColor: `hsl(var(--background) / ${opacity / 100})`,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================
// DARK MODE GRADIENT UTILITIES
// ============================================

interface GradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  gradient?: "primary" | "success" | "warning" | "danger" | "info" | "rainbow";
  children: React.ReactNode;
}

const gradientConfigs = {
  primary: "from-primary via-primary-glow to-primary",
  success: "from-success via-emerald-400 to-success",
  warning: "from-warning via-amber-400 to-warning",
  danger: "from-destructive via-red-400 to-destructive",
  info: "from-info via-cyan-400 to-info",
  rainbow: "from-red-500 via-yellow-500 to-blue-500",
};

export function GradientText({
  gradient = "primary",
  className,
  children,
  ...props
}: GradientTextProps) {
  return (
    <span
      className={cn(
        "bg-gradient-to-r bg-clip-text text-transparent",
        gradientConfigs[gradient],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// ============================================
// DARK MODE GLOW EFFECTS
// ============================================

interface GlowProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: "primary" | "success" | "warning" | "danger" | "info";
  intensity?: "subtle" | "medium" | "strong";
  children: React.ReactNode;
}

const glowColors = {
  primary: "shadow-primary/30 dark:shadow-primary/40",
  success: "shadow-success/30 dark:shadow-success/40",
  warning: "shadow-warning/30 dark:shadow-warning/40",
  danger: "shadow-destructive/30 dark:shadow-destructive/40",
  info: "shadow-info/30 dark:shadow-info/40",
};

const glowIntensities = {
  subtle: "shadow-lg",
  medium: "shadow-xl",
  strong: "shadow-2xl",
};

export function Glow({
  color = "primary",
  intensity = "medium",
  className,
  children,
  ...props
}: GlowProps) {
  return (
    <div
      className={cn(
        "transition-shadow duration-300",
        glowIntensities[intensity],
        glowColors[color],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================
// DARK MODE DIVIDER
// ============================================

interface DarkModeDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "solid" | "gradient" | "glow";
  orientation?: "horizontal" | "vertical";
}

export function DarkModeDivider({
  variant = "solid",
  orientation = "horizontal",
  className,
  ...props
}: DarkModeDividerProps) {
  const isHorizontal = orientation === "horizontal";
  
  const variantStyles = {
    solid: "bg-border dark:bg-border/50",
    gradient: cn(
      "bg-gradient-to-r from-transparent via-border to-transparent",
      "dark:from-transparent dark:via-border/50 dark:to-transparent"
    ),
    glow: cn(
      "bg-gradient-to-r from-transparent via-primary/30 to-transparent",
      "dark:via-primary/50 shadow-sm shadow-primary/20"
    ),
  };

  return (
    <div
      role="separator"
      className={cn(
        isHorizontal ? "w-full h-px" : "h-full w-px",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

// ============================================
// DARK MODE SKELETON
// ============================================

interface DarkModeSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "shimmer" | "pulse";
}

export function DarkModeSkeleton({
  variant = "shimmer",
  className,
  ...props
}: DarkModeSkeletonProps) {
  const variants = {
    default: "bg-muted dark:bg-muted/50",
    shimmer: cn(
      "bg-muted dark:bg-muted/30",
      "relative overflow-hidden",
      "after:absolute after:inset-0",
      "after:bg-gradient-to-r after:from-transparent after:via-background/50 after:to-transparent",
      "after:animate-shimmer",
      "dark:after:via-background/30"
    ),
    pulse: "bg-muted dark:bg-muted/40 animate-pulse",
  };

  return (
    <div
      className={cn(
        "rounded-md",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

// ============================================
// DARK MODE TOOLTIP STYLES
// ============================================

export const tooltipStyles = {
  content: cn(
    "z-50 overflow-hidden rounded-lg border px-3 py-1.5 text-sm shadow-lg",
    "bg-popover text-popover-foreground",
    "dark:bg-popover/95 dark:border-border/50 dark:shadow-black/30",
    "animate-in fade-in-0 zoom-in-95"
  ),
  arrow: "fill-popover dark:fill-popover/95",
};

// ============================================
// DARK MODE AWARE HOOK
// ============================================

export function useDarkMode() {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return { isDark, isLight: !isDark };
}

// ============================================
// DARK MODE COLOR UTILITIES
// ============================================

export const darkModeColors = {
  // Background layers
  bg: {
    base: "bg-background",
    elevated: "bg-card dark:bg-card/95",
    overlay: "bg-background/80 dark:bg-background/60",
    muted: "bg-muted dark:bg-muted/50",
  },
  
  // Border styles
  border: {
    default: "border-border dark:border-border/60",
    subtle: "border-border/50 dark:border-border/30",
    accent: "border-primary/20 dark:border-primary/30",
  },
  
  // Shadow styles
  shadow: {
    sm: "shadow-sm dark:shadow-black/20",
    md: "shadow-md dark:shadow-black/30",
    lg: "shadow-lg dark:shadow-black/40",
    glow: "shadow-lg shadow-primary/10 dark:shadow-primary/20",
  },
};
