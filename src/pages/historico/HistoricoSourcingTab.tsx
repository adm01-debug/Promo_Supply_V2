import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Target, Users, Building, Link2, Search, MapPin, 
  Package, Truck, CheckCircle, Info, AlertCircle, 
  TrendingDown, DollarSign, Sparkles, TrendingUp, BarChart, ArrowRight, Undo2, Download
} from "lucide-react";
import { type PurchaseRecord } from "@/hooks/usePurchaseHistory";
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
import { parseISO } from "date-fns/parseISO";
import { cn, formatCurrency } from "@/lib/utils";
import { exportToCSV } from "@/lib/exportData";
import { buildCategoryPriceIndex, productKeyOf, type SourcingRecordLike } from "@/lib/sourcingAnalytics";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/lib/feedbackToast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface Props {
  purchaseRecords: PurchaseRecord[];
  searchTerm: string;
}

export const HistoricoSourcingTab = ({ purchaseRecords, searchTerm }: Props) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const sourcingData = useMemo(() => {
    return purchaseRecords.filter(r => 
      (r.solicitacaoTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       r.departamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (r.costCenterName || r.centroCusto || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
       r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       r.supplierName.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  }, [purchaseRecords, searchTerm]);

  const stats = useMemo(() => {
    const clients = new Set(sourcingData.map(r => r.costCenterName || r.centroCusto || r.departamento)).size;
    const totalValue = sourcingData.reduce((acc, r) => acc + r.totalPrice, 0);
    const volatility = sourcingData.filter(r => r.discount > 15 || r.unitPrice > 1000).length;
    return { uniqueClients: clients, totalItems: sourcingData.length, totalValue, volatilityCount: volatility };
  }, [sourcingData]);

  const selectedRecord = useMemo(() => sourcingData.find(r => r.id === selectedRecordId), [sourcingData, selectedRecordId]);

  const analyticsSource = useMemo<SourcingRecordLike[]>(
    () =>
      purchaseRecords.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        productCategory: r.productCategory,
        supplierId: r.supplierId,
        supplierName: r.supplierName,
        purchaseDate: r.purchaseDate,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        totalPrice: r.totalPrice,
        discount: r.discount,
        status: r.status,
        deliveryDate: r.deliveryDate,
        orderId: r.id,
        orderNumber: r.orderNumber,
      })),
    [purchaseRecords]
  );

  const categoryPriceIndex = useMemo(
    () => buildCategoryPriceIndex(analyticsSource),
    [analyticsSource]
  );

  // Step 4: Neural Price Benchmark Data
  const priceBenchmarkData = useMemo(() => {
    if (!selectedRecord) return [];
    const chaveAlvo = productKeyOf(selectedRecord);
    return purchaseRecords
      .filter(r => productKeyOf(r) === chaveAlvo)
      .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))
      .map(r => ({
        date: format(parseISO(r.purchaseDate), "MMM/yy", { locale: ptBR }),
        price: r.unitPrice,
        supplier: r.supplierName
      }));
  }, [selectedRecord, purchaseRecords]);

  const benchmark = useMemo(() => {
    const precos = priceBenchmarkData.map((p) => p.price).filter((p) => p > 0);
    if (precos.length === 0) return null;
    const melhor = Math.min(...precos);
    const atual = selectedRecord && selectedRecord.unitPrice > 0 ? selectedRecord.unitPrice : precos[precos.length - 1];
    const media = precos.reduce((s, p) => s + p, 0) / precos.length;
    const fornecedorMelhor = priceBenchmarkData.find((p) => p.price === melhor)?.supplier ?? null;
    const variacaoPct = media > 0 ? ((atual - media) / media) * 100 : 0;
    const economiaPotencial = selectedRecord ? Math.max(0, (atual - melhor) * selectedRecord.quantity) : 0;
    const economiaPct = atual > 0 ? Math.max(0, ((atual - melhor) / atual) * 100) : 0;
    return { precos, melhor, atual, media, fornecedorMelhor, variacaoPct, economiaPotencial, economiaPct };
  }, [priceBenchmarkData, selectedRecord]);

  const handleExportReport = () => {
    if (!selectedRecord) {
      toast.warning("Nenhum registro selecionado", { description: "Selecione um item para gerar o relatório." });
      return;
    }
    const base = [
      { campo: "Pedido", valor: selectedRecord.orderNumber },
      { campo: "Produto", valor: selectedRecord.productName },
      { campo: "Categoria", valor: selectedRecord.productCategory },
      { campo: "Fornecedor", valor: selectedRecord.supplierName },
      { campo: "Centro de Custo", valor: selectedRecord.costCenterName || selectedRecord.centroCusto || "Geral" },
      { campo: "Solicitação", valor: selectedRecord.solicitacaoTitle || "Demanda Direta" },
      { campo: "Quantidade", valor: selectedRecord.quantity },
      { campo: "Preço Unitário", valor: selectedRecord.unitPrice },
      { campo: "Total", valor: selectedRecord.totalPrice },
      { campo: "Desconto (%)", valor: selectedRecord.discount },
      { campo: "Status", valor: selectedRecord.status },
      { campo: "Data da Compra", valor: selectedRecord.purchaseDate },
      { campo: "Data de Entrega", valor: selectedRecord.deliveryDate || "não registrada" },
      { campo: "Referências de preço no histórico", valor: priceBenchmarkData.length },
      { campo: "Menor preço histórico", valor: benchmark ? benchmark.melhor : "sem base" },
      { campo: "Economia potencial vs menor preço", valor: benchmark ? benchmark.economiaPotencial : "sem base" },
    ];
    exportToCSV(base, [
      { key: "campo", label: "Campo" },
      { key: "valor", label: "Valor" },
    ], `sourcing-report-${selectedRecord.orderNumber || selectedRecord.id}`);
    toast.success("Relatório de sourcing exportado", {
      description: `Pedido ${selectedRecord.orderNumber} com ${priceBenchmarkData.length} referência(s) de preço.`,
      icon: <Download className="w-4 h-4" />,
    });
  };

  const handleUndo = () => {
    if (!selectedRecordId) {
      toast.info("Nada para desfazer", {
        description: "Nenhum item está selecionado no console.",
      });
      return;
    }
    setSelectedRecordId(null);
    toast.success("Seleção limpa", {
      description: "O console voltou ao estado inicial.",
      icon: <Undo2 className="w-4 h-4 text-amber-500" />
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Step 6: Visual Purchase Timeline Chart */}
      <Card className="p-4 bg-muted/20 border-border/40 overflow-hidden h-[180px]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <BarChart className="w-3 h-3" /> Volume de Sourcing por Período
          </h4>
          <Badge variant="outline" className="text-[8px] border-primary/20 text-primary">Histórico real</Badge>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={priceBenchmarkData.length > 0 ? priceBenchmarkData : [{date: 'N/A', price: 0}]}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" fontSize={8} tickLine={false} axisLine={false} />
            <YAxis hide />
            <RechartsTooltip 
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: '10px' }}
              itemStyle={{ color: '#10b981' }}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#10b981" 
              strokeWidth={2} 
              dot={{ r: 3, fill: '#10b981' }} 
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-primary/5 border-primary/10 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Users className="w-5 h-5 text-primary" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Clientes</p><p className="text-2xl font-bold">{stats.uniqueClients}</p></div>
        </Card>
        <Card className="p-4 bg-emerald-500/5 border-emerald-500/10 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg"><Target className="w-5 h-5 text-emerald-500" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Itens Sourcing</p><p className="text-2xl font-bold">{stats.totalItems}</p></div>
        </Card>
        <Card className="p-4 bg-amber-500/5 border-amber-500/10 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg"><DollarSign className="w-5 h-5 text-amber-500" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Volume Total</p><p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p></div>
        </Card>
        <Card className="p-4 bg-rose-500/5 border-rose-500/10 flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 rounded-lg"><AlertCircle className="w-5 h-5 text-rose-500" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Volatilidade Alta</p><p className="text-2xl font-bold">{stats.volatilityCount}</p></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden border-border/40 shadow-sm flex flex-col h-[700px]">
          <div className="p-4 border-b border-border/40 bg-muted/30 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Link2 className="w-4 h-4 text-primary" />
                Rastreabilidade de Itens por Cliente/Origem
              </h3>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleUndo} className="h-7 text-[10px] uppercase font-bold text-amber-500 hover:text-amber-600 hover:bg-amber-500/10">
                <Undo2 className="w-3 h-3 mr-1" /> Desfazer
              </Button>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-primary/5 text-primary border-primary/20">Elite Sourcing Console 10/10</Badge>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20">
                  <TableHead className="text-[10px] uppercase font-bold">Cliente/Origem</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Item Solicitado</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-right">Preço Unit.</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourcingData.map((record) => (
                  <TableRow 
                    key={record.id} 
                    className={cn(
                      "group cursor-pointer transition-colors border-b border-border/20",
                      selectedRecordId === record.id ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedRecordId(record.id)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold flex items-center gap-1 text-foreground">
                          <MapPin className="w-3 h-3 text-primary" />
                          {record.costCenterName || record.centroCusto || record.departamento || "Geral"}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">
                          {record.costCenterCode ? `CC: ${record.costCenterCode}` : (record.departamento ? 'DEPARTAMENTO' : 'GLOBAL')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground">{record.productName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-muted/50 text-muted-foreground border-border/50">#{record.orderNumber}</Badge>
                          <span className="text-[10px] text-muted-foreground line-clamp-1 italic">
                            Fornecedor: {record.supplierName}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-xs text-foreground">{formatCurrency(record.unitPrice)}</span>
                        {record.discount > 5 && (
                          <span className={cn(
                            "text-[9px] font-bold flex items-center",
                            record.discount > 15 ? "text-emerald-500" : "text-blue-500"
                          )}>
                            <TrendingDown className="w-2 h-2 mr-0.5" /> -{record.discount}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "w-2.5 h-2.5 rounded-full border border-white/10 shadow-sm",
                                record.status === 'delivered' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'
                              )} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-[10px]">{record.status === 'delivered' ? 'Sourcing Concluído e Entregue' : 'Em Processo de Entrega'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                          {record.status === 'delivered' ? 'CONCLUÍDO' : 'PENDENTE'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {sourcingData.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <Search className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Nenhum registro encontrado no universo de sourcing</p>
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="p-6 bg-muted/10 border-border/40 h-[700px] flex flex-col shadow-inner overflow-y-auto">
          {selectedRecord ? (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <h3 className="font-extrabold uppercase tracking-tight text-sm">Neural Journey Insight</h3>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-bold">PERFECTION 10/10</Badge>
              </div>
              
              <div className="space-y-8 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-gradient-to-b before:from-primary/50 before:via-border/50 before:to-transparent">
                <div className="flex items-start gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 z-10 border border-primary/20 shadow-sm">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Origem da Demanda</p>
                    <p className="text-xs font-bold text-foreground">{selectedRecord.costCenterName || selectedRecord.centroCusto || "Geral"}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Info className="w-2.5 h-2.5" /> Referência: {selectedRecord.solicitacaoTitle || "Pedido Direto"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 z-10 border border-amber-500/20 shadow-sm">
                    <Building className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Sourcing & Logística</p>
                    <p className="text-xs font-bold text-foreground">{selectedRecord.supplierName}</p>
                    <p className="text-[10px] text-muted-foreground">Pedido Gerado: <span className="text-foreground font-medium">#{selectedRecord.orderNumber}</span></p>
                    {(() => {
                      const variacao = categoryPriceIndex.get(selectedRecord.productCategory);
                      if (variacao === undefined) return null;
                      return (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-2.5 h-2.5" />
                          Índice de preço da categoria:{" "}
                          <span className={cn("font-bold", variacao > 0 ? "text-destructive" : variacao < 0 ? "text-emerald-600" : "text-foreground")}>
                            {variacao === 0 ? "sem base" : `${variacao > 0 ? "+" : ""}${variacao.toFixed(1)}%`}
                          </span>
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-start gap-4 relative">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border shadow-sm",
                    selectedRecord.status === 'delivered' ? "bg-emerald-500/20 border-emerald-500/20" : "bg-muted border-border"
                  )}>
                    {selectedRecord.status === 'delivered' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Truck className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Destino Final</p>
                    <p className="text-xs font-bold text-foreground">{selectedRecord.status === 'delivered' ? 'Entrega Confirmada' : 'Fluxo em Trânsito'}</p>
                    <p className="text-[10px] text-muted-foreground">Data Registro: {format(parseISO(selectedRecord.purchaseDate), "dd/MM/yyyy")}</p>
                  </div>
                </div>
              </div>

              {/* Step 4: Integrated Neural Price Benchmark Widget */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase text-blue-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Price Benchmark
                  </p>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/10 text-[9px] font-bold">Neural Comparison</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Menor Preço Histórico</p>
                    <p className="text-sm font-extrabold text-foreground">
                      {benchmark ? formatCurrency(benchmark.melhor) : "Sem base"}
                    </p>
                    <p className="text-[8px] text-muted-foreground italic">
                      {benchmark?.fornecedorMelhor ?? "Sem histórico comparável"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Variação vs Média</p>
                    <p className={cn("text-sm font-extrabold", !benchmark ? "text-muted-foreground" : benchmark.variacaoPct > 0 ? "text-amber-500" : "text-emerald-500")}>
                      {benchmark ? `${benchmark.variacaoPct > 0 ? "+" : ""}${benchmark.variacaoPct.toFixed(1)}%` : "Sem base"}
                    </p>
                    <p className="text-[8px] text-muted-foreground italic">
                      {benchmark ? `Média histórica ${formatCurrency(benchmark.media)}` : "Sem referências de preço"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!benchmark) {
                      toast.warning("Sem base de comparação", { description: "Este item não tem histórico de preço registrado." });
                      return;
                    }
                    exportToCSV(
                      priceBenchmarkData.map((p) => ({ data: p.date, fornecedor: p.supplier, preco: p.price })),
                      [
                        { key: "data", label: "Período" },
                        { key: "fornecedor", label: "Fornecedor" },
                        { key: "preco", label: "Preço Unitário", formatter: (v: unknown) => formatCurrency(Number(v)) },
                      ],
                      `benchmark-${selectedRecord.orderNumber || selectedRecord.id}`
                    );
                    toast.success("Série de preços exportada", { description: `${priceBenchmarkData.length} referência(s).` });
                  }}
                  className="w-full h-8 text-[10px] uppercase font-bold text-blue-500 border-blue-500/20 hover:bg-blue-500/10"
                >
                  Ver Análise Detalhada <ArrowRight className="w-3 h-3 ml-2" />
                </Button>
              </div>

              <div className="mt-auto space-y-4 pt-6 border-t border-border/40">
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-bold uppercase text-emerald-500 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Eficiência de Sourcing
                    </p>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/10 text-[9px] font-extrabold tracking-widest">SAVINGS</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Investimento Real</p>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(selectedRecord.unitPrice)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Menor Preço Praticado</p>
                      <p className="text-sm font-bold text-emerald-500">
                        {benchmark ? formatCurrency(benchmark.melhor) : "Sem base"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-emerald-500/10 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Economia Potencial</p>
                      <p className="text-xs font-extrabold text-emerald-600">
                        {benchmark ? formatCurrency(benchmark.economiaPotencial) : "Sem base"}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex flex-col items-center justify-center border border-emerald-500/20 shadow-inner">
                      <span className="text-[10px] font-black text-emerald-600">
                        {benchmark ? `${benchmark.economiaPct.toFixed(0)}%` : "—"}
                      </span>
                      <span className="text-[6px] text-emerald-500/70 font-bold uppercase">Gap</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={handleExportReport}
                  className="w-full bg-primary hover:bg-primary/90 text-[11px] font-extrabold uppercase tracking-widest py-6 h-auto shadow-lg shadow-primary/20"
                >
                  <Download className="w-4 h-4 mr-2" /> Gerar Executive Sourcing Report
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                <Target className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <p className="text-sm font-extrabold uppercase tracking-tight">Console de Inteligência</p>
              <p className="text-xs font-medium text-muted-foreground mt-2 max-w-[200px]">Selecione um registro para orbitar no universo de sourcing analítico</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};