import { useState, useMemo, forwardRef } from "react";
import { 
  Thermometer, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Truck,
  Activity,
  Zap,
  Wind,
  CloudRain,
  Sun,
  CloudSun
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { kpisMock, solicitacoesMock, buyerPerformanceMock } from "@/data/mockData";
import { cn } from "@/lib/utils";

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
    excellent: {
      label: 'Excelente',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      icon: Sun,
      emoji: '☀️',
      message: 'Operações fluindo perfeitamente!'
    },
    good: {
      label: 'Bom',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      icon: CloudSun,
      emoji: '🌤️',
      message: 'Clima favorável para compras'
    },
    moderate: {
      label: 'Moderado',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      icon: Wind,
      emoji: '🌥️',
      message: 'Alguns pontos de atenção'
    },
    warning: {
      label: 'Atenção',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      icon: CloudRain,
      emoji: '🌧️',
      message: 'Requer ação imediata'
    },
    critical: {
      label: 'Crítico',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      icon: AlertTriangle,
      emoji: '⛈️',
      message: 'Situação crítica - agir agora!'
    }
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

  const climateData = useMemo(() => {
    // Calculate individual indicators
    const totalSolicitacoes = solicitacoesMock.length;
    const atrasados = kpisMock.atrasados;
    const finalizados = kpisMock.finalizados;
    
    // 1. SLA Performance (based on delivery rate)
    const slaScore = kpisMock.taxaEntrega;
    
    // 2. Backlog Health (fewer pending items = better)
    const pendingItems = kpisMock.aguardandoCotacao + kpisMock.aguardandoPagamento;
    const backlogScore = Math.max(0, 100 - (pendingItems * 5));
    
    // 3. Delay Rate (fewer delays = better)
    const delayScore = Math.max(0, 100 - (atrasados * 10));
    
    // 4. Financial Efficiency (savings)
    const savingsScore = Math.min(100, buyerPerformanceMock.economiaPercentual * 10);
    
    // 5. Lead Time Score (faster = better, baseline 10 days)
    const leadTimeScore = Math.max(0, 100 - ((kpisMock.leadTime - 3) * 10));
    
    // 6. Completion Rate
    const completionScore = Math.min(100, (finalizados / Math.max(1, finalizados + totalSolicitacoes)) * 100);

    const indicators: ClimateIndicator[] = [
      {
        name: 'SLA',
        value: slaScore,
        weight: 25,
        status: getStatusLevel(slaScore),
        icon: Clock,
        description: 'Taxa de entrega no prazo'
      },
      {
        name: 'Backlog',
        value: backlogScore,
        weight: 20,
        status: getStatusLevel(backlogScore),
        icon: Activity,
        description: 'Saúde da fila de pendências'
      },
      {
        name: 'Atrasos',
        value: delayScore,
        weight: 20,
        status: getStatusLevel(delayScore),
        icon: AlertTriangle,
        description: 'Índice de pedidos em dia'
      },
      {
        name: 'Economia',
        value: savingsScore,
        weight: 15,
        status: getStatusLevel(savingsScore),
        icon: DollarSign,
        description: 'Eficiência em negociações'
      },
      {
        name: 'Lead Time',
        value: leadTimeScore,
        weight: 10,
        status: getStatusLevel(leadTimeScore),
        icon: Zap,
        description: 'Velocidade de processamento'
      },
      {
        name: 'Conclusão',
        value: completionScore,
        weight: 10,
        status: getStatusLevel(completionScore),
        icon: CheckCircle2,
        description: 'Taxa de pedidos finalizados'
      }
    ];

    // Calculate overall score (weighted average)
    const totalWeight = indicators.reduce((acc, ind) => acc + ind.weight, 0);
    const overallScore = indicators.reduce((acc, ind) => acc + (ind.value * ind.weight), 0) / totalWeight;
    const overallLevel = getStatusLevel(overallScore);

    // Trend calculation (simulated - in production would compare with previous period)
    const trend = overallScore >= 70 ? 'up' : overallScore >= 50 ? 'stable' : 'down';
    const trendValue = trend === 'up' ? 5.2 : trend === 'down' ? -3.8 : 0.5;

    return {
      indicators,
      overallScore,
      overallLevel,
      trend,
      trendValue
    };
  }, []);

  const config = getClimateConfig(climateData.overallLevel);
  const ClimateIcon = config.icon;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg",
        config.borderColor,
        "border-2"
      )}
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Background gradient based on climate */}
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
        {/* Main Score Display */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center",
              config.bgColor
            )}>
              <ClimateIcon className={cn("w-10 h-10", config.color)} />
            </div>
            {/* Animated pulse for critical/warning */}
            {(climateData.overallLevel === 'critical' || climateData.overallLevel === 'warning') && (
              <div className={cn(
                "absolute inset-0 rounded-full animate-ping",
                config.bgColor,
                "opacity-50"
              )} />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn("text-4xl font-bold", config.color)}>
                {Math.round(climateData.overallScore)}
              </span>
              <span className="text-muted-foreground text-sm">/100</span>
              
              {/* Trend indicator */}
              <div className={cn(
                "flex items-center gap-1 ml-2 text-sm",
                climateData.trend === 'up' && "text-emerald-500",
                climateData.trend === 'down' && "text-red-500",
                climateData.trend === 'stable' && "text-muted-foreground"
              )}>
                {climateData.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : climateData.trend === 'down' ? (
                  <TrendingDown className="w-4 h-4" />
                ) : null}
                <span>{climateData.trendValue > 0 ? '+' : ''}{climateData.trendValue.toFixed(1)}%</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{config.message}</p>
            
            {/* Overall progress bar */}
            <div className="mt-2">
              <Progress 
                value={climateData.overallScore} 
                className="h-2"
              />
            </div>
          </div>
        </div>

        {/* Detailed Indicators (expandable) */}
        {showDetails && (
          <div className="pt-4 border-t border-border space-y-3 animate-fade-in">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Indicadores Detalhados
            </p>
            
            <TooltipProvider>
              <div className="grid grid-cols-2 gap-3">
                {climateData.indicators.map((indicator) => {
                  const indConfig = getClimateConfig(indicator.status);
                  const IndIcon = indicator.icon;
                  
                  return (
                    <Tooltip key={indicator.name}>
                      <TooltipTrigger className="w-full text-left cursor-help">
                        <div className={cn(
                          "p-3 rounded-lg border transition-colors",
                          indConfig.bgColor,
                          indConfig.borderColor
                        )}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <IndIcon className={cn("w-4 h-4", indConfig.color)} />
                              <span className="text-xs font-medium">{indicator.name}</span>
                            </div>
                            <span className={cn("text-sm font-bold", indConfig.color)}>
                              {Math.round(indicator.value)}%
                            </span>
                          </div>
                          <Progress 
                            value={indicator.value} 
                            className="h-1.5"
                          />
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

            {/* Quick Actions based on climate */}
            {climateData.overallLevel !== 'excellent' && climateData.overallLevel !== 'good' && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  💡 Ações Recomendadas:
                </p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {climateData.indicators
                    .filter(i => i.status === 'critical' || i.status === 'warning')
                    .slice(0, 3)
                    .map((ind, idx) => (
                      <li key={idx} className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-orange-500" />
                        Revisar {ind.name.toLowerCase()}: {ind.description.toLowerCase()}
                      </li>
                    ))
                  }
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Click hint */}
        <p className="text-xs text-center text-muted-foreground/60">
          {showDetails ? 'Clique para minimizar' : 'Clique para ver detalhes'}
        </p>
      </CardContent>
    </Card>
  );
}
