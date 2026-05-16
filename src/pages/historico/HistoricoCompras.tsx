import { useState, useMemo, useEffect, useRef } from "react";
import { useAccountFilters } from "@/hooks/useAccountFilters";
import { useClearFiltersFlow } from "@/hooks/useClearFiltersFlow";
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
import { exportToCSV } from "@/lib/exportData";
import { toast } from "sonner";
import { usePurchaseHistory, type PurchaseRecord } from "@/hooks/usePurchaseHistory";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

import { COLORS } from "./HistoricoHelpers";
import { HistoricoProdutosTab } from "./HistoricoProdutosTab";
import { HistoricoFornecedoresTab } from "./HistoricoFornecedoresTab";
import { HistoricoRegistrosTab } from "./HistoricoRegistrosTab";
import { HistoricoDrilldownModal } from "./HistoricoDrilldownModal";

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

  const formatDateRange = (r: DateRange | undefined) => {
    if (!r?.from) return "—";
    const f = format(r.from, "dd/MM/yyyy", { locale: ptBR });
    return r.to ? `${f} – ${format(r.to, "dd/MM/yyyy", { locale: ptBR })}` : f;
  };

  const { requestClear, ConfirmDialog } = useClearFiltersFlow<{
    searchTerm: string; categoryFilter: string; statusFilter: string;
    dateRange: DateRange | undefined; periodPreset: string;
  }>({
    scope: "historico-compras",
    screenLabel: "Histórico de Compras",
    describeActiveFilters: () => [
      { key: "searchTerm", label: "Busca", value: searchTerm },
      { key: "categoryFilter", label: "Categoria", value: categoryFilter },
      { key: "statusFilter", label: "Status", value: statusFilter },
      { key: "dateRange", label: "Período (datas)", value: dateRange?.from ? formatDateRange(dateRange) : null },
      { key: "periodPreset", label: "Preset de período", value: periodPreset !== "all" ? periodPreset : null },
    ],
    takeSnapshot: () => ({ searchTerm, categoryFilter, statusFilter, dateRange, periodPreset }),
    applySnapshot: (s) => {
      setSearchTerm(s.searchTerm); setCategoryFilter(s.categoryFilter);
      setStatusFilter(s.statusFilter); setDateRange(s.dateRange); setPeriodPreset(s.periodPreset);
    },
    performClear: async () => {
      setSearchTerm(""); setCategoryFilter("all"); setStatusFilter("all");
      setDateRange(undefined); setPeriodPreset("all");
      return acct.clearFilters();
    },
  });

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
    return (<div className="space-y-6"><Skeleton className="h-10 w-64" /><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20" />)}</div><Skeleton className="h-96" /></div>);
  }

  return (
    <div className="space-y-6">
...
      {ConfirmDialog}
    </div>
  );
};

export default HistoricoCompras;
