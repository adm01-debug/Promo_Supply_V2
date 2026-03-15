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
    excellent: { label: 'Excelente', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', icon: Sun, emoji: '☀️', message: 'Operações fluindo perfeitamente!' },
    good: { label: 'Bom', color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', icon: CloudSun, emoji: '🌤️', message: 'Clima favorável para compras' },
    moderate: { label: 'Moderado', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', icon: Wind, emoji: '🌥️', message: 'Alguns pontos de atenção' },
    warning: { label: 'Atenção', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', icon: CloudRain, emoji: '🌧️', message: 'Requer ação imediata' },
    critical: { label: 'Crítico', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: AlertTriangle, emoji: '⛈️', message: 'Situação crítica - agir agora!' },
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
    <Card 
      className={cn("relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg", config.borderColor, "border-2")}
      onClick={() => setShowDetails(!showDetails)}
    >
      <div className={cn(
        "absolute inset-0 opacity-30",
        climateData.overallLevel === 'excellent' && "bg-gradient-to-br from-emerald-500/20 to-green-500/10",
        climateData.overallLevel === 'good' && "bg-gradient-to-br from-green-500/20 to-teal-500/10",
        climateData.overallLevel === 'moderate' && "bg-gradient-to-br from-yellow-500/20 to-amber-500/10",
        climateData.overallLevel === 'warning' && "bg-gradient-to-br from-orange-500/20 to-red-500/10",
        climateData.overallLevel === 'critical' && "bg-gradient-to-br from-red-500/20 to-rose-500/10"
      )} />

      <CardHeader className="pb-2 relative">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className={cn("w-5 h-5", config.color)} />
            <span className="text-base font-semibold">Clima de Compras</span>
          </div>
          <Badge variant="outline" className={cn(config.bgColor, config.color, "border-0")}>
            {config.emoji} {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="relative space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center", config.bgColor)}>
              <ClimateIcon className={cn("w-10 h-10", config.color)} />
            </div>
            {(climateData.overallLevel === 'critical' || climateData.overallLevel === 'warning') && (
              <div className={cn("absolute inset-0 rounded-full animate-ping", config.bgColor, "opacity-50")} />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn("text-4xl font-bold", config.color)}>
                {Math.round(climateData.overallScore)}
              </span>
              <span className="text-muted-foreground text-sm">/100</span>
              <div className={cn(
                "flex items-center gap-1 ml-2 text-sm",
                climateData.trend === 'up' && "text-emerald-500",
                climateData.trend === 'down' && "text-red-500",
                climateData.trend === 'stable' && "text-muted-foreground"
              )}>
                {climateData.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : climateData.trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
                <span>{climateData.trendValue > 0 ? '+' : ''}{climateData.trendValue.toFixed(1)}%</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{config.message}</p>
            <div className="mt-2"><Progress value={climateData.overallScore} className="h-2" /></div>
          </div>
        </div>

        {showDetails && (
          <div className="pt-4 border-t border-border space-y-3 animate-fade-in">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Indicadores Detalhados</p>
            <TooltipProvider>
              <div className="grid grid-cols-2 gap-3">
                {climateData.indicators.map((indicator) => {
                  const indConfig = getClimateConfig(indicator.status);
                  const IndIcon = indicator.icon;
                  return (
                    <Tooltip key={indicator.name}>
                      <TooltipTrigger className="w-full text-left cursor-help">
                        <div className={cn("p-3 rounded-lg border transition-colors", indConfig.bgColor, indConfig.borderColor)}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <IndIcon className={cn("w-4 h-4", indConfig.color)} />
                              <span className="text-xs font-medium">{indicator.name}</span>
                            </div>
                            <span className={cn("text-sm font-bold", indConfig.color)}>{Math.round(indicator.value)}%</span>
                          </div>
                          <Progress value={indicator.value} className="h-1.5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{indicator.description}</p>
                        <p className="text-xs text-muted-foreground">Peso: {indicator.weight}%</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>

            {climateData.overallLevel !== 'excellent' && climateData.overallLevel !== 'good' && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">💡 Ações Recomendadas:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {climateData.indicators
                    .filter(i => i.status === 'critical' || i.status === 'warning')
                    .slice(0, 3)
                    .map((ind, idx) => (
                      <li key={idx} className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-orange-500" />
                        Revisar {ind.name.toLowerCase()}: {ind.description.toLowerCase()}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground/60">
          {showDetails ? 'Clique para minimizar' : 'Clique para ver detalhes'}
        </p>
      </CardContent>
    </Card>
  );
});
PurchaseClimateWidget.displayName = 'PurchaseClimateWidget';
