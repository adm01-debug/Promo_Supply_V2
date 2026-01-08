import { LucideIcon, TrendingUp, TrendingDown, Minus, ArrowUpRight, Sparkles } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAnimatedValue } from "@/hooks/useAnimatedValue";
import { Sparkline } from "@/components/ui/sparkline";
import { useMemo, useEffect, useState, useRef } from "react";

export type KpiColor = 'emerald' | 'orange' | 'blue' | 'purple' | 'green' | 'cyan' | 'red' | 'indigo' | 'teal';
export type KpiVariant = 'default' | 'featured' | 'compact' | 'minimal';

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
  trend?: {
    value: number;
    label?: string;
  };
  target?: {
    value: number;
    label?: string;
  };
  onClick?: () => void;
}

// Using semantic tokens from design system (index.css)
const colorClasses: Record<KpiColor, { 
  bg: string; 
  text: string; 
  border: string; 
  glow: string;
  gradient: string;
  gradientText: string;
}> = {
  emerald: {
    bg: 'bg-[hsl(var(--kpi-emerald-bg))]',
    text: 'text-[hsl(var(--kpi-emerald))]',
    border: 'border-[hsl(var(--kpi-emerald)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-emerald)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-emerald))] to-[hsl(var(--kpi-emerald)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-emerald))] via-[hsl(var(--kpi-emerald)/0.9)] to-[hsl(var(--kpi-emerald)/0.7)]',
  },
  orange: {
    bg: 'bg-[hsl(var(--kpi-orange-bg))]',
    text: 'text-[hsl(var(--kpi-orange))]',
    border: 'border-[hsl(var(--kpi-orange)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-orange)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-orange))] to-[hsl(var(--kpi-orange)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-orange))] via-[hsl(var(--kpi-orange)/0.9)] to-[hsl(var(--kpi-orange)/0.7)]',
  },
  blue: {
    bg: 'bg-[hsl(var(--kpi-blue-bg))]',
    text: 'text-[hsl(var(--kpi-blue))]',
    border: 'border-[hsl(var(--kpi-blue)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-blue)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-blue))] to-[hsl(var(--kpi-blue)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-blue))] via-[hsl(var(--kpi-blue)/0.9)] to-[hsl(var(--kpi-blue)/0.7)]',
  },
  purple: {
    bg: 'bg-[hsl(var(--kpi-purple-bg))]',
    text: 'text-[hsl(var(--kpi-purple))]',
    border: 'border-[hsl(var(--kpi-purple)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-purple)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-purple))] to-[hsl(var(--kpi-purple)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-purple))] via-[hsl(var(--kpi-purple)/0.9)] to-[hsl(var(--kpi-purple)/0.7)]',
  },
  green: {
    bg: 'bg-[hsl(var(--kpi-green-bg))]',
    text: 'text-[hsl(var(--kpi-green))]',
    border: 'border-[hsl(var(--kpi-green)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-green)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-green))] to-[hsl(var(--kpi-green)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-green))] via-[hsl(var(--kpi-green)/0.9)] to-[hsl(var(--kpi-green)/0.7)]',
  },
  cyan: {
    bg: 'bg-[hsl(var(--kpi-cyan-bg))]',
    text: 'text-[hsl(var(--kpi-cyan))]',
    border: 'border-[hsl(var(--kpi-cyan)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-cyan)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-cyan))] to-[hsl(var(--kpi-cyan)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-cyan))] via-[hsl(var(--kpi-cyan)/0.9)] to-[hsl(var(--kpi-cyan)/0.7)]',
  },
  red: {
    bg: 'bg-[hsl(var(--kpi-red-bg))]',
    text: 'text-[hsl(var(--kpi-red))]',
    border: 'border-[hsl(var(--kpi-red)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-red)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-red))] to-[hsl(var(--kpi-red)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-red))] via-[hsl(var(--kpi-red)/0.9)] to-[hsl(var(--kpi-red)/0.7)]',
  },
  indigo: {
    bg: 'bg-[hsl(var(--kpi-indigo-bg))]',
    text: 'text-[hsl(var(--kpi-indigo))]',
    border: 'border-[hsl(var(--kpi-indigo)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-indigo)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-indigo))] to-[hsl(var(--kpi-indigo)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-indigo))] via-[hsl(var(--kpi-indigo)/0.9)] to-[hsl(var(--kpi-indigo)/0.7)]',
  },
  teal: {
    bg: 'bg-[hsl(var(--kpi-teal-bg))]',
    text: 'text-[hsl(var(--kpi-teal))]',
    border: 'border-[hsl(var(--kpi-teal)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-teal)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-teal))] to-[hsl(var(--kpi-teal)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-teal))] via-[hsl(var(--kpi-teal)/0.9)] to-[hsl(var(--kpi-teal)/0.7)]',
  },
};

// Animated counter component
const AnimatedCounter = ({ 
  value, 
  className,
  duration = 1.5 
}: { 
  value: number; 
  className?: string;
  duration?: number;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const controls = animate(prevValue.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value, duration]);

  return (
    <span className={className}>
      {displayValue.toLocaleString('pt-BR')}
    </span>
  );
};

// Progress ring for targets
const ProgressRing = ({ 
  progress, 
  size = 40, 
  strokeWidth = 3,
  color 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  color: KpiColor;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const colors = colorClasses[color];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted/30"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={colors.text}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ 
            strokeDashoffset: circumference - (progress / 100) * circumference 
          }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
        {Math.round(progress)}%
      </span>
    </div>
  );
};

export const KpiCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  subtitle, 
  highlight, 
  index = 0, 
  sparklineData,
  variant = 'default',
  trend: trendProp,
  target,
  onClick
}: KpiCardProps) => {
  const colors = colorClasses[color];
  
  // Extract numeric value for animation if it's a number
  const numericValue = typeof value === 'number' ? value : null;
  
  // Format the display value
  const displayValue = numericValue !== null 
    ? numericValue.toLocaleString('pt-BR')
    : value;

  // Calculate trend from sparkline data or use prop
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

  // Calculate target progress
  const targetProgress = useMemo(() => {
    if (!target || numericValue === null) return null;
    return Math.min((numericValue / target.value) * 100, 100);
  }, [target, numericValue]);

  // Featured variant - larger, more prominent
  if (variant === 'featured') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.5, 
          delay: index * 0.1,
          ease: [0.16, 1, 0.3, 1]
        }}
        whileHover={{ 
          y: -6,
          scale: 1.02,
          transition: { duration: 0.2 }
        }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={cn(
          "relative rounded-2xl border-2 bg-card text-card-foreground shadow-lg p-5 md:p-6 group overflow-hidden",
          "transition-all duration-300",
          colors.border,
          onClick && "cursor-pointer",
          highlight && "ring-2 ring-destructive/50 animate-pulse"
        )}
      >
        {/* Background gradient effect */}
        <div 
          className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            "bg-gradient-to-br",
            colors.gradient
          )}
          style={{ opacity: 0.03 }}
        />

        {/* Animated particles for featured cards */}
        <motion.div 
          className="absolute top-2 right-2"
          animate={{ 
            rotate: [0, 180, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        >
          <Sparkles className={cn("w-4 h-4 opacity-30", colors.text)} />
        </motion.div>

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {title}
              </p>
              <motion.div 
                className="flex items-baseline gap-2"
                key={String(value)}
              >
                {numericValue !== null ? (
                  <span 
                    className={cn(
                      "text-3xl md:text-5xl font-black tracking-tight",
                      "bg-gradient-to-r bg-clip-text text-transparent",
                      colors.gradientText
                    )}
                  >
                    <AnimatedCounter value={numericValue} />
                  </span>
                ) : (
                  <span 
                    className={cn(
                      "text-3xl md:text-5xl font-black tracking-tight",
                      "bg-gradient-to-r bg-clip-text text-transparent",
                      colors.gradientText
                    )}
                  >
                    {displayValue}
                  </span>
                )}
                {trend && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className={cn(
                      "flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full",
                      trend.direction === 'up' && "bg-success/15 text-success",
                      trend.direction === 'down' && "bg-destructive/15 text-destructive",
                      trend.direction === 'neutral' && "bg-muted text-muted-foreground"
                    )}
                  >
                    {trend.direction === 'up' && <TrendingUp className="w-4 h-4" />}
                    {trend.direction === 'down' && <TrendingDown className="w-4 h-4" />}
                    {trend.direction === 'neutral' && <Minus className="w-4 h-4" />}
                    <span>{trend.value}%</span>
                  </motion.div>
                )}
              </motion.div>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-3">
              <motion.div 
                className={cn(
                  "p-3 md:p-4 rounded-2xl shadow-lg",
                  "bg-gradient-to-br",
                  colors.gradient
                )}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </motion.div>
              {targetProgress !== null && (
                <ProgressRing progress={targetProgress} color={color} size={44} />
              )}
            </div>
          </div>

          {/* Sparkline for featured */}
          {sparklineData && sparklineData.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="mt-4 pt-4 border-t border-border/30"
            >
              <Sparkline
                data={sparklineData}
                width={200}
                height={40}
                showArea={true}
                animate={true}
                className="w-full"
              />
            </motion.div>
          )}

          {/* Target info */}
          {target && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 flex items-center justify-between text-xs text-muted-foreground"
            >
              <span>{target.label || 'Meta'}</span>
              <span className="font-medium">{target.value.toLocaleString('pt-BR')}</span>
            </motion.div>
          )}
        </div>

        {/* Click indicator */}
        {onClick && (
          <motion.div 
            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
            whileHover={{ x: 2 }}
          >
            <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Compact variant - smaller, denser
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ y: -2 }}
        onClick={onClick}
        className={cn(
          "relative rounded-lg border bg-card p-2.5 group",
          "transition-all duration-200 hover:shadow-md",
          colors.border,
          onClick && "cursor-pointer"
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md shrink-0", colors.bg)}>
            <Icon className={cn("w-3.5 h-3.5", colors.text)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground truncate">{title}</p>
            <p className={cn("text-sm font-bold truncate", colors.text)}>
              {displayValue}
            </p>
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.5 rounded",
              trend.direction === 'up' && "bg-success/10 text-success",
              trend.direction === 'down' && "bg-destructive/10 text-destructive",
              trend.direction === 'neutral' && "bg-muted text-muted-foreground"
            )}>
              {trend.direction === 'up' && <TrendingUp className="w-2.5 h-2.5" />}
              {trend.direction === 'down' && <TrendingDown className="w-2.5 h-2.5" />}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Minimal variant - just value and icon
  if (variant === 'minimal') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="flex items-center gap-2"
      >
        <div className={cn("p-1 rounded", colors.bg)}>
          <Icon className={cn("w-3 h-3", colors.text)} />
        </div>
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
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: "easeOut"
      }}
      whileHover={{ 
        y: -4,
        transition: { duration: 0.2 }
      }}
      onClick={onClick}
      className={cn(
        "relative rounded-lg border bg-card text-card-foreground shadow-sm p-3 md:p-4 group",
        "transition-shadow duration-300 hover:shadow-lg",
        colors.border,
        colors.glow,
        onClick && "cursor-pointer",
        highlight && "ring-2 ring-destructive/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 md:space-y-1 min-w-0 flex-1">
          <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {title}
          </p>
          <motion.p 
            className={cn("text-lg md:text-2xl font-bold truncate", colors.text)}
            key={String(value)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {numericValue !== null ? (
              <AnimatedCounter value={numericValue} duration={1} />
            ) : (
              displayValue
            )}
          </motion.p>
          {subtitle && (
            <motion.p 
              className="text-[10px] md:text-xs text-muted-foreground truncate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {subtitle}
            </motion.p>
          )}
        </div>
        <motion.div 
          className={cn("p-1.5 md:p-2 rounded-lg shrink-0", colors.bg)}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Icon className={cn("w-4 h-4 md:w-5 md:h-5", colors.text)} />
        </motion.div>
      </div>

      {/* Sparkline and Trend */}
      {sparklineData && sparklineData.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + index * 0.1 }}
          className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between gap-2"
        >
          <Sparkline
            data={sparklineData}
            width={80}
            height={24}
            showArea={true}
            animate={true}
            className="flex-1"
          />
          {trend && (
            <div className={cn(
              "flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
              trend.direction === 'up' && "bg-success/10 text-success",
              trend.direction === 'down' && "bg-destructive/10 text-destructive",
              trend.direction === 'neutral' && "bg-muted text-muted-foreground"
            )}>
              {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
              {trend.direction === 'neutral' && <Minus className="w-3 h-3" />}
              <span>{trend.value}%</span>
            </div>
          )}
        </motion.div>
      )}
      
      {highlight && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-destructive/50 pointer-events-none"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};
