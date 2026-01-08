import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";

// ============================================
// ENHANCED CHART TOOLTIP
// ============================================
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
    dataKey?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
  showTrend?: boolean;
  previousValue?: number;
  currency?: boolean;
  compact?: boolean;
}

export const EnhancedChartTooltip = ({
  active,
  payload,
  label,
  valueFormatter = (v) => v.toLocaleString('pt-BR'),
  labelFormatter = (l) => l,
  showTrend = false,
  previousValue,
  currency = false,
  compact = false,
}: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const formatValue = (value: number) => {
    if (currency) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    }
    return valueFormatter(value);
  };

  const trend = useMemo(() => {
    if (!showTrend || previousValue === undefined || payload.length === 0) return null;
    const currentValue = payload[0].value;
    const change = ((currentValue - previousValue) / previousValue) * 100;
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      value: Math.abs(change).toFixed(1),
    };
  }, [showTrend, previousValue, payload]);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-3 py-2"
      >
        <p className="text-xs text-muted-foreground">{labelFormatter(label || '')}</p>
        <p className="text-sm font-bold text-foreground">
          {formatValue(payload[0].value)}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "bg-popover/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl",
        "p-4 min-w-[180px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-3 pb-2 border-b border-border/50">
        <span className="text-sm font-medium text-foreground">
          {labelFormatter(label || '')}
        </span>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full",
            trend.direction === 'up' && "bg-success/10 text-success",
            trend.direction === 'down' && "bg-destructive/10 text-destructive",
            trend.direction === 'neutral' && "bg-muted text-muted-foreground"
          )}>
            {trend.direction === 'up' && <ArrowUpRight className="w-3 h-3" />}
            {trend.direction === 'down' && <ArrowDownRight className="w-3 h-3" />}
            {trend.direction === 'neutral' && <Minus className="w-3 h-3" />}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>

      {/* Payload items */}
      <div className="space-y-2">
        {payload.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color || 'hsl(var(--primary))' }}
              />
              <span className="text-sm text-muted-foreground">{item.name}</span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              {formatValue(item.value)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ============================================
// GRADIENT DEFINITIONS FOR CHARTS
// ============================================
export const ChartGradients = () => (
  <defs>
    {/* Primary gradient */}
    <linearGradient id="gradientPrimary" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
    </linearGradient>
    
    {/* Success gradient */}
    <linearGradient id="gradientSuccess" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(var(--kpi-success))" stopOpacity={0.4} />
      <stop offset="100%" stopColor="hsl(var(--kpi-success))" stopOpacity={0} />
    </linearGradient>
    
    {/* Warning gradient */}
    <linearGradient id="gradientWarning" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(var(--kpi-warning))" stopOpacity={0.4} />
      <stop offset="100%" stopColor="hsl(var(--kpi-warning))" stopOpacity={0} />
    </linearGradient>
    
    {/* Danger gradient */}
    <linearGradient id="gradientDanger" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(var(--kpi-danger))" stopOpacity={0.4} />
      <stop offset="100%" stopColor="hsl(var(--kpi-danger))" stopOpacity={0} />
    </linearGradient>
    
    {/* Purple gradient */}
    <linearGradient id="gradientPurple" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(var(--kpi-purple))" stopOpacity={0.4} />
      <stop offset="100%" stopColor="hsl(var(--kpi-purple))" stopOpacity={0} />
    </linearGradient>
    
    {/* Blue gradient */}
    <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(var(--kpi-blue))" stopOpacity={0.4} />
      <stop offset="100%" stopColor="hsl(var(--kpi-blue))" stopOpacity={0} />
    </linearGradient>

    {/* Horizontal gradients for bars */}
    <linearGradient id="gradientPrimaryH" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1} />
    </linearGradient>

    {/* Animated gradient */}
    <linearGradient id="gradientAnimated" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="hsl(var(--primary))">
        <animate attributeName="stop-color" values="hsl(var(--primary));hsl(var(--accent));hsl(var(--primary))" dur="3s" repeatCount="indefinite" />
      </stop>
      <stop offset="100%" stopColor="hsl(var(--accent))">
        <animate attributeName="stop-color" values="hsl(var(--accent));hsl(var(--primary));hsl(var(--accent))" dur="3s" repeatCount="indefinite" />
      </stop>
    </linearGradient>
  </defs>
);

// ============================================
// CHART LEGEND
// ============================================
interface LegendItem {
  label: string;
  color: string;
  value?: number | string;
}

interface ChartLegendProps {
  items: LegendItem[];
  layout?: 'horizontal' | 'vertical';
  align?: 'start' | 'center' | 'end';
  interactive?: boolean;
  onItemClick?: (item: LegendItem) => void;
  className?: string;
}

export const ChartLegend = ({
  items,
  layout = 'horizontal',
  align = 'center',
  interactive = false,
  onItemClick,
  className,
}: ChartLegendProps) => {
  return (
    <div
      className={cn(
        "flex gap-4 flex-wrap",
        layout === 'vertical' && "flex-col",
        align === 'center' && "justify-center",
        align === 'end' && "justify-end",
        className
      )}
    >
      {items.map((item, index) => (
        <motion.button
          key={index}
          type="button"
          className={cn(
            "flex items-center gap-2 text-sm",
            interactive && "cursor-pointer hover:opacity-80 transition-opacity",
            !interactive && "cursor-default"
          )}
          onClick={() => interactive && onItemClick?.(item)}
          whileHover={interactive ? { scale: 1.02 } : {}}
          whileTap={interactive ? { scale: 0.98 } : {}}
        >
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground">{item.label}</span>
          {item.value !== undefined && (
            <span className="font-medium text-foreground">{item.value}</span>
          )}
        </motion.button>
      ))}
    </div>
  );
};

// ============================================
// ANIMATED PROGRESS BAR FOR CHARTS
// ============================================
interface AnimatedBarProps {
  value: number;
  maxValue?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  labelPosition?: 'inside' | 'outside';
  animate?: boolean;
  className?: string;
}

export const AnimatedBar = ({
  value,
  maxValue = 100,
  color = 'hsl(var(--primary))',
  height = 8,
  showLabel = false,
  labelPosition = 'outside',
  animate = true,
  className,
}: AnimatedBarProps) => {
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <div className={cn("relative", className)}>
      <div
        className="w-full bg-muted/50 rounded-full overflow-hidden"
        style={{ height }}
      >
        <motion.div
          className="h-full rounded-full relative overflow-hidden"
          style={{ backgroundColor: color }}
          initial={animate ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
          />
        </motion.div>
      </div>
      
      {showLabel && labelPosition === 'outside' && (
        <motion.span
          className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full text-xs font-medium text-foreground ml-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {percentage.toFixed(0)}%
        </motion.span>
      )}
    </div>
  );
};

// ============================================
// DONUT CENTER LABEL
// ============================================
interface DonutCenterLabelProps {
  value: string | number;
  label?: string;
  className?: string;
}

export const DonutCenterLabel = ({
  value,
  label,
  className,
}: DonutCenterLabelProps) => (
  <motion.div
    className={cn(
      "absolute inset-0 flex flex-col items-center justify-center",
      className
    )}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.3, duration: 0.4 }}
  >
    <span className="text-2xl md:text-3xl font-bold text-foreground">{value}</span>
    {label && (
      <span className="text-xs md:text-sm text-muted-foreground">{label}</span>
    )}
  </motion.div>
);

// ============================================
// NO DATA PLACEHOLDER FOR CHARTS
// ============================================
interface ChartNoDataProps {
  message?: string;
  height?: number;
  className?: string;
}

export const ChartNoData = ({
  message = "Sem dados disponíveis",
  height = 200,
  className,
}: ChartNoDataProps) => (
  <motion.div
    className={cn(
      "flex flex-col items-center justify-center text-muted-foreground",
      className
    )}
    style={{ height }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <svg
      className="w-16 h-16 mb-3 opacity-30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M3 3v18h18" />
      <path d="M18 9l-5 5-4-4-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <p className="text-sm">{message}</p>
  </motion.div>
);

// ============================================
// CHART HEADER
// ============================================
interface ChartHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const ChartHeader = ({
  title,
  subtitle,
  action,
  className,
}: ChartHeaderProps) => (
  <div className={cn("flex items-start justify-between mb-4", className)}>
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
    {action}
  </div>
);

// ============================================
// SPARKLINE TREND INDICATOR
// ============================================
interface SparklineTrendProps {
  data: number[];
  className?: string;
}

export const SparklineTrend = ({ data, className }: SparklineTrendProps) => {
  const trend = useMemo(() => {
    if (data.length < 2) return null;
    const first = data[0];
    const last = data[data.length - 1];
    const change = ((last - first) / first) * 100;
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      value: Math.abs(change).toFixed(1),
    };
  }, [data]);

  if (!trend) return null;

  return (
    <div className={cn(
      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
      trend.direction === 'up' && "bg-success/10 text-success",
      trend.direction === 'down' && "bg-destructive/10 text-destructive",
      trend.direction === 'neutral' && "bg-muted text-muted-foreground",
      className
    )}>
      {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
      {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
      {trend.direction === 'neutral' && <Minus className="w-3 h-3" />}
      <span>{trend.value}%</span>
    </div>
  );
};
