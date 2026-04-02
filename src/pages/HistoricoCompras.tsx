import { useState, useMemo } from "react";
import {
  Package,
  Building2,
  TrendingUp,
  TrendingDown,
  Search,
  Calendar,
  Star,
  Clock,
  Truck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DollarSign,
  BarChart3,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Percent,
  X,
  SlidersHorizontal,
  Target,
  Loader2,
  Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { MainLayout } from "@/components/compras/MainLayout";
import { exportToCSV } from "@/lib/exportData";
import { toast } from "sonner";
import {
  usePurchaseHistory,
  type PurchaseRecord,
  type ProductHistory,
  type SupplierHistory,
} from "@/hooks/usePurchaseHistory";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  TooltipProps,
} from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

const COLORS = [
  "hsl(var(--primary))", "hsl(142, 76%, 36%)", "hsl(221, 83%, 53%)",
  "hsl(262, 83%, 58%)", "hsl(38, 92%, 50%)",
];

const QualityStars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-3 h-3 ${star <= rating ? "fill-yellow-500 text-warning" : "text-muted-foreground/30"}`}
      />
    ))}
    <span className="text-xs text-muted-foreground ml-1">({rating.toFixed(1)})</span>
  </div>
);

const DeliveryBadge = ({ onTime }: { onTime: boolean }) => (
  <Badge
    variant={onTime ? "default" : "secondary"}
    className={`text-xs ${onTime ? "bg-success/10 text-success border-green-500/20" : "bg-warning/10 text-warning border-yellow-500/20"}`}
  >
    {onTime ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
    {onTime ? "No prazo" : "Atrasado"}
  </Badge>
);

const StatusBadge = ({ status }: { status: PurchaseRecord["status"] }) => {
  const config = {
    pending: { label: "Pendente", color: "bg-warning/10 text-warning border-yellow-500/20" },
    shipped: { label: "Enviado", color: "bg-info/10 text-info border-blue-500/20" },
    delivered: { label: "Entregue", color: "bg-success/10 text-success border-green-500/20" },
    returned: { label: "Devolvido", color: "bg-destructive/10 text-destructive border-red-500/20" },
  };
  return <Badge variant="outline" className={`text-xs ${config[status].color}`}>{config[status].label}</Badge>;
};

interface DrilldownData {
  name?: string;
  month?: string;
  category?: string;
  supplier?: string;
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

  // Drill-down state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownType, setDrilldownType] = useState<"month" | "category" | "supplier" | null>(null);
  const [drilldownData, setDrilldownData] = useState<DrilldownData | null>(null);

  // Period comparison state
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<"previousPeriod" | "lastYear">("previousPeriod");
  const [comparisonDateRange, setComparisonDateRange] = useState<DateRange | undefined>(undefined);

  const handleDrilldown = (type: "month" | "category" | "supplier", data: DrilldownData) => {
    setDrilldownType(type);
    setDrilldownData(data);
    setDrilldownOpen(true);
  };

  const getComparisonDateRange = useMemo(() => {
    if (!comparisonEnabled || !dateRange?.from) return undefined;
    const daysDiff = dateRange.to
      ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    if (comparisonPeriod === "previousPeriod") {
      const newTo = subDays(dateRange.from, 1);
      return { from: subDays(newTo, daysDiff), to: newTo };
    }
    if (comparisonPeriod === "lastYear") {
      return {
        from: subMonths(dateRange.from, 12),
        to: dateRange.to ? subMonths(dateRange.to, 12) : subMonths(dateRange.from, 12),
      };
    }
    return comparisonDateRange;
  }, [comparisonEnabled, dateRange, comparisonPeriod, comparisonDateRange]);

  const applyPeriodPreset = (preset: string) => {
    setPeriodPreset(preset);
    const today = new Date();
    switch (preset) {
      case "7d": setDateRange({ from: subDays(today, 7), to: today }); break;
      case "30d": setDateRange({ from: subDays(today, 30), to: today }); break;
      case "90d": setDateRange({ from: subDays(today, 90), to: today }); break;
      case "thisMonth": setDateRange({ from: startOfMonth(today), to: endOfMonth(today) }); break;
      case "lastMonth": {
        const lm = subMonths(today, 1);
        setDateRange({ from: startOfMonth(lm), to: endOfMonth(lm) });
        break;
      }
      default: setDateRange(undefined); break;
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setDateRange(undefined);
    setPeriodPreset("all");
  };

  const hasActiveFilters = searchTerm || categoryFilter !== "all" || statusFilter !== "all" || dateRange;

  // ── Filtered data ──
  const filteredPurchaseRecords = useMemo(() => {
    return purchaseRecords.filter((record) => {
      const matchesSearch =
        record.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.orderNumber.includes(searchTerm);
      const matchesCategory = categoryFilter === "all" || record.productCategory === categoryFilter;
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      let matchesDate = true;
      if (dateRange?.from) {
        const purchaseDate = parseISO(record.purchaseDate);
        matchesDate = isWithinInterval(purchaseDate, {
          start: dateRange.from,
          end: dateRange.to || dateRange.from,
        });
      }
      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    });
  }, [purchaseRecords, searchTerm, categoryFilter, statusFilter, dateRange]);

  const comparisonRecords = useMemo(() => {
    if (!comparisonEnabled || !getComparisonDateRange) return [];
    return purchaseRecords.filter((record) => {
      const matchesSearch =
        record.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.orderNumber.includes(searchTerm);
      const matchesCategory = categoryFilter === "all" || record.productCategory === categoryFilter;
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const purchaseDate = parseISO(record.purchaseDate);
      const matchesDate = isWithinInterval(purchaseDate, {
        start: getComparisonDateRange.from!,
        end: getComparisonDateRange.to || getComparisonDateRange.from!,
      });
      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    });
  }, [purchaseRecords, searchTerm, categoryFilter, statusFilter, getComparisonDateRange, comparisonEnabled]);

  const drilldownRecords = useMemo(() => {
    if (!drilldownData || !drilldownType) return [];
    return filteredPurchaseRecords.filter((record) => {
      if (drilldownType === "month") {
        const recordMonth = format(parseISO(record.purchaseDate), "MMM/yy", { locale: ptBR });
        return recordMonth === drilldownData.month;
      }
      if (drilldownType === "category") return record.productCategory === drilldownData.category;
      if (drilldownType === "supplier") return record.supplierName === drilldownData.supplier;
      return false;
    });
  }, [drilldownData, drilldownType, filteredPurchaseRecords]);

  const filteredProducts = useMemo(() => {
    return productsHistory.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [productsHistory, searchTerm, categoryFilter]);

  const filteredSuppliers = useMemo(() => {
    return suppliersHistory.filter((s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.cnpj.includes(searchTerm)
    );
  }, [suppliersHistory, searchTerm]);

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
      onTimeRate: deliveredRecords.length > 0
        ? (deliveredRecords.filter((r) => r.deliveredOnTime).length / deliveredRecords.length) * 100
        : 0,
    };
  }, [filteredPurchaseRecords]);

  // ── Chart data ──
  const chartData = useMemo(() => {
    const aggregateByCategory = (records: PurchaseRecord[]) => {
      const data: Record<string, { category: string; value: number; quantity: number; orders: number }> = {};
      records.forEach((r) => {
        if (!data[r.productCategory]) data[r.productCategory] = { category: r.productCategory, value: 0, quantity: 0, orders: 0 };
        data[r.productCategory].value += r.totalPrice;
        data[r.productCategory].quantity += r.quantity;
        data[r.productCategory].orders += 1;
      });
      return data;
    };

    const aggregateBySupplier = (records: PurchaseRecord[]) => {
      const data: Record<string, { supplier: string; value: number; quantity: number; orders: number; avgDiscount: number; discountSum: number }> = {};
      records.forEach((r) => {
        if (!data[r.supplierId]) data[r.supplierId] = { supplier: r.supplierName, value: 0, quantity: 0, orders: 0, avgDiscount: 0, discountSum: 0 };
        data[r.supplierId].value += r.totalPrice;
        data[r.supplierId].quantity += r.quantity;
        data[r.supplierId].orders += 1;
        data[r.supplierId].discountSum += r.discount;
      });
      Object.keys(data).forEach((key) => {
        data[key].avgDiscount = data[key].orders > 0 ? data[key].discountSum / data[key].orders : 0;
      });
      return data;
    };

    const currentCategoryData = aggregateByCategory(filteredPurchaseRecords);
    const currentSupplierData = aggregateBySupplier(filteredPurchaseRecords);
    const comparisonCategoryData = comparisonEnabled ? aggregateByCategory(comparisonRecords) : {};
    const comparisonSupplierData = comparisonEnabled ? aggregateBySupplier(comparisonRecords) : {};

    const allCategories = new Set([...Object.keys(currentCategoryData), ...Object.keys(comparisonCategoryData)]);
    const byCategory = Array.from(allCategories).map((cat) => ({
      category: cat,
      value: currentCategoryData[cat]?.value || 0,
      quantity: currentCategoryData[cat]?.quantity || 0,
      orders: currentCategoryData[cat]?.orders || 0,
      compValue: comparisonCategoryData[cat]?.value || 0,
    })).sort((a, b) => b.value - a.value);

    const allSuppliers = new Set([...Object.keys(currentSupplierData), ...Object.keys(comparisonSupplierData)]);
    const bySupplier = Array.from(allSuppliers).map((sup) => ({
      supplier: currentSupplierData[sup]?.supplier || comparisonSupplierData[sup]?.supplier || sup,
      value: currentSupplierData[sup]?.value || 0,
      quantity: currentSupplierData[sup]?.quantity || 0,
      orders: currentSupplierData[sup]?.orders || 0,
      avgDiscount: currentSupplierData[sup]?.avgDiscount || 0,
      compValue: comparisonSupplierData[sup]?.value || 0,
    })).sort((a, b) => b.value - a.value);

    // Monthly trend
    const monthlyMap: Record<string, { month: string; value: number; quantity: number; orders: number; avgPrice: number; monthIndex: number }> = {};
    filteredPurchaseRecords.forEach((record) => {
      const monthKey = record.purchaseDate.substring(0, 7);
      const monthLabel = format(parseISO(record.purchaseDate), "MMM/yy", { locale: ptBR });
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { month: monthLabel, value: 0, quantity: 0, orders: 0, avgPrice: 0, monthIndex: 0 };
      monthlyMap[monthKey].value += record.totalPrice;
      monthlyMap[monthKey].quantity += record.quantity;
      monthlyMap[monthKey].orders += 1;
    });
    const sortedKeys = Object.keys(monthlyMap).sort();
    sortedKeys.forEach((key, idx) => {
      monthlyMap[key].avgPrice = monthlyMap[key].quantity > 0 ? monthlyMap[key].value / monthlyMap[key].quantity : 0;
      monthlyMap[key].monthIndex = idx;
    });
    const monthlyTrend = sortedKeys.map((key) => monthlyMap[key]);

    // Forecast
    const calculateForecast = () => {
      if (monthlyTrend.length < 2) return [];
      const n = monthlyTrend.length;
      const sumX = monthlyTrend.reduce((s, d) => s + d.monthIndex, 0);
      const sumY = monthlyTrend.reduce((s, d) => s + d.avgPrice, 0);
      const sumXY = monthlyTrend.reduce((s, d) => s + d.monthIndex * d.avgPrice, 0);
      const sumXX = monthlyTrend.reduce((s, d) => s + d.monthIndex * d.monthIndex, 0);
      const denom = n * sumXX - sumX * sumX;
      const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
      const intercept = (sumY - slope * sumX) / n;

      const result: { month: string; avgPrice: number | null; forecast: number; type: "historical" | "forecast" }[] = [];
      monthlyTrend.forEach((d, idx) => {
        result.push({ month: d.month, avgPrice: d.avgPrice, forecast: intercept + slope * idx, type: "historical" });
      });
      const lastDate = parseISO(sortedKeys[sortedKeys.length - 1] + "-01");
      for (let i = 1; i <= 3; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setMonth(futureDate.getMonth() + i);
        result.push({
          month: format(futureDate, "MMM/yy", { locale: ptBR }),
          avgPrice: null,
          forecast: Math.max(0, intercept + slope * (n - 1 + i)),
          type: "forecast",
        });
      }
      return result;
    };
    const priceForecast = calculateForecast();

    const forecastMetrics = (() => {
      if (monthlyTrend.length < 2) return null;
      const avgPrice = monthlyTrend.reduce((s, d) => s + d.avgPrice, 0) / monthlyTrend.length;
      const variance = monthlyTrend.reduce((s, d) => s + Math.pow(d.avgPrice - avgPrice, 2), 0) / monthlyTrend.length;
      const stdDev = Math.sqrt(variance);
      const cv = avgPrice > 0 ? (stdDev / avgPrice) * 100 : 0;
      const lastPrice = monthlyTrend[monthlyTrend.length - 1]?.avgPrice || 0;
      const firstPrice = monthlyTrend[0]?.avgPrice || 0;
      const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
      const forecastValues = priceForecast.filter((d) => d.type === "forecast");
      return {
        avgPrice, stdDev, cv, priceChange,
        trend: priceChange > 2 ? "up" as const : priceChange < -2 ? "down" as const : "stable" as const,
        nextMonthForecast: forecastValues[0]?.forecast || 0,
        threeMonthForecast: forecastValues[forecastValues.length - 1]?.forecast || 0,
        confidence: cv < 10 ? "high" as const : cv < 25 ? "medium" as const : "low" as const,
      };
    })();

    const currentStats = {
      totalSpent: filteredPurchaseRecords.reduce((s, r) => s + r.totalPrice, 0),
      totalOrders: filteredPurchaseRecords.length,
      totalQuantity: filteredPurchaseRecords.reduce((s, r) => s + r.quantity, 0),
      avgDiscount: filteredPurchaseRecords.length > 0 ? filteredPurchaseRecords.reduce((s, r) => s + r.discount, 0) / filteredPurchaseRecords.length : 0,
    };
    const compStats = comparisonEnabled ? {
      totalSpent: comparisonRecords.reduce((s, r) => s + r.totalPrice, 0),
      totalOrders: comparisonRecords.length,
      totalQuantity: comparisonRecords.reduce((s, r) => s + r.quantity, 0),
      avgDiscount: comparisonRecords.length > 0 ? comparisonRecords.reduce((s, r) => s + r.discount, 0) / comparisonRecords.length : 0,
    } : null;

    return { monthlyTrend, byCategory, bySupplier, currentStats, compStats, priceForecast, forecastMetrics };
  }, [filteredPurchaseRecords, comparisonRecords, comparisonEnabled]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === "number" && (String(entry.name).includes("R$") || String(entry.name).includes("Preço") || String(entry.name).includes("Valor"))
              ? `R$ ${entry.value.toLocaleString("pt-BR")}`
              : entry.value}
          </p>
        ))}
      </div>
    );
  };

  // ── Export ──
  const handleExport = () => {
    if (!filteredPurchaseRecords.length) { toast.error("Sem dados para exportar"); return; }
    const exportData = filteredPurchaseRecords.map((r) => ({
      numero: r.orderNumber, produto: r.productName, fornecedor: r.supplierName,
      quantidade: r.quantity, preco_unitario: r.unitPrice, total: r.totalPrice,
      desconto: r.discount, status: r.status, data: r.purchaseDate,
      entrega: r.deliveryDate || "", no_prazo: r.deliveredOnTime ? "Sim" : "Não",
    }));
    exportToCSV(exportData, [
      { key: "numero", label: "Pedido" }, { key: "produto", label: "Produto" },
      { key: "fornecedor", label: "Fornecedor" }, { key: "quantidade", label: "Qtd" },
      { key: "preco_unitario", label: "Preço Unit.", formatter: (v) => `R$ ${Number(v).toFixed(2)}` },
      { key: "total", label: "Total", formatter: (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
      { key: "desconto", label: "Desconto %", formatter: (v) => `${v}%` },
      { key: "status", label: "Status" }, { key: "data", label: "Data" },
      { key: "entrega", label: "Entrega" }, { key: "no_prazo", label: "No Prazo" },
    ], "historico_compras");
    toast.success("Relatório exportado com sucesso!");
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Histórico de Compras
            </h1>
            <p className="text-sm text-muted-foreground">
              Análise de compras por produto e fornecedor • Dados em tempo real
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-success/10 text-success border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Dados Reais
            </Badge>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Package className="w-4 h-4" />
              <span className="text-xs font-medium">Produtos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{summaryStats.totalProducts}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-info mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-medium">Fornecedores</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{summaryStats.totalSuppliers}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs font-medium">Pedidos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{summaryStats.totalOrders}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-success mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Total Gasto</span>
            </div>
            <p className="text-xl font-bold text-foreground">R$ {summaryStats.totalSpent.toLocaleString("pt-BR")}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-warning mb-1">
              <Percent className="w-4 h-4" />
              <span className="text-xs font-medium">Desconto Médio</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{summaryStats.avgDiscount.toFixed(1)}%</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-success mb-1">
              <Truck className="w-4 h-4" />
              <span className="text-xs font-medium">No Prazo</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{summaryStats.onTimeRate.toFixed(0)}%</p>
          </Card>
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-[180px]" />
              </div>
              <Button variant={showAdvancedFilters ? "secondary" : "outline"} size="sm" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filtros
                {hasActiveFilters && (
                  <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {[categoryFilter !== "all", statusFilter !== "all", !!dateRange].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-muted-foreground">
                  <X className="w-3 h-3" />Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <Card className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Período</label>
                  <div className="flex items-center gap-2">
                    <Select value={periodPreset} onValueChange={applyPeriodPreset}>
                      <SelectTrigger className="w-[140px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todo período</SelectItem>
                        <SelectItem value="7d">Últimos 7 dias</SelectItem>
                        <SelectItem value="30d">Últimos 30 dias</SelectItem>
                        <SelectItem value="90d">Últimos 90 dias</SelectItem>
                        <SelectItem value="thisMonth">Este mês</SelectItem>
                        <SelectItem value="lastMonth">Mês passado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("w-[220px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                          <Calendar className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>{format(dateRange.from, "dd/MM/yy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}</>
                            ) : format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                          ) : <span>Período personalizado</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); setPeriodPreset("custom"); }} numberOfMonths={2} className="pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {productCategories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="shipped">Enviado</SelectItem>
                      <SelectItem value="delivered">Entregue</SelectItem>
                      <SelectItem value="returned">Devolvido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">Filtros ativos:</span>
                  {dateRange && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(dateRange.from!, "dd/MM", { locale: ptBR })} - {format(dateRange.to || dateRange.from!, "dd/MM", { locale: ptBR })}
                      <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => { setDateRange(undefined); setPeriodPreset("all"); }} />
                    </Badge>
                  )}
                  {categoryFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {categoryFilter}
                      <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setCategoryFilter("all")} />
                    </Badge>
                  )}
                  {statusFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {statusFilter === "pending" ? "Pendente" : statusFilter === "shipped" ? "Enviado" : statusFilter === "delivered" ? "Entregue" : "Devolvido"}
                      <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setStatusFilter("all")} />
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">{filteredPurchaseRecords.length} registros encontrados</span>
                </div>
              )}
            </Card>
          )}

          {/* ── Products Tab ── */}
          <TabsContent value="produtos" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 p-0">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Lista de Produtos</h3>
                  <p className="text-xs text-muted-foreground">{filteredProducts.length} produtos encontrados</p>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="divide-y divide-border">
                    {filteredProducts.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado</div>
                    ) : filteredProducts.map((product) => (
                      <div key={product.id} className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${selectedProductId === product.id ? "bg-accent" : ""}`} onClick={() => setSelectedProductId(product.id)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku} • {product.category}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-xs">R$ {product.avgPrice.toFixed(2)}</Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Compras:</span> <span className="font-medium">{product.totalPurchases}</span></div>
                          <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">R$ {product.totalSpent.toLocaleString("pt-BR")}</span></div>
                          <div><span className="text-muted-foreground">Min:</span> <span className="font-medium text-success">R$ {product.minPrice.toFixed(2)}</span></div>
                          <div><span className="text-muted-foreground">Max:</span> <span className="font-medium text-destructive">R$ {product.maxPrice.toFixed(2)}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="lg:col-span-2 p-6">
                {selectedProduct ? (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{selectedProduct.name}</h2>
                        <p className="text-sm text-muted-foreground">{selectedProduct.sku} • {selectedProduct.category}</p>
                      </div>
                      <QualityStars rating={selectedProduct.qualityAvg} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Preço Médio</p>
                        <p className="text-lg font-bold text-foreground">R$ {selectedProduct.avgPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-success/10">
                        <p className="text-xs text-success">Menor Preço</p>
                        <p className="text-lg font-bold text-success">R$ {selectedProduct.minPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-destructive/10">
                        <p className="text-xs text-destructive">Maior Preço</p>
                        <p className="text-lg font-bold text-destructive">R$ {selectedProduct.maxPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Qtd. Total</p>
                        <p className="text-lg font-bold text-foreground">{selectedProduct.totalQuantity.toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                    {selectedProduct.priceHistory.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />Evolução de Preço
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={selectedProduct.priceHistory}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$ ${v}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="price" name="Preço" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />Histórico de Compras ({productPurchases.length})
                      </h3>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <Table aria-label="Tabela de dados">
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="text-xs">Pedido</TableHead>
                              <TableHead className="text-xs">Fornecedor</TableHead>
                              <TableHead className="text-xs text-right">Qtd</TableHead>
                              <TableHead className="text-xs text-right">Preço Unit.</TableHead>
                              <TableHead className="text-xs text-right">Desconto</TableHead>
                              <TableHead className="text-xs">Entrega</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {productPurchases.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell className="text-xs font-medium">#{record.orderNumber}</TableCell>
                                <TableCell className="text-xs">{record.supplierName}</TableCell>
                                <TableCell className="text-xs text-right">{record.quantity}</TableCell>
                                <TableCell className="text-xs text-right">R$ {record.unitPrice.toFixed(2)}</TableCell>
                                <TableCell className="text-xs text-right text-success">{record.discount}%</TableCell>
                                <TableCell className="text-xs">{record.status === "delivered" && <DeliveryBadge onTime={record.deliveredOnTime || false} />}</TableCell>
                                <TableCell className="text-xs"><StatusBadge status={record.status} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <Package className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">Selecione um produto para ver detalhes</p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* ── Suppliers Tab ── */}
          <TabsContent value="fornecedores" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 p-0">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Lista de Fornecedores</h3>
                  <p className="text-xs text-muted-foreground">{filteredSuppliers.length} fornecedores</p>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="divide-y divide-border">
                    {filteredSuppliers.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">Nenhum fornecedor encontrado</div>
                    ) : filteredSuppliers.map((supplier) => (
                      <div key={supplier.id} className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${selectedSupplierId === supplier.id ? "bg-accent" : ""}`} onClick={() => setSelectedSupplierId(supplier.id)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{supplier.name}</p>
                            <p className="text-xs text-muted-foreground">{supplier.cnpj}</p>
                          </div>
                          <Badge variant={supplier.onTimeRate >= 80 ? "default" : "secondary"} className={`shrink-0 text-xs ${supplier.onTimeRate >= 80 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                            {supplier.onTimeRate}% SLA
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Pedidos:</span> <span className="ml-1 font-medium">{supplier.totalOrders}</span></div>
                          <div><span className="text-muted-foreground">Total:</span> <span className="ml-1 font-medium">R$ {supplier.totalSpent.toLocaleString("pt-BR")}</span></div>
                          <div><span className="text-muted-foreground">Desconto médio:</span> <span className="ml-1 font-medium text-success">{supplier.averageDiscount.toFixed(1)}%</span></div>
                          <div><QualityStars rating={supplier.qualityScore} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="lg:col-span-2 p-6">
                {selectedSupplier ? (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{selectedSupplier.name}</h2>
                        <p className="text-sm text-muted-foreground">{selectedSupplier.cnpj} {selectedSupplier.category && `• ${selectedSupplier.category}`}</p>
                      </div>
                      <QualityStars rating={selectedSupplier.qualityScore} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Total Gasto</p>
                        <p className="text-lg font-bold text-foreground">R$ {selectedSupplier.totalSpent.toLocaleString("pt-BR")}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Valor Médio</p>
                        <p className="text-lg font-bold text-foreground">R$ {selectedSupplier.averageOrderValue.toLocaleString("pt-BR")}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${selectedSupplier.onTimeRate >= 80 ? "bg-success/10" : "bg-warning/10"}`}>
                        <p className={`text-xs ${selectedSupplier.onTimeRate >= 80 ? "text-success" : "text-warning"}`}>Taxa SLA</p>
                        <p className={`text-lg font-bold ${selectedSupplier.onTimeRate >= 80 ? "text-success" : "text-warning"}`}>{selectedSupplier.onTimeRate}%</p>
                      </div>
                      <div className="p-3 rounded-lg bg-success/10">
                        <p className="text-xs text-success">Melhor Desconto</p>
                        <p className="text-lg font-bold text-success">{selectedSupplier.bestDiscount}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 text-purple-600 mb-2"><Package className="w-4 h-4" /><span className="text-xs font-medium">Produtos</span></div>
                        <p className="text-xl font-bold text-foreground">{selectedSupplier.productCount}</p>
                      </div>
                      <div className="p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 text-destructive mb-2"><XCircle className="w-4 h-4" /><span className="text-xs font-medium">Taxa Devolução</span></div>
                        <p className="text-xl font-bold text-foreground">{selectedSupplier.returnRate}%</p>
                      </div>
                      <div className="p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 text-info mb-2"><ShoppingCart className="w-4 h-4" /><span className="text-xs font-medium">Total Pedidos</span></div>
                        <p className="text-xl font-bold text-foreground">{selectedSupplier.totalOrders}</p>
                      </div>
                    </div>
                    {selectedSupplier.monthlyVolume.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Volume Mensal</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={selectedSupplier.monthlyVolume}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" name="Valor (R$)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />Histórico de Pedidos ({supplierPurchases.length})</h3>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <Table aria-label="Tabela de dados">
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="text-xs">Pedido</TableHead>
                              <TableHead className="text-xs">Produto</TableHead>
                              <TableHead className="text-xs text-right">Qtd</TableHead>
                              <TableHead className="text-xs text-right">Total</TableHead>
                              <TableHead className="text-xs text-right">Desconto</TableHead>
                              <TableHead className="text-xs">Entrega</TableHead>
                              <TableHead className="text-xs">Qualidade</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplierPurchases.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell className="text-xs font-medium">#{record.orderNumber}</TableCell>
                                <TableCell className="text-xs max-w-[150px] truncate">{record.productName}</TableCell>
                                <TableCell className="text-xs text-right">{record.quantity}</TableCell>
                                <TableCell className="text-xs text-right">R$ {record.totalPrice.toLocaleString("pt-BR")}</TableCell>
                                <TableCell className="text-xs text-right text-success">{record.discount}%</TableCell>
                                <TableCell className="text-xs">{record.status === "delivered" && <DeliveryBadge onTime={record.deliveredOnTime || false} />}</TableCell>
                                <TableCell className="text-xs">{(record.qualityRating || 0) > 0 && <QualityStars rating={record.qualityRating!} />}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <Building2 className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">Selecione um fornecedor para ver detalhes</p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* ── Analytics Tab ── */}
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
                      <SelectContent>
                        <SelectItem value="previousPeriod">Período Anterior</SelectItem>
                        <SelectItem value="lastYear">Mesmo Período Ano Passado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {comparisonEnabled && !dateRange?.from && (
                  <p className="text-xs text-warning">Selecione um período nos filtros avançados para habilitar comparação</p>
                )}
                {comparisonEnabled && getComparisonDateRange && (
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-primary" />
                      <span className="text-muted-foreground">Atual: {dateRange?.from && format(dateRange.from, "dd/MM/yy", { locale: ptBR })} - {dateRange?.to && format(dateRange.to, "dd/MM/yy", { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-muted-foreground/50" />
                      <span className="text-muted-foreground">Comparação: {format(getComparisonDateRange.from!, "dd/MM/yy", { locale: ptBR })} - {format(getComparisonDateRange.to!, "dd/MM/yy", { locale: ptBR })}</span>
                    </div>
                  </div>
                )}
              </div>

              {comparisonEnabled && chartData.compStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
                  {[
                    { label: "Volume Total", current: chartData.currentStats.totalSpent, comp: chartData.compStats.totalSpent, fmt: (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` },
                    { label: "Pedidos", current: chartData.currentStats.totalOrders, comp: chartData.compStats.totalOrders, fmt: (v: number) => String(v) },
                    { label: "Quantidade", current: chartData.currentStats.totalQuantity, comp: chartData.compStats.totalQuantity, fmt: (v: number) => v.toLocaleString("pt-BR") },
                    { label: "Desc. Médio", current: chartData.currentStats.avgDiscount, comp: chartData.compStats.avgDiscount, fmt: (v: number) => `${v.toFixed(1)}%` },
                  ].map((item) => {
                    const isUp = item.current >= item.comp;
                    const pctChange = item.comp > 0 ? ((item.current - item.comp) / item.comp) * 100 : 0;
                    return (
                      <div key={item.label} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold">{item.fmt(item.current)}</span>
                          {item.comp > 0 && (
                            <Badge variant={isUp ? "default" : "secondary"} className={`text-[10px] ${isUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                              {isUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                              {Math.abs(pctChange).toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">vs {item.fmt(item.comp)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Monthly Trend */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Tendência Mensal</h3>
                  <p className="text-xs text-muted-foreground mt-1">Volume e valor ao longo do tempo</p>
                </div>
              </div>
              {chartData.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.monthlyTrend} onClick={(e) => e?.activePayload && handleDrilldown("month", e.activePayload[0].payload)}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" name="Valor (R$)" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#areaGradient)" style={{ cursor: "pointer" }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Sem dados no período</div>
              )}
            </Card>

            {/* Price Forecast */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Previsão de Preços</h3>
                  <p className="text-xs text-muted-foreground mt-1">Regressão linear com projeção de 3 meses</p>
                </div>
                {chartData.forecastMetrics && (
                  <Badge variant="outline" className={cn("text-xs", chartData.forecastMetrics.confidence === "high" ? "bg-success/10 text-success" : chartData.forecastMetrics.confidence === "medium" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>
                    Confiança: {chartData.forecastMetrics.confidence === "high" ? "Alta" : chartData.forecastMetrics.confidence === "medium" ? "Média" : "Baixa"}
                  </Badge>
                )}
              </div>
              {chartData.priceForecast.length > 0 ? (
                <>
                  {chartData.forecastMetrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Preço Médio Atual</p>
                        <p className="text-lg font-bold text-foreground">R$ {chartData.forecastMetrics.avgPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Variação no Período</p>
                        <p className={`text-lg font-bold ${chartData.forecastMetrics.priceChange > 0 ? "text-destructive" : chartData.forecastMetrics.priceChange < 0 ? "text-success" : "text-foreground"}`}>
                          {chartData.forecastMetrics.priceChange > 0 ? "+" : ""}{chartData.forecastMetrics.priceChange.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10">
                        <p className="text-xs text-primary">Previsão Próx. Mês</p>
                        <p className="text-lg font-bold text-primary">R$ {chartData.forecastMetrics.nextMonthForecast.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10">
                        <p className="text-xs text-primary">Previsão 3 Meses</p>
                        <p className="text-lg font-bold text-primary">R$ {chartData.forecastMetrics.threeMonthForecast.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData.priceForecast}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$ ${v.toFixed(0)}`} domain={["auto", "auto"]} />
                      <Tooltip content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                            <p className="font-medium text-foreground">{label}</p>
                            {data.avgPrice !== null && <p className="text-sm text-success">Preço Real: R$ {data.avgPrice.toFixed(2)}</p>}
                            <p className="text-sm text-primary">{data.type === "forecast" ? "Previsão" : "Tendência"}: R$ {data.forecast.toFixed(2)}</p>
                            {data.type === "forecast" && <p className="text-xs text-muted-foreground mt-1">* Valor projetado</p>}
                          </div>
                        );
                      }} />
                      <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
                      <Line type="monotone" dataKey="avgPrice" name="Preço Real" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 5, fill: "hsl(142, 76%, 36%)" }} connectNulls={false} />
                      <Line type="monotone" dataKey="forecast" name="Tendência / Previsão" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5"
                        dot={(props: Record<string, unknown>) => {
                          const { cx, cy, payload } = props as { cx: number; cy: number; payload: { type: string } };
                          if (payload.type === "forecast") {
                            return <circle cx={cx} cy={cy} r={6} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2} />;
                          }
                          return <circle cx={cx} cy={cy} r={0} />;
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Dados insuficientes para previsão (mínimo 2 meses)</div>
              )}
            </Card>

            {/* Category and Supplier charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4"><Package className="w-4 h-4 text-purple-600" />Distribuição por Categoria</h3>
                {chartData.byCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData.byCategory} layout="vertical" onClick={(e) => e?.activePayload && handleDrilldown("category", e.activePayload[0].payload)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      {comparisonEnabled && <Bar dataKey="compValue" name="Comparação (R$)" fill="hsl(var(--muted-foreground))" fillOpacity={0.3} radius={[0, 4, 4, 0]} />}
                      <Bar dataKey="value" name="Atual (R$)" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }}>
                        {chartData.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Sem dados</div>}
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4"><Building2 className="w-4 h-4 text-warning" />Volume por Fornecedor</h3>
                {chartData.bySupplier.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData.bySupplier} layout="vertical" onClick={(e) => e?.activePayload && handleDrilldown("supplier", e.activePayload[0].payload)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="supplier" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      {comparisonEnabled && <Bar dataKey="compValue" name="Comparação (R$)" fill="hsl(var(--muted-foreground))" fillOpacity={0.3} radius={[0, 4, 4, 0]} />}
                      <Bar dataKey="value" name="Atual (R$)" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Sem dados</div>}
              </Card>
            </div>

            {/* Supplier Metrics Table */}
            <Card className="p-0">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground flex items-center gap-2"><Percent className="w-4 h-4 text-primary" />Métricas por Fornecedor</h3>
              </div>
              <div className="overflow-x-auto">
                <Table aria-label="Tabela de dados">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Fornecedor</TableHead>
                      <TableHead className="text-xs text-right">Pedidos</TableHead>
                      <TableHead className="text-xs text-right">Quantidade</TableHead>
                      <TableHead className="text-xs text-right">Volume (R$)</TableHead>
                      <TableHead className="text-xs text-right">Ticket Médio</TableHead>
                      <TableHead className="text-xs text-right">Desc. Médio</TableHead>
                      <TableHead className="text-xs">Participação</TableHead>
                    </TableRow>
                  </TableHeader>
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
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <Progress value={share} className="h-2 w-16" />
                              <span className="text-xs text-muted-foreground">{share.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* ── All Records Tab ── */}
          <TabsContent value="registros" className="space-y-4">
            <Card className="p-0">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Todos os Registros de Compra</h3>
                <p className="text-xs text-muted-foreground">
                  {filteredPurchaseRecords.length} registros {hasActiveFilters && `(filtrado de ${purchaseRecords.length})`}
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table aria-label="Tabela de dados">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Pedido</TableHead>
                      <TableHead className="text-xs">Produto</TableHead>
                      <TableHead className="text-xs">Fornecedor</TableHead>
                      <TableHead className="text-xs text-right">Qtd</TableHead>
                      <TableHead className="text-xs text-right">Preço Unit.</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                      <TableHead className="text-xs text-right">Desconto</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Entrega</TableHead>
                      <TableHead className="text-xs">Qualidade</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchaseRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground text-sm">Nenhum registro encontrado</TableCell>
                      </TableRow>
                    ) : filteredPurchaseRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-xs font-medium">#{record.orderNumber}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{record.productName}</TableCell>
                        <TableCell className="text-xs">{record.supplierName}</TableCell>
                        <TableCell className="text-xs text-right">{record.quantity}</TableCell>
                        <TableCell className="text-xs text-right">R$ {record.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right font-medium">R$ {record.totalPrice.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-xs text-right text-success">{record.discount}%</TableCell>
                        <TableCell className="text-xs">{format(parseISO(record.purchaseDate), "dd/MM/yy", { locale: ptBR })}</TableCell>
                        <TableCell className="text-xs">{record.status === "delivered" && <DeliveryBadge onTime={record.deliveredOnTime || false} />}</TableCell>
                        <TableCell className="text-xs">{(record.qualityRating || 0) > 0 && <QualityStars rating={record.qualityRating!} />}</TableCell>
                        <TableCell className="text-xs"><StatusBadge status={record.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Drill-down Dialog */}
        <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
          <DialogContent aria-describedby="dialog-desc" className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Detalhamento: {drilldownType === "month" ? drilldownData?.month : drilldownType === "category" ? drilldownData?.category : drilldownData?.supplier}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Registros</p>
                  <p className="text-lg font-bold">{drilldownRecords.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Volume Total</p>
                  <p className="text-lg font-bold">R$ {drilldownRecords.reduce((s, r) => s + r.totalPrice, 0).toLocaleString("pt-BR")}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Quantidade</p>
                  <p className="text-lg font-bold">{drilldownRecords.reduce((s, r) => s + r.quantity, 0).toLocaleString("pt-BR")}</p>
                </div>
              </div>
              <Table aria-label="Tabela de dados">
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Pedido</TableHead>
                    <TableHead className="text-xs">Produto</TableHead>
                    <TableHead className="text-xs">Fornecedor</TableHead>
                    <TableHead className="text-xs text-right">Qtd</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drilldownRecords.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-medium">#{r.orderNumber}</TableCell>
                      <TableCell className="text-xs">{r.productName}</TableCell>
                      <TableCell className="text-xs">{r.supplierName}</TableCell>
                      <TableCell className="text-xs text-right">{r.quantity}</TableCell>
                      <TableCell className="text-xs text-right">R$ {r.totalPrice.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-xs"><StatusBadge status={r.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default HistoricoCompras;
