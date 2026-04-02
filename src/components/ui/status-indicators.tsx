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
  low: { label: "Baixa", color: "bg-success", bars: 1 },
  medium: { label: "Média", color: "bg-warning", bars: 2 },
  high: { label: "Alta", color: "bg-warning", bars: 3 },
  urgent: { label: "Urgente", color: "bg-destructive", bars: 4 },
  critical: { label: "Crítica", color: "bg-destructive", bars: 4 },
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

// =============================================================================
// CONNECTION STATUS - Online/Offline indicator
// =============================================================================

interface ConnectionStatusProps {
  status: 'online' | 'offline' | 'connecting' | 'error';
  showLabel?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

const connectionConfigs = {
  online: { label: 'Online', color: 'bg-success', textColor: 'text-success' },
  offline: { label: 'Offline', color: 'bg-muted-foreground', textColor: 'text-muted-foreground' },
  connecting: { label: 'Conectando...', color: 'bg-warning', textColor: 'text-warning' },
  error: { label: 'Erro de conexão', color: 'bg-destructive', textColor: 'text-destructive' },
};

export function ConnectionStatus({
  status,
  showLabel = true,
  size = 'default',
  className
}: ConnectionStatusProps) {
  const config = connectionConfigs[status];
  const dotSizes = { sm: 'w-1.5 h-1.5', default: 'w-2 h-2', lg: 'w-2.5 h-2.5' };
  const textSizes = { sm: 'text-[10px]', default: 'text-xs', lg: 'text-sm' };

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative flex">
        <span className={cn("rounded-full", dotSizes[size], config.color)} />
        {(status === 'online' || status === 'connecting') && (
          <span className={cn(
            "absolute inline-flex rounded-full opacity-75 animate-ping",
            dotSizes[size],
            config.color
          )} />
        )}
      </span>
      {showLabel && (
        <span className={cn("font-medium", textSizes[size], config.textColor)}>
          {config.label}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// SLA STATUS - Service Level Agreement indicator
// =============================================================================

interface SLAStatusProps {
  daysRemaining: number;
  totalDays: number;
  showProgress?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function SLAStatus({
  daysRemaining,
  totalDays,
  showProgress = true,
  size = 'default',
  className
}: SLAStatusProps) {
  const percentage = ((totalDays - daysRemaining) / totalDays) * 100;
  const isOverdue = daysRemaining < 0;
  const isWarning = daysRemaining <= 3 && daysRemaining >= 0;
  const isOnTrack = daysRemaining > 3;

  const getColor = () => {
    if (isOverdue) return { bg: 'bg-destructive', text: 'text-destructive', badge: 'bg-destructive/10' };
    if (isWarning) return { bg: 'bg-warning', text: 'text-warning', badge: 'bg-warning/10' };
    return { bg: 'bg-success', text: 'text-success', badge: 'bg-success/10' };
  };

  const colors = getColor();
  const textSizes = { sm: 'text-xs', default: 'text-sm', lg: 'text-base' };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between">
        <span className={cn("font-medium", textSizes[size], colors.text)}>
          {isOverdue ? (
            <>Atrasado {Math.abs(daysRemaining)} dia{Math.abs(daysRemaining) !== 1 ? 's' : ''}</>
          ) : (
            <>{daysRemaining} dia{daysRemaining !== 1 ? 's' : ''} restante{daysRemaining !== 1 ? 's' : ''}</>
          )}
        </span>
        <Badge variant="outline" className={cn(colors.badge, colors.text, "border-0")}>
          {isOverdue ? 'Atrasado' : isWarning ? 'Urgente' : 'No Prazo'}
        </Badge>
      </div>
      {showProgress && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.5 }}
            className={cn("h-full rounded-full", colors.bg)}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SYNC STATUS - Data synchronization indicator
// =============================================================================

interface SyncStatusProps {
  lastSynced?: Date;
  isSyncing?: boolean;
  hasError?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function SyncStatus({
  lastSynced,
  isSyncing = false,
  hasError = false,
  size = 'default',
  className
}: SyncStatusProps) {
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'agora mesmo';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
    return `${Math.floor(seconds / 86400)}d atrás`;
  };

  const iconSizes = { sm: 'h-3 w-3', default: 'h-4 w-4', lg: 'h-5 w-5' };
  const textSizes = { sm: 'text-[10px]', default: 'text-xs', lg: 'text-sm' };

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {isSyncing ? (
        <>
          <Loader2 className={cn(iconSizes[size], "animate-spin text-info")} />
          <span className={cn(textSizes[size], "text-info")}>Sincronizando...</span>
        </>
      ) : hasError ? (
        <>
          <XCircle className={cn(iconSizes[size], "text-destructive")} />
          <span className={cn(textSizes[size], "text-destructive")}>Erro ao sincronizar</span>
        </>
      ) : (
        <>
          <CheckCircle2 className={cn(iconSizes[size], "text-success")} />
          <span className={cn(textSizes[size], "text-muted-foreground")}>
            Sincronizado {lastSynced ? getTimeAgo(lastSynced) : ''}
          </span>
        </>
      )}
    </div>
  );
}

// =============================================================================
// STEP STATUS - Multi-step process indicator
// =============================================================================

interface Step {
  label: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'error';
}

interface StepStatusProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function StepStatus({
  steps,
  orientation = 'horizontal',
  size = 'default',
  className
}: StepStatusProps) {
  const isHorizontal = orientation === 'horizontal';
  const dotSizes = { sm: 'w-6 h-6', default: 'w-8 h-8', lg: 'w-10 h-10' };
  const iconSizes = { sm: 'h-3 w-3', default: 'h-4 w-4', lg: 'h-5 w-5' };
  const textSizes = { sm: 'text-xs', default: 'text-sm', lg: 'text-base' };

  const getStepStyles = (status: Step['status']) => {
    switch (status) {
      case 'completed': return { bg: 'bg-success', text: 'text-success', icon: CheckCircle2 };
      case 'current': return { bg: 'bg-primary', text: 'text-primary', icon: null };
      case 'error': return { bg: 'bg-destructive', text: 'text-destructive', icon: XCircle };
      default: return { bg: 'bg-muted', text: 'text-muted-foreground', icon: null };
    }
  };

  return (
    <div className={cn(
      "flex",
      isHorizontal ? "flex-row items-start" : "flex-col",
      className
    )}>
      {steps.map((step, index) => {
        const styles = getStepStyles(step.status);
        const Icon = styles.icon;
        const isLast = index === steps.length - 1;

        return (
          <div 
            key={index}
            className={cn(
              "flex",
              isHorizontal ? "flex-col items-center flex-1" : "flex-row items-start gap-4"
            )}
          >
            <div className={cn(
              "flex items-center",
              isHorizontal ? "flex-col" : "flex-row"
            )}>
              {/* Step circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1, type: "spring" }}
                className={cn(
                  "rounded-full flex items-center justify-center font-medium text-white relative z-10",
                  dotSizes[size],
                  styles.bg,
                  step.status === 'current' && "ring-4 ring-primary/20"
                )}
              >
                {Icon ? (
                  <Icon className={iconSizes[size]} />
                ) : (
                  <span className={textSizes[size]}>{index + 1}</span>
                )}
              </motion.div>
              
              {/* Connector line */}
              {!isLast && (
                <div className={cn(
                  isHorizontal ? "w-full h-0.5" : "w-0.5 h-full min-h-8",
                  step.status === 'completed' ? "bg-success" : "bg-muted"
                )} />
              )}
            </div>
            
            {/* Step content */}
            <div className={cn(
              isHorizontal ? "text-center mt-2 px-2" : "pb-8"
            )}>
              <p className={cn(
                "font-medium",
                textSizes[size],
                styles.text
              )}>
                {step.label}
              </p>
              {step.description && (
                <p className={cn(
                  "text-muted-foreground mt-0.5",
                  size === 'sm' ? 'text-[10px]' : 'text-xs'
                )}>
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// HEALTH CHECK STATUS - System health indicator
// =============================================================================

interface HealthCheckProps {
  items: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down' | 'checking';
    message?: string;
  }>;
  title?: string;
  compact?: boolean;
  className?: string;
}

export function HealthCheck({
  items,
  title = "Status do Sistema",
  compact = false,
  className
}: HealthCheckProps) {
  const getStatusConfig = (status: 'healthy' | 'degraded' | 'down' | 'checking') => {
    switch (status) {
      case 'healthy': return { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', label: 'Operacional' };
      case 'degraded': return { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', label: 'Degradado' };
      case 'down': return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Inoperante' };
      case 'checking': return { icon: Loader2, color: 'text-info', bg: 'bg-info/10', label: 'Verificando' };
    }
  };

  const overallStatus = items.some(i => i.status === 'down') 
    ? 'down' 
    : items.some(i => i.status === 'degraded')
    ? 'degraded'
    : items.some(i => i.status === 'checking')
    ? 'checking'
    : 'healthy';

  const overallConfig = getStatusConfig(overallStatus);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Overall status */}
      <div className={cn("flex items-center justify-between p-3 rounded-lg border", overallConfig.bg)}>
        <span className="font-medium">{title}</span>
        <div className={cn("flex items-center gap-2", overallConfig.color)}>
          <overallConfig.icon className={cn("h-4 w-4", overallStatus === 'checking' && "animate-spin")} />
          <span className="text-sm font-medium">{overallConfig.label}</span>
        </div>
      </div>

      {/* Individual items */}
      {!compact && (
        <div className="space-y-2">
          {items.map((item, index) => {
            const config = getStatusConfig(item.status);
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
              >
                <span className="text-sm">{item.name}</span>
                <div className="flex items-center gap-2">
                  {item.message && (
                    <span className="text-xs text-muted-foreground">{item.message}</span>
                  )}
                  <config.icon className={cn("h-4 w-4", config.color, item.status === 'checking' && "animate-spin")} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
