import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Scale, 
  Check, 
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
  Package,
  PieChart,
  Target,
  X
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  PieChart as RechartsPieChart,
  Pie
} from "recharts";
import { cn } from "@/lib/utils";
import { RadarTab, BarsTab, PrazoTab, ScoresTab, TableTab } from "./visual-comparador/ComparadorCharts";

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

interface VisualComparadorCotacoesProps {
  cotacoes: Cotacao[];
  quantidade: number;
  onSelecionar: (id: string) => void;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)", // emerald
  "hsl(38, 92%, 50%)",  // amber
  "hsl(262, 83%, 58%)", // purple
  "hsl(199, 89%, 48%)", // cyan
];

export function VisualComparadorCotacoes({ cotacoes, quantidade, onSelecionar }: VisualComparadorCotacoesProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("radar");
  const [decisionSupport, setDecisionSupport] = useState<{ rationale: string, confidence: number } | null>({
    rationale: "O Fornecedor A apresenta o melhor TCO devido à isenção de frete e prazo de pagamento estendido, compensando o valor unitário 2% superior.",
    confidence: 94
  });

  // Calculate scores and best values
  const analysis = useMemo(() => {
    if (cotacoes.length === 0) return null;

    const minTotal = Math.min(...cotacoes.map(c => c.total));
    const maxTotal = Math.max(...cotacoes.map(c => c.total));
    const minPrazo = Math.min(...cotacoes.map(c => c.prazoEntrega));
    const maxPrazo = Math.max(...cotacoes.map(c => c.prazoEntrega));
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
      const prazoScore = maxPrazo === minPrazo ? 100 :
        ((maxPrazo - cotacao.prazoEntrega) / (maxPrazo - minPrazo)) * 100;
      score += prazoScore * 0.3;
      
      // Stock availability weight: 20%
      const stockScore = cotacao.quantidadeDisponivel >= quantidade ? 100 : 
        (cotacao.quantidadeDisponivel / quantidade) * 100;
      score += stockScore * 0.2;

      return { 
        id: cotacao.id, 
        score: Math.round(score),
        priceScore: Math.round(priceScore),
        prazoScore: Math.round(prazoScore),
        stockScore: Math.round(stockScore)
      };
    });

    return {
      minTotal,
      maxTotal,
      minPrazo,
      maxPrazo,
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
        : prev.length < 5 
          ? [...prev, id]
          : prev
    );
  };

  const selectedCotacoes = cotacoes.filter(c => selectedIds.includes(c.id));
  const getScore = (id: string) => analysis?.scores.find(s => s.id === id);

  // Prepare chart data
  const barChartData = useMemo(() => {
    return selectedCotacoes.map((c, index) => ({
      name: c.fornecedor.length > 12 ? c.fornecedor.substring(0, 12) + '...' : c.fornecedor,
      total: c.total,
      unitario: c.valorUnitario,
      frete: c.frete,
      fill: COLORS[index % COLORS.length]
    }));
  }, [selectedCotacoes]);

  const prazoChartData = useMemo(() => {
    return selectedCotacoes.map((c, index) => ({
      name: c.fornecedor.length > 12 ? c.fornecedor.substring(0, 12) + '...' : c.fornecedor,
      prazo: c.prazoEntrega,
      fill: COLORS[index % COLORS.length]
    }));
  }, [selectedCotacoes]);

  const radarData = useMemo(() => {
    if (!analysis) return [];
    
    return [
      { 
        metric: 'Preço', 
        ...Object.fromEntries(selectedCotacoes.map((c, i) => [
          c.fornecedor.substring(0, 10), 
          getScore(c.id)?.priceScore || 0
        ]))
      },
      { 
        metric: 'Prazo', 
        ...Object.fromEntries(selectedCotacoes.map((c, i) => [
          c.fornecedor.substring(0, 10), 
          getScore(c.id)?.prazoScore || 0
        ]))
      },
      { 
        metric: 'Estoque', 
        ...Object.fromEntries(selectedCotacoes.map((c, i) => [
          c.fornecedor.substring(0, 10), 
          getScore(c.id)?.stockScore || 0
        ]))
      },
      { 
        metric: 'Frete', 
        ...Object.fromEntries(selectedCotacoes.map((c, i) => {
          const maxFrete = Math.max(...selectedCotacoes.map(x => x.frete), 1);
          const freteScore = ((maxFrete - c.frete) / maxFrete) * 100;
          return [c.fornecedor.substring(0, 10), Math.round(freteScore)];
        }))
      },
    ];
  }, [selectedCotacoes, analysis]);

  const pieData = useMemo(() => {
    return selectedCotacoes.map((c, index) => ({
      name: c.fornecedor,
      value: getScore(c.id)?.score || 0,
      fill: COLORS[index % COLORS.length]
    }));
  }, [selectedCotacoes, analysis]);

  if (!analysis) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Scale className="w-4 h-4" />
          Comparador Visual
        </Button>
      </DialogTrigger>

      <DialogContent aria-describedby="dialog-desc" className="max-w-7xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Scale className="w-6 h-6 text-primary" />
            </motion.div>
            Comparador Visual de Cotações
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row h-[calc(95vh-80px)]">
          {/* Selection Sidebar */}
          <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r bg-muted/30 p-4 overflow-auto">
            <p className="text-sm font-medium mb-3">
              Selecione até 5 cotações:
            </p>
            
            <div className="space-y-2">
              <AnimatePresence>
                {cotacoes.map((cotacao, index) => {
                  const isSelected = selectedIds.includes(cotacao.id);
                  const score = getScore(cotacao.id);
                  
                  return (
                    <motion.button
                      key={cotacao.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                        isSelected 
                          ? "border-primary bg-primary/10 shadow-sm" 
                          : "border-transparent bg-background hover:border-muted-foreground/20"
                      )}
                      onClick={() => toggleSelection(cotacao.id)}
                    >
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{cotacao.fornecedor}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {cotacao.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge 
                          variant={(score?.score ?? 0) >= 70 ? "default" : (score?.score ?? 0) >= 40 ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {score?.score ?? 0}pts
                        </Badge>
                        {cotacao.id === analysis.bestOverall && (
                          <Trophy className="w-4 h-4 text-warning" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>

            {selectedCotacoes.length > 0 && (
              <motion.div 
                className="mt-4 pt-4 border-t"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setSelectedIds([])}
                >
                  <X className="w-4 h-4 mr-2" />
                  Limpar Seleção
                </Button>
              </motion.div>
            )}
          </div>

          {/* Charts Area */}
          <div className="flex-1 p-6 overflow-auto">
            {selectedCotacoes.length >= 2 ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="mb-4 w-full justify-start">
                  <TabsTrigger value="radar" className="gap-2">
                    <Target className="w-4 h-4" />
                    Radar Comparativo
                  </TabsTrigger>
                  <TabsTrigger value="bars" className="gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Valores
                  </TabsTrigger>
                  <TabsTrigger value="prazo" className="gap-2">
                    <Clock className="w-4 h-4" />
                    Prazos
                  </TabsTrigger>
                  <TabsTrigger value="scores" className="gap-2">
                    <PieChart className="w-4 h-4" />
                    Pontuação
                  </TabsTrigger>
                  <TabsTrigger value="table" className="gap-2">
                    <Scale className="w-4 h-4" />
                    Detalhes
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 min-h-0">
                  <TabsContent value="radar" className="h-full mt-0">
                    <RadarTab selectedCotacoes={selectedCotacoes} radarData={radarData} COLORS={COLORS} />
                  </TabsContent>
                  <TabsContent value="bars" className="h-full mt-0">
                    <BarsTab barChartData={barChartData} />
                  </TabsContent>
                  <TabsContent value="prazo" className="h-full mt-0">
                    <PrazoTab prazoChartData={prazoChartData} />
                  </TabsContent>
                  <TabsContent value="scores" className="h-full mt-0">
                    <ScoresTab selectedCotacoes={selectedCotacoes} pieData={pieData} getScore={getScore} />
                  </TabsContent>
                  <TabsContent value="table" className="h-full mt-0 overflow-auto">
                    <div className="space-y-6 pb-20">
                      {decisionSupport && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-violet-500/10 border border-violet-500/20 p-4 rounded-xl flex gap-4 items-start"
                        >
                          <div className="p-2 rounded-lg bg-violet-500/20 text-violet-400">
                            <Target className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-bold text-violet-300 uppercase tracking-widest">IA Decision Support rationale</h4>
                              <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400">CONFIDENCE: {decisionSupport.confidence}%</Badge>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">{decisionSupport.rationale}</p>
                          </div>
                        </motion.div>
                      )}
                      <TableTab selectedCotacoes={selectedCotacoes} COLORS={COLORS} getScore={getScore} analysis={analysis} quantidade={quantidade} />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center"
              >
                <Card className="p-8 text-center bg-muted/30 max-w-md">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Scale className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  </motion.div>
                  <p className="font-semibold text-lg mb-2">Selecione pelo menos 2 cotações</p>
                  <p className="text-sm text-muted-foreground">
                    para visualizar os gráficos comparativos lado a lado
                  </p>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {selectedCotacoes.length >= 1 && (
          <motion.div 
            className="border-t p-4 flex justify-between items-center bg-muted/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-sm text-muted-foreground">
              {selectedCotacoes.length} cotação(ões) selecionada(s) para comparação
            </div>
            
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
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
