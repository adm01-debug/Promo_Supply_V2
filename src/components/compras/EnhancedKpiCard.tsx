import { LucideIcon, ArrowUpRight, Sparkles, Target, Info } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMemo, forwardRef } from "react";
import { Sparkline } from "@/components/ui/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { 
  type KpiColor, colorClasses, 
  AnimatedCounter, DeltaIndicator, TargetProgressRing 
} from "./enhanced-kpi/EnhancedKpiHelpers";

export type { KpiColor };

export interface EnhancedKpiCardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon: LucideIcon;
  color: KpiColor;
  subtitle?: string;
  format?: 'number' | 'currency' | 'percent';
  target?: { value: number; label?: string };
  sparklineData?: number[];
  variant?: 'default' | 'featured' | 'compact';
  onClick?: () => void;
  periodLabel?: string;
  showComparison?: boolean;
  animate?: boolean;
}

export const EnhancedKpiCard = forwardRef<HTMLDivElement, EnhancedKpiCardProps>(({ 
  title, 
  value, 
  previousValue,
  icon: Icon, 
  color, 
  subtitle, 
  format = 'number',
  target,
  sparklineData,
  variant = 'default',
  onClick,
  periodLabel = 'vs previous period',
  showComparison = true,
  animate = true
}, ref) => {
  const colors = colorClasses[color] || colorClasses['violet'];
  
  const targetProgress = useMemo(() => {
    if (!target) return null;
    return (value / target.value) * 100;
  }, [target, value]);

  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
      case 'percent':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString('pt-BR');
    }
  };

  const commonCardClasses = cn(
    "relative overflow-hidden cursor-pointer transition-all duration-500",
    "border-border/40 bg-card/40 backdrop-blur-2xl rounded-[2rem]",
    "hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-1 active:scale-[0.98]",
    colors.border
  );

  return (
    <motion.div
      ref={ref}
      initial={animate ? { opacity: 0, y: 15 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={commonCardClasses} onClick={onClick}>
        <div className={cn(
          "absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20",
          colors.bg
        )} />
        
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
              colors.bg,
              colors.text
            )}>
              <Icon className="h-6 w-6" />
            </div>
            
            <div className="flex items-center gap-3">
              {sparklineData && sparklineData.length >= 2 && (
                <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                  <Sparkline
                    data={sparklineData}
                    width={60}
                    height={20}
                    color={colors.text.includes('emerald') ? '#10b981' : colors.text.includes('rose') ? '#ef4444' : '#8b5cf6'}
                  />
                </div>
              )}
              
              {showComparison && previousValue !== undefined && (
                <DeltaIndicator currentValue={value} previousValue={previousValue} />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{title}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground tracking-tighter leading-none">
                  {animate ? <AnimatedCounter value={value} format={format} /> : formatValue(value)}
                </span>
                {targetProgress && targetProgress >= 100 && (
                  <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                )}
              </div>
              {subtitle && <p className="text-[10px] font-bold text-muted-foreground/60 mt-2 uppercase tracking-wide">{subtitle}</p>}
            </div>

            {target && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Target className="h-3.5 w-3.5" />
                    <span>{target.label || 'TARGET INDEX'}</span>
                  </div>
                  <span className={cn(targetProgress && targetProgress >= 100 ? 'text-emerald-400' : colors.text)}>
                    {targetProgress?.toFixed(0)}%
                  </span>
                </div>
                <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div 
                    className={cn(
                      "h-full rounded-full",
                      targetProgress && targetProgress >= 100 ? 'bg-emerald-500' : cn("bg-gradient-to-r", colors.gradient)
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(targetProgress || 0, 100)}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

EnhancedKpiCard.displayName = 'EnhancedKpiCard';

export default EnhancedKpiCard;
