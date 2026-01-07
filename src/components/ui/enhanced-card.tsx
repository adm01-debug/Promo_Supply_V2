import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const enhancedCardVariants = cva(
  "rounded-xl border bg-card text-card-foreground transition-all duration-300",
  {
    variants: {
      variant: {
        default: "border-border shadow-sm",
        elevated: "border-border/50 shadow-lg hover:shadow-xl",
        interactive: "border-border shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer",
        glass: "border-border/30 bg-card/80 backdrop-blur-xl shadow-lg",
        gradient: "border-0 bg-gradient-to-br from-card via-card to-primary/5 shadow-md",
        highlighted: "border-primary/30 bg-primary/5 shadow-md ring-1 ring-primary/20",
        destructive: "border-destructive/30 bg-destructive/5 shadow-md",
        success: "border-success/30 bg-success/5 shadow-md",
        warning: "border-warning/30 bg-warning/5 shadow-md",
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
      glow: {
        none: "",
        primary: "shadow-glow-sm",
        success: "shadow-glow-success",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      glow: "none",
    },
  }
);

export interface EnhancedCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof enhancedCardVariants> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
  badge?: React.ReactNode;
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ className, variant, size, glow, header, footer, loading, badge, children, ...props }, ref) => {
    if (loading) {
      return (
        <div 
          ref={ref} 
          className={cn(enhancedCardVariants({ variant, size, glow }), "animate-pulse", className)} 
          {...props}
        >
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </div>
      );
    }

    return (
      <motion.div 
        ref={ref} 
        className={cn(enhancedCardVariants({ variant, size, glow }), "relative", className)} 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {badge && (
          <div className="absolute -top-2 -right-2 z-10">
            {badge}
          </div>
        )}
        
        {header && (
          <div className="mb-4 pb-4 border-b border-border">
            {header}
          </div>
        )}
        
        {children}
        
        {footer && (
          <div className="mt-4 pt-4 border-t border-border">
            {footer}
          </div>
        )}
      </motion.div>
    );
  }
);

EnhancedCard.displayName = "EnhancedCard";

// Stat Card for KPIs and metrics
interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, title, value, description, icon, trend, variant = "default", ...props }, ref) => {
    const variantStyles = {
      default: "bg-card border-border",
      primary: "bg-primary/5 border-primary/20",
      success: "bg-success/5 border-success/20",
      warning: "bg-warning/5 border-warning/20",
      destructive: "bg-destructive/5 border-destructive/20",
    };

    const iconStyles = {
      default: "bg-muted text-muted-foreground",
      primary: "bg-primary/10 text-primary",
      success: "bg-success/10 text-success",
      warning: "bg-warning/10 text-warning",
      destructive: "bg-destructive/10 text-destructive",
    };

    const TrendIcon = trend?.direction === "up" 
      ? TrendingUp 
      : trend?.direction === "down" 
      ? TrendingDown 
      : Minus;

    const trendColors = {
      up: "text-success bg-success/10",
      down: "text-destructive bg-destructive/10",
      neutral: "text-muted-foreground bg-muted",
    };

    return (
      <motion.div 
        ref={ref} 
        className={cn(
          "rounded-xl border p-5 transition-all duration-200 hover:shadow-md",
          variantStyles[variant],
          className
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -2 }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <motion.p 
              className="text-2xl font-bold tracking-tight"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              {value}
            </motion.p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          
          {icon && (
            <motion.div 
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                iconStyles[variant]
              )}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {icon}
            </motion.div>
          )}
        </div>

        {trend && (
          <motion.div 
            className="mt-3 flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
              trendColors[trend.direction]
            )}>
              <TrendIcon className="w-3 h-3" />
              {trend.value > 0 ? "+" : ""}{Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-muted-foreground">
              {trend.label || "vs período anterior"}
            </span>
          </motion.div>
        )}
      </motion.div>
    );
  }
);

StatCard.displayName = "StatCard";

export { EnhancedCard, enhancedCardVariants, StatCard };
