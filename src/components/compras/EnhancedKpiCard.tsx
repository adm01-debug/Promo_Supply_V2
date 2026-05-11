import { LucideIcon, ArrowUpRight, Sparkles, Target, Info } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMemo, forwardRef } from "react";
import { Sparkline } from "@/components/ui/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
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
// Components (AnimatedCounter, DeltaIndicator, TargetProgressRing) imported from enhanced-kpi/EnhancedKpiHelpers
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
  periodLabel = 'vs período anterior',
  showComparison = true,
  animate = true
}, ref) => {
  const colors = colorClasses[color];
  
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

  // Featured variant - larger, more prominent
  if (variant === 'featured') {
    return (
      <motion.div
        ref={ref}
        initial={animate ? { opacity: 0, y: 20, scale: 0.95 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        className={cn(
          "relative rounded-2xl border-2 bg-card text-card-foreground shadow-lg p-5 group overflow-hidden cursor-pointer",
          "transition-all duration-300 hover:shadow-xl",
          colors.border
        )}
      >
        {/* Decorative gradient */}
        <div 
          className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            "bg-gradient-to-br",
            colors.gradient
          )}
          style={{ opacity: 0.03 }}
        />

        {/* Sparkle decoration */}
        <motion.div 
          className="absolute top-3 right-3"
          animate={{ rotate: [0, 180, 360], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className={cn("w-4 h-4 opacity-30", colors.text)} />
        </motion.div>

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {title}
              </p>
              
              <div className="flex items-baseline gap-3">
                <span className={cn(
                  "text-3xl md:text-4xl font-black tracking-tight",
                  colors.text
                )}>
                  {animate ? <AnimatedCounter value={value} format={format} /> : formatValue(value)}
                </span>
                
                {showComparison && previousValue !== undefined && (
                  <DeltaIndicator 
                    currentValue={value} 
                    previousValue={previousValue}
                  />
                )}
              </div>

              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}

              {/* Comparison tooltip */}
              {showComparison && previousValue !== undefined && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground/70 flex items-center gap-1 cursor-help">
                      <Info className="w-3 h-3" />
                      {periodLabel}: {formatValue(previousValue)}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Valor do período anterior: <strong>{formatValue(previousValue)}</strong></p>
                    <p>Variação: <strong>{((value - previousValue) / previousValue * 100).toFixed(1)}%</strong></p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="flex flex-col items-end gap-3">
              <motion.div 
                className={cn(
                  "p-3 rounded-xl shadow-lg",
                  "bg-gradient-to-br",
                  colors.gradient
                )}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Icon className="w-6 h-6 text-primary-foreground" />
              </motion.div>
              
              {targetProgress !== null && (
                <TargetProgressRing progress={targetProgress} color={color} />
              )}
            </div>
          </div>

          {/* Sparkline */}
          {sparklineData && sparklineData.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-4 pt-4 border-t border-border/30"
            >
              <Sparkline
                data={sparklineData}
                width={200}
                height={40}
                showArea={true}
                animate={animate}
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
              className="mt-3"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {target.label || 'Meta'}
                </span>
                <span className="font-medium">{formatValue(target.value)}</span>
              </div>
              <Progress 
                value={Math.min(targetProgress || 0, 100)} 
                className="h-1.5"
              />
            </motion.div>
          )}
        </div>

        {/* Click indicator */}
        {onClick && (
          <motion.div 
            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
            whileHover={{ x: 2 }}
          >
            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <motion.div
        ref={ref}
        initial={animate ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        onClick={onClick}
        className={cn(
          "relative rounded-lg border bg-card p-3 group cursor-pointer",
          "transition-all duration-200 hover:shadow-md",
          colors.border
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg shrink-0", colors.bg)}>
            <Icon className={cn("w-4 h-4", colors.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <div className="flex items-center gap-2">
              <span className={cn("text-lg font-bold", colors.text)}>
                {formatValue(value)}
              </span>
              {showComparison && previousValue !== undefined && (
                <DeltaIndicator 
                  currentValue={value} 
                  previousValue={previousValue}
                />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      ref={ref}
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={cn(
        "relative rounded-xl border bg-card/40 text-card-foreground shadow-sm p-5 group cursor-pointer backdrop-blur-sm",
        "transition-all duration-300 hover:shadow-lg",
        colors.border
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold", colors.text)}>
              {animate ? <AnimatedCounter value={value} format={format} /> : formatValue(value)}
            </span>
            
            {showComparison && previousValue !== undefined && (
              <DeltaIndicator 
                currentValue={value} 
                previousValue={previousValue}
              />
            )}
          </div>

          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className={cn("p-2.5 rounded-xl", colors.bg)}>
          <Icon className={cn("w-5 h-5", colors.text)} />
        </div>
      </div>

      {/* Target progress bar */}
      {target && (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Meta: {formatValue(target.value)}</span>
            <span className={targetProgress && targetProgress >= 100 ? 'text-success' : ''}>
              {targetProgress?.toFixed(0)}%
            </span>
          </div>
          <Progress value={Math.min(targetProgress || 0, 100)} className="h-1.5" />
        </div>
      )}

      {/* Mini sparkline */}
      {sparklineData && sparklineData.length >= 2 && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <Sparkline
            data={sparklineData}
            width={300}
            height={48}
            showArea={true}
            className="w-full opacity-80 group-hover:opacity-100 transition-opacity"
          />
        </div>
      )}
    </motion.div>
  );
});

EnhancedKpiCard.displayName = 'EnhancedKpiCard';

export default EnhancedKpiCard;
