import { LucideIcon, TrendingUp, TrendingDown, Minus, ArrowUpRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/ui/sparkline";
import { useMemo } from "react";
import { colorClasses, type KpiColor, type KpiVariant } from "./kpi/kpiColorClasses";
import { AnimatedCounter, ProgressRing } from "./kpi/KpiCardHelpers";

export type { KpiColor, KpiVariant };

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: KpiColor;
  subtitle?: string;
  highlight?: boolean;
  index?: number;
  sparklineData?: number[];
  variant?: KpiVariant;
  trend?: { value: number; label?: string };
  target?: { value: number; label?: string };
  onClick?: () => void;
}

export const KpiCard = ({ 
  title, value, icon: Icon, color, subtitle, highlight, index = 0, 
  sparklineData, variant = 'default', trend: trendProp, target, onClick
}: KpiCardProps) => {
  const colors = colorClasses[color];
  const numericValue = typeof value === 'number' ? value : null;
  const displayValue = numericValue !== null ? numericValue.toLocaleString('pt-BR') : value;

  const trend = useMemo(() => {
    if (trendProp) {
      return {
        direction: trendProp.value > 0.5 ? 'up' : trendProp.value < -0.5 ? 'down' : 'neutral',
        value: Math.abs(trendProp.value).toFixed(1),
        label: trendProp.label
      };
    }
    if (!sparklineData || sparklineData.length < 2) return null;
    const first = sparklineData[0];
    const last = sparklineData[sparklineData.length - 1];
    const percentChange = ((last - first) / first) * 100;
    return {
      direction: percentChange > 0.5 ? 'up' : percentChange < -0.5 ? 'down' : 'neutral',
      value: Math.abs(percentChange).toFixed(1),
      label: undefined
    };
  }, [sparklineData, trendProp]);

  const targetProgress = useMemo(() => {
    if (!target || numericValue === null) return null;
    return Math.min((numericValue / target.value) * 100, 100);
  }, [target, numericValue]);

  const TrendBadge = ({ size = "default" }: { size?: "default" | "small" }) => {
    if (!trend) return null;
    const isSmall = size === "small";
    return (
      <div className={cn(
        "flex items-center gap-0.5 font-medium rounded-full",
        isSmall ? "text-[9px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5",
        trend.direction === 'up' && "bg-success/10 text-success",
        trend.direction === 'down' && "bg-destructive/10 text-destructive",
        trend.direction === 'neutral' && "bg-muted text-muted-foreground"
      )}>
        {trend.direction === 'up' && <TrendingUp className={cn(isSmall ? "w-2.5 h-2.5" : "w-3 h-3")} />}
        {trend.direction === 'down' && <TrendingDown className={cn(isSmall ? "w-2.5 h-2.5" : "w-3 h-3")} />}
        {trend.direction === 'neutral' && <Minus className={cn(isSmall ? "w-2.5 h-2.5" : "w-3 h-3")} />}
        <span>{trend.value}%</span>
      </div>
    );
  };

  // Featured variant
  if (variant === 'featured') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={cn(
          "relative rounded-2xl border-2 bg-card text-card-foreground shadow-lg p-5 md:p-6 group overflow-hidden transition-all duration-300",
          colors.border, onClick && "cursor-pointer", highlight && "ring-2 ring-destructive/50 animate-pulse"
        )}
      >
        <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br", colors.gradient)} style={{ opacity: 0.03 }} />
        <motion.div className="absolute top-2 right-2" animate={{ rotate: [0, 180, 360], scale: [1, 1.1, 1] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
          <Sparkles className={cn("w-4 h-4 opacity-30", colors.text)} />
        </motion.div>

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
              <motion.div className="flex items-baseline gap-2" key={String(value)}>
                <span className={cn("text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-r bg-clip-text text-transparent", colors.gradientText)}>
                  {numericValue !== null ? <AnimatedCounter value={numericValue} /> : displayValue}
                </span>
                {trend && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                    className={cn("flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full",
                      trend.direction === 'up' && "bg-success/15 text-success",
                      trend.direction === 'down' && "bg-destructive/15 text-destructive",
                      trend.direction === 'neutral' && "bg-muted text-muted-foreground"
                    )}>
                    {trend.direction === 'up' && <TrendingUp className="w-4 h-4" />}
                    {trend.direction === 'down' && <TrendingDown className="w-4 h-4" />}
                    {trend.direction === 'neutral' && <Minus className="w-4 h-4" />}
                    <span>{trend.value}%</span>
                  </motion.div>
                )}
              </motion.div>
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            <div className="flex flex-col items-end gap-3">
              <motion.div className={cn("p-3 md:p-4 rounded-2xl shadow-lg bg-gradient-to-br", colors.gradient)} whileHover={{ scale: 1.1, rotate: 5 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                <Icon className="w-6 h-6 md:w-8 md:h-8 text-primary-foreground" />
              </motion.div>
              {targetProgress !== null && <ProgressRing progress={targetProgress} color={color} size={44} />}
            </div>
          </div>
          {sparklineData && sparklineData.length >= 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + index * 0.1 }} className="mt-4 pt-4 border-t border-border/30">
              <Sparkline data={sparklineData} width={200} height={40} showArea={true} animate={true} className="w-full" />
            </motion.div>
          )}
          {target && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{target.label || 'Meta'}</span>
              <span className="font-medium">{target.value.toLocaleString('pt-BR')}</span>
            </motion.div>
          )}
        </div>
        {onClick && (
          <motion.div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" whileHover={{ x: 2 }}>
            <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ y: -2 }}
        onClick={onClick}
        className={cn("relative rounded-lg border bg-card p-2.5 group transition-all duration-200 hover:shadow-md", colors.border, onClick && "cursor-pointer")}
      >
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md shrink-0", colors.bg)}>
            <Icon className={cn("w-3.5 h-3.5", colors.text)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground truncate">{title}</p>
            <p className={cn("text-sm font-bold truncate", colors.text)}>{displayValue}</p>
          </div>
          <TrendBadge size="small" />
        </div>
      </motion.div>
    );
  }

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: index * 0.05 }} className="flex items-center gap-2">
        <div className={cn("p-1 rounded", colors.bg)}><Icon className={cn("w-3 h-3", colors.text)} /></div>
        <span className="text-xs text-muted-foreground">{title}:</span>
        <span className={cn("text-sm font-semibold", colors.text)}>{displayValue}</span>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={cn(
        "relative rounded-lg border bg-card text-card-foreground shadow-sm p-3 md:p-4 group transition-shadow duration-300 hover:shadow-lg",
        colors.border, colors.glow, onClick && "cursor-pointer", highlight && "ring-2 ring-destructive/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 md:space-y-1 min-w-0 flex-1">
          <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
          <motion.p className={cn("text-lg md:text-2xl font-bold truncate", colors.text)} key={String(value)} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            {numericValue !== null ? <AnimatedCounter value={numericValue} duration={1} /> : displayValue}
          </motion.p>
          {subtitle && (
            <motion.p className="text-[10px] md:text-xs text-muted-foreground truncate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              {subtitle}
            </motion.p>
          )}
        </div>
        <motion.div className={cn("p-1.5 md:p-2 rounded-lg shrink-0", colors.bg)} whileHover={{ scale: 1.1, rotate: 5 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Icon className={cn("w-4 h-4 md:w-5 md:h-5", colors.text)} />
        </motion.div>
      </div>

      {sparklineData && sparklineData.length >= 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + index * 0.1 }} className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
          <Sparkline data={sparklineData} width={80} height={24} showArea={true} animate={true} className="flex-1" />
          <TrendBadge />
        </motion.div>
      )}
      
      {highlight && (
        <motion.div className="absolute inset-0 rounded-lg border-2 border-destructive/50 pointer-events-none" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
      )}
    </motion.div>
  );
};
