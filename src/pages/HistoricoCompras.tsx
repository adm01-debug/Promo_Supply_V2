import { useState, useMemo } from "react";
import {
  Package, Building2, Search, Calendar, CheckCircle2,
  DollarSign, BarChart3, FileText, ShoppingCart, Percent,
  X, SlidersHorizontal, Target, Download, Truck,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { MainLayout } from "@/components/compras/MainLayout";
import { exportToCSV } from "@/lib/exportData";
import { toast } from "sonner";
import { usePurchaseHistory, type PurchaseRecord } from "@/hooks/usePurchaseHistory";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

import { COLORS } from "./historico/HistoricoHelpers";
import { HistoricoProdutosTab } from "./historico/HistoricoProdutosTab";
import { HistoricoFornecedoresTab } from "./historico/HistoricoFornecedoresTab";
import { HistoricoRegistrosTab } from "./historico/HistoricoRegistrosTab";
import { HistoricoDrilldownModal } from "./historico/HistoricoDrilldownModal";

interface DrilldownData {
  name?: string; month?: string; category?: string; supplier?: string;
  [key: string]: unknown;
}

const HistoricoCompras = () => {
  const { purchaseRecords, productsHistory, suppliersHistory, productCategories, isLoading } = usePurchaseHistory();

  const [activeTab, setActiveTab] = useState("produtos");
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

  const getComparisonDateRange = useMemo(() => {
    if (!comparisonEnabled || !dateRange?.from) return undefined;
    const daysDiff = dateRange.to ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    if (comparisonPeriod === "previousPeriod") { const newTo = subDays(dateRange.from, 1); return { from: subDays(newTo, daysDiff), to: newTo }; }
    if (comparisonPeriod === "lastYear") { return { from: subMonths(dateRange.from, 12), to: dateRange.to ? subMonths(dateRange.to, 12) : subMonths(dateRange.from, 12) }; }
    return undefined;
  }, [comparisonEnabled, dateRange, comparisonPeriod]);

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

  const clearAllFilters = () => { setSearchTerm(""); setCategoryFilter("all"); setStatusFilter("all"); setDateRange(undefined); setPeriodPreset("all"); };
  const hasActiveFilters = !!(searchTerm || categoryFilter !== "all" || statusFilter !== "all" || dateRange);

  const filteredPurchaseRecords = useMemo(() => {
    return purchaseRecords.filter((record) => {
      const matchesSearch = record.productName.toLowerCase().includes(searchTerm.toLowerCase()) || record.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || record.orderNumber.includes(searchTerm);
      const matchesCategory = categoryFilter === "all" || record.productCategory === categoryFilter;
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      let matchesDate = true;
      if (dateRange?.from) { matchesDate = isWithinInterval(parseISO(record.purchaseDate), { start: dateRange.from, end: dateRange.to || dateRange.from }); }
      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    });
  }, [purchaseRecords, searchTerm, categoryFilter, statusFilter, dateRange]);

  const comparisonRecords = useMemo(() => {
    if (!comparisonEnabled || !getComparisonDateRange) return [];
    return purchaseRecords.filter((record) => {
      const matchesSearch = record.productName.toLowerCase().includes(searchTerm.toLowerCase()) || record.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || record.orderNumber.includes(searchTerm);
      const matchesCategory = categoryFilter === "all" || record.productCategory === categoryFilter;
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesDate = isWithinInterval(parseISO(record.purchaseDate), { start: getComparisonDateRange.from!, end: getComparisonDateRange.to || getComparisonDateRange.from! });
      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    });
  }, [purchaseRecords, searchTerm, categoryFilter, statusFilter, getComparisonDateRange, comparisonEnabled]);

  const drilldownRecords = useMemo(() => {
    if (!drilldownData || !drilldownType) return [];
    return filteredPurchaseRecords.filter((record) => {
      if (drilldownType === "month") return format(parseISO(record.purchaseDate), "MMM/yy", { locale: ptBR }) === drilldownData.month;
      if (drilldownType === "category") return record.productCategory === drilldownData.category;
      if (drilldownType === "supplier") return record.supplierName === drilldownData.supplier;
      return false;
    });
  }, [drilldownData, drilldownType, filteredPurchaseRecords]);

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

  // Chart data computation for analytics tab
  const chartData = useMemo(() => {
    const aggregateByCategory = (records: PurchaseRecord[]) => {
      const data: Record<string, { category: string; value: number; quantity: number; orders: number }> = {};
      records.forEach((r) => { if (!data[r.productCategory]) data[r.productCategory] = { category: r.productCategory, value: 0, quantity: 0, orders: 0 }; data[r.productCategory].value += r.totalPrice; data[r.productCategory].quantity += r.quantity; data[r.productCategory].orders += 1; });
      return data;
    };
    const aggregateBySupplier = (records: PurchaseRecord[]) => {
      const data: Record<string, { supplier: string; value: number; quantity: number; orders: number; avgDiscount: number; discountSum: number }> = {};
      records.forEach((r) => { if (!data[r.supplierId]) data[r.supplierId] = { supplier: r.supplierName, value: 0, quantity: 0, orders: 0, avgDiscount: 0, discountSum: 0 }; data[r.supplierId].value += r.totalPrice; data[r.supplierId].quantity += r.quantity; data[r.supplierId].orders += 1; data[r.supplierId].discountSum += r.discount; });
      Object.keys(data).forEach((key) => { data[key].avgDiscount = data[key].orders > 0 ? data[key].discountSum / data[key].orders : 0; });
      return data;
    };
    const currentCategoryData = aggregateByCategory(filteredPurchaseRecords);
    const currentSupplierData = aggregateBySupplier(filteredPurchaseRecords);
    const comparisonCategoryData = comparisonEnabled ? aggregateByCategory(comparisonRecords) : {};
    const comparisonSupplierData = comparisonEnabled ? aggregateBySupplier(comparisonRecords) : {};
    const allCats = new Set([...Object.keys(currentCategoryData), ...Object.keys(comparisonCategoryData)]);
    const byCategory = Array.from(allCats).map((cat) => ({ category: cat, value: currentCategoryData[cat]?.value || 0, quantity: currentCategoryData[cat]?.quantity || 0, orders: currentCategoryData[cat]?.orders || 0, compValue: comparisonCategoryData[cat]?.value || 0 })).sort((a, b) => b.value - a.value);
    const allSups = new Set([...Object.keys(currentSupplierData), ...Object.keys(comparisonSupplierData)]);
    const bySupplier = Array.from(allSups).map((sup) => ({ supplier: currentSupplierData[sup]?.supplier || comparisonSupplierData[sup]?.supplier || sup, value: currentSupplierData[sup]?.value || 0, quantity: currentSupplierData[sup]?.quantity || 0, orders: currentSupplierData[sup]?.orders || 0, avgDiscount: currentSupplierData[sup]?.avgDiscount || 0, compValue: comparisonSupplierData[sup]?.value || 0 })).sort((a, b) => b.value - a.value);

    // Monthly trend + forecast
    const monthlyMap: Record<string, { month: string; value: number; quantity: number; orders: number; avgPrice: number; monthIndex: number }> = {};
    filteredPurchaseRecords.forEach((record) => { const mk = record.purchaseDate.substring(0, 7); const ml = format(parseISO(record.purchaseDate), "MMM/yy", { locale: ptBR }); if (!monthlyMap[mk]) monthlyMap[mk] = { month: ml, value: 0, quantity: 0, orders: 0, avgPrice: 0, monthIndex: 0 }; monthlyMap[mk].value += record.totalPrice; monthlyMap[mk].quantity += record.quantity; monthlyMap[mk].orders += 1; });
    const sortedKeys = Object.keys(monthlyMap).sort();
    sortedKeys.forEach((key, idx) => { monthlyMap[key].avgPrice = monthlyMap[key].quantity > 0 ? monthlyMap[key].value / monthlyMap[key].quantity : 0; monthlyMap[key].monthIndex = idx; });
    const monthlyTrend = sortedKeys.map((key) => monthlyMap[key]);

    const calculateForecast = () => {
      if (monthlyTrend.length < 2) return [];
      const n = monthlyTrend.length;
      const sumX = monthlyTrend.reduce((s, d) => s + d.monthIndex, 0); const sumY = monthlyTrend.reduce((s, d) => s + d.avgPrice, 0);
      const sumXY = monthlyTrend.reduce((s, d) => s + d.monthIndex * d.avgPrice, 0); const sumXX = monthlyTrend.reduce((s, d) => s + d.monthIndex * d.monthIndex, 0);
      const denom = n * sumXX - sumX * sumX; const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0; const intercept = (sumY - slope * sumX) / n;
      const result: { month: string; avgPrice: number | null; forecast: number; type: "historical" | "forecast" }[] = [];
      monthlyTrend.forEach((d, idx) => { result.push({ month: d.month, avgPrice: d.avgPrice, forecast: intercept + slope * idx, type: "historical" }); });
      const lastDate = parseISO(sortedKeys[sortedKeys.length - 1] + "-01");
      for (let i = 1; i <= 3; i++) { const fd = new Date(lastDate); fd.setMonth(fd.getMonth() + i); result.push({ month: format(fd, "MMM/yy", { locale: ptBR }), avgPrice: null, forecast: Math.max(0, intercept + slope * (n - 1 + i)), type: "forecast" }); }
      return result;
    };
    const priceForecast = calculateForecast();
    const forecastMetrics = (() => {
      if (monthlyTrend.length < 2) return null;
      const avgPrice = monthlyTrend.reduce((s, d) => s + d.avgPrice, 0) / monthlyTrend.length;
      const variance = monthlyTrend.reduce((s, d) => s + Math.pow(d.avgPrice - avgPrice, 2), 0) / monthlyTrend.length;
      const stdDev = Math.sqrt(variance); const cv = avgPrice > 0 ? (stdDev / avgPrice) * 100 : 0;
      const lastPrice = monthlyTrend[monthlyTrend.length - 1]?.avgPrice || 0; const firstPrice = monthlyTrend[0]?.avgPrice || 0;
      const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
      const forecastValues = priceForecast.filter((d) => d.type === "forecast");
      return { avgPrice, stdDev, cv, priceChange, trend: priceChange > 2 ? "up" as const : priceChange < -2 ? "down" as const : "stable" as const, nextMonthForecast: forecastValues[0]?.forecast || 0, threeMonthForecast: forecastValues[forecastValues.length - 1]?.forecast || 0, confidence: cv < 10 ? "high" as const : cv < 25 ? "medium" as const : "low" as const };
    })();

    const currentStats = { totalSpent: filteredPurchaseRecords.reduce((s, r) => s + r.totalPrice, 0), totalOrders: filteredPurchaseRecords.length, totalQuantity: filteredPurchaseRecords.reduce((s, r) => s + r.quantity, 0), avgDiscount: filteredPurchaseRecords.length > 0 ? filteredPurchaseRecords.reduce((s, r) => s + r.discount, 0) / filteredPurchaseRecords.length : 0 };
    const compStats = comparisonEnabled ? { totalSpent: comparisonRecords.reduce((s, r) => s + r.totalPrice, 0), totalOrders: comparisonRecords.length, totalQuantity: comparisonRecords.reduce((s, r) => s + r.quantity, 0), avgDiscount: comparisonRecords.length > 0 ? comparisonRecords.reduce((s, r) => s + r.discount, 0) / comparisonRecords.length : 0 } : null;

    return { monthlyTrend, byCategory, bySupplier, currentStats, compStats, priceForecast, forecastMetrics };
  }, [filteredPurchaseRecords, comparisonRecords, comparisonEnabled]);

  const handleExport = () => {
    if (!filteredPurchaseRecords.length) { toast.error("Sem dados para exportar"); return; }
    const exportData = filteredPurchaseRecords.map((r) => ({ numero: r.orderNumber, produto: r.productName, fornecedor: r.supplierName, quantidade: r.quantity, preco_unitario: r.unitPrice, total: r.totalPrice, desconto: r.discount, status: r.status, data: r.purchaseDate, entrega: r.deliveryDate || "", no_prazo: r.deliveredOnTime ? "Sim" : "Não" }));
    exportToCSV(exportData, [
      { key: "numero", label: "Pedido" }, { key: "produto", label: "Produto" }, { key: "fornecedor", label: "Fornecedor" }, { key: "quantidade", label: "Qtd" },
      { key: "preco_unitario", label: "Preço Unit.", formatter: (v) => `R$ ${Number(v).toFixed(2)}` },
      { key: "total", label: "Total", formatter: (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
      { key: "desconto", label: "Desconto %", formatter: (v) => `${v}%` }, { key: "status", label: "Status" }, { key: "data", label: "Data" }, { key: "entrega", label: "Entrega" }, { key: "no_prazo", label: "No Prazo" },
    ], "historico_compras");
    toast.success("Relatório exportado com sucesso!");
  };

  if (isLoading) {
    return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-64" /><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20" />)}</div><Skeleton className="h-96" /></div></MainLayout>);
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText className="w-6 h-6 text-primary" />Histórico de Compras</h1>
            <p className="text-sm text-muted-foreground">Análise de compras por produto e fornecedor • Dados em tempo real</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-success/10 text-success border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Dados Reais</Badge>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}><Download className="w-4 h-4" />Exportar CSV</Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="p-4"><div className="flex items-center gap-2 text-primary mb-1"><Package className="w-4 h-4" /><span className="text-xs font-medium">Produtos</span></div><p className="text-2xl font-bold text-foreground">{summaryStats.totalProducts}</p></Card>
          <Card className="p-4"><div className="flex items-center gap-2 text-info mb-1"><Building2 className="w-4 h-4" /><span className="text-xs font-medium">Fornecedores</span></div><p className="text-2xl font-bold text-foreground">{summaryStats.totalSuppliers}</p></Card>
          <Card className="p-4"><div className="flex items-center gap-2 text-purple-600 mb-1"><ShoppingCart className="w-4 h-4" /><span className="text-xs font-medium">Pedidos</span></div><p className="text-2xl font-bold text-foreground">{summaryStats.totalOrders}</p></Card>
          <Card className="p-4"><div className="flex items-center gap-2 text-success mb-1"><DollarSign className="w-4 h-4" /><span className="text-xs font-medium">Total Gasto</span></div><p className="text-xl font-bold text-foreground">R$ {summaryStats.totalSpent.toLocaleString("pt-BR")}</p></Card>
          <Card className="p-4"><div className="flex items-center gap-2 text-warning mb-1"><Percent className="w-4 h-4" /><span className="text-xs font-medium">Desconto Médio</span></div><p className="text-2xl font-bold text-foreground">{summaryStats.avgDiscount.toFixed(1)}%</p></Card>
          <Card className="p-4"><div className="flex items-center gap-2 text-success mb-1"><Truck className="w-4 h-4" /><span className="text-xs font-medium">No Prazo</span></div><p className="text-2xl font-bold text-foreground">{summaryStats.onTimeRate.toFixed(0)}%</p></Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-4">
              <TabsTrigger value="produtos" className="gap-2"><Package className="w-4 h-4" />Produtos</TabsTrigger>
              <TabsTrigger value="fornecedores" className="gap-2"><Building2 className="w-4 h-4" />Fornecedores</TabsTrigger>
              <TabsTrigger value="analises" className="gap-2"><BarChart3 className="w-4 h-4" />Análises</TabsTrigger>
              <TabsTrigger value="registros" className="gap-2"><FileText className="w-4 h-4" />Registros</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-[180px]" /></div>
              <Button variant={showAdvancedFilters ? "secondary" : "outline"} size="sm" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="gap-2">
                <SlidersHorizontal className="w-4 h-4" />Filtros
                {hasActiveFilters && <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">{[categoryFilter !== "all", statusFilter !== "all", !!dateRange].filter(Boolean).length}</Badge>}
              </Button>
              {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-muted-foreground"><X className="w-3 h-3" />Limpar</Button>}
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <Card className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Período</label>
                  <div className="flex items-center gap-2">
                    <Select value={periodPreset} onValueChange={applyPeriodPreset}>
                      <SelectTrigger className="w-[140px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Todo período</SelectItem><SelectItem value="7d">Últimos 7 dias</SelectItem><SelectItem value="30d">Últimos 30 dias</SelectItem><SelectItem value="90d">Últimos 90 dias</SelectItem><SelectItem value="thisMonth">Este mês</SelectItem><SelectItem value="lastMonth">Mês passado</SelectItem></SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("w-[220px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                          <Calendar className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "dd/MM/yy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}</> : format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })) : <span>Período personalizado</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><CalendarComponent initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); setPeriodPreset("custom"); }} numberOfMonths={2} className="pointer-events-auto" /></PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{productCategories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pending">Pendente</SelectItem><SelectItem value="shipped">Enviado</SelectItem><SelectItem value="delivered">Entregue</SelectItem><SelectItem value="returned">Devolvido</SelectItem></SelectContent></Select>
                </div>
              </div>
            </Card>
          )}

          <TabsContent value="produtos" className="space-y-4">
            <HistoricoProdutosTab filteredProducts={filteredProducts} selectedProductId={selectedProductId} onSelectProduct={setSelectedProductId} selectedProduct={selectedProduct} productPurchases={productPurchases} />
          </TabsContent>

          <TabsContent value="fornecedores" className="space-y-4">
            <HistoricoFornecedoresTab filteredSuppliers={filteredSuppliers} selectedSupplierId={selectedSupplierId} onSelectSupplier={setSelectedSupplierId} selectedSupplier={selectedSupplier} supplierPurchases={supplierPurchases} />
          </TabsContent>

          <TabsContent value="analises" className="space-y-6">
            {/* Comparison Controls */}
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="comparison-toggle" checked={comparisonEnabled} onChange={(e) => setComparisonEnabled(e.target.checked)} className="h-4 w-4 rounded border-border" />
                    <label htmlFor="comparison-toggle" className="text-sm font-medium text-foreground cursor-pointer">Comparar Períodos</label>
                  </div>
                  {comparisonEnabled && dateRange?.from && (
                    <Select value={comparisonPeriod} onValueChange={(v: "previousPeriod" | "lastYear") => setComparisonPeriod(v)}>
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="previousPeriod">Período Anterior</SelectItem><SelectItem value="lastYear">Mesmo Período Ano Passado</SelectItem></SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </Card>

            {/* Price Forecast */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div><h3 className="font-semibold text-foreground flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Previsão de Preços</h3><p className="text-xs text-muted-foreground mt-1">Regressão linear com projeção de 3 meses</p></div>
                {chartData.forecastMetrics && <Badge variant="outline" className={cn("text-xs", chartData.forecastMetrics.confidence === "high" ? "bg-success/10 text-success" : chartData.forecastMetrics.confidence === "medium" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>Confiança: {chartData.forecastMetrics.confidence === "high" ? "Alta" : chartData.forecastMetrics.confidence === "medium" ? "Média" : "Baixa"}</Badge>}
              </div>
              {chartData.priceForecast.length > 0 ? (
                <>
                  {chartData.forecastMetrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Preço Médio Atual</p><p className="text-lg font-bold text-foreground">R$ {chartData.forecastMetrics.avgPrice.toFixed(2)}</p></div>
                      <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Variação no Período</p><p className={`text-lg font-bold ${chartData.forecastMetrics.priceChange > 0 ? "text-destructive" : chartData.forecastMetrics.priceChange < 0 ? "text-success" : "text-foreground"}`}>{chartData.forecastMetrics.priceChange > 0 ? "+" : ""}{chartData.forecastMetrics.priceChange.toFixed(1)}%</p></div>
                      <div className="p-3 rounded-lg bg-primary/10"><p className="text-xs text-primary">Previsão Próx. Mês</p><p className="text-lg font-bold text-primary">R$ {chartData.forecastMetrics.nextMonthForecast.toFixed(2)}</p></div>
                      <div className="p-3 rounded-lg bg-primary/10"><p className="text-xs text-primary">Previsão 3 Meses</p><p className="text-lg font-bold text-primary">R$ {chartData.forecastMetrics.threeMonthForecast.toFixed(2)}</p></div>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData.priceForecast}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$ ${v.toFixed(0)}`} domain={["auto", "auto"]} />
                      <Tooltip content={({ active, payload, label }) => { if (!active || !payload?.length) return null; const data = payload[0].payload; return (<div className="bg-popover border border-border rounded-lg shadow-lg p-3"><p className="font-medium text-foreground">{label}</p>{data.avgPrice !== null && <p className="text-sm text-success">Preço Real: R$ {data.avgPrice.toFixed(2)}</p>}<p className="text-sm text-primary">{data.type === "forecast" ? "Previsão" : "Tendência"}: R$ {data.forecast.toFixed(2)}</p></div>); }} />
                      <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
                      <Line type="monotone" dataKey="avgPrice" name="Preço Real" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 5, fill: "hsl(142, 76%, 36%)" }} connectNulls={false} />
                      <Line type="monotone" dataKey="forecast" name="Tendência / Previsão" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" dot={(props: Record<string, unknown>) => { const { cx, cy, payload } = props as { cx: number; cy: number; payload: { type: string } }; if (payload.type === "forecast") return <circle cx={cx} cy={cy} r={6} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2} />; return <circle cx={cx} cy={cy} r={0} />; }} />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Dados insuficientes para previsão</div>}
            </Card>

            {/* Category & Supplier Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4"><Package className="w-4 h-4 text-purple-600" />Distribuição por Categoria</h3>
                {chartData.byCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData.byCategory} layout="vertical" onClick={(e) => e?.activePayload && handleDrilldown("category", e.activePayload[0].payload)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} /><YAxis type="category" dataKey="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={100} /><Tooltip />
                      {comparisonEnabled && <Bar dataKey="compValue" name="Comparação (R$)" fill="hsl(var(--muted-foreground))" fillOpacity={0.3} radius={[0, 4, 4, 0]} />}
                      <Bar dataKey="value" name="Atual (R$)" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }}>{chartData.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Sem dados</div>}
              </Card>
              <Card className="p-6">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4"><Building2 className="w-4 h-4 text-warning" />Volume por Fornecedor</h3>
                {chartData.bySupplier.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData.bySupplier} layout="vertical" onClick={(e) => e?.activePayload && handleDrilldown("supplier", e.activePayload[0].payload)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} /><YAxis type="category" dataKey="supplier" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={100} /><Tooltip />
                      {comparisonEnabled && <Bar dataKey="compValue" name="Comparação (R$)" fill="hsl(var(--muted-foreground))" fillOpacity={0.3} radius={[0, 4, 4, 0]} />}
                      <Bar dataKey="value" name="Atual (R$)" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Sem dados</div>}
              </Card>
            </div>

            {/* Supplier Metrics Table */}
            <Card className="p-0">
              <div className="p-4 border-b border-border"><h3 className="font-semibold text-foreground flex items-center gap-2"><Percent className="w-4 h-4 text-primary" />Métricas por Fornecedor</h3></div>
              <div className="overflow-x-auto">
                <Table aria-label="Tabela de dados">
                  <TableHeader><TableRow className="bg-muted/30"><TableHead className="text-xs">Fornecedor</TableHead><TableHead className="text-xs text-right">Pedidos</TableHead><TableHead className="text-xs text-right">Quantidade</TableHead><TableHead className="text-xs text-right">Volume (R$)</TableHead><TableHead className="text-xs text-right">Ticket Médio</TableHead><TableHead className="text-xs text-right">Desc. Médio</TableHead><TableHead className="text-xs">Participação</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {chartData.bySupplier.map((supplier, idx) => {
                      const totalValue = chartData.bySupplier.reduce((s, sup) => s + sup.value, 0);
                      const share = totalValue > 0 ? (supplier.value / totalValue) * 100 : 0;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-sm font-medium">{supplier.supplier}</TableCell>
                          <TableCell className="text-sm text-right">{supplier.orders}</TableCell>
                          <TableCell className="text-sm text-right">{supplier.quantity.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-sm text-right font-medium">R$ {supplier.value.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-sm text-right">R$ {(supplier.orders > 0 ? supplier.value / supplier.orders : 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</TableCell>
                          <TableCell className="text-sm text-right text-success">{supplier.avgDiscount.toFixed(1)}%</TableCell>
                          <TableCell className="text-sm"><div className="flex items-center gap-2"><Progress value={share} className="h-2 w-16" /><span className="text-xs text-muted-foreground">{share.toFixed(1)}%</span></div></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="registros" className="space-y-4">
            <HistoricoRegistrosTab filteredRecords={filteredPurchaseRecords} totalRecords={purchaseRecords.length} hasActiveFilters={hasActiveFilters} />
          </TabsContent>
        </Tabs>

        <HistoricoDrilldownModal open={drilldownOpen} onOpenChange={setDrilldownOpen} drilldownType={drilldownType} drilldownData={drilldownData} drilldownRecords={drilldownRecords} />
      </div>
    </MainLayout>
  );
};

export default HistoricoCompras;
