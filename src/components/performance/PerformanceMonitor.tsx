import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Gauge, 
  Timer, 
  Move, 
  MousePointer2, 
  Wifi,
  RefreshCw,
  Trash2,
  Download,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { useWebVitals } from '@/hooks/useWebVitals';
import { cn } from '@/lib/utils';

const metricInfo: Record<string, { 
  label: string; 
  description: string; 
  icon: typeof Activity;
  unit: string;
}> = {
  LCP: { 
    label: 'Largest Contentful Paint', 
    description: 'Tempo para renderizar o maior elemento',
    icon: Gauge,
    unit: 'ms'
  },
  FCP: { 
    label: 'First Contentful Paint', 
    description: 'Primeira renderização de conteúdo',
    icon: Timer,
    unit: 'ms'
  },
  CLS: { 
    label: 'Cumulative Layout Shift', 
    description: 'Estabilidade visual da página',
    icon: Move,
    unit: ''
  },
  INP: { 
    label: 'Interaction to Next Paint', 
    description: 'Responsividade a interações',
    icon: MousePointer2,
    unit: 'ms'
  },
  TTFB: { 
    label: 'Time to First Byte', 
    description: 'Tempo de resposta do servidor',
    icon: Wifi,
    unit: 'ms'
  },
};

const ratingColors = {
  good: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'needs-improvement': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  poor: 'bg-destructive/10 text-destructive border-destructive/20',
};

const ratingLabels = {
  good: 'Bom',
  'needs-improvement': 'Precisa Melhorar',
  poor: 'Ruim',
};

export const PerformanceMonitor = () => {
  const { 
    metrics, 
    history, 
    isLoading, 
    thresholds,
    refreshMetrics, 
    clearHistory, 
    forceReport,
    isPerformanceGood,
    getPoorMetrics,
  } = useWebVitals({ autoInit: true, debug: true });

  const [showHistory, setShowHistory] = useState(false);

  const getProgressValue = (name: string, value: number): number => {
    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 50;
    
    // Invert for CLS (lower is better)
    if (name === 'CLS') {
      return Math.max(0, 100 - (value / threshold.poor) * 100);
    }
    
    return Math.max(0, 100 - (value / threshold.poor) * 100);
  };

  const formatValue = (name: string, value: number): string => {
    if (name === 'CLS') return value.toFixed(3);
    return `${Math.round(value)}ms`;
  };

  const exportMetrics = () => {
    const data = {
      currentSession: metrics,
      history: history,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `web-vitals-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Carregando métricas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const poorMetrics = getPoorMetrics();
  const performanceGood = isPerformanceGood();

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Core Web Vitals</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refreshMetrics}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={exportMetrics}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={clearHistory}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Monitoramento de performance em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Overall Status */}
          <div className={cn(
            "mb-4 p-3 rounded-lg flex items-center gap-3",
            performanceGood ? "bg-emerald-500/10" : poorMetrics.length > 0 ? "bg-destructive/10" : "bg-amber-500/10"
          )}>
            {performanceGood ? (
              <>
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <span className="text-emerald-600 font-medium">Performance excelente!</span>
              </>
            ) : poorMetrics.length > 0 ? (
              <>
                <TrendingDown className="h-5 w-5 text-destructive" />
                <span className="text-destructive font-medium">
                  {poorMetrics.length} métrica(s) precisam de atenção
                </span>
              </>
            ) : (
              <>
                <Minus className="h-5 w-5 text-amber-600" />
                <span className="text-amber-600 font-medium">Performance pode ser melhorada</span>
              </>
            )}
          </div>

          {/* Metrics Grid */}
          {metrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aguardando coleta de métricas...</p>
              <p className="text-sm">Interaja com a página para gerar dados.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {metrics.map((metric) => {
                const info = metricInfo[metric.name];
                if (!info) return null;
                
                const Icon = info.icon;
                
                return (
                  <div 
                    key={metric.id} 
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">{metric.name}</div>
                          <div className="text-xs text-muted-foreground">{info.label}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className={ratingColors[metric.rating]}>
                        {ratingLabels[metric.rating]}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-2xl font-bold">
                          {formatValue(metric.name, metric.value)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          Δ {metric.delta > 0 ? '+' : ''}{formatValue(metric.name, metric.delta)}
                        </span>
                      </div>
                      
                      <Progress 
                        value={getProgressValue(metric.name, metric.value)} 
                        className="h-2"
                      />
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Ruim</span>
                        <span>Bom</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Toggle */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Histórico ({history.length} sessões)</CardTitle>
              <Button variant="ghost" size="sm">
                {showHistory ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>
          </CardHeader>
          
          {showHistory && (
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-60 overflow-auto">
                {history.slice().reverse().map((report, i) => (
                  <div 
                    key={report.sessionId} 
                    className="p-3 rounded border bg-muted/50 text-sm"
                  >
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">Sessão {history.length - i}</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(report.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {report.metrics.map(m => (
                        <Badge 
                          key={m.id} 
                          variant="outline" 
                          className={cn("text-xs", ratingColors[m.rating])}
                        >
                          {m.name}: {formatValue(m.name, m.value)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Send Report Button */}
      <Button onClick={forceReport} className="w-full">
        <Activity className="h-4 w-4 mr-2" />
        Enviar Relatório Agora
      </Button>
    </div>
  );
};

export default PerformanceMonitor;
