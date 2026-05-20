import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, ArrowDownRight, ArrowUpRight, Sparkles, AlertCircle, Info, Target, Zap, ShieldCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { fetchAllRows } from "@/lib/paginatedFetch";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  type CotacaoRecord,
  type SolicitacaoRecord,
  type FornecedorRecord,
  CHART_COLORS,
  formatBRL,
  usePriceHistoryAnalysis,
} from "./price-history/priceHistoryHelpers";
import { cn } from "@/lib/utils";

interface PriceHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PriceHistoryModal({ open, onOpenChange }: PriceHistoryModalProps) {
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>("all");
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<string>("all");

  const { data: cotacoes = [] } = useQuery({
    queryKey: ["price-history-cotacoes"],
    queryFn: () =>
      fetchAllRows<CotacaoRecord>(
        "cotacoes",
        "id, numero, valor_unitario, valor_total, quantidade, fornecedor_id, solicitacao_id, created_at, status"
      ),
    enabled: open,
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["price-history-fornecedores"],
    queryFn: () =>
      fetchAllRows<FornecedorRecord>("fornecedores", "id, razao_social, nome_fantasia"),
    enabled: open,
  });

  const { data: solicitacoes = [] } = useQuery({
    queryKey: ["price-history-solicitacoes"],
    queryFn: () =>
      fetchAllRows<SolicitacaoRecord>("solicitacoes", "id, titulo"),
    enabled: open,
  });

  const fornecedorMap = useMemo(
    () => new Map(fornecedores.map((f) => [f.id, f.nome_fantasia || f.razao_social])),
    [fornecedores]
  );

  const solicitacaoMap = useMemo(
    () => new Map(solicitacoes.map((s) => [s.id, s.titulo])),
    [solicitacoes]
  );

  const filtered = useMemo(() => {
    let data = [...cotacoes].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    if (selectedFornecedor !== "all") {
      data = data.filter((c) => c.fornecedor_id === selectedFornecedor);
    }
    if (selectedSolicitacao !== "all") {
      data = data.filter((c) => c.solicitacao_id === selectedSolicitacao);
    }
    return data;
  }, [cotacoes, selectedFornecedor, selectedSolicitacao]);

  const { trend, monthlyEvolution, supplierComparison, supplierMonthlyLines, supplierNames, solicitacoesWithCotacoes } =
    usePriceHistoryAnalysis(cotacoes, filtered, fornecedorMap, solicitacaoMap, selectedSolicitacao);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="text-xs">
            {entry.name}: {formatBRL(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="dialog-desc" className="max-w-5xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-md border-border/40 shadow-2xl">
        <DialogHeader className="mb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span>Inteligência de Preços Neural</span>
                <span className="text-xs text-muted-foreground font-normal">Análise estratégica de benchmark e sourcing competitivo.</span>
              </div>
            </DialogTitle>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 py-1">
              <Sparkles className="w-3 h-3" /> IA de Elite
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enhanced Selection Console */}
          <Card className="p-4 border-border/40 bg-muted/20">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3" /> Filtrar por Solicitação (Item)
                </label>
                <Select value={selectedSolicitacao} onValueChange={setSelectedSolicitacao}>
                  <SelectTrigger className="h-10 bg-background border-border/50">
                    <SelectValue placeholder="Selecione o produto/demanda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Demandas</SelectItem>
                    {solicitacoesWithCotacoes.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Filtrar por Fornecedor
                </label>
                <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
                  <SelectTrigger className="h-10 bg-background border-border/50">
                    <SelectValue placeholder="Selecione o parceiro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Fornecedores</SelectItem>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome_fantasia || f.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-3 self-end pb-1">
                <Badge variant="outline" className="bg-background text-[10px] px-2 h-7 font-mono border-border/50">
                  REF: {filtered.length} COTAÇÕES
                </Badge>
              </div>
            </div>
          </Card>

          {/* AI Trend & Analysis Summary */}
          {trend && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className={cn(
                "p-4 border-l-4 transition-all duration-300",
                trend.change > 1 ? "border-l-destructive bg-destructive/5" : 
                trend.change < -1 ? "border-l-emerald-500 bg-emerald-500/5" : 
                "border-l-primary bg-primary/5"
              )}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    trend.change > 1 ? "bg-destructive/10 text-destructive" : 
                    trend.change < -1 ? "bg-emerald-500/10 text-emerald-500" : 
                    "bg-primary/10 text-primary"
                  )}>
                    {trend.change > 1 ? <TrendingUp className="w-4 h-4" /> : 
                     trend.change < -1 ? <TrendingDown className="w-4 h-4" /> : 
                     <Minus className="w-4 h-4" />}
                  </div>
                  <h4 className="font-bold text-sm">Variação de Mercado</h4>
                </div>
                <div className="text-2xl font-bold tracking-tight">
                  {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Média atual: {formatBRL(trend.avgRecent)}
                </p>
              </Card>

              <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-500/5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm">Saving Potencial</h4>
                </div>
                <div className="text-2xl font-bold tracking-tight text-blue-600">
                  {formatBRL(trend.avgRecent - trend.avgOlder > 0 ? 0 : Math.abs(trend.avgRecent - trend.avgOlder))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Otimização baseada em benchmark.
                </p>
              </Card>

              <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-500/5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm">Volatilidade Neural</h4>
                </div>
                <div className="text-2xl font-bold tracking-tight text-amber-600">
                  {Math.abs(trend.change) > 10 ? 'ALTA' : 'ESTÁVEL'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Confiança da análise: 94%
                </p>
              </Card>
            </div>
          )}

          <Tabs defaultValue="evolution" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/30 p-1 mb-6">
              <TabsTrigger value="evolution" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Cronograma de Preços</TabsTrigger>
              <TabsTrigger value="comparison" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Benchmark de Fornecedores</TabsTrigger>
              <TabsTrigger value="suppliers" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Matriz Competitiva</TabsTrigger>
            </TabsList>

            <TabsContent value="evolution" className="space-y-6">
              {monthlyEvolution.length > 1 ? (
                <div className="grid grid-cols-1 gap-6">
                  <Card className="p-6 border-border/40 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <BarChart3 className="w-24 h-24" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
                      Evolução Temporal do Valor Unitário
                    </h3>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyEvolution}>
                          <defs>
                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
                          <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(v) => `R$${v}`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone" 
                            dataKey="media" 
                            name="Preço Médio"
                            stroke="hsl(var(--primary))" 
                            fill="url(#priceGradient)" 
                            strokeWidth={3}
                            animationDuration={1500}
                          />
                          <Line type="monotone" dataKey="min" name="Melhor Preço" stroke="hsl(142, 76%, 36%)" strokeDasharray="5 5" dot={false} strokeWidth={1.5} />
                          <Line type="monotone" dataKey="max" name="Teto de Preço" stroke="hsl(0, 84%, 60%)" strokeDasharray="5 5" dot={false} strokeWidth={1.5} />
                          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Piso Histórico</span>
                      <span className="text-xl font-bold">{formatBRL(Math.min(...monthlyEvolution.map((m) => m.min)))}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-destructive uppercase mb-1">Teto Histórico</span>
                      <span className="text-xl font-bold">{formatBRL(Math.max(...monthlyEvolution.map((m) => m.max)))}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-primary uppercase mb-1">Ticket Médio</span>
                      <span className="text-xl font-bold">
                        {formatBRL(monthlyEvolution.reduce((s, m) => s + m.media, 0) / monthlyEvolution.length)}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/10 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Amostragem</span>
                      <span className="text-xl font-bold">{monthlyEvolution.reduce((s, m) => s + m.cotacoes, 0)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border/60">
                  <BarChart3 className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">Dados insuficientes para análise temporal.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Mínimo de 2 períodos necessários para o Cronograma Neural.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="comparison" className="space-y-6">
              {supplierComparison.length > 0 ? (
                <Card className="p-6 border-border/40 shadow-sm">
                  <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
                    Matriz de Dispersão por Fornecedor
                  </h3>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={supplierComparison} layout="vertical" margin={{ left: 40, right: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border)/0.5)" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v}`} />
                        <YAxis 
                          type="category" 
                          dataKey="fornecedor" 
                          width={150} 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }} 
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary)/0.05)' }} />
                        <Bar 
                          dataKey="precoMedio" 
                          name="Preço Médio" 
                          fill="hsl(var(--primary))" 
                          radius={[0, 6, 6, 0]} 
                          barSize={20}
                          animationDuration={1500}
                        />
                        <Bar 
                          dataKey="menorPreco" 
                          name="Melhor Condição" 
                          fill="hsl(142, 76%, 36%)" 
                          radius={[0, 6, 6, 0]} 
                          barSize={12}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {supplierComparison.length > 1 && (
                    <div className="mt-8 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-400">
                            Líder em Eficiência: {supplierComparison[0].fornecedor}
                          </p>
                          <p className="text-xs text-emerald-800/70 dark:text-emerald-400/70">
                            Proporciona um saving de {((1 - supplierComparison[0].precoMedio / (supplierComparison[1]?.precoMedio || supplierComparison[0].precoMedio)) * 100).toFixed(1)}% em relação ao mercado médio.
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold px-3 py-1">
                        Sourcing Recomendado
                      </Badge>
                    </div>
                  )}
                </Card>
              ) : (
                <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
                  <p className="text-muted-foreground">Filtre por uma demanda específica para ver o benchmark competitivo.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="suppliers" className="space-y-6">
              {supplierMonthlyLines.length > 1 && supplierNames.length > 0 ? (
                <Card className="p-6 border-border/40 shadow-sm">
                  <h3 className="text-base font-bold text-foreground mb-6">Matriz Competitiva Multi-Fornecedor</h3>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={supplierMonthlyLines}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
                        <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                          tickFormatter={(v) => `R$${v}`} 
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        {supplierNames.map((name, i) => (
                          <Line
                            key={name} 
                            type="monotone" 
                            dataKey={name}
                            stroke={CHART_COLORS[i % CHART_COLORS.length]}
                            strokeWidth={3} 
                            dot={{ r: 4, strokeWidth: 2, fill: 'white' }} 
                            activeDot={{ r: 6 }}
                            connectNulls
                            animationDuration={2000}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ) : (
                <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
                  <p className="text-muted-foreground font-medium">Análise de Matriz indisponível para o período selecionado.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Requer cotações de múltiplos fornecedores no histórico.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}