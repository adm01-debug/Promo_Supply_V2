import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { forwardRef, useState } from "react";
import { ArrowRight, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PipelineData {
  solicitacao: number;
  cotacao: number;
  pedido: number;
  pagamento: number;
  transito: number;
  entregue: number;
}

interface PipelineChartProps {
  data: PipelineData;
  previousData?: PipelineData;
}

const stages = [
  { key: 'solicitacao', label: 'Solicitação', bgClass: 'bg-kpi-emerald', glowClass: 'dark:shadow-[0_0_12px_hsl(var(--kpi-emerald)/0.4)]', colorVar: '--kpi-emerald', description: 'Solicitações abertas aguardando cotação' },
  { key: 'cotacao', label: 'Cotação', bgClass: 'bg-warning', glowClass: 'dark:shadow-[0_0_12px_hsl(var(--warning)/0.4)]', colorVar: '--warning', description: 'Em processo de cotação com fornecedores' },
  { key: 'pedido', label: 'Pedido', bgClass: 'bg-kpi-blue', glowClass: 'dark:shadow-[0_0_12px_hsl(var(--kpi-blue)/0.4)]', colorVar: '--kpi-blue', description: 'Pedidos gerados aguardando pagamento' },
  { key: 'pagamento', label: 'Pagamento', bgClass: 'bg-kpi-orange', glowClass: 'dark:shadow-[0_0_12px_hsl(var(--kpi-orange)/0.4)]', colorVar: '--kpi-orange', description: 'Em processo de pagamento' },
  { key: 'transito', label: 'Trânsito', bgClass: 'bg-kpi-purple', glowClass: 'dark:shadow-[0_0_12px_hsl(var(--kpi-purple)/0.4)]', colorVar: '--kpi-purple', description: 'Pedidos em trânsito para entrega' },
  { key: 'entregue', label: 'Entregue', bgClass: 'bg-success', glowClass: 'dark:shadow-[0_0_12px_hsl(var(--success)/0.4)]', colorVar: '--success', description: 'Pedidos entregues com sucesso' },
] as const;

// Default data in case previousData is not provided
const defaultPreviousData: PipelineData = {
  solicitacao: 0,
  cotacao: 0,
  pedido: 0,
  pagamento: 0,
  transito: 0,
  entregue: 0,
};

function getConversionRate(from: number, to: number): number {
  if (from === 0) return 0;
  return Math.round((to / from) * 100);
}

function getTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
}

const ConversionArrow = ({ rate, fromLabel, toLabel }: { rate: number; fromLabel: string; toLabel: string }) => {
  const isGood = rate >= 60;
  const isWarning = rate >= 40 && rate < 60;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div 
          className="flex flex-col items-center justify-center px-0.5 shrink-0"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <ArrowRight className={cn(
            "w-3.5 h-3.5",
            isGood ? "text-success" : isWarning ? "text-warning" : "text-destructive"
          )} />
          <span className={cn(
            "text-[10px] font-bold leading-none mt-0.5",
            isGood ? "text-success" : isWarning ? "text-warning" : "text-destructive"
          )}>
            {rate}%
          </span>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="font-semibold">{rate}% de conversão</p>
        <p className="text-muted-foreground">{fromLabel} → {toLabel}</p>
      </TooltipContent>
    </Tooltip>
  );
};

const TrendIndicator = ({ trend, current, previous }: { trend: 'up' | 'down' | 'stable'; current: number; previous: number }) => {
  const diff = current - previous;
  const pctChange = previous > 0 ? Math.round(Math.abs(diff / previous) * 100) : 0;
  
  if (trend === 'stable' || pctChange === 0) {
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  }
  
  return (
    <span className={cn(
      "flex items-center gap-0.5 text-[10px] font-medium",
      trend === 'up' ? "text-success" : "text-destructive"
    )}>
      {trend === 'up' ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {pctChange}%
    </span>
  );
};

export const PipelineChart = forwardRef<HTMLDivElement, PipelineChartProps>(({ data, previousData = defaultPreviousData }, ref) => {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  
  const values = Object.values(data);
  const maxSqrt = Math.max(...values.map(v => Math.sqrt(v)));
  
  // Calculate total throughput
  const totalActive = data.solicitacao + data.cotacao + data.pedido + data.pagamento + data.transito;
  const totalCompleted = data.entregue;
  const overallConversion = totalActive > 0 ? Math.round((totalCompleted / (totalActive + totalCompleted)) * 100) : 0;
  
  return (
    <div className="space-y-4" ref={ref}>
      {/* Summary Stats Row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground">{totalActive} em andamento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-muted-foreground">{totalCompleted} concluídos</span>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 border border-success/20 cursor-help">
              <span className="text-[11px] font-semibold text-success">{overallConversion}% conclusão</span>
              <Info className="w-3 h-3 text-success/60" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[200px]">
            <p className="text-xs">Taxa geral de conclusão: {totalCompleted} entregues de {totalActive + totalCompleted} total</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Bar Chart with Conversion Arrows */}
      <div className="flex items-end gap-0">
        {stages.map((stage, index) => {
          const value = data[stage.key];
          const prevValue = previousData[stage.key] || 0;
          const height = maxSqrt > 0 ? (Math.sqrt(value) / maxSqrt) * 100 : 0;
          const trend = getTrend(value, prevValue);
          const isHovered = hoveredStage === stage.key;
          
          // Conversion arrow between stages
          const nextStage = stages[index + 1];
          const conversionRate = nextStage ? getConversionRate(value, data[nextStage.key]) : null;
          
          return (
            <div key={stage.key} className="flex items-end flex-1 min-w-0">
              {/* Stage Bar */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div 
                    className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onMouseEnter={() => setHoveredStage(stage.key)}
                    onMouseLeave={() => setHoveredStage(null)}
                  >
                    {/* Value + Trend */}
                    <div className="flex flex-col items-center gap-0.5">
                      <motion.span 
                        className={cn(
                          "text-sm font-bold text-foreground transition-all",
                          isHovered && "text-primary scale-110"
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                      >
                        {value}
                      </motion.span>
                      <TrendIndicator trend={trend} current={value} previous={prevValue} />
                    </div>
                    
                    {/* Bar */}
                    <div className={cn(
                      "w-full bg-muted/40 dark:bg-muted/30 rounded-t-lg relative overflow-hidden transition-all",
                      isHovered && "ring-2 ring-primary/30 ring-offset-1 ring-offset-background"
                    )} style={{ height: '120px' }}>
                      <motion.div 
                        className={cn(
                          "absolute bottom-0 left-0 right-0 rounded-t-lg transition-colors duration-300",
                          stage.bgClass,
                          stage.glowClass
                        )}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
                      />
                      {/* Shimmer effect on hover */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {/* Label */}
                    <span className={cn(
                      "text-[10px] sm:text-xs text-muted-foreground truncate w-full text-center transition-colors",
                      isHovered && "text-foreground font-medium"
                    )}>{stage.label}</span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-sm">{stage.label}: {value}</p>
                    <p className="text-xs text-muted-foreground">{stage.description}</p>
                    <div className="flex items-center gap-1 text-xs border-t border-border pt-1.5">
                      <span className="text-muted-foreground">Período anterior:</span>
                      <span className="font-medium">{prevValue}</span>
                      <TrendIndicator trend={trend} current={value} previous={prevValue} />
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
              
              {/* Conversion Arrow */}
              {conversionRate !== null && (
                <ConversionArrow 
                  rate={conversionRate} 
                  fromLabel={stage.label} 
                  toLabel={nextStage!.label} 
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Funnel Summary - conversion narrative */}
      <motion.div 
        className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50 text-xs"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.3 }}
      >
        <Info className="w-4 h-4 text-primary shrink-0" />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Funil de compras:</span>{' '}
          De {data.solicitacao} solicitações, {getConversionRate(data.solicitacao, data.cotacao)}% avançam para cotação
          {data.cotacao > 0 && <> e {getConversionRate(data.cotacao, data.pedido)}% se convertem em pedidos</>}. 
          {' '}<span className="text-success font-medium">{totalCompleted} entregas</span> concluídas no período.
        </p>
      </motion.div>

      {/* Compact Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-border/50">
        {stages.map((stage) => (
          <div 
            key={stage.key} 
            className="flex items-center gap-1.5"
            onMouseEnter={() => setHoveredStage(stage.key)}
            onMouseLeave={() => setHoveredStage(null)}
          >
            <div className={cn("w-2 h-2 rounded-full", stage.bgClass)} />
            <span className="text-[10px] text-muted-foreground">{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

PipelineChart.displayName = 'PipelineChart';
