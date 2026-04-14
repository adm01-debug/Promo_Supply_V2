import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, ArrowDownRight, ArrowUpRight } from "lucide-react";
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
      <DialogContent aria-describedby="dialog-desc" className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Histórico de Preços — Evolução e Comparativo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Fornecedor" />
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

            <Select value={selectedSolicitacao} onValueChange={setSelectedSolicitacao}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Solicitação (produto)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Solicitações</SelectItem>
                {solicitacoesWithCotacoes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.titulo.length > 40 ? s.titulo.slice(0, 40) + "…" : s.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trend Card */}
          {trend && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                {trend.change > 1 ? (
                  <ArrowUpRight className="w-5 h-5 text-destructive" />
                ) : trend.change < -1 ? (
                  <ArrowDownRight className="w-5 h-5 text-success" />
                ) : (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {trend.change > 1
                      ? `Preços subiram ${Math.abs(trend.change).toFixed(1)}%`
                      : trend.change < -1
                        ? `Preços caíram ${Math.abs(trend.change).toFixed(1)}%`
                        : "Preços estáveis"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Média recente: {formatBRL(trend.avgRecent)} · Média anterior: {formatBRL(trend.avgOlder)}
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto text-xs">
                  {filtered.length} cotações analisadas
                </Badge>
              </div>
            </Card>
          )}

          <Tabs defaultValue="evolution" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="evolution">Evolução Mensal</TabsTrigger>
              <TabsTrigger value="comparison">Comparar Fornecedores</TabsTrigger>
              <TabsTrigger value="suppliers">Por Fornecedor</TabsTrigger>
            </TabsList>

            {/* Tab 1: Monthly Evolution */}
            <TabsContent value="evolution" className="space-y-4">
              {monthlyEvolution.length > 1 ? (
                <Card className="p-4">
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Preço Médio Unitário ao Longo do Tempo
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyEvolution}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => `R$${v}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone" dataKey="media" name="Preço Médio"
                        stroke="hsl(var(--primary))" fill="url(#priceGradient)" strokeWidth={2}
                      />
                      <Line type="monotone" dataKey="min" name="Mínimo" stroke="hsl(142, 76%, 36%)" strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="max" name="Máximo" stroke="hsl(0, 84%, 60%)" strokeDasharray="4 4" dot={false} />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">
                  São necessários pelo menos 2 meses de dados para exibir o gráfico de evolução.
                </p>
              )}

              {/* Summary cards */}
              {monthlyEvolution.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Menor Preço</p>
                    <p className="text-lg font-bold text-success">
                      {formatBRL(Math.min(...monthlyEvolution.map((m) => m.min)))}
                    </p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Maior Preço</p>
                    <p className="text-lg font-bold text-destructive">
                      {formatBRL(Math.max(...monthlyEvolution.map((m) => m.max)))}
                    </p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Média Geral</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatBRL(
                        monthlyEvolution.reduce((s, m) => s + m.media, 0) / monthlyEvolution.length
                      )}
                    </p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Cotações</p>
                    <p className="text-lg font-bold text-foreground">
                      {monthlyEvolution.reduce((s, m) => s + m.cotacoes, 0)}
                    </p>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Supplier Comparison Bar */}
            <TabsContent value="comparison" className="space-y-4">
              {supplierComparison.length > 0 ? (
                <Card className="p-4">
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Preço Médio por Fornecedor
                    {selectedSolicitacao !== "all" && (
                      <span className="text-muted-foreground font-normal"> — para a solicitação selecionada</span>
                    )}
                  </h3>
                  <ResponsiveContainer width="100%" height={Math.max(200, supplierComparison.length * 45)}>
                    <BarChart data={supplierComparison} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v}`} />
                      <YAxis type="category" dataKey="fornecedor" width={150} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="precoMedio" name="Preço Médio" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="menorPreco" name="Menor Preço" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Best supplier highlight */}
                  {supplierComparison.length > 1 && (
                    <div className="mt-3 p-3 rounded-lg bg-success/10 border border-green-500/20">
                      <p className="text-sm text-success dark:text-success font-medium">
                        🏆 Melhor preço médio: <strong>{supplierComparison[0].fornecedor}</strong> — {formatBRL(supplierComparison[0].precoMedio)}
                      </p>
                      {supplierComparison.length > 1 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Diferença para o 2º mais barato:{" "}
                          {formatBRL(supplierComparison[1].precoMedio - supplierComparison[0].precoMedio)}{" "}
                          ({((1 - supplierComparison[0].precoMedio / supplierComparison[1].precoMedio) * 100).toFixed(1)}% mais barato)
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Selecione uma solicitação para comparar preços entre fornecedores.
                </p>
              )}
            </TabsContent>

            {/* Tab 3: Multi-supplier Lines */}
            <TabsContent value="suppliers" className="space-y-4">
              {supplierMonthlyLines.length > 1 && supplierNames.length > 0 ? (
                <Card className="p-4">
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Evolução de Preço por Fornecedor (Top 5)
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={supplierMonthlyLines}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      {supplierNames.map((name, i) => (
                        <Line
                          key={name} type="monotone" dataKey={name}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth={2} dot={{ r: 3 }} connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">
                  São necessários pelo menos 2 meses com múltiplos fornecedores para exibir o comparativo.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
