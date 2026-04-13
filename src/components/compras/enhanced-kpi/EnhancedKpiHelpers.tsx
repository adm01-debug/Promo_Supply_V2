import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, forwardRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type KpiColor = 'emerald' | 'orange' | 'blue' | 'purple' | 'green' | 'cyan' | 'red' | 'indigo' | 'teal';

export const colorClasses: Record<KpiColor, { 
  bg: string; text: string; border: string; gradient: string;
}> = {
  emerald: { bg: 'bg-[hsl(var(--kpi-emerald-bg))]', text: 'text-[hsl(var(--kpi-emerald))]', border: 'border-[hsl(var(--kpi-emerald)/0.2)]', gradient: 'from-[hsl(var(--kpi-emerald))] to-[hsl(var(--kpi-emerald)/0.7)]' },
  orange: { bg: 'bg-[hsl(var(--kpi-orange-bg))]', text: 'text-[hsl(var(--kpi-orange))]', border: 'border-[hsl(var(--kpi-orange)/0.2)]', gradient: 'from-[hsl(var(--kpi-orange))] to-[hsl(var(--kpi-orange)/0.7)]' },
  blue: { bg: 'bg-[hsl(var(--kpi-blue-bg))]', text: 'text-[hsl(var(--kpi-blue))]', border: 'border-[hsl(var(--kpi-blue)/0.2)]', gradient: 'from-[hsl(var(--kpi-blue))] to-[hsl(var(--kpi-blue)/0.7)]' },
  purple: { bg: 'bg-[hsl(var(--kpi-purple-bg))]', text: 'text-[hsl(var(--kpi-purple))]', border: 'border-[hsl(var(--kpi-purple)/0.2)]', gradient: 'from-[hsl(var(--kpi-purple))] to-[hsl(var(--kpi-purple)/0.7)]' },
  green: { bg: 'bg-[hsl(var(--kpi-green-bg))]', text: 'text-[hsl(var(--kpi-green))]', border: 'border-[hsl(var(--kpi-green)/0.2)]', gradient: 'from-[hsl(var(--kpi-green))] to-[hsl(var(--kpi-green)/0.7)]' },
  cyan: { bg: 'bg-[hsl(var(--kpi-cyan-bg))]', text: 'text-[hsl(var(--kpi-cyan))]', border: 'border-[hsl(var(--kpi-cyan)/0.2)]', gradient: 'from-[hsl(var(--kpi-cyan))] to-[hsl(var(--kpi-cyan)/0.7)]' },
  red: { bg: 'bg-[hsl(var(--kpi-red-bg))]', text: 'text-[hsl(var(--kpi-red))]', border: 'border-[hsl(var(--kpi-red)/0.2)]', gradient: 'from-[hsl(var(--kpi-red))] to-[hsl(var(--kpi-red)/0.7)]' },
  indigo: { bg: 'bg-[hsl(var(--kpi-indigo-bg))]', text: 'text-[hsl(var(--kpi-indigo))]', border: 'border-[hsl(var(--kpi-indigo)/0.2)]', gradient: 'from-[hsl(var(--kpi-indigo))] to-[hsl(var(--kpi-indigo)/0.7)]' },
  teal: { bg: 'bg-[hsl(var(--kpi-teal-bg))]', text: 'text-[hsl(var(--kpi-teal))]', border: 'border-[hsl(var(--kpi-teal)/0.2)]', gradient: 'from-[hsl(var(--kpi-teal))] to-[hsl(var(--kpi-teal)/0.7)]' },
};

// Animated counter component
export const AnimatedCounter = forwardRef<HTMLSpanElement, { value: number; format?: 'number' | 'currency' | 'percent' }>(({ value, format = 'number' }, ref) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * easeOut));

      if (currentStep >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  const formatValue = (val: number) => {
    switch (format) {
      case 'currency': return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
      case 'percent': return `${val.toFixed(1)}%`;
      default: return val.toLocaleString('pt-BR');
    }
  };

  return <span ref={ref}>{formatValue(displayValue)}</span>;
});
AnimatedCounter.displayName = 'AnimatedCounter';

// Delta indicator component
export const DeltaIndicator = forwardRef<HTMLDivElement, {
  currentValue: number;
  previousValue: number;
  invertColors?: boolean;
}>(({ currentValue, previousValue, invertColors = false }, ref) => {
  const delta = previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
  const isPositive = delta > 0;
  const isNeutral = Math.abs(delta) < 0.5;

  const colorClass = useMemo(() => {
    if (isNeutral) return 'bg-muted text-muted-foreground';
    if (invertColors) return isPositive ? 'bg-destructive/15 text-destructive' : 'bg-success/15 text-success';
    return isPositive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive';
  }, [isPositive, isNeutral, invertColors]);

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full", colorClass)}>
      <AnimatePresence mode="wait">
        {isPositive && !isNeutral && <motion.div key="up" initial={{ rotate: 45 }} animate={{ rotate: 0 }}><TrendingUp className="w-3 h-3" /></motion.div>}
        {!isPositive && !isNeutral && <motion.div key="down" initial={{ rotate: -45 }} animate={{ rotate: 0 }}><TrendingDown className="w-3 h-3" /></motion.div>}
        {isNeutral && <motion.div key="neutral" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Minus className="w-3 h-3" /></motion.div>}
      </AnimatePresence>
      <span>{Math.abs(delta).toFixed(1)}%</span>
    </motion.div>
  );
});
DeltaIndicator.displayName = 'DeltaIndicator';

// Target progress ring
export const TargetProgressRing = ({ progress, size = 44, strokeWidth = 4, color }: { 
  progress: number; size?: number; strokeWidth?: number; color: KpiColor;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const colors = colorClasses[color];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative cursor-help" style={{ width: size, height: size }}>
          <svg className="transform -rotate-90" width={size} height={size}>
            <circle className="text-muted/30" strokeWidth={strokeWidth} stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
            <motion.circle className={colors.text} strokeWidth={strokeWidth} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - (Math.min(progress, 100) / 100) * circumference }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ strokeDasharray: circumference }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">{Math.round(progress)}%</span>
        </div>
      </TooltipTrigger>
      <TooltipContent><p>{progress >= 100 ? '✅ Meta atingida!' : `${Math.round(progress)}% da meta`}</p></TooltipContent>
    </Tooltip>
  );
};
