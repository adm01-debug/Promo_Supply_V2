import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Calendar,
  DollarSign,
  Package,
  Users,
  Clock,
  Target,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';

// ==================== ENHANCED TOOLTIP ====================

interface EnhancedTooltipData {
  label: string;
  value: number | string;
  formattedValue?: string;
  change?: number;
  changeLabel?: string;
  color?: string;
  icon?: React.ElementType;
  details?: { label: string; value: string }[];
  date?: string;
}

interface EnhancedTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: EnhancedTooltipData; dataKey: string; value: number; color?: string }>;
  label?: string;
  className?: string;
  formatValue?: (value: number) => string;
  showTrend?: boolean;
  customContent?: React.ReactNode;
}

export const EnhancedChartTooltip: React.FC<EnhancedTooltipProps> = ({
  active,
  payload,
  label,
  className,
  formatValue = (v) => v.toLocaleString('pt-BR'),
  showTrend = true,
  customContent
}) => {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 5, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-4 min-w-[200px]",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
          <span className="text-sm font-medium text-foreground">{label || data?.label}</span>
          {data?.date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {data.date}
            </span>
          )}
        </div>

        {/* Values */}
        <div className="space-y-2">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color || 'hsl(var(--primary))' }}
                />
                <span className="text-sm text-muted-foreground capitalize">
                  {entry.dataKey.replace(/_/g, ' ')}
                </span>
              </div>
              <span className="font-semibold text-foreground">
                {formatValue(entry.value)}
              </span>
            </div>
          ))}
        </div>

        {/* Trend */}
        {showTrend && data?.change !== undefined && (
          <div className="mt-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              {data.change > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-500 font-medium">
                    +{data.change.toFixed(1)}%
                  </span>
                </>
              ) : data.change < 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-500 font-medium">
                    {data.change.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">
                    Sem alteração
                  </span>
                </>
              )}
              {data.changeLabel && (
                <span className="text-xs text-muted-foreground">
                  {data.changeLabel}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Details */}
        {data?.details && data.details.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border space-y-1">
            {data.details.map((detail, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{detail.label}</span>
                <span className="font-medium text-foreground">{detail.value}</span>
              </div>
            ))}
          </div>
        )}

        {customContent}
      </motion.div>
    </AnimatePresence>
  );
};

// ==================== CHART LEGEND ====================

interface LegendItem {
  name: string;
  color: string;
  value?: number | string;
  active?: boolean;
}

interface InteractiveLegendProps {
  items: LegendItem[];
  onToggle?: (name: string) => void;
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

export const InteractiveLegend: React.FC<InteractiveLegendProps> = ({
  items,
  onToggle,
  layout = 'horizontal',
  className
}) => {
  return (
    <div
      className={cn(
        "flex gap-4",
        layout === 'vertical' ? 'flex-col' : 'flex-wrap justify-center',
        className
      )}
    >
      {items.map((item) => (
        <motion.button
          key={item.name}
          onClick={() => onToggle?.(item.name)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
            item.active !== false
              ? "bg-muted hover:bg-muted/80"
              : "bg-transparent opacity-50 hover:opacity-75"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span
            className="w-3 h-3 rounded-full transition-transform"
            style={{ 
              backgroundColor: item.color,
              transform: item.active !== false ? 'scale(1)' : 'scale(0.8)'
            }}
          />
          <span className="text-foreground font-medium">{item.name}</span>
          {item.value !== undefined && (
            <span className="text-muted-foreground text-xs">
              ({typeof item.value === 'number' ? item.value.toLocaleString('pt-BR') : item.value})
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );
};

// ==================== CHART HEADER ====================

interface ChartHeaderProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
}

export const ChartHeader: React.FC<ChartHeaderProps> = ({
  title,
  subtitle,
  value,
  change,
  changeLabel,
  icon: Icon,
  actions,
  className
}) => {
  return (
    <div className={cn("flex items-start justify-between mb-4", className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {value !== undefined && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">
                {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
              </span>
              {change !== undefined && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-sm font-medium",
                    change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-muted-foreground"
                  )}
                >
                  {change > 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : change < 0 ? (
                    <ArrowDownRight className="w-4 h-4" />
                  ) : null}
                  {change > 0 ? '+' : ''}{change}%
                  {changeLabel && (
                    <span className="text-muted-foreground font-normal ml-1">
                      {changeLabel}
                    </span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

// ==================== MINI CHART ====================

interface MiniChartProps {
  data: number[];
  type?: 'line' | 'bar' | 'area';
  color?: string;
  height?: number;
  width?: number;
  showDots?: boolean;
  className?: string;
}

export const MiniChart: React.FC<MiniChartProps> = ({
  data,
  type = 'line',
  color = 'hsl(var(--primary))',
  height = 40,
  width = 100,
  showDots = false,
  className
}) => {
  if (!data.length) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y, value };
  });

  const pathD = points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <motion.svg
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {type === 'area' && (
        <motion.path
          d={areaD}
          fill={color}
          fillOpacity={0.1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}
      
      {type === 'bar' ? (
        data.map((value, index) => {
          const barHeight = ((value - min) / range) * height;
          const barWidth = width / data.length - 2;
          const x = (index / data.length) * width + 1;
          
          return (
            <motion.rect
              key={index}
              x={x}
              y={height - barHeight}
              width={barWidth}
              height={barHeight}
              fill={color}
              rx={2}
              initial={{ height: 0, y: height }}
              animate={{ height: barHeight, y: height - barHeight }}
              transition={{ delay: index * 0.05 }}
            />
          );
        })
      ) : (
        <motion.path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      )}

      {showDots && type !== 'bar' && points.map((point, index) => (
        <motion.circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={3}
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 + index * 0.05 }}
        />
      ))}
    </motion.svg>
  );
};

// ==================== DATA CARD ====================

interface DataCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ElementType;
  trend?: number[];
  trendType?: 'line' | 'bar' | 'area';
  color?: string;
  onClick?: () => void;
  className?: string;
}

export const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend,
  trendType = 'area',
  color = 'hsl(var(--primary))',
  onClick,
  className
}) => {
  return (
    <motion.div
      className={cn(
        "bg-card border border-border rounded-xl p-4 transition-all",
        onClick && "cursor-pointer hover:border-primary/30 hover:shadow-lg",
        className
      )}
      onClick={onClick}
      whileHover={onClick ? { y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div 
              className="p-2 rounded-lg" 
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
          )}
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        {change !== undefined && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full",
              change > 0 
                ? "bg-green-500/10 text-green-500" 
                : change < 0 
                  ? "bg-red-500/10 text-red-500" 
                  : "bg-muted text-muted-foreground"
            )}
          >
            {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold text-foreground">
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </span>
          {changeLabel && (
            <span className="text-xs text-muted-foreground ml-2">{changeLabel}</span>
          )}
        </div>
        
        {trend && trend.length > 0 && (
          <MiniChart 
            data={trend} 
            type={trendType}
            color={color}
            height={32}
            width={80}
          />
        )}
      </div>
    </motion.div>
  );
};

// ==================== CHART TYPE ICONS ====================

export const ChartTypeIcon: React.FC<{ type: 'bar' | 'line' | 'pie'; className?: string }> = ({
  type,
  className
}) => {
  const icons = {
    bar: BarChart3,
    line: LineChart,
    pie: PieChart
  };

  const Icon = icons[type];
  return <Icon className={className} />;
};

// ==================== COMPARISON BADGE ====================

interface ComparisonBadgeProps {
  current: number;
  previous: number;
  format?: (value: number) => string;
  className?: string;
}

export const ComparisonBadge: React.FC<ComparisonBadgeProps> = ({
  current,
  previous,
  format = (v) => v.toLocaleString('pt-BR'),
  className
}) => {
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-semibold">{format(current)}</span>
      <span
        className={cn(
          "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
          isNeutral
            ? "bg-muted text-muted-foreground"
            : isPositive
              ? "bg-green-500/10 text-green-600"
              : "bg-red-500/10 text-red-600"
        )}
      >
        {!isNeutral && (
          isPositive ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )
        )}
        {isNeutral ? '0%' : `${isPositive ? '+' : ''}${change.toFixed(1)}%`}
      </span>
    </div>
  );
};

// ==================== CHART EMPTY STATE ====================

interface ChartEmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ElementType;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const ChartEmptyState: React.FC<ChartEmptyStateProps> = ({
  title = "Sem dados disponíveis",
  description = "Não há dados para exibir no momento",
  icon: Icon = BarChart3,
  action,
  className
}) => {
  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <Icon className="w-8 h-8 text-muted-foreground" />
      </motion.div>
      <h4 className="font-medium text-foreground mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground max-w-[250px] mb-4">{description}</p>
      {action && (
        <motion.button
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
};

// ==================== STAT HIGHLIGHT ====================

interface StatHighlightProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ElementType;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatHighlight: React.FC<StatHighlightProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  color = 'primary',
  size = 'md',
  className
}) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-green-500/10 text-green-600 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    danger: 'bg-red-500/10 text-red-600 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const valueSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <motion.div
      className={cn(
        "rounded-xl border",
        colorClasses[color],
        sizeClasses[size],
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <Icon className={cn("w-5 h-5", size === 'lg' && "w-6 h-6")} />
        )}
        <div>
          <p className="text-xs uppercase tracking-wide opacity-70 mb-1">{label}</p>
          <p className={cn("font-bold", valueSizes[size])}>
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </p>
          {subValue && (
            <p className="text-xs opacity-70 mt-1">{subValue}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
