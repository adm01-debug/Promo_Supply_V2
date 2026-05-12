import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3, AlertTriangle, Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { fetchAllRows } from '@/lib/paginatedFetch';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface Prediction {
  month: string;
  predictedValue: number;
  predictedQuantity: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

interface SeasonalPattern {
  period: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

interface RiskFactor {
  factor: string;
  probability: 'high' | 'medium' | 'low';
  mitigation: string;
}

interface DemandPredictionResponse {
  predictions: Prediction[];
  seasonalPatterns: SeasonalPattern[];
  recommendations: string[];
  riskFactors: RiskFactor[];
  summary: string;
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const trendColors = {
  up: 'text-success',
  down: 'text-destructive',
  stable: 'text-warning',
};

const impactColors = {
  high: 'bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-destructive',
  medium: 'bg-warning/10 text-warning dark:bg-warning/15 dark:text-warning',
  low: 'bg-success/10 text-success dark:bg-success/15 dark:text-success',
};

export function DemandPredictionPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');
  const [timeframe, setTimeframe] = useState('6');
  const [prediction, setPrediction] = useState<DemandPredictionResponse | null>(null);

  const categories = [
    { value: 'all', label: 'Todas as Categorias' },
    { value: 'embalagens', label: 'Embalagens' },
    { value: 'escritorio', label: 'Material de Escritório' },
    { value: 'equipamentos', label: 'Equipamentos' },
    { value: 'tecnologia', label: 'Tecnologia' },
  ];

  const timeframes = [
    { value: '3', label: 'Próximos 3 meses' },
    { value: '6', label: 'Próximos 6 meses' },
    { value: '12', label: 'Próximo ano' },
  ];

  const { data: pedidos } = useQuery({
    queryKey: ['demand-prediction-pedidos'],
    queryFn: () => fetchAllRows<{ valor_total: number; data_emissao: string }>('pedidos', 'valor_total, data_emissao'),
    staleTime: 60000,
  });

  const historicalData = useMemo(() => {
    if (!pedidos) return [];
    
    // Calculate last 6 months of real data
    const now = new Date();
    return Array.from({ length: 6 }).map((_, i) => {
      const date = subMonths(now, 6 - i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthLabel = format(date, 'MMM yyyy');

      const monthPedidos = pedidos.filter(p => {
        const d = new Date(p.data_emissao);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      });

      return {
        month: monthLabel,
        totalValue: monthPedidos.reduce((sum, p) => sum + (Number(p.valor_total) || 0), 0),
        totalQuantity: monthPedidos.length * 10, // Simulated quantity if not in DB
      };
    });
  }, [pedidos]);

  const handlePredict = async () => {
    if (historicalData.length === 0) {
      toast({
        title: 'Sem dados suficientes',
        description: 'Não há dados históricos de pedidos para gerar a previsão.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setPrediction(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-demand-prediction', {
        body: {
          historicalData: historicalData.map(item => ({
            month: item.month,
            value: item.totalValue,
            quantity: item.totalQuantity,
            category: 'Geral',
          })),
          category: category === 'all' ? 'Todas' : category,
          timeframe: `Próximos ${timeframe} meses`,
        },
      });

      if (error) throw error;

      setPrediction(data as DemandPredictionResponse);
      toast({
        title: 'Previsão gerada',
        description: 'A análise de demanda foi concluída com sucesso.',
      });
    } catch (error) {
      console.error('Error generating prediction:', error);
      toast({
        title: 'Erro na previsão',
        description: 'Não foi possível gerar a previsão. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Combine historical and predicted data for chart
  const chartData = prediction?.predictions?.map((p: Prediction) => ({
    name: p.month,
    valor: p.predictedValue,
    quantidade: p.predictedQuantity,
    confianca: p.confidence,
  })) || [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Previsão de Demanda
        </CardTitle>
        <CardDescription>
          Análise preditiva baseada em IA do histórico de compras
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handlePredict} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Prever
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          {prediction && (
            <ScrollArea className="h-[500px]">
              <div className="space-y-6 pr-4">
                {/* Summary */}
                {prediction.summary && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-4">
                      <p className="text-sm">{prediction.summary}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Chart */}
                {chartData.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Previsão de Valores
                    </h4>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="valor"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary) / 0.2)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Predictions Table */}
                {prediction.predictions?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Previsões Mensais</h4>
                    <div className="space-y-2">
                      {prediction.predictions.map((p, index) => {
                        const TrendIcon = trendIcons[p.trend] || Minus;
                        return (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                              <TrendIcon className={`h-4 w-4 ${trendColors[p.trend]}`} />
                              <span className="font-medium">{p.month}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-semibold">
                                  R$ {p.predictedValue?.toLocaleString('pt-BR') || '0'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {p.predictedQuantity || 0} unidades
                                </p>
                              </div>
                              <div className="w-16">
                                <Progress value={p.confidence || 0} className="h-2" />
                                <p className="text-[10px] text-muted-foreground text-center mt-0.5">
                                  {p.confidence || 0}% conf.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Seasonal Patterns */}
                {prediction.seasonalPatterns?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Padrões Sazonais
                    </h4>
                    <div className="space-y-2">
                      {prediction.seasonalPatterns.map((pattern, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <Badge variant="secondary" className={impactColors[pattern.impact]}>
                            {pattern.period}
                          </Badge>
                          <p className="text-sm flex-1">{pattern.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Factors */}
                {prediction.riskFactors?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Fatores de Risco
                    </h4>
                    <div className="space-y-2">
                      {prediction.riskFactors.map((risk, index) => (
                        <Card key={index}>
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm">{risk.factor}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Mitigação: {risk.mitigation}
                                </p>
                              </div>
                              <Badge variant="secondary" className={impactColors[risk.probability]}>
                                {risk.probability === 'high' ? 'Alta' : risk.probability === 'medium' ? 'Média' : 'Baixa'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {prediction.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-warning" />
                      Recomendações
                    </h4>
                    <ul className="space-y-2">
                      {prediction.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end pb-4">
                  <Button variant="outline" size="sm" onClick={() => setPrediction(null)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nova Análise
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}

          {!prediction && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Selecione os parâmetros e clique em "Prever"</p>
              <p className="text-sm">para gerar a análise de demanda</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
