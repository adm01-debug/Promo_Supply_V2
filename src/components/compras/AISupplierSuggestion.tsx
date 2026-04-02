import { useState } from 'react';
import { Bot, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Loader2, Send, RefreshCw, Lightbulb, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { useQuery } from '@tanstack/react-query';

const categorias = [
  'Embalagens',
  'Material de Escritório',
  'Equipamentos',
  'Tecnologia',
  'Brindes',
  'Uniformes',
  'Serviços',
  'Outros',
];

interface SupplierRecommendation {
  supplierId: string;
  supplierName: string;
  score: number;
  reasons: string[];
  estimatedPrice: number;
  deliveryTime: string;
  riskLevel: 'low' | 'medium' | 'high';
  negotiationTips: string[];
}

interface AISuggestionResponse {
  recommendations: SupplierRecommendation[];
  marketInsights: string;
  alternativeSuggestions: string[];
}

const riskConfig = {
  low: { label: 'Baixo', color: 'bg-success/10 text-emerald-800 dark:bg-emerald-900/30 dark:text-success', icon: CheckCircle2 },
  medium: { label: 'Médio', color: 'bg-warning/10 text-amber-800 dark:bg-amber-900/30 dark:text-warning', icon: AlertTriangle },
  high: { label: 'Alto', color: 'bg-destructive/10 text-red-800 dark:bg-red-900/30 dark:text-destructive', icon: AlertTriangle },
};

export function AISupplierSuggestion() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productDescription, setProductDescription] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [budget, setBudget] = useState('');
  const [suggestions, setSuggestions] = useState<AISuggestionResponse | null>(null);

  const { data: fornecedores = [] } = useQuery({
    queryKey: ['ai-suggestion-fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, razao_social, nome_fantasia, tipo, avaliacao, segmento, integrado_api')
        .eq('status', 'ativo');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const handleGetSuggestions = async () => {
    if (!productDescription.trim()) {
      toast({
        title: 'Descrição necessária',
        description: 'Por favor, descreva o produto ou serviço que deseja comprar.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setSuggestions(null);

    try {
      // Prepare supplier data from Supabase
      const suppliersData = fornecedores.map(f => ({
        id: f.id,
        name: f.nome_fantasia || f.razao_social,
        type: f.tipo,
        rating: f.avaliacao,
        ramos: f.segmento,
        apiIntegrada: f.integrado_api,
      }));

      // Fetch real purchase history
      const { data: recentPedidos } = await supabase
        .from('pedidos')
        .select('fornecedor_id, valor_total')
        .order('created_at', { ascending: false })
        .limit(20);

      const purchaseHistory = (recentPedidos || []).map(p => {
        const supplier = fornecedores.find(f => f.id === p.fornecedor_id);
        return {
          supplier: supplier?.nome_fantasia || supplier?.razao_social || 'Desconhecido',
          product: 'Pedido recente',
          value: Number(p.valor_total),
          rating: Number(supplier?.avaliacao || 4),
        };
      });

      const { data, error } = await supabase.functions.invoke('ai-supplier-suggestion', {
        body: {
          productDescription,
          category,
          quantity: quantity ? parseInt(quantity) : null,
          budget: budget ? parseFloat(budget.replace(/[^\d,]/g, '').replace(',', '.')) : null,
          purchaseHistory,
          suppliers: suppliersData,
        },
      });

      if (error) throw error;

      setSuggestions(data as AISuggestionResponse);
      toast({
        title: 'Análise concluída',
        description: 'A IA analisou seus fornecedores e gerou recomendações.',
      });
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      toast({
        title: 'Erro na análise',
        description: 'Não foi possível gerar as sugestões. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProductDescription('');
    setCategory('');
    setQuantity('');
    setBudget('');
    setSuggestions(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="h-4 w-4" />
          Sugestão IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Sugestão Inteligente de Fornecedores
          </DialogTitle>
          <DialogDescription>
            A IA analisa seu histórico de compras e fornecedores para recomendar os melhores parceiros para sua necessidade.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {!suggestions ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="description">Descreva o que você precisa comprar *</Label>
                  <Textarea
                    id="description"
                    placeholder="Ex: Notebooks para equipe de desenvolvimento, 16GB RAM, SSD 512GB, tela 15.6 polegadas..."
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    className="mt-1.5 min-h-[100px]"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="Ex: 10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="budget">Orçamento Estimado (R$)</Label>
                  <Input
                    id="budget"
                    placeholder="Ex: 50.000,00"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Limpar
                </Button>
                <Button onClick={handleGetSuggestions} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Obter Sugestões
                    </>
                  )}
                </Button>
              </div>

              {loading && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Bot className="h-8 w-8 text-primary animate-pulse" />
                      <div className="flex-1">
                        <p className="font-medium">Analisando fornecedores...</p>
                        <p className="text-sm text-muted-foreground">
                          A IA está avaliando o histórico de compras, performance dos fornecedores e condições de mercado.
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
                {/* Recommendations */}
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-primary" />
                    Fornecedores Recomendados
                  </h3>
                  <div className="space-y-3">
                    {suggestions.recommendations?.length > 0 ? (
                      suggestions.recommendations.map((rec, index) => {
                        const risk = riskConfig[rec.riskLevel] || riskConfig.medium;
                        const RiskIcon = risk.icon;
                        
                        return (
                          <Card key={index} className="overflow-hidden">
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-base flex items-center gap-2">
                                    #{index + 1} {rec.supplierName}
                                  </CardTitle>
                                  <CardDescription className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className={risk.color}>
                                      <RiskIcon className="h-3 w-3 mr-1" />
                                      Risco {risk.label}
                                    </Badge>
                                    <span className="text-xs">• {rec.deliveryTime}</span>
                                  </CardDescription>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Score:</span>
                                    <span className="text-lg font-bold text-primary">{rec.score}</span>
                                  </div>
                                  <Progress value={rec.score} className="w-20 h-2 mt-1" />
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Por que recomendamos:</p>
                                  <ul className="text-sm space-y-1">
                                    {rec.reasons?.map((reason, i) => (
                                      <li key={i} className="flex items-start gap-1">
                                        <CheckCircle2 className="h-3 w-3 text-success mt-0.5 flex-shrink-0" />
                                        {reason}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Dicas de Negociação:</p>
                                  <ul className="text-sm space-y-1">
                                    {rec.negotiationTips?.map((tip, i) => (
                                      <li key={i} className="flex items-start gap-1">
                                        <Lightbulb className="h-3 w-3 text-warning mt-0.5 flex-shrink-0" />
                                        {tip}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              {rec.estimatedPrice > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <span className="text-sm text-muted-foreground">Preço estimado: </span>
                                  <span className="font-semibold">
                                    R$ {rec.estimatedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                          Nenhuma recomendação específica disponível.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Market Insights */}
                {suggestions.marketInsights && (
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Insights de Mercado
                    </h3>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {suggestions.marketInsights}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Alternative Suggestions */}
                {suggestions.alternativeSuggestions?.length > 0 && (
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-warning" />
                      Sugestões Alternativas
                    </h3>
                    <Card>
                      <CardContent className="pt-4">
                        <ul className="space-y-2">
                          {suggestions.alternativeSuggestions.map((sug, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-warning">•</span>
                              {sug}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="flex justify-end gap-2 pb-4">
                  <Button variant="outline" onClick={resetForm}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nova Consulta
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
