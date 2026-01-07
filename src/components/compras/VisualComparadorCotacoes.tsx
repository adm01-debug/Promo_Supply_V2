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

      <DialogContent className="max-w-7xl max-h-[95vh] p-0 overflow-hidden">
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
                          variant={score?.score >= 70 ? "default" : score?.score >= 40 ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {score?.score}pts
                        </Badge>
                        {cotacao.id === analysis.bestOverall && (
                          <Trophy className="w-4 h-4 text-yellow-500" />
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
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-full"
                    >
                      <Card className="h-full">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" />
                            Análise Multidimensional
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-60px)]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                              <PolarGrid stroke="hsl(var(--border))" />
                              <PolarAngleAxis 
                                dataKey="metric" 
                                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                              />
                              <PolarRadiusAxis 
                                angle={30} 
                                domain={[0, 100]}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                              />
                              {selectedCotacoes.map((cotacao, index) => (
                                <Radar
                                  key={cotacao.id}
                                  name={cotacao.fornecedor}
                                  dataKey={cotacao.fornecedor.substring(0, 10)}
                                  stroke={COLORS[index % COLORS.length]}
                                  fill={COLORS[index % COLORS.length]}
                                  fillOpacity={0.2}
                                  strokeWidth={2}
                                />
                              ))}
                              <Legend />
                              <RechartsTooltip 
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="bars" className="h-full mt-0">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-full"
                    >
                      <Card className="h-full">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-500" />
                            Comparativo de Valores
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-60px)]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                type="number" 
                                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                                tickFormatter={(v) => `R$ ${(v/1000).toFixed(1)}k`}
                              />
                              <YAxis 
                                type="category" 
                                dataKey="name" 
                                width={100}
                                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                              />
                              <RechartsTooltip 
                                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                              />
                              <Legend />
                              <Bar dataKey="total" name="Valor Total" radius={[0, 4, 4, 0]}>
                                {barChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="prazo" className="h-full mt-0">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-full"
                    >
                      <Card className="h-full">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-500" />
                            Comparativo de Prazos de Entrega
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-60px)]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={prazoChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                dataKey="name" 
                                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                              />
                              <YAxis 
                                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                                tickFormatter={(v) => `${v} dias`}
                              />
                              <RechartsTooltip 
                                formatter={(value: number) => `${value} dias`}
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                              />
                              <Bar dataKey="prazo" name="Prazo (dias)" radius={[4, 4, 0, 0]}>
                                {prazoChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="scores" className="h-full mt-0">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-full"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Star className="w-5 h-5 text-yellow-500" />
                              Pontuação Geral
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="h-[calc(100%-60px)]">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  paddingAngle={4}
                                  dataKey="value"
                                  label={({ name, value }) => `${name.substring(0, 8)}... (${value}pts)`}
                                  labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                                >
                                  {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                  ))}
                                </Pie>
                                <RechartsTooltip 
                                  formatter={(value: number) => `${value} pontos`}
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                  }}
                                />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Ranking de Pontuação</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {selectedCotacoes
                                .sort((a, b) => (getScore(b.id)?.score || 0) - (getScore(a.id)?.score || 0))
                                .map((cotacao, index) => {
                                  const score = getScore(cotacao.id);
                                  return (
                                    <motion.div
                                      key={cotacao.id}
                                      initial={{ opacity: 0, x: 20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.1 }}
                                      className="space-y-2"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                            index === 0 ? "bg-yellow-500 text-yellow-950" :
                                            index === 1 ? "bg-gray-300 text-gray-700" :
                                            index === 2 ? "bg-orange-400 text-orange-950" :
                                            "bg-muted text-muted-foreground"
                                          )}>
                                            {index + 1}
                                          </span>
                                          <span className="font-medium">{cotacao.fornecedor}</span>
                                        </div>
                                        <span className="font-bold text-lg">{score?.score}pts</span>
                                      </div>
                                      <Progress value={score?.score} className="h-2" />
                                    </motion.div>
                                  );
                                })}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="table" className="h-full mt-0 overflow-auto">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Tabela Comparativa Detalhada</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-3 font-medium">Critério</th>
                                  {selectedCotacoes.map((c, i) => (
                                    <th key={c.id} className="p-3 text-center">
                                      <div 
                                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
                                        style={{ backgroundColor: `${COLORS[i % COLORS.length]}20` }}
                                      >
                                        <div 
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                        />
                                        <span className="font-semibold text-sm">{c.fornecedor}</span>
                                      </div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b">
                                  <td className="p-3 flex items-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-500" />
                                    Pontuação
                                  </td>
                                  {selectedCotacoes.map(c => (
                                    <td key={c.id} className="p-3 text-center">
                                      <Badge variant={getScore(c.id)?.score >= 70 ? "default" : "secondary"}>
                                        {getScore(c.id)?.score}/100
                                      </Badge>
                                    </td>
                                  ))}
                                </tr>
                                <tr className="border-b bg-muted/30">
                                  <td className="p-3 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                    Valor Total
                                  </td>
                                  {selectedCotacoes.map(c => (
                                    <td key={c.id} className={cn(
                                      "p-3 text-center font-semibold",
                                      c.id === analysis.bestPrice && "text-emerald-500"
                                    )}>
                                      R$ {c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      {c.id === analysis.bestPrice && <Trophy className="w-4 h-4 inline ml-1 text-yellow-500" />}
                                    </td>
                                  ))}
                                </tr>
                                <tr className="border-b">
                                  <td className="p-3 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-blue-500" />
                                    Valor Unitário
                                  </td>
                                  {selectedCotacoes.map(c => (
                                    <td key={c.id} className="p-3 text-center">
                                      R$ {c.valorUnitario.toFixed(2)}
                                    </td>
                                  ))}
                                </tr>
                                <tr className="border-b bg-muted/30">
                                  <td className="p-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-purple-500" />
                                    Prazo Entrega
                                  </td>
                                  {selectedCotacoes.map(c => (
                                    <td key={c.id} className={cn(
                                      "p-3 text-center font-semibold",
                                      c.id === analysis.bestDelivery && "text-emerald-500"
                                    )}>
                                      {c.prazoEntrega} dias
                                      {c.id === analysis.bestDelivery && <Trophy className="w-4 h-4 inline ml-1 text-yellow-500" />}
                                    </td>
                                  ))}
                                </tr>
                                <tr className="border-b">
                                  <td className="p-3 flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-orange-500" />
                                    Frete
                                  </td>
                                  {selectedCotacoes.map(c => (
                                    <td key={c.id} className={cn(
                                      "p-3 text-center",
                                      c.frete === 0 && "text-emerald-500"
                                    )}>
                                      {c.frete === 0 ? 'Grátis' : `R$ ${c.frete.toFixed(2)}`}
                                    </td>
                                  ))}
                                </tr>
                                <tr className="border-b bg-muted/30">
                                  <td className="p-3 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-cyan-500" />
                                    Estoque
                                  </td>
                                  {selectedCotacoes.map(c => (
                                    <td key={c.id} className={cn(
                                      "p-3 text-center",
                                      c.quantidadeDisponivel >= quantidade ? "text-emerald-500" : "text-orange-500"
                                    )}>
                                      {c.quantidadeDisponivel.toLocaleString('pt-BR')} un
                                      {c.quantidadeDisponivel >= quantidade 
                                        ? <Check className="w-4 h-4 inline ml-1" />
                                        : <AlertTriangle className="w-4 h-4 inline ml-1" />
                                      }
                                    </td>
                                  ))}
                                </tr>
                                <tr>
                                  <td className="p-3 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-indigo-500" />
                                    Pagamento
                                  </td>
                                  {selectedCotacoes.map(c => (
                                    <td key={c.id} className="p-3 text-center">
                                      <Badge variant="secondary">{c.condicaoPagamento}</Badge>
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
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
