import { useState, useMemo } from "react";
import { 
  Scale, 
  Check, 
  X, 
  Trophy,
  Clock,
  Truck,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Star,
  ArrowRight,
  BarChart3,
  Package
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Cotacao {
  id: string;
  fornecedor: string;
  valorUnitario: number;
  quantidadeDisponivel: number;
  prazoEntrega: number;
  frete: number;
  freteInfo?: string;
  condicaoPagamento: string;
  total: number;
  alerta?: string;
  rating?: number;
}

interface ComparadorCotacoesProps {
  cotacoes: Cotacao[];
  quantidade: number;
  onSelecionar: (id: string) => void;
}

interface ComparisonMetric {
  label: string;
  key: keyof Cotacao | 'score';
  icon: React.ReactNode;
  format: (value: number, cotacao: Cotacao, allCotacoes: Cotacao[]) => React.ReactNode;
  getBest: (cotacoes: Cotacao[]) => string; // Returns the best cotacao id for this metric
  weight: number; // For scoring
}

export function ComparadorCotacoes({ cotacoes, quantidade, onSelecionar }: ComparadorCotacoesProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Calculate scores and best values
  const analysis = useMemo(() => {
    if (cotacoes.length === 0) return null;

    const minTotal = Math.min(...cotacoes.map(c => c.total));
    const maxTotal = Math.max(...cotacoes.map(c => c.total));
    const minPrazo = Math.min(...cotacoes.map(c => c.prazoEntrega));
    const minFrete = Math.min(...cotacoes.map(c => c.frete));
    const minValorUnitario = Math.min(...cotacoes.map(c => c.valorUnitario));

    // Calculate score for each cotacao (0-100)
    const scores = cotacoes.map(cotacao => {
      let score = 0;
      
      // Price weight: 50%
      const priceScore = maxTotal === minTotal ? 100 : 
        ((maxTotal - cotacao.total) / (maxTotal - minTotal)) * 100;
      score += priceScore * 0.5;
      
      // Delivery time weight: 30%
      const maxPrazo = Math.max(...cotacoes.map(c => c.prazoEntrega));
      const prazoScore = maxPrazo === minPrazo ? 100 :
        ((maxPrazo - cotacao.prazoEntrega) / (maxPrazo - minPrazo)) * 100;
      score += prazoScore * 0.3;
      
      // Stock availability weight: 20%
      const stockScore = cotacao.quantidadeDisponivel >= quantidade ? 100 : 
        (cotacao.quantidadeDisponivel / quantidade) * 100;
      score += stockScore * 0.2;

      return { id: cotacao.id, score: Math.round(score) };
    });

    return {
      minTotal,
      maxTotal,
      minPrazo,
      minFrete,
      minValorUnitario,
      scores,
      bestOverall: scores.reduce((a, b) => a.score > b.score ? a : b).id,
      bestPrice: cotacoes.reduce((a, b) => a.total < b.total ? a : b).id,
      bestDelivery: cotacoes.reduce((a, b) => a.prazoEntrega < b.prazoEntrega ? a : b).id,
    };
  }, [cotacoes, quantidade]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : prev.length < 4 
          ? [...prev, id]
          : prev
    );
  };

  const selectedCotacoes = cotacoes.filter(c => selectedIds.includes(c.id));
  const getScore = (id: string) => analysis?.scores.find(s => s.id === id)?.score || 0;

  const metrics: ComparisonMetric[] = [
    {
      label: 'Pontuação Geral',
      key: 'score',
      icon: <Star className="w-4 h-4 text-warning" />,
      format: (_, cotacao) => {
        const score = getScore(cotacao.id);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{score}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
        );
      },
      getBest: () => analysis?.bestOverall || '',
      weight: 0,
    },
    {
      label: 'Valor Total',
      key: 'total',
      icon: <DollarSign className="w-4 h-4 text-success" />,
      format: (value, cotacao, allCotacoes) => {
        const isBest = analysis?.bestPrice === cotacao.id;
        const diff = analysis ? ((value - analysis.minTotal) / analysis.minTotal * 100).toFixed(1) : 0;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-xl font-bold", isBest && "text-success")}>
                R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              {isBest && <Trophy className="w-4 h-4 text-warning" />}
            </div>
            {!isBest && analysis && (
              <span className="text-xs text-warning flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +{diff}% vs menor
              </span>
            )}
          </div>
        );
      },
      getBest: () => analysis?.bestPrice || '',
      weight: 50,
    },
    {
      label: 'Valor Unitário',
      key: 'valorUnitario',
      icon: <Package className="w-4 h-4 text-info" />,
      format: (value, cotacao) => {
        const isBest = value === analysis?.minValorUnitario;
        return (
          <div className="flex items-center gap-2">
            <span className={cn("text-lg font-semibold", isBest && "text-success")}>
              R$ {value.toFixed(2)}
            </span>
            {isBest && <Badge variant="outline" className="text-xs">Menor</Badge>}
          </div>
        );
      },
      getBest: (cotacoes) => cotacoes.reduce((a, b) => a.valorUnitario < b.valorUnitario ? a : b).id,
      weight: 0,
    },
    {
      label: 'Prazo de Entrega',
      key: 'prazoEntrega',
      icon: <Clock className="w-4 h-4 text-purple-500" />,
      format: (value, cotacao) => {
        const isBest = analysis?.bestDelivery === cotacao.id;
        return (
          <div className="flex items-center gap-2">
            <span className={cn("text-lg font-semibold", isBest && "text-success")}>
              {value} {value === 1 ? 'dia' : 'dias'}
            </span>
            {isBest && <Badge variant="outline" className="text-xs">Mais rápido</Badge>}
          </div>
        );
      },
      getBest: () => analysis?.bestDelivery || '',
      weight: 30,
    },
    {
      label: 'Frete',
      key: 'frete',
      icon: <Truck className="w-4 h-4 text-warning" />,
      format: (value, cotacao) => {
        const isFree = value === 0;
        return (
          <div className="flex items-center gap-2">
            <span className={cn("text-lg font-semibold", isFree && "text-success")}>
              {isFree ? 'Grátis' : `R$ ${value.toFixed(2)}`}
            </span>
            {cotacao.freteInfo && (
              <span className="text-xs text-muted-foreground">
                ({cotacao.freteInfo})
              </span>
            )}
          </div>
        );
      },
      getBest: (cotacoes) => cotacoes.reduce((a, b) => a.frete < b.frete ? a : b).id,
      weight: 0,
    },
    {
      label: 'Estoque Disponível',
      key: 'quantidadeDisponivel',
      icon: <BarChart3 className="w-4 h-4 text-cyan-500" />,
      format: (value, cotacao) => {
        const sufficient = value >= quantidade;
        const percentage = (value / quantidade * 100).toFixed(0);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-lg font-semibold", sufficient ? "text-success" : "text-warning")}>
                {value.toLocaleString('pt-BR')} un
              </span>
              {sufficient ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-warning" />
              )}
            </div>
            {!sufficient && (
              <span className="text-xs text-warning">
                Falta {(quantidade - value).toLocaleString('pt-BR')} un ({percentage}%)
              </span>
            )}
            {cotacao.alerta && (
              <Badge variant="outline" className="text-xs text-warning border-orange-300">
                {cotacao.alerta}
              </Badge>
            )}
          </div>
        );
      },
      getBest: (cotacoes) => cotacoes.reduce((a, b) => a.quantidadeDisponivel > b.quantidadeDisponivel ? a : b).id,
      weight: 20,
    },
    {
      label: 'Condição de Pagamento',
      key: 'condicaoPagamento',
      icon: <DollarSign className="w-4 h-4 text-indigo-500" />,
      format: (value) => (
        <Badge variant="secondary" className="text-sm">
          {value}
        </Badge>
      ),
      getBest: () => '',
      weight: 0,
    },
  ];

  if (!analysis) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Scale className="w-4 h-4" />
          Comparar Cotações
        </Button>
      </DialogTrigger>

      <DialogContent aria-describedby="dialog-desc" className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Comparador de Cotações
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Selection Area */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecione até 4 cotações para comparar lado a lado:
            </p>
            
            <div className="flex flex-wrap gap-2">
              {cotacoes.map(cotacao => {
                const isSelected = selectedIds.includes(cotacao.id);
                const score = getScore(cotacao.id);
                
                return (
                  <TooltipProvider key={cotacao.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all",
                            isSelected 
                              ? "border-primary bg-primary/10" 
                              : "border-muted hover:border-muted-foreground/30"
                          )}
                          onClick={() => toggleSelection(cotacao.id)}
                        >
                          <Checkbox checked={isSelected} />
                          <span className="font-medium text-sm">{cotacao.fornecedor}</span>
                          <Badge 
                            variant={score >= 70 ? "default" : score >= 40 ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {score}pts
                          </Badge>
                          {cotacao.id === analysis.bestOverall && (
                            <Trophy className="w-4 h-4 text-warning" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total: R$ {cotacao.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p>Prazo: {cotacao.prazoEntrega} dias</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>

          {/* Comparison Table */}
          {selectedCotacoes.length >= 2 ? (
            <ScrollArea className="w-full">
              <div className="min-w-[600px]">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-3 bg-muted/50 rounded-tl-lg w-48">
                        Critério
                      </th>
                      {selectedCotacoes.map((cotacao, i) => (
                        <th 
                          key={cotacao.id} 
                          className={cn(
                            "p-3 bg-muted/50 text-center",
                            i === selectedCotacoes.length - 1 && "rounded-tr-lg"
                          )}
                        >
                          <div className="space-y-1">
                            <p className="font-semibold">{cotacao.fornecedor}</p>
                            {cotacao.id === analysis.bestOverall && (
                              <Badge className="bg-warning text-foreground">
                                <Trophy className="w-3 h-3 mr-1" />
                                Recomendado
                              </Badge>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric, rowIndex) => (
                      <tr 
                        key={metric.key}
                        className={cn(
                          "border-b border-border",
                          rowIndex % 2 === 0 && "bg-muted/20"
                        )}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {metric.icon}
                            <span className="font-medium text-sm">{metric.label}</span>
                          </div>
                        </td>
                        {selectedCotacoes.map(cotacao => {
                          const isBest = metric.getBest(selectedCotacoes) === cotacao.id;
                          return (
                            <td 
                              key={cotacao.id} 
                              className={cn(
                                "p-3 text-center",
                                isBest && metric.key !== 'score' && metric.key !== 'condicaoPagamento' && "bg-success/10"
                              )}
                            >
                              <div className="flex justify-center">
                                {metric.format(
                                  metric.key === 'score' 
                                    ? getScore(cotacao.id) 
                                    : (typeof cotacao[metric.key as keyof Cotacao] === 'number' 
                                        ? cotacao[metric.key as keyof Cotacao] as number 
                                        : 0),
                                  cotacao,
                                  selectedCotacoes
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <Card className="p-8 text-center bg-muted/30">
              <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Selecione pelo menos 2 cotações</p>
              <p className="text-sm text-muted-foreground">
                para visualizar a comparação lado a lado
              </p>
            </Card>
          )}

          {/* Quick Actions */}
          {selectedCotacoes.length >= 1 && (
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedCotacoes.length} cotação(ões) selecionada(s)
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedIds([])}>
                  Limpar Seleção
                </Button>
                
                {selectedCotacoes.length === 1 && (
                  <Button 
                    className="gap-2"
                    onClick={() => {
                      onSelecionar(selectedCotacoes[0].id);
                      setIsOpen(false);
                    }}
                  >
                    Selecionar {selectedCotacoes[0].fornecedor}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
