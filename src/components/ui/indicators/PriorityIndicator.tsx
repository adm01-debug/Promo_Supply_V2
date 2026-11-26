import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type PriorityLevel = "low" | "medium" | "high" | "urgent" | "critical";

const priorityConfigs: Record<PriorityLevel, { label: string; color: string; bars: number }> = {
  low: { label: "Baixa", color: "bg-success", bars: 1 },
  medium: { label: "Média", color: "bg-warning", bars: 2 },
  high: { label: "Alta", color: "bg-warning", bars: 3 },
  urgent: { label: "Urgente", color: "bg-destructive", bars: 4 },
  critical: { label: "Crítica", color: "bg-destructive", bars: 4 },
};

interface PriorityIndicatorProps {
  priority: PriorityLevel;
  showLabel?: boolean;
  size?: "sm" | "default" | "lg";
  animated?: boolean;
  className?: string;
}

export const PriorityIndicator = ({
  priority, showLabel = true, size = "default", animated = true, className,
}: PriorityIndicatorProps) => {
  const config = priorityConfigs[priority];
  const barSizes = {
    sm: { width: "w-0.5", heights: [3, 5, 7, 9], gap: "gap-0.5" },
    default: { width: "w-1", heights: [4, 6, 8, 10], gap: "gap-0.5" },
    lg: { width: "w-1.5", heights: [5, 8, 11, 14], gap: "gap-1" },
  };
  const s = barSizes[size];

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div className={cn("flex items-end", s.gap)}>
        {[1, 2, 3, 4].map((barNum) => {
          const isActive = barNum <= config.bars;
          const BarWrapper = animated ? motion.div : "div";
          const barProps = animated ? {
            initial: { scaleY: 0 }, animate: { scaleY: 1 },
            transition: { delay: barNum * 0.05, duration: 0.2 }, style: { originY: 1 }
          } : {};
          return (
            <BarWrapper key={barNum} {...barProps}
              className={cn(s.width, "rounded-full transition-colors duration-200", isActive ? config.color : "bg-muted")}
              style={{ height: `${s.heights[barNum - 1]}px`, ...(animated ? { originY: 1 } : {}) }}
            />
          );
        })}
      </div>
      {showLabel && (
        <span className={cn("font-medium",
          size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs",
          priority === "critical" && "text-destructive",
          priority === "urgent" && "text-destructive",
          priority === "high" && "text-warning",
          priority === "medium" && "text-warning",
          priority === "low" && "text-success"
        )}>
          {config.label}
        </span>
      )}
    </div>
  );
};
