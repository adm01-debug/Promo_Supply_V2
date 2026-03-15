import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle2, XCircle, TrendingUp, TrendingDown, Loader2, RefreshCw, Target, AlertCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface RiskFactor {
  category: string;
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  description: string;
  recommendations: string[];
}

interface ActionItem {
  priority: 'high' | 'medium' | 'low';
  action: string;
  deadline: string;
}

interface RiskAnalysisResponse {
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  strengths: string[];
  weaknesses: string[];
  actionItems: ActionItem[];
  summary: string;
}

const riskLevelConfig = {
  low: { label: 'Baixo', color: 'bg-emerald-500', textColor: 'text-emerald-500', bgLight: 'bg-emerald-100 dark:bg-emerald-900/30' },
  medium: { label: 'Médio', color: 'bg-amber-500', textColor: 'text-amber-500', bgLight: 'bg-amber-100 dark:bg-amber-900/30' },
  high: { label: 'Alto', color: 'bg-orange-500', textColor: 'text-orange-500', bgLight: 'bg-orange-100 dark:bg-orange-900/30' },
  critical: { label: 'Crítico', color: 'bg-red-500', textColor: 'text-red-500', bgLight: 'bg-red-100 dark:bg-red-900/30' },
};

const statusConfig = {
  healthy: { icon: CheckCircle2, color: 'text-emerald-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-500' },
  critical: { icon: XCircle, color: 'text-red-500' },
};

const priorityConfig = {
  high: { label: 'Alta', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  medium: { label: 'Média', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  low: { label: 'Baixa', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

export function SupplierRiskAnalysis() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [analysis, setAnalysis] = useState<RiskAnalysisResponse | null>(null);

  const handleAnalyze = async () => {
    if (!selectedSupplier) {
      toast({
        title: 'Selecione um fornecedor',
        description: 'Por favor, selecione um fornecedor para analisar.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const supplier = fornecedoresMock.find(f => f.id === selectedSupplier);
      if (!supplier) throw new Error('Fornecedor não encontrado');

      // Mock purchase history
      const purchaseHistory = [
        { date: '2024-12-01', value: 15000, onTime: true, quality: 4.5 },
        { date: '2024-11-15', value: 22000, onTime: true, quality: 4.8 },
        { date: '2024-10-20', value: 18000, onTime: false, quality: 4.2 },
        { date: '2024-09-10', value: 25000, onTime: true, quality: 4.6 },
      ];

      // Mock market data
      const marketData = {
        industryAvgDelivery: 92,
        marketGrowth: 5.2,
        competitorCount: 15,
        priceVolatility: 'medium',
      };

      const { data, error } = await supabase.functions.invoke('ai-supplier-risk', {
        body: {
          supplier: {
            id: supplier.id,
            name: supplier.nomeFantasia,
            cnpj: supplier.cnpj,
            type: supplier.tipo,
            rating: supplier.rating,
            totalPurchases: supplier.totalMes,
            ramos: supplier.ramos,
          },
          purchaseHistory,
          marketData,
        },
      });

      if (error) throw error;

      setAnalysis(data as RiskAnalysisResponse);
      toast({
        title: 'Análise concluída',
        description: 'A análise de risco foi gerada com sucesso.',
      });
    } catch (error) {
      console.error('Error analyzing supplier risk:', error);
      toast({
        title: 'Erro na análise',
        description: 'Não foi possível gerar a análise. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedSupplier('');
    setAnalysis(null);
  };

  const riskConfig = analysis ? riskLevelConfig[analysis.riskLevel] || riskLevelConfig.medium : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Shield className="h-4 w-4" />
          Análise de Risco
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Análise de Risco de Fornecedor
          </DialogTitle>
          <DialogDescription>
            Avaliação completa baseada em IA dos riscos associados ao fornecedor
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {!analysis ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Selecione o Fornecedor</label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedoresMock.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nomeFantasia} - {f.cnpj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={handleAnalyze} disabled={loading || !selectedSupplier}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Analisar Risco
                    </>
                  )}
                </Button>
              </div>

              {loading && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-primary animate-pulse" />
                      <div className="flex-1">
                        <p className="font-medium">Analisando riscos...</p>
                        <p className="text-sm text-muted-foreground">
                          A IA está avaliando dados financeiros, histórico e indicadores de mercado.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-6 pr-4">
                {/* Overall Score */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className={cn("col-span-1", riskConfig?.bgLight)}>
                    <CardContent className="pt-6 text-center">
                      <div className="text-4xl font-bold mb-2">{analysis.overallScore}</div>
                      <p className="text-sm text-muted-foreground">Score de Risco</p>
                      <Badge className={cn("mt-2", riskConfig?.color, "text-white")}>
                        Risco {riskConfig?.label}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card className="col-span-1 md:col-span-2">
                    <CardContent className="pt-6">
                      <h4 className="font-medium mb-2">Resumo Executivo</h4>
                      <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Risk Factors */}
                {analysis.riskFactors?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Fatores de Risco
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysis.riskFactors.map((factor, index) => {
                        const status = statusConfig[factor.status] || statusConfig.warning;
                        const StatusIcon = status.icon;
                        return (
                          <Card key={index}>
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <StatusIcon className={cn("h-4 w-4", status.color)} />
                                  <span className="font-medium text-sm">{factor.category}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-lg font-bold">{factor.score}</span>
                                  <Progress value={factor.score} className="w-16 h-1.5 mt-1" />
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {factor.description}
                              </p>
                              {factor.recommendations?.length > 0 && (
                                <div className="text-xs">
                                  <span className="font-medium">Recomendações:</span>
                                  <ul className="mt-1 space-y-0.5">
                                    {factor.recommendations.slice(0, 2).map((rec, i) => (
                                      <li key={i} className="text-muted-foreground">• {rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  {analysis.strengths?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                          Pontos Fortes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {analysis.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Weaknesses */}
                  {analysis.weaknesses?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          Pontos de Atenção
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {analysis.weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Action Items */}
                {analysis.actionItems?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Plano de Ação
                    </h4>
                    <div className="space-y-2">
                      {analysis.actionItems.map((item, index) => {
                        const priority = priorityConfig[item.priority] || priorityConfig.medium;
                        return (
                          <Card key={index}>
                            <CardContent className="py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className={priority.color}>
                                  {priority.label}
                                </Badge>
                                <span className="text-sm">{item.action}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{item.deadline}</span>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pb-4">
                  <Button variant="outline" onClick={resetAnalysis}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nova Análise
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
