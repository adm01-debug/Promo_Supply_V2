import { useState, useMemo, forwardRef } from "react";
import { 
  Thermometer, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Zap,
  Activity,
  Wind,
  CloudRain,
  Sun,
  CloudSun
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";


type ClimateLevel = 'excellent' | 'good' | 'moderate' | 'warning' | 'critical';

interface ClimateIndicator {
  name: string;
  value: number;
  weight: number;
  status: ClimateLevel;
  icon: React.ElementType;
  description: string;
}

const getClimateConfig = (level: ClimateLevel) => {
  const configs = {
    excellent: { label: 'Excelente', color: 'text-success', bgColor: 'bg-success/10', borderColor: 'border-emerald-500/30', icon: Sun, emoji: '☀️', message: 'Operações fluindo perfeitamente!' },
    good: { label: 'Bom', color: 'text-success', bgColor: 'bg-success/10', borderColor: 'border-green-500/30', icon: CloudSun, emoji: '🌤️', message: 'Clima favorável para compras' },
    moderate: { label: 'Moderado', color: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-yellow-500/30', icon: Wind, emoji: '🌥️', message: 'Alguns pontos de atenção' },
    warning: { label: 'Atenção', color: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-orange-500/30', icon: CloudRain, emoji: '🌧️', message: 'Requer ação imediata' },
    critical: { label: 'Crítico', color: 'text-destructive', bgColor: 'bg-destructive/10', borderColor: 'border-red-500/30', icon: AlertTriangle, emoji: '⛈️', message: 'Situação crítica - agir agora!' },
  };
  return configs[level];
};

const getStatusLevel = (value: number): ClimateLevel => {
  if (value >= 90) return 'excellent';
  if (value >= 75) return 'good';
  if (value >= 60) return 'moderate';
  if (value >= 40) return 'warning';
  return 'critical';
};

export const PurchaseClimateWidget = forwardRef<HTMLDivElement>((_props, ref) => {
  const [showDetails, setShowDetails] = useState(false);

  // Fetch real stats from Supabase
  const { data: stats } = useQuery({
    queryKey: ['purchase-climate-stats'],
    queryFn: async () => {
      const [solRes, pedRes, pagRes] = await Promise.all([
        supabase.from('solicitacoes').select('status, valor_estimado', { count: 'exact' }),
        supabase.from('pedidos').select('status, data_previsao, data_entrega', { count: 'exact' }),
        supabase.from('pagamentos').select('status, valor, valor_pago', { count: 'exact' }),
      ]);

      const sols = solRes.data || [];
      const peds = pedRes.data || [];
      const pags = pagRes.data || [];

      const totalSol = sols.length;
      const pendingSol = sols.filter(s => ['pendente', 'em_cotacao'].includes(s.status)).length;
      const finalizados = sols.filter(s => s.status === 'concluida').length;
      const cancelados = sols.filter(s => s.status === 'cancelada').length;

      const entregues = peds.filter(p => p.status === 'entregue' || p.status === 'recebido').length;
      const totalPed = peds.length;
      const atrasados = peds.filter(p => {
        if (!p.data_previsao || p.status === 'entregue' || p.status === 'recebido') return false;
        return new Date(p.data_previsao) < new Date();
      }).length;

      const totalPago = pags.reduce((a, p) => a + (p.valor_pago || 0), 0);
      const totalValor = pags.reduce((a, p) => a + (p.valor || 0), 0);
      const savings = totalValor > 0 ? ((totalValor - totalPago) / totalValor) * 100 : 0;

      return {
        totalSol, pendingSol, finalizados, cancelados,
        entregues, totalPed, atrasados,
        taxaEntrega: totalPed > 0 ? (entregues / totalPed) * 100 : 100,
        savings: Math.max(0, savings),
      };
    },
  });

  const climateData = useMemo(() => {
    const s = stats || { totalSol: 0, pendingSol: 0, finalizados: 0, cancelados: 0, entregues: 0, totalPed: 0, atrasados: 0, taxaEntrega: 100, savings: 0 };

    const slaScore = s.taxaEntrega;
    const backlogScore = Math.max(0, 100 - (s.pendingSol * 5));
    const delayScore = Math.max(0, 100 - (s.atrasados * 10));
    const savingsScore = Math.min(100, s.savings * 10);
    const completionScore = s.totalSol > 0 ? Math.min(100, (s.finalizados / s.totalSol) * 100) : 100;
    const leadTimeScore = Math.max(0, 100 - (s.atrasados * 15));

    const indicators: ClimateIndicator[] = [
      { name: 'SLA', value: slaScore, weight: 25, status: getStatusLevel(slaScore), icon: Clock, description: 'Taxa de entrega no prazo' },
      { name: 'Backlog', value: backlogScore, weight: 20, status: getStatusLevel(backlogScore), icon: Activity, description: 'Saúde da fila de pendências' },
      { name: 'Atrasos', value: delayScore, weight: 20, status: getStatusLevel(delayScore), icon: AlertTriangle, description: 'Índice de pedidos em dia' },
      { name: 'Economia', value: savingsScore, weight: 15, status: getStatusLevel(savingsScore), icon: DollarSign, description: 'Eficiência em negociações' },
      { name: 'Lead Time', value: leadTimeScore, weight: 10, status: getStatusLevel(leadTimeScore), icon: Zap, description: 'Velocidade de processamento' },
      { name: 'Conclusão', value: completionScore, weight: 10, status: getStatusLevel(completionScore), icon: CheckCircle2, description: 'Taxa de pedidos finalizados' },
    ];

    const totalWeight = indicators.reduce((acc, ind) => acc + ind.weight, 0);
    const overallScore = indicators.reduce((acc, ind) => acc + (ind.value * ind.weight), 0) / totalWeight;
    const overallLevel = getStatusLevel(overallScore);
    const trend = overallScore >= 70 ? 'up' : overallScore >= 50 ? 'stable' : 'down';
    const trendValue = trend === 'up' ? 5.2 : trend === 'down' ? -3.8 : 0.5;

    return { indicators, overallScore, overallLevel, trend, trendValue };
  }, [stats]);

  const config = getClimateConfig(climateData.overallLevel);
  const ClimateIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full"
    >
      <Card 
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all duration-500 h-full group",
          config.borderColor, 
          "border-2 hover:shadow-glow-primary/20",
          "bg-gradient-to-br from-card to-card/50 backdrop-blur-md"
        )}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className={cn(
          "absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500",
          climateData.overallLevel === 'excellent' && "bg-gradient-to-br from-emerald-500 to-green-500",
          climateData.overallLevel === 'good' && "bg-gradient-to-br from-green-500 to-teal-500",
          climateData.overallLevel === 'moderate' && "bg-gradient-to-br from-yellow-500 to-amber-500",
          climateData.overallLevel === 'warning' && "bg-gradient-to-br from-orange-500 to-red-500",
          climateData.overallLevel === 'critical' && "bg-gradient-to-br from-red-500 to-rose-500"
        )} />

        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className={cn("w-5 h-5", config.color)} />
              <span className="text-base font-bold tracking-tight">Clima de Compras</span>
            </div>
            <Badge variant="outline" className={cn(config.bgColor, config.color, "border-0 font-bold px-2.5 py-1 text-[11px] tracking-wider uppercase")}>
              {config.emoji} {config.label}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="relative z-10 space-y-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <motion.div 
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, 0, -5, 0]
                }}
                transition={{ 
                  duration: 6, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className={cn("w-24 h-24 rounded-full flex items-center justify-center", config.bgColor, "ring-4 ring-white/10")}
              >
                <ClimateIcon className={cn("w-12 h-12", config.color)} />
              </motion.div>
              {(climateData.overallLevel === 'critical' || climateData.overallLevel === 'warning') && (
                <div className={cn("absolute inset-0 rounded-full animate-ping", config.bgColor, "opacity-40")} />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className={cn("text-5xl font-black tracking-tighter", config.color)}>
                  {Math.round(climateData.overallScore)}
                </span>
                <span className="text-muted-foreground/60 text-sm font-medium">/100</span>
                <div className={cn(
                  "flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-xs font-bold",
                  climateData.trend === 'up' && "bg-success/10 text-success",
                  climateData.trend === 'down' && "bg-destructive/10 text-destructive",
                  climateData.trend === 'stable' && "bg-muted/10 text-muted-foreground"
                )}>
                  {climateData.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : climateData.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
                  <span>{climateData.trendValue > 0 ? '+' : ''}{climateData.trendValue.toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-1 leading-snug">{config.message}</p>
              <div className="mt-3 relative h-2.5 w-full bg-muted/30 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${climateData.overallScore}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className={cn("h-full rounded-full", config.bgColor.replace('/10', ''))}
                />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showDetails && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-5 border-t border-border/40 space-y-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Indicadores Detalhados</p>
                  <TooltipProvider>
                    <div className="grid grid-cols-2 gap-3">
                      {climateData.indicators.map((indicator, index) => {
                        const indConfig = getClimateConfig(indicator.status);
                        const IndIcon = indicator.icon;
                        return (
                          <Tooltip key={indicator.name}>
                            <TooltipTrigger asChild>
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                  "p-3 rounded-xl border transition-all duration-300 cursor-help group/ind", 
                                  indConfig.bgColor, 
                                  indConfig.borderColor,
                                  "hover:scale-[1.02]"
                                )}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <IndIcon className={cn("w-4 h-4", indConfig.color)} />
                                    <span className="text-[11px] font-bold uppercase tracking-tight">{indicator.name}</span>
                                  </div>
                                  <span className={cn("text-xs font-black", indConfig.color)}>{Math.round(indicator.value)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className={cn("h-full transition-all duration-1000", indConfig.bgColor.replace('/10', ''))} 
                                    style={{ width: `${indicator.value}%` }}
                                  />
                                </div>
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-popover/90 backdrop-blur-md border-border/40 shadow-xl">
                              <p className="font-bold text-xs">{indicator.description}</p>
                              <p className="text-[10px] text-muted-foreground font-medium">Peso: {indicator.weight}%</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>

                  {climateData.overallLevel !== 'excellent' && climateData.overallLevel !== 'good' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 p-4 rounded-xl bg-muted/40 border border-border/40"
                    >
                      <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-widest">💡 Ações Recomendadas:</p>
                      <ul className="text-xs space-y-2 text-muted-foreground font-medium">
                        {climateData.indicators
                          .filter(i => i.status === 'critical' || i.status === 'warning')
                          .slice(0, 3)
                          .map((ind, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-warning shadow-[0_0_8px_rgba(var(--warning),0.5)]" />
                              Revisar {ind.name.toLowerCase()}: {ind.description.toLowerCase()}
                            </li>
                          ))}
                      </ul>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-center text-muted-foreground/50 font-bold uppercase tracking-widest pt-1">
            {showDetails ? 'Ver menos' : 'Ver detalhes'}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
});
PurchaseClimateWidget.displayName = 'PurchaseClimateWidget';
  );
});
PurchaseClimateWidget.displayName = 'PurchaseClimateWidget';
