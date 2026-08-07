import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ProgressStatus
interface ProgressStatusProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "success" | "warning" | "destructive" | "gradient";
  animated?: boolean;
  className?: string;
}

export const ProgressStatus = ({
  current, total, label, showPercentage = true,
  size = "default", variant = "default", animated = true, className,
}: ProgressStatusProps) => {
  const percentage = Math.round((current / total) * 100);
  const variantColors = {
    default: "bg-primary", success: "bg-success", warning: "bg-warning",
    destructive: "bg-destructive", gradient: "bg-gradient-to-r from-primary via-primary/70 to-primary/50",
  };
  const barHeight = { sm: "h-1.5", default: "h-2", lg: "h-3" };
  const BarWrapper = animated ? motion.div : "div";

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && (
            <motion.span key={percentage} initial={animated ? { opacity: 0, y: -5 } : {}} animate={{ opacity: 1, y: 0 }} className="font-semibold">
              {percentage}%
            </motion.span>
          )}
        </div>
      )}
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", barHeight[size])}>
        <BarWrapper
          initial={animated ? { width: 0 } : {}}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full rounded-full transition-all", variantColors[variant])}
        />
      </div>
    </div>
  );
};

// TrendIndicator
interface TrendIndicatorProps {
  value: number;
  previousValue?: number;
  suffix?: string;
  showIcon?: boolean;
  size?: "sm" | "default" | "lg";
  inverted?: boolean;
  className?: string;
}

export function TrendIndicator({
  value, previousValue = 0, suffix = "%", showIcon = true,
  size = "default", inverted = false, className
}: TrendIndicatorProps) {
  const change = previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : 0;
  const isPositive = inverted ? change < 0 : change > 0;
  const isNegative = inverted ? change > 0 : change < 0;
  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const colorClass = isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground";
  const bgClass = isPositive ? "bg-success/10" : isNegative ? "bg-destructive/10" : "bg-muted";
  const sizes = {
    sm: { badge: "px-1.5 py-0.5 text-[10px] gap-1", icon: "h-3 w-3" },
    default: { badge: "px-2 py-0.5 text-xs gap-1.5", icon: "h-3.5 w-3.5" },
    lg: { badge: "px-2.5 py-1 text-sm gap-1.5", icon: "h-4 w-4" },
  };
  const s = sizes[size];

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
      className={cn("inline-flex items-center rounded-full font-medium", bgClass, colorClass, s.badge, className)}>
      {showIcon && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
          <Icon className={s.icon} />
        </motion.div>
      )}
      <span>{change > 0 && "+"}{change.toFixed(1)}{suffix}</span>
    </motion.div>
  );
}
