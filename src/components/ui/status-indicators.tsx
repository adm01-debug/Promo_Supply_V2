import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Star,
  Zap
} from "lucide-react";

// =============================================================================
// EXISTING STATUS TYPES
// =============================================================================

type StatusType = 
  | "pending" 
  | "processing" 
  | "approved" 
  | "completed" 
  | "cancelled" 
  | "error" 
  | "warning"
  | "info"
  | "draft"
  | "active"
  | "inactive"
  | "success"
  | "neutral";

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  pulseColor?: string;
  icon?: React.ElementType;
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  pending: {
    label: "Pendente",
    color: "bg-warning",
    bgColor: "bg-warning/10",
    textColor: "text-warning",
    pulseColor: "bg-warning",
    icon: Clock,
  },
  processing: {
    label: "Em Processamento",
    color: "bg-info",
    bgColor: "bg-info/10",
    textColor: "text-info",
    pulseColor: "bg-info",
    icon: Loader2,
  },
  approved: {
    label: "Aprovado",
    color: "bg-success",
    bgColor: "bg-success/10",
    textColor: "text-success",
    icon: CheckCircle2,
  },
  completed: {
    label: "Concluído",
    color: "bg-success",
    bgColor: "bg-success/10",
    textColor: "text-success",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-destructive",
    bgColor: "bg-destructive/10",
    textColor: "text-destructive",
    icon: XCircle,
  },
  error: {
    label: "Erro",
    color: "bg-destructive",
    bgColor: "bg-destructive/10",
    textColor: "text-destructive",
    pulseColor: "bg-destructive",
    icon: XCircle,
  },
  warning: {
    label: "Atenção",
    color: "bg-warning",
    bgColor: "bg-warning/10",
    textColor: "text-warning",
    icon: AlertTriangle,
  },
  info: {
    label: "Informação",
    color: "bg-info",
    bgColor: "bg-info/10",
    textColor: "text-info",
    icon: Zap,
  },
  draft: {
    label: "Rascunho",
    color: "bg-muted-foreground",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    icon: Clock,
  },
  active: {
    label: "Ativo",
    color: "bg-success",
    bgColor: "bg-success/10",
    textColor: "text-success",
    icon: CheckCircle2,
  },
  inactive: {
    label: "Inativo",
    color: "bg-muted-foreground",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    icon: Minus,
  },
  success: {
    label: "Sucesso",
    color: "bg-success",
    bgColor: "bg-success/10",
    textColor: "text-success",
    icon: CheckCircle2,
  },
  neutral: {
    label: "Neutro",
    color: "bg-muted-foreground",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    icon: Minus,
  },
};

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  showDot?: boolean;
  showPulse?: boolean;
  showIcon?: boolean;
  size?: "sm" | "default" | "lg";
  tooltip?: string;
  animated?: boolean;
  className?: string;
}

export const StatusIndicator = ({
  status,
  label,
  showDot = true,
  showPulse = false,
  showIcon = false,
  size = "default",
  tooltip,
  animated = true,
  className,
}: StatusIndicatorProps) => {
  const config = statusConfigs[status];
  const displayLabel = label || config.label;
  const Icon = config.icon;

  const sizes = {
    sm: {
      badge: "text-[10px] px-1.5 py-0.5",
      dot: "w-1.5 h-1.5",
      icon: "h-3 w-3",
    },
    default: {
      badge: "text-xs px-2 py-0.5",
      dot: "w-2 h-2",
      icon: "h-3.5 w-3.5",
    },
    lg: {
      badge: "text-sm px-2.5 py-1",
      dot: "w-2.5 h-2.5",
      icon: "h-4 w-4",
    },
  };

  const s = sizes[size];
  const isProcessing = status === "processing";

  const Wrapper = animated ? motion.div : "div";
  const wrapperProps = animated ? {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.2 }
  } : {};

  const content = (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.bgColor,
        config.textColor,
        s.badge,
        className
      )}
    >
      {showIcon && Icon && (
        <Icon className={cn(s.icon, isProcessing && "animate-spin")} />
      )}
      {showDot && !showIcon && (
        <span className="relative flex">
          <span className={cn("rounded-full", config.color, s.dot)} />
          {showPulse && config.pulseColor && (
            <span
              className={cn(
                "absolute inline-flex rounded-full opacity-75 animate-ping",
                config.pulseColor,
                s.dot
              )}
            />
          )}
        </span>
      )}
      {displayLabel}
    </Wrapper>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

// =============================================================================
// PRIORITY INDICATOR - Enhanced
// =============================================================================

type PriorityLevel = "low" | "medium" | "high" | "urgent" | "critical";

interface PriorityIndicatorProps {
  priority: PriorityLevel;
  showLabel?: boolean;
  size?: "sm" | "default" | "lg";
  animated?: boolean;
  className?: string;
}

const priorityConfigs: Record<PriorityLevel, { label: string; color: string; bars: number }> = {
  low: { label: "Baixa", color: "bg-green-500", bars: 1 },
  medium: { label: "Média", color: "bg-amber-500", bars: 2 },
  high: { label: "Alta", color: "bg-orange-500", bars: 3 },
  urgent: { label: "Urgente", color: "bg-red-500", bars: 4 },
  critical: { label: "Crítica", color: "bg-red-600", bars: 4 },
};

export const PriorityIndicator = ({
  priority,
  showLabel = true,
  size = "default",
  animated = true,
  className,
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
            initial: { scaleY: 0 },
            animate: { scaleY: 1 },
            transition: { delay: barNum * 0.05, duration: 0.2 },
            style: { originY: 1 }
          } : {};
          
          return (
            <BarWrapper
              key={barNum}
              {...barProps}
              className={cn(
                s.width,
                "rounded-full transition-colors duration-200",
                isActive ? config.color : "bg-muted"
              )}
              style={{ 
                height: `${s.heights[barNum - 1]}px`,
                ...(animated ? { originY: 1 } : {})
              }}
            />
          );
        })}
      </div>
      {showLabel && (
        <span className={cn(
          "font-medium",
          size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs",
          priority === "critical" && "text-red-600 dark:text-red-400",
          priority === "urgent" && "text-red-500 dark:text-red-400",
          priority === "high" && "text-orange-500 dark:text-orange-400",
          priority === "medium" && "text-amber-500 dark:text-amber-400",
          priority === "low" && "text-green-500 dark:text-green-400"
        )}>
          {config.label}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// PROGRESS STATUS - Enhanced
// =============================================================================

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
  current,
  total,
  label,
  showPercentage = true,
  size = "default",
  variant = "default",
  animated = true,
  className,
}: ProgressStatusProps) => {
  const percentage = Math.round((current / total) * 100);
  
  const variantColors = {
    default: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    gradient: "bg-gradient-to-r from-primary via-purple-500 to-pink-500",
  };

  const barHeight = {
    sm: "h-1.5",
    default: "h-2",
    lg: "h-3",
  };

  const BarWrapper = animated ? motion.div : "div";

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && (
            <motion.span 
              key={percentage}
              initial={animated ? { opacity: 0, y: -5 } : {}}
              animate={{ opacity: 1, y: 0 }}
              className="font-semibold"
            >
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
          className={cn(
            "h-full rounded-full transition-all", 
            variantColors[variant],
            variant === "gradient" && "bg-[length:200%_100%]"
          )}
        />
      </div>
    </div>
  );
};

// =============================================================================
// TREND INDICATOR - Shows up/down/neutral trends
// =============================================================================

interface TrendIndicatorProps {
  value: number;
  previousValue?: number;
  suffix?: string;
  showIcon?: boolean;
  size?: "sm" | "default" | "lg";
  inverted?: boolean; // For metrics where down is good
  className?: string;
}

export function TrendIndicator({
  value,
  previousValue = 0,
  suffix = "%",
  showIcon = true,
  size = "default",
  inverted = false,
  className
}: TrendIndicatorProps) {
  const change = previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : 0;
  const isPositive = inverted ? change < 0 : change > 0;
  const isNegative = inverted ? change > 0 : change < 0;

  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  
  const colorClass = isPositive 
    ? "text-green-600 dark:text-green-400" 
    : isNegative 
    ? "text-red-600 dark:text-red-400"
    : "text-muted-foreground";

  const bgClass = isPositive 
    ? "bg-green-500/10" 
    : isNegative 
    ? "bg-red-500/10"
    : "bg-muted";

  const sizes = {
    sm: { badge: "px-1.5 py-0.5 text-[10px] gap-1", icon: "h-3 w-3" },
    default: { badge: "px-2 py-0.5 text-xs gap-1.5", icon: "h-3.5 w-3.5" },
    lg: { badge: "px-2.5 py-1 text-sm gap-1.5", icon: "h-4 w-4" },
  };

  const s = sizes[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        bgClass,
        colorClass,
        s.badge,
        className
      )}
    >
      {showIcon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          <Icon className={s.icon} />
        </motion.div>
      )}
      <span>
        {change > 0 && "+"}
        {change.toFixed(1)}{suffix}
      </span>
    </motion.div>
  );
}

// =============================================================================
// CONFIDENCE METER - Shows confidence/quality scores
// =============================================================================

interface ConfidenceMeterProps {
  value: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function ConfidenceMeter({
  value,
  label,
  showValue = true,
  size = "default",
  className
}: ConfidenceMeterProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  const getColor = (val: number) => {
    if (val >= 80) return "bg-green-500";
    if (val >= 60) return "bg-amber-500";
    if (val >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const heightConfig = { sm: "h-1.5", default: "h-2", lg: "h-3" };
  const textConfig = { sm: "text-xs", default: "text-sm", lg: "text-base" };

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className={cn("text-muted-foreground", textConfig[size])}>
              {label}
            </span>
          )}
          {showValue && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn("font-semibold", textConfig[size])}
            >
              {clampedValue}%
            </motion.span>
          )}
        </div>
      )}
      <div className={cn("w-full rounded-full bg-muted overflow-hidden", heightConfig[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full", getColor(clampedValue))}
        />
      </div>
    </div>
  );
}

// =============================================================================
// RATING STARS - Animated star ratings
// =============================================================================

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "default" | "lg";
  showValue?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

export function RatingStars({
  rating,
  maxRating = 5,
  size = "default",
  showValue = false,
  interactive = false,
  onChange,
  className
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = React.useState(0);
  const displayRating = hoverRating || rating;

  const iconSizes = { sm: "h-3 w-3", default: "h-4 w-4", lg: "h-5 w-5" };
  const textSizes = { sm: "text-xs", default: "text-sm", lg: "text-base" };

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: maxRating }).map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= displayRating;

        return (
          <motion.button
            key={i}
            type="button"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 500 }}
            whileHover={interactive ? { scale: 1.2 } : {}}
            whileTap={interactive ? { scale: 0.9 } : {}}
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starValue)}
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={cn(
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded",
              interactive && "cursor-pointer",
              !interactive && "cursor-default"
            )}
          >
            <Star
              className={cn(
                iconSizes[size],
                "transition-colors duration-200",
                isFilled
                  ? "text-amber-400 fill-amber-400"
                  : "text-muted-foreground/30"
              )}
            />
          </motion.button>
        );
      })}
      {showValue && (
        <span className={cn("ml-1.5 font-medium text-muted-foreground", textSizes[size])}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// SECURITY SCORE - Shows security/trust level
// =============================================================================

interface SecurityScoreProps {
  score: number;
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function SecurityScore({
  score,
  size = "default",
  showLabel = true,
  className
}: SecurityScoreProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  
  const getLevel = (val: number) => {
    if (val >= 80) return { label: "Excelente", color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" };
    if (val >= 60) return { label: "Bom", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" };
    if (val >= 40) return { label: "Moderado", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" };
    return { label: "Crítico", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" };
  };

  const level = getLevel(clampedScore);
  const iconSizes = { sm: "h-4 w-4", default: "h-5 w-5", lg: "h-6 w-6" };
  const textSizes = { sm: "text-xs", default: "text-sm", lg: "text-base" };
  const paddings = { sm: "p-2", default: "p-3", lg: "p-4" };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border",
        level.bg,
        level.border,
        level.color,
        paddings[size],
        className
      )}
    >
      <Shield className={iconSizes[size]} />
      <div className="flex flex-col">
        <span className={cn("font-bold", textSizes[size])}>
          {clampedScore}%
        </span>
        {showLabel && (
          <span className={cn("opacity-75", size === "sm" ? "text-[10px]" : "text-xs")}>
            {level.label}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// ANIMATED COUNTER - Smooth number transitions
// =============================================================================

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  prefix = "",
  suffix = "",
  decimals = 0,
  className
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const previousValue = React.useRef(0);

  React.useEffect(() => {
    const startValue = previousValue.current;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValue + (value - startValue) * eased;
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = value;
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  const formattedValue = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(displayValue);

  return (
    <span className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
}
