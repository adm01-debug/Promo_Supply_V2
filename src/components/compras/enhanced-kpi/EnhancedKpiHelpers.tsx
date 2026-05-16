import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, forwardRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type KpiColor = 'emerald' | 'orange' | 'blue' | 'purple' | 'green' | 'cyan' | 'red' | 'indigo' | 'teal' | 'violet' | 'fuchsia';

export const colorClasses: Record<string, { 
  bg: string; text: string; border: string; gradient: string;
}> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', gradient: 'from-emerald-600 to-emerald-400' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', gradient: 'from-orange-600 to-orange-400' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', gradient: 'from-blue-600 to-blue-400' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', gradient: 'from-purple-600 to-purple-400' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', gradient: 'from-violet-600 to-violet-400' },
  fuchsia: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20', gradient: 'from-fuchsia-600 to-fuchsia-400' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', gradient: 'from-green-600 to-green-400' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', gradient: 'from-cyan-600 to-cyan-400' },
  red: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', gradient: 'from-rose-600 to-rose-400' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', gradient: 'from-indigo-600 to-indigo-400' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', gradient: 'from-teal-600 to-teal-400' },
};

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

export const DeltaIndicator = forwardRef<HTMLDivElement, {
  currentValue: number;
  previousValue: number;
  invertColors?: boolean;
}>(({ currentValue, previousValue, invertColors = false }, ref) => {
  const delta = previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
  const isPositive = delta > 0;
  const isNeutral = Math.abs(delta) < 0.5;

  const colorClass = useMemo(() => {
    if (isNeutral) return 'bg-white/10 text-zinc-400';
    if (invertColors) return isPositive ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400';
    return isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400';
  }, [isPositive, isNeutral, invertColors]);

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className={cn("inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tight", colorClass)}>
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

export const TargetProgressRing = ({ progress, size = 44, strokeWidth = 4, color }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const colors = colorClasses[color] || colorClasses['violet'];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative cursor-help" style={{ width: size, height: size }}>
          <svg className="transform -rotate-90" width={size} height={size}>
            <circle className="text-white/5" strokeWidth={strokeWidth} stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
            <motion.circle className={colors.text} strokeWidth={strokeWidth} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - (Math.min(progress, 100) / 100) * circumference }}
              transition={{ duration: 1.5, ease: "circOut" }}
              style={{ strokeDasharray: circumference }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">{Math.round(progress)}%</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="bg-[#05020a] border-white/10 text-zinc-300"><p className="text-[10px] font-black uppercase tracking-widest">{progress >= 100 ? 'Target Achieved' : `${Math.round(progress)}% of Target`}</p></TooltipContent>
    </Tooltip>
  );
};
