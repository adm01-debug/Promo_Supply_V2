import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Target, Users, Building, Link2, Search, MapPin, 
  Package, Truck, CheckCircle, Info, AlertCircle, 
  TrendingDown, DollarSign, Sparkles, Filter,
  BarChart3, History, ArrowRight, ShieldCheck,
  TrendingUp, Clock, Calendar, ChevronRight, Undo2,
  Globe, Zap, FileText, Download, BarChart, Map as MapIcon,
  Table as TableIcon, Brain, Database, Activity,
  Lock, SearchCode
} from "lucide-react";
import { usePurchaseHistory, type PurchaseRecord, type SupplierHistory } from "@/hooks/usePurchaseHistory";
import { exportToCSV } from "@/lib/exportData";
import { cn, formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/lib/feedbackToast";
import {
  buildCategoryBenchmark,
  buildCategoryPriceIndex,
  buildCategorySpend,
  buildHealthIndex,
  buildMonthlyTrend,
  buildRepurchasePredictions,
  buildSavings,
  buildSourcingMatrix,
  buildSupplierPerformance,
  buildSupplierTrend,
  buildSupplierConcentration,
  supplierLeadTimeLabel,
  type SourcingRecordLike,
} from "@/lib/sourcingAnalytics";
import { 
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, 
  Tooltip as RechartsTooltip, Cell, PieChart, Pie,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart as RechartsBarChart, Bar, AreaChart, Area
} from "recharts";

const PriceTrendChart = ({ data }: { data: { date: string, price: number }[] }) => (
  <div className="h-16 w-32">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="currentColor" 
          strokeWidth={2} 
          dot={false} 
          className="text-primary"
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const SourcingHistoryConsole = () => {
  const { purchaseRecords, suppliersHistory, isLoading } = usePurchaseHistory();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"client" | "supplier" | "intelligence" | "neural">("client");
  const [lastActions, setLastActions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = useMemo(() => {
    const cats = new Set(purchaseRecords.map(r => r.productCategory));
    return Array.from(cats);
  }, [purchaseRecords]);

  const filteredRecords = useMemo(() => {
    return purchaseRecords.filter(r => {
      const matchesSearch = 
        r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.costCenterName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.solicitacaoTitle || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(r.productCategory);
      
      return matchesSearch && matchesCategory;
    });
  }, [purchaseRecords, searchTerm, selectedCategories]);

  const filteredSuppliers = useMemo(() => {
    return suppliersHistory.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cnpj.includes(searchTerm)
    );
  }, [suppliersHistory, searchTerm]);

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

  const sourcingMatrix = useMemo(() => buildSourcingMatrix(analyticsSource), [analyticsSource]);
  const categorySpend = useMemo(() => buildCategorySpend(analyticsSource), [analyticsSource]);
  const supplierConcentration = useMemo(
    () => buildSupplierConcentration(analyticsSource),
    [analyticsSource]
  );
  const repurchasePredictions = useMemo(
    () => buildRepurchasePredictions(analyticsSource),
    [analyticsSource]
  );
  const predictionByProduct = useMemo(
    () => new Map(repurchasePredictions.map((p) => [p.productKey, p])),
    [repurchasePredictions]
  );
  const monthlyTrend = useMemo(() => buildMonthlyTrend(analyticsSource), [analyticsSource]);
  const categoryBenchmark = useMemo(() => buildCategoryBenchmark(analyticsSource), [analyticsSource]);
  const categoryPriceIndex = useMemo(
    () => buildCategoryPriceIndex(analyticsSource),
    [analyticsSource]
  );
  const health = useMemo(() => buildHealthIndex(suppliersHistory), [suppliersHistory]);
  const savings = useMemo(() => buildSavings(analyticsSource), [analyticsSource]);
  const supplierTrend = useMemo(() => buildSupplierTrend(analyticsSource), [analyticsSource]);
  const performance = useMemo(() => buildSupplierPerformance(suppliersHistory), [suppliersHistory]);
  const performanceBySupplier = useMemo(
    () => new Map(performance.map((p) => [p.id, p])),
    [performance]
  );
  const oportunidade = useMemo(() => {
    const candidatos = categoryBenchmark
      .filter((b) => b.melhoresFornecedores.length > 0 && b.registros > 0)
      .map((b) => {
        const menor = b.melhoresFornecedores[0];
        const economia = Math.max(0, (b.precoMedioNos - menor.precoMedio) * b.registros);
        return { benchmark: b, menor, economia };
      })
      .filter((c) => c.economia > 0)
      .sort((a, b) => b.economia - a.economia);
    return candidatos[0] ?? null;
  }, [categoryBenchmark]);
  const riscoSourcing = useMemo(() => {
    const comSpread = categoryBenchmark.filter((b) => b.spreadPct !== null && b.spreadPct > 0);
    if (comSpread.length === 0) return null;
    return [...comSpread].sort((a, b) => (b.spreadPct ?? 0) - (a.spreadPct ?? 0))[0];
  }, [categoryBenchmark]);
  const priceHistoryByProduct = useMemo(() => {
    const mapa = new Map<string, { date: string; price: number }[]>();
    const ordenado = [...analyticsSource].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
    ordenado.forEach((r) => {
      const chave = r.productId || `nome:${r.productName.trim().toLowerCase()}`;
      const preco = r.unitPrice > 0 ? r.unitPrice : r.totalPrice;
      if (preco <= 0) return;
      const serie = mapa.get(chave) || [];
      serie.push({ date: r.purchaseDate, price: preco });
      mapa.set(chave, serie);
    });
    return mapa;
  }, [analyticsSource]);

  const formatarDataCurta = (iso: string | null) => {
    if (!iso) return "Sem base";
    const data = new Date(iso);
    return Number.isFinite(data.getTime()) ? data.toLocaleDateString("pt-BR") : "Sem base";
  };

  const indicePerformance = (supplier: SupplierHistory) => {
    const doModulo = performanceBySupplier.get(supplier.id);
    if (doModulo) return doModulo.indice;
    const qualidade = Math.min(100, supplier.qualityScore * 20);
    const preco = Math.min(100, 60 + supplier.bestDiscount * 2);
    return qualidade * 0.4 + supplier.onTimeRate * 0.35 + preco * 0.25;
  };

  const handleUndo = () => {
    if (lastActions.length > 0) {
      const newActions = [...lastActions];
      newActions.pop();
      setLastActions(newActions);
      toast.success("Ação desfeita com sucesso", {
        icon: <Undo2 className="w-4 h-4" />
      });
    }
  };

  const toDossierRows = (records: PurchaseRecord[]) =>
    records.map((r) => ({
      pedido: r.orderNumber,
      produto: r.productName,
      categoria: r.productCategory,
      fornecedor: r.supplierName,
      solicitacao: r.solicitacaoTitle || "Demanda Direta",
      centro_custo: r.costCenterName || r.centroCusto || "Geral",
      departamento: r.departamento || "",
      quantidade: r.quantity,
      preco_unitario: r.unitPrice,
      total: r.totalPrice,
      status: r.status,
      data_compra: r.purchaseDate,
    }));

  const dossierColumns = [
    { key: "pedido", label: "Pedido" },
    { key: "produto", label: "Produto" },
    { key: "categoria", label: "Categoria" },
    { key: "fornecedor", label: "Fornecedor" },
    { key: "solicitacao", label: "Solicitação" },
    { key: "centro_custo", label: "Centro de Custo" },
    { key: "departamento", label: "Departamento" },
    { key: "quantidade", label: "Qtd" },
    { key: "preco_unitario", label: "Preço Unitário", formatter: (v: unknown) => formatCurrency(Number(v)) },
    { key: "total", label: "Total", formatter: (v: unknown) => formatCurrency(Number(v)) },
    { key: "status", label: "Status" },
    { key: "data_compra", label: "Data da Compra" },
  ];

  const exportarDossier = (records: PurchaseRecord[], nomeArquivo: string, escopo: string) => {
    if (records.length === 0) {
      toast.warning("Nada para exportar", {
        description: "Nenhum registro corresponde ao filtro atual.",
      });
      return;
    }

    exportToCSV(
      toDossierRows(records) as unknown as Record<string, unknown>[],
      dossierColumns,
      nomeArquivo
    );
    setLastActions((prev) => [...prev, `Dossier exportado (${records.length} registros)`]);
    toast.success("Dossier exportado", {
      description: `${records.length} registro(s) de ${escopo} no arquivo CSV.`,
      icon: <FileText className="w-4 h-4" />,
    });
  };

  const handleExportSupplier = (supplier: SupplierHistory) => {
    const registros = purchaseRecords.filter(
      (r) => r.supplierId === supplier.id || r.supplierName.trim() === supplier.name.trim()
    );
    const slug = supplier.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toLowerCase()
      .replace(/^-|-$/g, "");
    exportarDossier(registros, `dossie-fornecedor-${slug || supplier.id}.csv`, supplier.name);
  };

  const getReliabilityColor = (score: number) => {
    if (score >= 4.5) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 3.5) return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Estratégico com Matrix de Sourcing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2 mb-2">
            Console de Sourcing Elite
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <Sparkles className="w-3 h-3 mr-1" /> Inteligência 10/10
            </Badge>
          </h2>
          <p className="text-muted-foreground text-lg">Ecossistema de compras, fornecedores e inteligência estratégica.</p>
        </div>
        <div className="flex flex-col gap-2 items-start lg:items-end justify-center">
          <div className="flex items-center gap-2">
            {lastActions.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleUndo} className="gap-2 border-dashed">
                <Undo2 className="w-4 h-4" /> Desfazer ({lastActions.length})
              </Button>
            )}
            <Button 
              size="sm" 
              className="gap-2 bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/40"
              onClick={() => exportarDossier(filteredRecords, "dossier-sourcing-elite", "sourcing filtrado")}
            >
              <Download className="w-4 h-4" /> Exportar Dossier Elite 10/10
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Status: Sincronizado | Tempo real</p>
        </div>
      </div>


      {/* Matriz de Sourcing Estratégico */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Itens Estratégicos", count: sourcingMatrix.estrategicos, desc: "Alto gasto, fornecedor único", color: "border-l-primary" },
          { title: "Itens Críticos", count: sourcingMatrix.criticos, desc: "Alto gasto, multi-fornecedor", color: "border-l-destructive" },
          { title: "Alavancagem", count: sourcingMatrix.alavancagem, desc: "Multi-fornecedor", color: "border-l-emerald-500" },
          { title: "Rotineiros", count: sourcingMatrix.rotineiros, desc: "Baixo gasto, fornecedor único", color: "border-l-amber-500" },
        ].map(item => (
          <Card key={item.title} className={cn("p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow", item.color)}>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-muted-foreground uppercase">{item.title}</span>
              <Badge variant="secondary" className="text-[10px]">{item.count} itens</Badge>
            </div>
            <div className="mt-2 text-2xl font-bold">{item.count}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{item.desc}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6 border-border/40 shadow-sm bg-background/50 backdrop-blur-sm">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50">
            <Button 
              variant="ghost" 
              size="sm"
              className={cn(
                "gap-2 px-4 transition-all duration-200",
                viewMode === "client" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )} 
              onClick={() => setViewMode("client")}
            >
              <Users className="w-4 h-4" /> Cliente
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className={cn(
                "gap-2 px-4 transition-all duration-200",
                viewMode === "supplier" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )} 
              onClick={() => setViewMode("supplier")}
            >
              <Building className="w-4 h-4" /> Fornecedor
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className={cn(
                "gap-2 px-4 transition-all duration-200",
                viewMode === "intelligence" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )} 
              onClick={() => setViewMode("intelligence")}
            >
              <Globe className="w-4 h-4" /> Inteligência
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className={cn(
                "gap-2 px-4 transition-all duration-200",
                viewMode === "neural" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )} 
              onClick={() => setViewMode("neural")}
            >
              <Brain className="w-4 h-4" /> Neural
            </Button>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar itens, fornecedores, centros de custo..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10 h-10 bg-background/50 border-border/60 focus:ring-primary/20"
              />
            </div>
            <Button 
              variant={showFilters ? "default" : "outline"} 
              size="sm" 
              className="h-10 gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {selectedCategories.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1 h-5 min-w-[20px] justify-center">
                  {selectedCategories.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {searchTerm && (
          <div className="mb-4 flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <Info className="w-4 h-4" />
              <span>{filteredRecords.length} resultados encontrados. Deseja realizar ações em massa?</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] uppercase font-bold"
                onClick={() => {
                  const cats = Array.from(new Set(filteredRecords.map((r) => r.productCategory)));
                  setSelectedCategories(cats);
                  setShowFilters(true);
                }}
              >Selecionar Tudo</Button>
              <Button size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => exportarDossier(filteredRecords, "dossier-sourcing-combinado", "resultados da busca")}>Gerar Dossier Combinado</Button>
            </div>

          </div>
        )}

        {showFilters && (

          <div className="mb-6 p-4 rounded-xl bg-muted/20 border border-border/40 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-wrap gap-2">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider w-full mb-1">Categorias</div>
              {categories.map(cat => (
                <Badge
                  key={cat}
                  variant={selectedCategories.includes(cat) ? "default" : "outline"}
                  className="cursor-pointer hover:border-primary/50 transition-colors py-1 px-3"
                  onClick={() => {
                    setSelectedCategories(prev => 
                      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                    );
                  }}
                >
                  {cat}
                </Badge>
              ))}
              {selectedCategories.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedCategories([])}
                  className="h-7 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Limpar Todos
                </Button>
              )}
            </div>
          </div>
        )}

        <ScrollArea className="h-[600px] pr-4">
          {viewMode === "client" ? (
            <div className="space-y-4">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <div 
                    key={record.id} 
                    className="group border border-border/40 rounded-xl p-4 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                          <Package className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-lg">{record.productName}</h4>
                            <Badge variant="secondary" className="text-[10px] h-5">
                              {record.productCategory}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5" /> {record.solicitacaoTitle || "Demanda Direta"}
                            </span>
                            <span className="flex items-center gap-1.5 font-medium text-foreground">
                              <Building className="w-3.5 h-3.5" /> {record.costCenterName || "Geral"}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" /> {record.departamento || "Logística"}
                            </span>
                            {(() => {
                              const previsao = predictionByProduct.get(
                                record.productId || `nome:${record.productName.trim().toLowerCase()}`
                              );
                              if (!previsao || previsao.proximaCompra === null) return null;
                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="flex items-center gap-1.5 text-emerald-600 cursor-help">
                                        <Sparkles className="w-3.5 h-3.5" /> Recompra Sugerida: {formatarDataCurta(previsao.proximaCompra)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Intervalo médio de {previsao.intervaloMedioDias} dias entre {previsao.amostras} compras reais deste item.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })()}
                          </div>

                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row items-end gap-6">
                        <div className="hidden lg:block text-right">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Evolução Preço</div>
                          {(() => {
                            const serie = priceHistoryByProduct.get(
                              record.productId || `nome:${record.productName.trim().toLowerCase()}`
                            );
                            if (!serie || serie.length < 2) {
                              return (
                                <p className="text-[10px] text-muted-foreground w-32">
                                  {serie && serie.length === 1 ? "Compra única" : "Sem histórico"}
                                </p>
                              );
                            }
                            return <PriceTrendChart data={serie.slice(-6)} />;
                          })()}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 text-right">
                          <div className="text-xl font-bold">
                            {formatCurrency(record.totalPrice)}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <Badge variant="outline" className={cn(
                              "gap-1",
                              record.status === 'delivered' ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20" : "bg-blue-500/5 text-blue-600 border-blue-500/20"
                            )}>
                              {record.status === 'delivered' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {record.status === 'delivered' ? 'Entregue' : 'Em Processo'}
                            </Badge>
                            <span className="text-muted-foreground">
                              {new Date(record.purchaseDate).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-4 opacity-50" />
                    
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="text-xs text-muted-foreground">FORNECEDOR ORIGEM:</div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {record.supplierName.charAt(0)}
                          </div>
                          <span className="font-semibold text-sm underline decoration-primary/30 underline-offset-4 cursor-pointer hover:text-primary transition-colors">
                            {record.supplierName}
                          </span>
                        </div>
                        <Separator orientation="vertical" className="h-4 mx-2" />
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                          IPG (Índice Preço Categoria): 
                          {(() => {
                            const variacao = categoryPriceIndex.get(record.productCategory) ?? 0;
                            if (variacao === 0) {
                              return <span className="text-muted-foreground flex items-center">sem base</span>;
                            }
                            return (
                              <span className={cn("flex items-center", variacao < 0 ? "text-emerald-500" : "text-destructive")}>
                                {variacao < 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <TrendingUp className="w-3 h-3 mr-0.5" />}
                                {variacao > 0 ? "+" : ""}{variacao.toFixed(1)}%
                              </span>
                            );
                          })()}
                        </div>
                        {record.discount > 0 && (
                          <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 text-[10px] ml-auto">
                            <TrendingDown className="w-3 h-3 mr-1" /> {record.discount}% Economy
                          </Badge>
                        )}
                      </div>

                        <Sheet>
                          <SheetTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 text-xs gap-2 hover:bg-primary/10 hover:text-primary">
                              <span className="inline-flex items-center gap-2">
                                Ver Detalhes do Sourcing
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="sm:max-w-xl">
                            <SheetHeader>
                              <SheetTitle className="flex items-center gap-2">
                                <History className="w-5 h-5 text-primary" />
                                Jornada do Item: {record.productName}
                              </SheetTitle>
                              <SheetDescription>
                                Rastreabilidade completa desde a solicitação até a entrega final.
                              </SheetDescription>
                            </SheetHeader>
                            
                            <div className="mt-8 space-y-8">
                              <div className="relative pl-6 border-l-2 border-primary/20 space-y-8">
                                <div className="relative">
                                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-primary border-4 border-background" />
                                  <div className="font-bold text-sm">
                                    {record.status === "delivered" ? "Entrega Concluída" : "Entrega em Processo"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {record.deliveryDate
                                      ? `${formatarDataCurta(record.deliveryDate)}${record.deliveredOnTime === null ? "" : record.deliveredOnTime ? " · no prazo" : " · fora do prazo"}`
                                      : "Data de entrega não registrada"}
                                  </div>
                                </div>
                                
                                <div className="relative">
                                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-primary/40 border-4 border-background" />
                                  <div className="font-bold text-sm">Pedido de Compra Emitido</div>
                                  <div className="text-xs text-muted-foreground">Fornecedor: {record.supplierName} - Pedido: {record.orderNumber}</div>
                                </div>

                                <div className="relative">
                                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-primary/20 border-4 border-background" />
                                  <div className="font-bold text-sm">Aprovação de Sourcing</div>
                                  <div className="text-xs text-muted-foreground">
                                    {record.discount > 0 ? `Economia de ${record.discount}% sobre o preço de referência` : "Sem desconto registrado neste pedido"}
                                  </div>
                                </div>

                                <div className="relative">
                                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-muted border-4 border-background" />
                                  <div className="font-bold text-sm">Solicitação Originada</div>
                                  <div className="text-xs text-muted-foreground">
                                    {record.solicitacaoId ? `ID: ${record.solicitacaoId} · ` : ""}
                                    {record.costCenterName || record.centroCusto || "Centro de custo não informado"}
                                  </div>
                                </div>
                              </div>

                              <Card className="p-4 bg-muted/30 border-dashed">
                                <h5 className="font-bold text-xs uppercase tracking-wider mb-3">Histórico Real de Preço</h5>
                                {(() => {
                                  const serie = priceHistoryByProduct.get(
                                    record.productId || `nome:${record.productName.trim().toLowerCase()}`
                                  );
                                  if (!serie || serie.length < 2) {
                                    return (
                                      <p className="text-[11px] text-muted-foreground">
                                        {serie && serie.length === 1
                                          ? "Este item tem apenas uma compra registrada — sem série histórica para comparar."
                                          : "Sem histórico de preço registrado para este item."}
                                      </p>
                                    );
                                  }
                                  const valores = serie.map((p) => p.price);
                                  const minimo = Math.min(...valores);
                                  const maximo = Math.max(...valores);
                                  const chartData = serie.map((p) => ({
                                    name: new Date(p.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                                    price: p.price,
                                  }));
                                  return (
                                    <>
                                      <div className="h-32">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <LineChart data={chartData}>
                                            <XAxis dataKey="name" hide />
                                            <YAxis hide />
                                            <RechartsTooltip />
                                            <Line type="monotone" dataKey="price" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                          </LineChart>
                                        </ResponsiveContainer>
                                      </div>
                                      <div className="flex justify-between mt-2 text-[10px] font-bold">
                                        <span className="text-muted-foreground">MÍN: {formatCurrency(minimo)}</span>
                                        <span className="text-primary">ATUAL: {formatCurrency(valores[valores.length - 1])}</span>
                                        <span className="text-muted-foreground">MÁX: {formatCurrency(maximo)}</span>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground mt-2">
                                        Preço unitário em {serie.length} compras reais.
                                      </p>
                                    </>
                                  );
                                })()}
                              </Card>
                            </div>
                          </SheetContent>
                        </Sheet>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-muted-foreground">Nenhum registro encontrado para sua busca.</p>
                </div>
              )}
            </div>
          ) : viewMode === "intelligence" ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Sourcing Health Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <Card className="p-4 border-primary/20 bg-primary/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Health Index Global</p>
                    <h3 className="text-2xl font-black">{health.indice.toFixed(1)}/100</h3>
                    <p className="text-[10px] text-muted-foreground">{health.base} fornecedor(es) com pedidos</p>
                  </div>
                  <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin-slow flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                </Card>
                <Card className="p-4 border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Economia Concedida</p>
                    <h3 className="text-2xl font-black">{formatCurrency(savings.desconto)}</h3>
                    <p className="text-[10px] text-muted-foreground">{savings.descontoPct.toFixed(1)}% sobre {formatCurrency(savings.bruto)}</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-emerald-500 opacity-50" />
                </Card>
                <Card className="p-4 border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Taxa de Devolução</p>
                    <h3 className="text-2xl font-black">{health.devolucao.toFixed(1)}%</h3>
                    <p className="text-[10px] text-muted-foreground">Pontualidade média {health.pontualidade.toFixed(1)}%</p>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-blue-500 opacity-50" />
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 border-border/40 bg-muted/10">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="font-bold text-lg flex items-center gap-2">
                        <MapIcon className="w-5 h-5 text-primary" /> Concentração por Fornecedor
                      </h4>
                      <p className="text-xs text-muted-foreground">Participação real de cada fornecedor no gasto registrado</p>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Dados reais
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    {supplierConcentration.length > 0 ? supplierConcentration.slice(0, 5).map((item) => (
                      <div key={item.fornecedor} className="space-y-2">
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="flex items-center gap-2 truncate">
                            <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{item.fornecedor}</span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            {item.percentual.toFixed(1)}%
                            <span className="text-[10px] text-muted-foreground">{item.pedidos} ped.</span>
                          </span>
                        </div>
                        <Progress value={item.percentual} className="h-2" />
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">Nenhum fornecedor com pedidos registrados.</p>
                    )}
                  </div>

                  <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-primary">Insight Logístico</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {supplierConcentration[0]
                            ? `${supplierConcentration[0].fornecedor} concentra ${supplierConcentration[0].percentual.toFixed(1)}% do gasto registrado (${supplierConcentration[0].pedidos} pedido(s)). Acima de 40% há risco de dependência — avalie um segundo fornecedor qualificado.`
                            : "Sem base de fornecedores para calcular concentração de gasto."}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-border/40 bg-muted/10">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="font-bold text-lg flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-primary" /> Radar de Performance de Sourcing
                      </h4>
                      <p className="text-xs text-muted-foreground">Métricas integradas de eficiência</p>
                    </div>
                  </div>
                  
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                        { subject: "Pontualidade", A: health.pontualidade, B: 75, fullMark: 100 },
                        { subject: "Qualidade", A: health.qualidade, B: 75, fullMark: 100 },
                        { subject: "Confiabilidade", A: Math.max(0, 100 - health.devolucao), B: 95, fullMark: 100 },
                        { subject: "Cobertura", A: suppliersHistory.length > 0 ? Math.min(100, (suppliersHistory.filter(s => s.totalOrders > 0).length / suppliersHistory.length) * 100) : 0, B: 80, fullMark: 100 },
                        { subject: "Economia", A: Math.min(100, savings.descontoPct * 4), B: 40, fullMark: 100 },
                      ]}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                        <PolarRadiusAxis hide />
                        <Radar
                          name="Sourcing Atual"
                          dataKey="B"
                          stroke="#0ea5e9"
                          fill="#0ea5e9"
                          fillOpacity={0.5}
                        />
                        <Radar
                          name="Referência Interna (meta)"
                          dataKey="A"
                          stroke="#94a3b8"
                          fill="#94a3b8"
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-primary/50" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Sourcing Atual</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-slate-400/30" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Referência Interna (meta)</span>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6 border-border/40">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      <TableIcon className="w-5 h-5 text-primary" /> Matriz de Comparação Competitiva
                    </h4>
                    <p className="text-xs text-muted-foreground">Preço médio real por categoria e spread entre fornecedores</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      if (categoryBenchmark.length === 0) {
                        toast.warning("Nada para exportar", { description: "Sem compras registradas para comparar." });
                        return;
                      }
                      exportToCSV(
                        categoryBenchmark.map((row) => ({
                          categoria: row.categoria,
                          preco_medio: row.precoMedioNos,
                          registros: row.registros,
                          spread_pct: row.spreadPct ?? "",
                          status: row.status,
                          melhores_fornecedores: row.melhoresFornecedores
                            .map((f) => `${f.nome} (${f.precoMedio})`)
                            .join(" | "),
                        })),
                        [
                          { key: "categoria", label: "Categoria" },
                          { key: "preco_medio", label: "Preço Médio", formatter: (v: unknown) => formatCurrency(Number(v)) },
                          { key: "registros", label: "Registros" },
                          { key: "spread_pct", label: "Spread %" },
                          { key: "status", label: "Status" },
                          { key: "melhores_fornecedores", label: "Melhores Fornecedores" },
                        ],
                        "benchmark-categorias"
                      );
                      setLastActions((prev) => [...prev, `Benchmark exportado (${categoryBenchmark.length} categorias)`]);
                      toast.success("Benchmark exportado", { description: `${categoryBenchmark.length} categoria(s) no CSV.` });
                    }}
                  >
                    <Download className="w-4 h-4" /> Exportar Dados
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Categoria</th>
                        <th className="pb-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Preço Médio (Nós)</th>
                        <th className="pb-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Spread Entre Fornecedores</th>
                        <th className="pb-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Registros</th>
                        <th className="pb-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status Sourcing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {categoryBenchmark.length > 0 ? categoryBenchmark.map((row) => (
                        <tr key={row.categoria} className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 font-bold text-sm">{row.categoria}</td>
                          <td className="py-4 text-sm">{formatCurrency(row.precoMedioNos)}</td>
                          <td className={cn("py-4 text-sm font-bold", row.spreadPct === null ? "text-muted-foreground" : row.spreadPct <= 15 ? "text-emerald-500" : "text-destructive")}>
                            {row.spreadPct === null ? "sem base" : `${row.spreadPct > 0 ? "+" : ""}${row.spreadPct.toFixed(1)}%`}
                          </td>
                          <td className="py-4 text-sm text-muted-foreground">{row.registros}</td>
                          <td className="py-4">
                            <Badge variant="outline" className={cn(
                              "text-[10px] uppercase font-bold",
                              row.status === "Otimizado" ? "bg-emerald-50/50 text-emerald-600 border-emerald-200" :
                              row.status === "Critico" ? "bg-destructive/10 text-destructive border-destructive/20" :
                              row.status === "Sem Base" ? "bg-muted text-muted-foreground border-border" :
                              "bg-amber-50/50 text-amber-600 border-amber-200"
                            )}>
                              {row.status === "Critico" ? "Crítico" : row.status}
                            </Badge>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                            Nenhuma compra registrada para comparar categorias.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : viewMode === "neural" ? (
            <div className="space-y-6 animate-in fade-in zoom-in duration-500">
              {/* Neural Prediction Console */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 border-primary/30 bg-primary/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                    <Brain className="w-24 h-24" />
                  </div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-xl tracking-tight">Predição de Recompra Neural</h4>
                      <p className="text-xs text-muted-foreground">Baseado em padrões históricos e sazonalidade</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {repurchasePredictions.length > 0 ? repurchasePredictions.slice(0, 5).map((pred) => (
                      <div key={pred.productKey} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/40 hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          <div>
                            <p className="text-sm font-bold">{pred.productName}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">
                              Estimativa: {formatarDataCurta(pred.proximaCompra)}
                              {pred.diasRestantes !== null && pred.diasRestantes < 0 ? " (janela vencida)" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-primary">{pred.confianca}% Confiança</div>
                          <Badge variant="outline" className="text-[8px] h-4 px-1">
                            {pred.tendencia === "subindo" ? "Preço subindo" : pred.tendencia === "caindo" ? "Preço caindo" : "Preço estável"}
                          </Badge>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum item com histórico suficiente (2+ compras) para calcular previsão de recompra.
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full mt-6 bg-primary shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all gap-2"
                    onClick={() => {
                      if (repurchasePredictions.length === 0) {
                        toast.warning("Sem base para análise", {
                          description: "É preciso ao menos 2 compras do mesmo item para calcular a próxima recompra.",
                        });
                        return;
                      }
                      const vencidas = repurchasePredictions.filter((p) => (p.diasRestantes ?? 1) < 0).length;
                      setLastActions((prev) => [...prev, `Análise de demanda (${repurchasePredictions.length} itens)`]);
                      toast.success("Análise de demanda concluída", {
                        description: `${repurchasePredictions.length} item(ns) analisado(s), ${vencidas} com janela de recompra vencida.`,
                        icon: <Activity className="w-4 h-4" />,
                      });
                    }}
                  >
                    <Activity className="w-4 h-4" /> Executar Análise de Demanda Global
                  </Button>
                </Card>

                <Card className="p-6 border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="font-black text-xl tracking-tight">Evolução de Compra</h4>
                      <p className="text-xs text-muted-foreground">Volume comprado mês a mês (histórico real)</p>
                    </div>
                    <Badge className="bg-emerald-500 hover:bg-emerald-600">Dados reais</Badge>
                  </div>

                  <div className="h-48 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrend.map((p) => ({ name: p.label, us: p.valor, pedidos: p.pedidos }))}>
                        <defs>
                          <linearGradient id="colorUs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" hide />
                        <YAxis hide />
                        <RechartsTooltip />
                        <Area type="monotone" dataKey="us" stroke="#10b981" fillOpacity={1} fill="url(#colorUs)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-background/50 rounded-lg border border-border/40">
                      <p className="text-[9px] text-muted-foreground uppercase font-black">Volume no Período</p>
                      <div className="text-xl font-black text-emerald-600">{formatCurrency(savings.bruto)}</div>
                      <p className="text-[8px] text-muted-foreground">{monthlyTrend.length} mês(es) com compras</p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg border border-border/40">
                      <p className="text-[9px] text-muted-foreground uppercase font-black">Economia Obtida</p>
                      <div className="text-xl font-black text-primary">{savings.descontoPct.toFixed(1)}%</div>
                      <p className="text-[8px] text-muted-foreground">{formatCurrency(savings.desconto)} sobre o bruto</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Advanced Analytics Table */}
              <Card className="p-6 border-border/40">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-black text-lg flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" /> Matriz de Inteligência de Custo
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px] font-black uppercase"
                      onClick={() => {
                        if (repurchasePredictions.length === 0) {
                          toast.warning("Sem base para varredura", { description: "Nenhum item com 2+ compras registradas." });
                          return;
                        }
                        setLastActions((prev) => [...prev, `Deep scan em ${repurchasePredictions.length} itens`]);
                        toast.success("Varredura concluída", {
                          description: `${repurchasePredictions.length} item(ns) com padrão de recompra identificado.`,
                          icon: <SearchCode className="w-4 h-4" />,
                        });
                      }}
                    >
                      <SearchCode className="w-3 h-3 mr-1" /> Deep Scan
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px] font-black uppercase"
                      onClick={() => {
                        if (lastActions.length === 0) {
                          toast.info("Auditoria vazia", { description: "Nenhuma ação executada nesta sessão ainda." });
                          return;
                        }
                        exportToCSV(
                          lastActions.map((acao, idx) => ({ ordem: idx + 1, acao })),
                          [
                            { key: "ordem", label: "#" },
                            { key: "acao", label: "Ação" },
                          ],
                          "audit-log-sourcing"
                        );
                        toast.success("Audit Log exportado", { description: `${lastActions.length} ação(ões) no CSV.` });
                      }}
                    >
                      <Lock className="w-3 h-3 mr-1" /> Audit Log
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {[
                     { label: "Matriz de Kraljic", value: sourcingMatrix.estrategicos > 0 ? "Estratégico" : "Rotineiro", desc: `${sourcingMatrix.estrategicos} item(ns) de alto valor e fornecedor único` },
                     { label: "Itens com Previsão", value: `${repurchasePredictions.length}`, desc: "Itens com 2+ compras e padrão calculado" },
                     { label: "Concentração Top Fornecedor", value: supplierConcentration[0] ? `${supplierConcentration[0].percentual.toFixed(1)}%` : "sem base", desc: supplierConcentration[0] ? supplierConcentration[0].fornecedor : "Sem fornecedores com pedidos" },
                   ].map(item => (
                     <div key={item.label} className="p-4 bg-muted/20 rounded-xl border border-border/40 hover:border-primary/30 transition-all cursor-pointer group">
                       <p className="text-[10px] text-muted-foreground uppercase font-black mb-1 group-hover:text-primary transition-colors">{item.label}</p>
                       <p className="text-2xl font-black">{item.value}</p>
                       <p className="text-[10px] text-muted-foreground mt-1">{item.desc}</p>
                     </div>
                   ))}
                </div>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSuppliers.map((supplier) => (
                <Card 
                  key={supplier.id} 
                  className="p-5 border-border/40 hover:border-primary/30 hover:shadow-md transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className={cn(
                            "gap-1 py-1 px-2 font-bold animate-pulse", 
                            getReliabilityColor(supplier.qualityScore)
                          )}>
                            <ShieldCheck className="w-3 h-3" /> {supplier.qualityScore.toFixed(1)} Confiança IA
                          </Badge>

                        </TooltipTrigger>
                        <TooltipContent>Índice de Confiabilidade Neural</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex gap-4 mb-4">
                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <Building className="w-7 h-7 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg leading-tight mb-1">{supplier.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono">{supplier.cnpj}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px] font-bold tracking-wider">
                          {supplier.category || "GENERAL SUPPLIER"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-muted/30 p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Vol. Histórico</div>
                      <div className="text-lg font-bold text-foreground">
                        {supplier.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </div>
                      <div className={cn(
                        "text-[9px] font-bold mt-1 flex items-center",
                        supplierTrend.get(supplier.name)?.variacaoPct === null || (supplierTrend.get(supplier.name)?.variacaoPct ?? 0) >= 0
                          ? "text-emerald-600"
                          : "text-destructive"
                      )}>
                        {(supplierTrend.get(supplier.name)?.variacaoPct ?? 0) >= 0
                          ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                          : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                        {supplierTrend.get(supplier.name)?.variacaoPct === null
                          ? "sem base anterior"
                          : `${(supplierTrend.get(supplier.name)?.variacaoPct ?? 0).toFixed(1)}% vs semestre anterior`}
                      </div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Ticket Médio</div>
                      <div className="text-lg font-bold text-foreground">
                        {supplier.averageOrderValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-[9px] text-blue-600 font-bold mt-1 flex items-center">
                        <ArrowRight className="w-2.5 h-2.5 mr-0.5" /> {supplier.totalOrders} pedido(s)
                      </div>
                    </div>
                  </div>


                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">Qualidade</div>
                        <div className="text-sm font-bold text-emerald-600">{(supplier.qualityScore * 20).toFixed(0)}%</div>
                      </div>
                      <div className="text-center border-x border-border/50">
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">Prazo</div>
                        <div className="text-sm font-bold text-blue-600">{supplier.onTimeRate}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">Preço</div>
                        <div className="text-sm font-bold text-amber-600">{Math.min(100, 60 + supplier.bestDiscount * 2).toFixed(0)}%</div>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-tighter">Índice Global de Performance</span>
                        <span className="text-foreground">{indicePerformance(supplier).toFixed(1)}%</span>
                      </div>
                      <Progress value={indicePerformance(supplier)} className="h-1.5 bg-muted group-hover:bg-muted/50 transition-colors" />
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Pedidos</span>
                          <span className="text-sm font-bold">{supplier.totalOrders}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Lead Time</span>
                          <span className="text-sm font-bold text-blue-600">{supplierLeadTimeLabel(supplier.avgDeliveryDays)}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportSupplier(supplier)}
                        className="h-8 text-[11px] font-bold gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-full px-4"
                      >
                        Dossiê Completo <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Footer Inteligente / Insights 10/10 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-12 h-12" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h5 className="font-bold text-emerald-900 dark:text-emerald-400 text-xs uppercase tracking-wider">Oportunidade IA</h5>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700">
              {oportunidade ? formatCurrency(oportunidade.economia) : "Sem base"}
            </div>
            <p className="text-[10px] text-emerald-800/70 dark:text-emerald-400/70 mt-1">
              {oportunidade
                ? `Diferença entre o preço médio e o menor preço praticado em ${oportunidade.benchmark.categoria} (${oportunidade.menor.nome}).`
                : "Nenhuma categoria com dois fornecedores comparáveis até agora."}
            </p>
          </div>
          <Progress value={oportunidade ? Math.min(100, (oportunidade.benchmark.spreadPct ?? 0)) : 0} className="h-1 bg-emerald-200/30" />
        </Card>

        <Card className="p-4 border-amber-500/20 bg-amber-500/5 flex flex-col gap-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
            <AlertCircle className="w-12 h-12" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </div>
            <h5 className="font-bold text-amber-900 dark:text-amber-400 text-xs uppercase tracking-wider">Risco de Sourcing</h5>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-700">
              {riscoSourcing ? riscoSourcing.status : "Sem base"}
            </div>
            <p className="text-[10px] text-amber-800/70 dark:text-amber-400/70 mt-1">
              {riscoSourcing
                ? `Maior spread de ${riscoSourcing.categoria}: ${riscoSourcing.spreadPct?.toFixed(1)}% entre menor e maior preço.`
                : "Sem categorias com preços comparáveis para medir risco."}
            </p>
          </div>
          <Progress value={riscoSourcing ? Math.min(100, riscoSourcing.spreadPct ?? 0) : 0} className="h-1 bg-amber-200/30" />
        </Card>

        <Card className="p-4 border-primary/20 bg-primary/5 flex flex-col gap-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
            <Sparkles className="w-12 h-12" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <h5 className="font-bold text-primary-900 dark:text-primary-400 text-xs uppercase tracking-wider">Insight Estratégico</h5>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary-700">{health.base > 0 ? `${health.indice.toFixed(1)}%` : "Sem base"}</div>
            <p className="text-[10px] text-primary-800/70 dark:text-primary-400/70 mt-1">
              {health.base > 0
                ? `Índice de saúde calculado sobre ${health.base} fornecedor(es): pontualidade ${health.pontualidade.toFixed(1)}%, qualidade ${health.qualidade.toFixed(1)}%, devolução ${health.devolucao.toFixed(1)}%.`
                : "Nenhum fornecedor com pedidos registrados para calcular o índice."}
            </p>
          </div>
          <Progress value={health.indice} className="h-1 bg-primary-200/30" />
        </Card>

        <Card className="p-4 border-border/40 bg-background/50 backdrop-blur-sm flex flex-col gap-3">
          <h5 className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Spend por Categoria</h5>
          <div className="space-y-2">
            {categorySpend.slice(0, 3).map((cat, i) => (
              <div key={cat.categoria} className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold">
                  <span className="truncate pr-2">{cat.categoria}</span>
                  <span>{cat.percentual.toFixed(1)}%</span>
                </div>
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-full", ["bg-blue-500", "bg-emerald-500", "bg-amber-500"][i % 3])} style={{ width: `${Math.min(100, cat.percentual)}%` }} />
                </div>
              </div>
            ))}
            {categorySpend.length === 0 && (
              <p className="text-[10px] text-muted-foreground">Sem compras registradas.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};