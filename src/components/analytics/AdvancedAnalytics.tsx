import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Lightbulb,
  ArrowRight,
  Eye,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Types
interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  category: 'savings' | 'efficiency' | 'risk' | 'opportunity' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  metric?: {
    value: number;
    change: number;
    unit: string;
  };
  action?: {
    label: string;
    href: string;
  };
  timestamp: string;
}

interface Forecast {
  metric: string;
  current: number;
  predicted: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  timeline: string;
}

interface Anomaly {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  value: number;
  expectedRange: { min: number; max: number };
  timestamp: string;
}

// Mock data
const mockInsights: Insight[] = [
  {
    id: '1',
    type: 'positive',
    category: 'savings',
    title: 'Economia acima da meta',
    description: 'Você economizou 23% a mais que o esperado este mês através de negociações com fornecedores.',
    impact: 'high',
    metric: { value: 45000, change: 23, unit: 'R$' },
    action: { label: 'Ver detalhes', href: '/relatorios' },
    timestamp: '2024-01-20',
  },
  {
    id: '2',
    type: 'warning',
    category: 'risk',
    title: 'Concentração de fornecedores',
    description: '65% das compras estão concentradas em apenas 3 fornecedores. Considere diversificar.',
    impact: 'medium',
    metric: { value: 65, change: 5, unit: '%' },
    action: { label: 'Ver fornecedores', href: '/fornecedores' },
    timestamp: '2024-01-19',
  },
  {
    id: '3',
    type: 'positive',
    category: 'efficiency',
    title: 'Tempo de ciclo reduzido',
    description: 'O tempo médio de processamento de pedidos caiu 18% comparado ao mês anterior.',
    impact: 'medium',
    metric: { value: 4.2, change: -18, unit: 'dias' },
    timestamp: '2024-01-18',
  },
  {
    id: '4',
    type: 'neutral',
    category: 'opportunity',
    title: 'Oportunidade de consolidação',
    description: 'Identificamos 8 pedidos que poderiam ser consolidados para reduzir custos de frete.',
    impact: 'low',
    metric: { value: 2500, change: 0, unit: 'R$' },
    action: { label: 'Consolidar', href: '/pedidos' },
    timestamp: '2024-01-17',
  },
  {
    id: '5',
    type: 'negative',
    category: 'trend',
    title: 'Aumento de preços detectado',
    description: 'Categoria "Eletrônicos" apresentou aumento médio de 12% nos últimos 30 dias.',
    impact: 'high',
    metric: { value: 12, change: 12, unit: '%' },
    action: { label: 'Analisar', href: '/cotacao' },
    timestamp: '2024-01-16',
  },
];

const mockForecasts: Forecast[] = [
  {
    metric: 'Volume de Compras',
    current: 850000,
    predicted: 920000,
    confidence: 85,
    trend: 'up',
    timeline: 'Próximo mês',
  },
  {
    metric: 'Economia Projetada',
    current: 45000,
    predicted: 52000,
    confidence: 78,
    trend: 'up',
    timeline: 'Próximo mês',
  },
  {
    metric: 'SLA de Entregas',
    current: 94,
    predicted: 91,
    confidence: 72,
    trend: 'down',
    timeline: 'Próxima semana',
  },
  {
    metric: 'Novos Fornecedores',
    current: 3,
    predicted: 5,
    confidence: 65,
    trend: 'up',
    timeline: 'Próximo trimestre',
  },
];

const mockAnomalies: Anomaly[] = [
  {
    id: '1',
    type: 'Valor de Pedido',
    severity: 'critical',
    description: 'Pedido #PED-2024-089 com valor 340% acima da média da categoria',
    value: 125000,
    expectedRange: { min: 20000, max: 35000 },
    timestamp: '2024-01-20 14:32',
  },
  {
    id: '2',
    type: 'Frequência de Compras',
    severity: 'warning',
    description: 'Aumento de 85% na frequência de compras de "Material de Escritório"',
    value: 85,
    expectedRange: { min: -10, max: 20 },
    timestamp: '2024-01-19 09:15',
  },
  {
    id: '3',
    type: 'Tempo de Aprovação',
    severity: 'info',
    description: 'Tempo médio de aprovação 50% menor que o habitual',
    value: 0.5,
    expectedRange: { min: 1, max: 2 },
    timestamp: '2024-01-18 16:45',
  },
];

// Insight Card Component
const InsightCard = ({ insight }: { insight: Insight }) => {
  const [expanded, setExpanded] = useState(false);

  const typeConfig = {
    positive: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    negative: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    neutral: { icon: Lightbulb, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  };

  const impactConfig = {
    high: { label: 'Alto impacto', color: 'text-red-500' },
    medium: { label: 'Médio impacto', color: 'text-amber-500' },
    low: { label: 'Baixo impacto', color: 'text-muted-foreground' },
  };

  const config = typeConfig[insight.type];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border cursor-pointer transition-all",
        config.bg, config.border,
        "hover:shadow-md"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", config.bg)}>
          <Icon className={cn("w-5 h-5", config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-foreground">{insight.title}</h4>
            <Badge variant="outline" className={cn("text-[10px]", impactConfig[insight.impact].color)}>
              {impactConfig[insight.impact].label}
            </Badge>
          </div>

          <p className={cn("text-sm text-muted-foreground", !expanded && "line-clamp-1")}>
            {insight.description}
          </p>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 pt-3 border-t border-border/50"
              >
                {insight.metric && (
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <span className="text-2xl font-bold">
                        {insight.metric.unit === 'R$' && 'R$ '}
                        {insight.metric.value.toLocaleString('pt-BR')}
                        {insight.metric.unit === '%' && '%'}
                        {insight.metric.unit === 'dias' && ' dias'}
                      </span>
                      {insight.metric.change !== 0 && (
                        <Badge 
                          className={cn(
                            "ml-2",
                            insight.metric.change > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                          )}
                        >
                          {insight.metric.change > 0 ? '+' : ''}{insight.metric.change}%
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {insight.action && (
                  <Button size="sm" variant="outline" className="gap-1">
                    {insight.action.label}
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button variant="ghost" size="icon" className="shrink-0 h-6 w-6">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>
    </motion.div>
  );
};

// Forecast Card Component
const ForecastCard = ({ forecast }: { forecast: Forecast }) => {
  const changePercent = ((forecast.predicted - forecast.current) / forecast.current) * 100;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{forecast.metric}</span>
        <Badge variant="outline" className="text-[10px]">
          {forecast.timeline}
        </Badge>
      </div>

      <div className="flex items-end gap-2 mb-3">
        <span className="text-2xl font-bold">
          {forecast.predicted.toLocaleString('pt-BR')}
        </span>
        <span className={cn(
          "text-sm flex items-center gap-0.5",
          forecast.trend === 'up' ? 'text-emerald-500' : forecast.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
        )}>
          {forecast.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : forecast.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
          {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Confiança</span>
          <span>{forecast.confidence}%</span>
        </div>
        <Progress value={forecast.confidence} className="h-1.5" />
      </div>

      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <Activity className="w-3 h-3" />
        <span>Atual: {forecast.current.toLocaleString('pt-BR')}</span>
      </div>
    </Card>
  );
};

// Anomaly Alert Component
const AnomalyAlert = ({ anomaly }: { anomaly: Anomaly }) => {
  const severityConfig = {
    critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/50' },
    warning: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/50' },
    info: { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/50' },
  };

  const config = severityConfig[anomaly.severity];

  return (
    <div className={cn("p-3 rounded-lg border", config.bg, config.border)}>
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className={cn("w-4 h-4", config.color)} />
        <span className="text-sm font-medium">{anomaly.type}</span>
        <Badge className={cn("text-[10px] ml-auto", config.bg, config.color)}>
          {anomaly.severity}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{anomaly.description}</p>
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-muted-foreground">
          Esperado: {anomaly.expectedRange.min} - {anomaly.expectedRange.max}
        </span>
        <span className={config.color}>Valor: {anomaly.value}</span>
      </div>
    </div>
  );
};

// Main Advanced Analytics Component
export const AdvancedAnalytics = () => {
  const [activeTab, setActiveTab] = useState('insights');
  const [period, setPeriod] = useState('30d');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Analytics Inteligente
          </h2>
          <p className="text-sm text-muted-foreground">
            Insights automatizados e previsões baseadas em IA
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
              <SelectItem value="1y">1 ano</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button variant="outline" size="icon">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="insights" className="gap-1">
            <Lightbulb className="w-4 h-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="forecasts" className="gap-1">
            <TrendingUp className="w-4 h-4" />
            Previsões
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="gap-1">
            <AlertTriangle className="w-4 h-4" />
            Anomalias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="mt-4">
          <div className="space-y-3">
            {mockInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="forecasts" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockForecasts.map((forecast, idx) => (
              <ForecastCard key={idx} forecast={forecast} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="anomalies" className="mt-4">
          <div className="space-y-3">
            {mockAnomalies.map(anomaly => (
              <AnomalyAlert key={anomaly.id} anomaly={anomaly} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Compact Widget for Dashboard
export const AnalyticsWidget = () => {
  const topInsights = mockInsights.slice(0, 3);
  const criticalAnomalies = mockAnomalies.filter(a => a.severity === 'critical');

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Insights do Dia
        </h3>
        <Badge variant="secondary">{mockInsights.length} novos</Badge>
      </div>

      <div className="space-y-3">
        {topInsights.map(insight => {
          const Icon = insight.type === 'positive' ? TrendingUp : 
                       insight.type === 'negative' ? TrendingDown : 
                       insight.type === 'warning' ? AlertTriangle : Lightbulb;
          const color = insight.type === 'positive' ? 'text-emerald-500' :
                       insight.type === 'negative' ? 'text-red-500' :
                       insight.type === 'warning' ? 'text-amber-500' : 'text-blue-500';

          return (
            <div key={insight.id} className="flex items-start gap-2">
              <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", color)} />
              <div className="min-w-0">
                <p className="text-sm font-medium line-clamp-1">{insight.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{insight.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {criticalAnomalies.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">
              {criticalAnomalies.length} anomalia(s) crítica(s)
            </span>
          </div>
        </div>
      )}

      <Button variant="ghost" size="sm" className="w-full mt-3 gap-1">
        Ver todos os insights
        <ArrowRight className="w-3 h-3" />
      </Button>
    </Card>
  );
};

export default AdvancedAnalytics;
