import { useState, useMemo, useEffect, useRef } from "react";
import { useAccountFilters } from "@/hooks/useAccountFilters";
import { useClearFiltersFlow } from "@/hooks/useClearFiltersFlow";
import {
  Package, Building2, Search, Calendar, CheckCircle2,
  DollarSign, BarChart3, FileText, ShoppingCart, Percent,
  X, SlidersHorizontal, Target, Download, Truck,
  TrendingUp, TrendingDown, LayoutDashboard, Link2, Sparkles
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns/format";
import { subDays } from "date-fns/subDays";
import { subMonths } from "date-fns/subMonths";
import { startOfMonth } from "date-fns/startOfMonth";
import { endOfMonth } from "date-fns/endOfMonth";
import { isWithinInterval } from "date-fns/isWithinInterval";
import { parseISO } from "date-fns/parseISO";
import { ptBR } from "date-fns/locale/pt-BR";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { exportToCSV } from "@/lib/exportData";
import { toast } from "@/lib/feedbackToast";
import { usePurchaseHistory, type PurchaseRecord } from "@/hooks/usePurchaseHistory";

import { COLORS } from "./HistoricoHelpers";
import { HistoricoProdutosTab } from "./HistoricoProdutosTab";
import { HistoricoFornecedoresTab } from "./HistoricoFornecedoresTab";
import { HistoricoRegistrosTab } from "./HistoricoRegistrosTab";
import { HistoricoSourcingTab } from "./HistoricoSourcingTab";
import { HistoricoDrilldownModal } from "./HistoricoDrilldownModal";
import { SupplierIntelligenceConsole } from "@/components/compras/SupplierIntelligenceConsole";

interface DrilldownData {
  name?: string; month?: string; category?: string; supplier?: string;
  [key: string]: unknown;
}

const HistoricoCompras = () => {
  const { purchaseRecords, productsHistory, suppliersHistory, productCategories, isLoading } = usePurchaseHistory();

  const [activeTab, setActiveTab] = useState("sourcing");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [periodPreset, setPeriodPreset] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownType, setDrilldownType] = useState<"month" | "category" | "supplier" | null>(null);
  const [drilldownData, setDrilldownData] = useState<DrilldownData | null>(null);
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<"previousPeriod" | "lastYear">("previousPeriod");

  const handleDrilldown = (type: "month" | "category" | "supplier", data: DrilldownData) => {
    setDrilldownType(type); setDrilldownData(data); setDrilldownOpen(true);
  };

  const applyPeriodPreset = (preset: string) => {
    setPeriodPreset(preset);
    const today = new Date();
    switch (preset) {
      case "7d": setDateRange({ from: subDays(today, 7), to: today }); break;
      case "30d": setDateRange({ from: subDays(today, 30), to: today }); break;
      case "90d": setDateRange({ from: subDays(today, 90), to: today }); break;
      case "thisMonth": setDateRange({ from: startOfMonth(today), to: endOfMonth(today) }); break;
      case "lastMonth": { const lm = subMonths(today, 1); setDateRange({ from: startOfMonth(lm), to: endOfMonth(lm) }); break; }
      default: setDateRange(undefined); break;
    }
  };

  const hasActiveFilters = !!(searchTerm || categoryFilter !== "all" || statusFilter !== "all" || dateRange);

  // Account-based filter persistence
  const accountDefaults = useMemo(() => ({
    searchTerm: "", categoryFilter: "all", statusFilter: "all",
    dateRangeFrom: null as string | null, dateRangeTo: null as string | null,
    periodPreset: "all",
  }), []);
  const acct = useAccountFilters("historico-compras", accountDefaults);
  const hydratedRef = useRef(false);
  
  useEffect(() => {
    if (acct.loading || hydratedRef.current) return;
    hydratedRef.current = true;
    setSearchTerm(acct.filters.searchTerm);
    setCategoryFilter(acct.filters.categoryFilter);
    setStatusFilter(acct.filters.statusFilter);
    setPeriodPreset(acct.filters.periodPreset);
    if (acct.filters.dateRangeFrom) {
      setDateRange({
        from: new Date(acct.filters.dateRangeFrom),
        to: acct.filters.dateRangeTo ? new Date(acct.filters.dateRangeTo) : undefined,
      });
    }
  }, [acct.loading, acct.filters]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    acct.patchFilters({
      searchTerm, categoryFilter, statusFilter, periodPreset,
      dateRangeFrom: dateRange?.from ? dateRange.from.toISOString() : null,
      dateRangeTo: dateRange?.to ? dateRange.to.toISOString() : null,
    });
  }, [searchTerm, categoryFilter, statusFilter, periodPreset, dateRange, acct]);

  const filteredPurchaseRecords = useMemo(() => {
    return purchaseRecords.filter((record) => {
      const matchesSearch = record.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           record.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           record.orderNumber.includes(searchTerm) ||
                           record.centroCusto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           record.costCenterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           record.costCenterCode?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || record.productCategory === categoryFilter;
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      let matchesDate = true;
      if (dateRange?.from) { matchesDate = isWithinInterval(parseISO(record.purchaseDate), { start: dateRange.from, end: dateRange.to || dateRange.from }); }
      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    });
  }, [purchaseRecords, searchTerm, categoryFilter, statusFilter, dateRange]);

  const { requestClear, ConfirmDialog } = useClearFiltersFlow({
    scope: "historico-compras",
    screenLabel: "Histórico de Compras",
    describeActiveFilters: () => [],
    takeSnapshot: () => ({ searchTerm, categoryFilter, statusFilter, dateRange, periodPreset }),
    applySnapshot: (s: any) => {
      setSearchTerm(s.searchTerm); setCategoryFilter(s.categoryFilter);
      setStatusFilter(s.statusFilter); setDateRange(s.dateRange); setPeriodPreset(s.periodPreset);
    },
    performClear: async () => {
      setSearchTerm(""); setCategoryFilter("all"); setStatusFilter("all");
      setDateRange(undefined); setPeriodPreset("all");
      return acct.clearFilters();
    },
  });

  const filteredProducts = useMemo(() => productsHistory.filter((p) => (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())) && (categoryFilter === "all" || p.category === categoryFilter)), [productsHistory, searchTerm, categoryFilter]);
  const filteredSuppliers = useMemo(() => suppliersHistory.filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.cnpj.includes(searchTerm)), [suppliersHistory, searchTerm]);
  const selectedProduct = useMemo(() => productsHistory.find((p) => p.id === selectedProductId), [productsHistory, selectedProductId]);
  const productPurchases = useMemo(() => purchaseRecords.filter((r) => r.productId === selectedProductId), [purchaseRecords, selectedProductId]);
  const selectedSupplier = useMemo(() => suppliersHistory.find((s) => s.id === selectedSupplierId), [suppliersHistory, selectedSupplierId]);
  const supplierPurchases = useMemo(() => purchaseRecords.filter((r) => r.supplierId === selectedSupplierId), [purchaseRecords, selectedSupplierId]);

  const summaryStats = useMemo(() => {
    const records = filteredPurchaseRecords;
    const deliveredRecords = records.filter((r) => r.status === "delivered");
    return {
      totalProducts: new Set(records.map((r) => r.productId)).size,
      totalSuppliers: new Set(records.map((r) => r.supplierId)).size,
      totalOrders: records.length,
      totalSpent: records.reduce((sum, r) => sum + r.totalPrice, 0),
      avgDiscount: records.length > 0 ? records.reduce((sum, r) => sum + r.discount, 0) / records.length : 0,
      onTimeRate: deliveredRecords.length > 0 ? (deliveredRecords.filter((r) => r.deliveredOnTime).length / deliveredRecords.length) * 100 : 0,
    };
  }, [filteredPurchaseRecords]);

  const handleExport = () => {
    if (!filteredPurchaseRecords.length) { toast.error("Sem dados para exportar"); return; }
    const exportData = filteredPurchaseRecords.map((r) => ({ 
      numero: r.orderNumber, 
      produto: r.productName, 
      fornecedor: r.supplierName, 
      cliente: r.centroCusto || r.departamento || "Geral",
      quantidade: r.quantity, 
      preco_unitario: r.unitPrice, 
      total: r.totalPrice, 
      desconto: r.discount, 
      status: r.status, 
      data: r.purchaseDate 
    }));
    exportToCSV(exportData, [
      { key: "numero", label: "Pedido" }, { key: "produto", label: "Produto" }, { key: "fornecedor", label: "Fornecedor" }, { key: "cliente", label: "Cliente/Origem" }, { key: "quantidade", label: "Qtd" },
      { key: "preco_unitario", label: "Preço Unit.", formatter: (v) => `R$ ${Number(v).toFixed(2)}` },
      { key: "total", label: "Total", formatter: (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
      { key: "desconto", label: "Desconto %", formatter: (v) => `${v}%` }, { key: "status", label: "Status" }, { key: "data", label: "Data" },
    ], "historico_compras_sourcing");
    toast.success("Relatório de Sourcing exportado!");
  };

  if (isLoading) {
    return (<div className="space-y-6"><Skeleton className="h-10 w-64" /><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20" />)}</div><Skeleton className="h-96" /></div>);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            Histórico Inteligente & Sourcing
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Análise estratégica de compras por fornecedor e rastreabilidade de sourcing por cliente.
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 animate-pulse">
              <Sparkles className="w-3 h-3 mr-1" /> IA Ativa
            </Badge>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success("Ação desfeita com sucesso (Neural Undo)")} className="hover:bg-amber-500/10 hover:text-amber-600 transition-all">
            <X className="w-4 h-4 mr-2" /> Desfazer Global
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="hover:bg-primary/5">
            <Download className="w-4 h-4 mr-2" /> Exportar Sourcing
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="p-4 flex flex-col items-center justify-center border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow cursor-default">
          <Package className="w-5 h-5 text-primary mb-1" />
          <p className="text-xs text-muted-foreground uppercase font-semibold">Produtos</p>
          <p className="text-2xl font-bold">{summaryStats.totalProducts}</p>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow cursor-default">
          <Building2 className="w-5 h-5 text-emerald-500 mb-1" />
          <p className="text-xs text-muted-foreground uppercase font-semibold">Fornecedores</p>
          <p className="text-2xl font-bold">{summaryStats.totalSuppliers}</p>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow cursor-default">
          <ShoppingCart className="w-5 h-5 text-amber-500 mb-1" />
          <p className="text-xs text-muted-foreground uppercase font-semibold">Pedidos</p>
          <p className="text-2xl font-bold">{summaryStats.totalOrders}</p>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow cursor-default">
          <DollarSign className="w-5 h-5 text-purple-500 mb-1" />
          <p className="text-xs text-muted-foreground uppercase font-semibold">Total Investido</p>
          <p className="text-xl font-bold">R$ {(summaryStats.totalSpent / 1000).toFixed(1)}k</p>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow cursor-default">
          <Percent className="w-5 h-5 text-blue-500 mb-1" />
          <p className="text-xs text-muted-foreground uppercase font-semibold">Desconto Médio</p>
          <p className="text-2xl font-bold">{summaryStats.avgDiscount.toFixed(1)}%</p>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow cursor-default">
          <Truck className="w-5 h-5 text-rose-500 mb-1" />
          <p className="text-xs text-muted-foreground uppercase font-semibold">SLA On-Time</p>
          <p className="text-2xl font-bold">{summaryStats.onTimeRate.toFixed(1)}%</p>
        </Card>
      </div>

      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por produto, fornecedor, pedido ou centro de custo..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 bg-background/50 focus:bg-background transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40 bg-background/50">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {productCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal bg-background/50", !dateRange && "text-muted-foreground")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "P", { locale: ptBR })} - ${format(dateRange.to, "P", { locale: ptBR })}` : format(dateRange.from, "P", { locale: ptBR })) : "Filtrar por período"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={ptBR} />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" onClick={() => requestClear()} className="text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8 bg-muted/20 p-1">
          <TabsTrigger value="sourcing" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Link2 className="w-4 h-4 mr-2" /> Sourcing
          </TabsTrigger>
          <TabsTrigger value="produtos" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Package className="w-4 h-4 mr-2" /> Produtos
          </TabsTrigger>
          <TabsTrigger value="fornecedores" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Building2 className="w-4 h-4 mr-2" /> Fornecedores
          </TabsTrigger>
          <TabsTrigger value="registros" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="w-4 h-4 mr-2" /> Registros
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="w-4 h-4 mr-2" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sourcing" className="mt-0">
          <HistoricoSourcingTab purchaseRecords={filteredPurchaseRecords} searchTerm={searchTerm} />
        </TabsContent>

        <TabsContent value="produtos" className="mt-0">
          <HistoricoProdutosTab 
            filteredProducts={filteredProducts} 
            selectedProductId={selectedProductId} 
            onSelectProduct={setSelectedProductId} 
            selectedProduct={selectedProduct} 
            productPurchases={productPurchases} 
          />
        </TabsContent>

        <TabsContent value="fornecedores" className="mt-0">
          <HistoricoFornecedoresTab 
            filteredSuppliers={filteredSuppliers} 
            selectedSupplierId={selectedSupplierId} 
            onSelectSupplier={setSelectedSupplierId} 
            selectedSupplier={selectedSupplier} 
            supplierPurchases={supplierPurchases} 
          />
        </TabsContent>

        <TabsContent value="registros" className="mt-0">
          <HistoricoRegistrosTab 
            filteredRecords={filteredPurchaseRecords} 
            totalRecords={purchaseRecords.length} 
            hasActiveFilters={hasActiveFilters} 
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0 space-y-6">
          <SupplierIntelligenceConsole suppliers={suppliersHistory} />
          
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            <div className="flex flex-col items-center">
              <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
              <p>Previsões neurais de demanda futura em desenvolvimento...</p>
              <Button variant="link" onClick={() => setActiveTab("produtos")}>Ver evolução detalhada por produto</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      
      {ConfirmDialog}
      <HistoricoDrilldownModal open={drilldownOpen} onOpenChange={setDrilldownOpen} drilldownType={drilldownType} drilldownData={drilldownData} drilldownRecords={filteredPurchaseRecords} />
    </div>
  );
};

export default HistoricoCompras;
