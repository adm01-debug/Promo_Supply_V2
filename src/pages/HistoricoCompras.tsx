import { useState, useMemo } from "react";
import {
  Package,
  Building2,
  TrendingUp,
  TrendingDown,
  Search,
  Calendar,
  Filter,
  Star,
  Clock,
  Truck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DollarSign,
  BarChart3,
  FileText,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Percent,
  RefreshCw,
  X,
  SlidersHorizontal
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Separator } from "@/components/ui/separator";
import { MainLayout } from "@/components/compras/MainLayout";
import {
  purchaseRecords,
  productsHistory,
  suppliersHistory,
  productCategories,
  ProductHistory,
  SupplierHistory,
  PurchaseRecord
} from "@/data/purchaseHistoryData";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(221, 83%, 53%)', 'hsl(262, 83%, 58%)', 'hsl(38, 92%, 50%)'];

const QualityStars = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3 h-3 ${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground/30'}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">({rating.toFixed(1)})</span>
    </div>
  );
};

const DeliveryBadge = ({ onTime }: { onTime: boolean }) => (
  <Badge variant={onTime ? "default" : "secondary"} className={`text-xs ${onTime ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'}`}>
    {onTime ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
    {onTime ? 'No prazo' : 'Atrasado'}
  </Badge>
);

const StatusBadge = ({ status }: { status: PurchaseRecord['status'] }) => {
  const config = {
    pending: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    shipped: { label: 'Enviado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    delivered: { label: 'Entregue', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    returned: { label: 'Devolvido', color: 'bg-red-500/10 text-red-600 border-red-500/20' }
  };
  return <Badge variant="outline" className={`text-xs ${config[status].color}`}>{config[status].label}</Badge>;
};

const HistoricoCompras = () => {
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
  const [drilldownType, setDrilldownType] = useState<'month' | 'category' | 'supplier' | null>(null);
  const [drilldownData, setDrilldownData] = useState<any>(null);

  // Handle chart drill-down
  const handleDrilldown = (type: 'month' | 'category' | 'supplier', data: any) => {
    setDrilldownType(type);
    setDrilldownData(data);
    setDrilldownOpen(true);
  };

  // Period presets
  const applyPeriodPreset = (preset: string) => {
    setPeriodPreset(preset);
    const today = new Date();
    switch (preset) {
      case "7d":
        setDateRange({ from: subDays(today, 7), to: today });
        break;
      case "30d":
        setDateRange({ from: subDays(today, 30), to: today });
        break;
      case "90d":
        setDateRange({ from: subDays(today, 90), to: today });
        break;
      case "thisMonth":
        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
        break;
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
      case "all":
      default:
        setDateRange(undefined);
        break;
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setDateRange(undefined);
    setPeriodPreset("all");
  };

  const hasActiveFilters = searchTerm || categoryFilter !== "all" || statusFilter !== "all" || dateRange;

  // Filter purchase records based on all filters
  const filteredPurchaseRecords = useMemo(() => {
    return purchaseRecords.filter(record => {
      const matchesSearch = record.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.orderNumber.includes(searchTerm);
      
      const matchesCategory = categoryFilter === 'all' || record.productCategory === categoryFilter;
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      
      let matchesDate = true;
      if (dateRange?.from) {
        const purchaseDate = parseISO(record.purchaseDate);
        matchesDate = isWithinInterval(purchaseDate, {
          start: dateRange.from,
          end: dateRange.to || dateRange.from
        });
      }
      
      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    });
  }, [searchTerm, categoryFilter, statusFilter, dateRange]);

  // Get records for drill-down
  const drilldownRecords = useMemo(() => {
    if (!drilldownData || !drilldownType) return [];
    
    return filteredPurchaseRecords.filter(record => {
      if (drilldownType === 'month') {
        const recordMonth = format(parseISO(record.purchaseDate), 'MMM/yy', { locale: ptBR });
        return recordMonth === drilldownData.month;
      }
      if (drilldownType === 'category') {
        return record.productCategory === drilldownData.category;
      }
      if (drilldownType === 'supplier') {
        return record.supplierName === drilldownData.supplier;
      }
      return false;
    });
  }, [drilldownData, drilldownType, filteredPurchaseRecords]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return productsHistory.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, categoryFilter]);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliersHistory.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cnpj.includes(searchTerm)
    );
  }, [searchTerm]);

  // Get selected product details
  const selectedProduct = useMemo(() =>
    productsHistory.find(p => p.id === selectedProductId),
    [selectedProductId]
  );

  // Get purchase records for selected product
  const productPurchases = useMemo(() =>
    purchaseRecords.filter(r => r.productId === selectedProductId),
    [selectedProductId]
  );

  // Get selected supplier details
  const selectedSupplier = useMemo(() =>
    suppliersHistory.find(s => s.id === selectedSupplierId),
    [selectedSupplierId]
  );

  // Get purchase records for selected supplier
  const supplierPurchases = useMemo(() =>
    purchaseRecords.filter(r => r.supplierId === selectedSupplierId),
    [selectedSupplierId]
  );

  // Summary stats based on filtered data
  const summaryStats = useMemo(() => {
    const records = filteredPurchaseRecords;
    const deliveredRecords = records.filter(r => r.status === 'delivered');
    return {
      totalProducts: new Set(records.map(r => r.productId)).size,
      totalSuppliers: new Set(records.map(r => r.supplierId)).size,
      totalOrders: records.length,
      totalSpent: records.reduce((sum, r) => sum + r.totalPrice, 0),
      avgDiscount: records.length > 0 ? records.reduce((sum, r) => sum + r.discount, 0) / records.length : 0,
      onTimeRate: deliveredRecords.length > 0 
        ? (deliveredRecords.filter(r => r.deliveredOnTime).length / deliveredRecords.length) * 100 
        : 0
    };
  }, [filteredPurchaseRecords]);

  // Chart data for comparative analysis
  const chartData = useMemo(() => {
    // Group records by month
    const monthlyData: Record<string, { month: string; value: number; quantity: number; orders: number; avgPrice: number }> = {};
    
    filteredPurchaseRecords.forEach(record => {
      const monthKey = format(parseISO(record.purchaseDate), 'yyyy-MM');
      const monthLabel = format(parseISO(record.purchaseDate), 'MMM/yy', { locale: ptBR });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, value: 0, quantity: 0, orders: 0, avgPrice: 0 };
      }
      monthlyData[monthKey].value += record.totalPrice;
      monthlyData[monthKey].quantity += record.quantity;
      monthlyData[monthKey].orders += 1;
    });

    // Calculate average price per month
    Object.keys(monthlyData).forEach(key => {
      monthlyData[key].avgPrice = monthlyData[key].quantity > 0 
        ? monthlyData[key].value / monthlyData[key].quantity 
        : 0;
    });

    const monthlyTrend = Object.keys(monthlyData)
      .sort()
      .map(key => monthlyData[key]);

    // Group by category
    const categoryData: Record<string, { category: string; value: number; quantity: number; orders: number }> = {};
    
    filteredPurchaseRecords.forEach(record => {
      if (!categoryData[record.productCategory]) {
        categoryData[record.productCategory] = { category: record.productCategory, value: 0, quantity: 0, orders: 0 };
      }
      categoryData[record.productCategory].value += record.totalPrice;
      categoryData[record.productCategory].quantity += record.quantity;
      categoryData[record.productCategory].orders += 1;
    });

    const byCategory = Object.values(categoryData).sort((a, b) => b.value - a.value);

    // Group by supplier
    const supplierData: Record<string, { supplier: string; value: number; quantity: number; orders: number; avgDiscount: number; discountSum: number }> = {};
    
    filteredPurchaseRecords.forEach(record => {
      if (!supplierData[record.supplierId]) {
        supplierData[record.supplierId] = { 
          supplier: record.supplierName, 
          value: 0, 
          quantity: 0, 
          orders: 0, 
          avgDiscount: 0,
          discountSum: 0 
        };
      }
      supplierData[record.supplierId].value += record.totalPrice;
      supplierData[record.supplierId].quantity += record.quantity;
      supplierData[record.supplierId].orders += 1;
      supplierData[record.supplierId].discountSum += record.discount;
    });

    Object.keys(supplierData).forEach(key => {
      supplierData[key].avgDiscount = supplierData[key].orders > 0 
        ? supplierData[key].discountSum / supplierData[key].orders 
        : 0;
    });

    const bySupplier = Object.values(supplierData).sort((a, b) => b.value - a.value);

    // Price evolution by product
    const priceByProduct: Record<string, { product: string; prices: { date: string; price: number }[] }> = {};
    
    filteredPurchaseRecords.forEach(record => {
      if (!priceByProduct[record.productId]) {
        priceByProduct[record.productId] = { product: record.productName, prices: [] };
      }
      priceByProduct[record.productId].prices.push({
        date: format(parseISO(record.purchaseDate), 'dd/MM'),
        price: record.unitPrice
      });
    });

    return { monthlyTrend, byCategory, bySupplier, priceByProduct };
  }, [filteredPurchaseRecords]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('R$') || entry.name.includes('Preço') || entry.name.includes('Valor')
                ? `R$ ${entry.value.toLocaleString('pt-BR')}`
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

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
              Análise de compras por produto e fornecedor • Integração Bitrix24 (Mock)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              <RefreshCw className="w-3 h-3 mr-1" />
              Dados Mockados
            </Badge>
            <Button variant="outline" size="sm" disabled>
              <ExternalLink className="w-4 h-4 mr-2" />
              Sincronizar Bitrix24
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
            <p className="text-2xl font-bold">{summaryStats.totalProducts}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-medium">Fornecedores</span>
            </div>
            <p className="text-2xl font-bold">{summaryStats.totalSuppliers}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs font-medium">Pedidos</span>
            </div>
            <p className="text-2xl font-bold">{summaryStats.totalOrders}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Total Gasto</span>
            </div>
            <p className="text-xl font-bold">R$ {summaryStats.totalSpent.toLocaleString('pt-BR')}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Percent className="w-4 h-4" />
              <span className="text-xs font-medium">Desconto Médio</span>
            </div>
            <p className="text-2xl font-bold">{summaryStats.avgDiscount.toFixed(1)}%</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Truck className="w-4 h-4" />
              <span className="text-xs font-medium">No Prazo</span>
            </div>
            <p className="text-2xl font-bold">{summaryStats.onTimeRate.toFixed(0)}%</p>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-4">
              <TabsTrigger value="produtos" className="gap-2">
                <Package className="w-4 h-4" />
                Produtos
              </TabsTrigger>
              <TabsTrigger value="fornecedores" className="gap-2">
                <Building2 className="w-4 h-4" />
                Fornecedores
              </TabsTrigger>
              <TabsTrigger value="analises" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Análises
              </TabsTrigger>
              <TabsTrigger value="registros" className="gap-2">
                <FileText className="w-4 h-4" />
                Registros
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[180px]"
                />
              </div>
              <Button 
                variant={showAdvancedFilters ? "secondary" : "outline"} 
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtros
                {hasActiveFilters && (
                  <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {[categoryFilter !== 'all', statusFilter !== 'all', !!dateRange].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-muted-foreground">
                  <X className="w-3 h-3" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <Card className="p-4">
              <div className="flex flex-wrap gap-4">
                {/* Period Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Período</label>
                  <div className="flex items-center gap-2">
                    <Select value={periodPreset} onValueChange={applyPeriodPreset}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
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
                        <Button variant="outline" size="sm" className={cn(
                          "w-[220px] justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                        )}>
                          <Calendar className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                                {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                              </>
                            ) : (
                              format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                            )
                          ) : (
                            <span>Período personalizado</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange?.from}
                          selected={dateRange}
                          onSelect={(range) => {
                            setDateRange(range);
                            setPeriodPreset("custom");
                          }}
                          numberOfMonths={2}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Category Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {productCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
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

              {/* Active Filters Summary */}
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
                  {categoryFilter !== 'all' && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {categoryFilter}
                      <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setCategoryFilter("all")} />
                    </Badge>
                  )}
                  {statusFilter !== 'all' && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {statusFilter === 'pending' ? 'Pendente' : statusFilter === 'shipped' ? 'Enviado' : statusFilter === 'delivered' ? 'Entregue' : 'Devolvido'}
                      <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setStatusFilter("all")} />
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {filteredPurchaseRecords.length} registros encontrados
                  </span>
                </div>
              )}
            </Card>
          )}

          {/* Products Tab */}
          <TabsContent value="produtos" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product List */}
              <Card className="lg:col-span-1 p-0">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Lista de Produtos</h3>
                  <p className="text-xs text-muted-foreground">{filteredProducts.length} produtos encontrados</p>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="divide-y divide-border">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${selectedProductId === product.id ? 'bg-accent' : ''}`}
                        onClick={() => setSelectedProductId(product.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-xs">{product.category}</Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Compras:</span>
                            <span className="ml-1 font-medium">{product.totalPurchases}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Qtd:</span>
                            <span className="ml-1 font-medium">{product.totalQuantity}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Preço médio:</span>
                            <span className="ml-1 font-medium">R$ {product.averagePrice.toFixed(2)}</span>
                          </div>
                          <div>
                            <QualityStars rating={product.qualityAvg} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              {/* Product Details */}
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

                    {/* Product Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Total Gasto</p>
                        <p className="text-lg font-bold text-foreground">R$ {selectedProduct.totalSpent.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Preço Médio</p>
                        <p className="text-lg font-bold text-foreground">R$ {selectedProduct.averagePrice.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-500/10">
                        <p className="text-xs text-green-600">Menor Preço</p>
                        <p className="text-lg font-bold text-green-600">R$ {selectedProduct.lowestPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/10">
                        <p className="text-xs text-red-600">Maior Preço</p>
                        <p className="text-lg font-bold text-red-600">R$ {selectedProduct.highestPrice.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Price History Chart */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Evolução de Preços
                      </h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={selectedProduct.priceHistory}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="price" name="Preço" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Purchase Records for Product */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Histórico de Compras ({productPurchases.length})
                      </h3>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <Table>
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
                            {productPurchases.map(record => (
                              <TableRow key={record.id}>
                                <TableCell className="text-xs font-medium">#{record.orderNumber}</TableCell>
                                <TableCell className="text-xs">{record.supplierName}</TableCell>
                                <TableCell className="text-xs text-right">{record.quantity}</TableCell>
                                <TableCell className="text-xs text-right">R$ {record.unitPrice.toFixed(2)}</TableCell>
                                <TableCell className="text-xs text-right text-green-600">{record.discount}%</TableCell>
                                <TableCell className="text-xs">
                                  {record.status === 'delivered' && <DeliveryBadge onTime={record.deliveredOnTime} />}
                                </TableCell>
                                <TableCell className="text-xs">
                                  <StatusBadge status={record.status} />
                                </TableCell>
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

          {/* Suppliers Tab */}
          <TabsContent value="fornecedores" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Supplier List */}
              <Card className="lg:col-span-1 p-0">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Lista de Fornecedores</h3>
                  <p className="text-xs text-muted-foreground">{filteredSuppliers.length} fornecedores</p>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="divide-y divide-border">
                    {filteredSuppliers.map(supplier => (
                      <div
                        key={supplier.id}
                        className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${selectedSupplierId === supplier.id ? 'bg-accent' : ''}`}
                        onClick={() => setSelectedSupplierId(supplier.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{supplier.name}</p>
                            <p className="text-xs text-muted-foreground">{supplier.cnpj}</p>
                          </div>
                          <Badge variant={supplier.onTimeDeliveryRate >= 80 ? "default" : "secondary"} className={`shrink-0 text-xs ${supplier.onTimeDeliveryRate >= 80 ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                            {supplier.onTimeDeliveryRate}% SLA
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Pedidos:</span>
                            <span className="ml-1 font-medium">{supplier.totalOrders}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <span className="ml-1 font-medium">R$ {supplier.totalSpent.toLocaleString('pt-BR')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Desconto médio:</span>
                            <span className="ml-1 font-medium text-green-600">{supplier.averageDiscount.toFixed(1)}%</span>
                          </div>
                          <div>
                            <QualityStars rating={supplier.qualityRating} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              {/* Supplier Details */}
              <Card className="lg:col-span-2 p-6">
                {selectedSupplier ? (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{selectedSupplier.name}</h2>
                        <p className="text-sm text-muted-foreground">{selectedSupplier.cnpj} • {selectedSupplier.category}</p>
                      </div>
                      <QualityStars rating={selectedSupplier.qualityRating} />
                    </div>

                    {/* Supplier Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Total Gasto</p>
                        <p className="text-lg font-bold text-foreground">R$ {selectedSupplier.totalSpent.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Valor Médio</p>
                        <p className="text-lg font-bold text-foreground">R$ {selectedSupplier.averageOrderValue.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${selectedSupplier.onTimeDeliveryRate >= 80 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                        <p className={`text-xs ${selectedSupplier.onTimeDeliveryRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>Taxa SLA</p>
                        <p className={`text-lg font-bold ${selectedSupplier.onTimeDeliveryRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>{selectedSupplier.onTimeDeliveryRate}%</p>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-500/10">
                        <p className="text-xs text-emerald-600">Melhor Desconto</p>
                        <p className="text-lg font-bold text-emerald-600">{selectedSupplier.bestDiscount}%</p>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 text-blue-600 mb-2">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs font-medium">Tempo Médio Entrega</span>
                        </div>
                        <p className="text-xl font-bold text-foreground">{selectedSupplier.averageDeliveryDays} dias</p>
                      </div>
                      <div className="p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 text-purple-600 mb-2">
                          <Package className="w-4 h-4" />
                          <span className="text-xs font-medium">Produtos</span>
                        </div>
                        <p className="text-xl font-bold text-foreground">{selectedSupplier.productCount}</p>
                      </div>
                      <div className="p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                          <XCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Taxa Devolução</span>
                        </div>
                        <p className="text-xl font-bold text-foreground">{selectedSupplier.returnRate}%</p>
                      </div>
                    </div>

                    {/* Monthly Volume Chart */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        Volume Mensal
                      </h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={selectedSupplier.monthlyVolume}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" name="Valor (R$)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Purchase Records for Supplier */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Histórico de Pedidos ({supplierPurchases.length})
                      </h3>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <Table>
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
                            {supplierPurchases.map(record => (
                              <TableRow key={record.id}>
                                <TableCell className="text-xs font-medium">#{record.orderNumber}</TableCell>
                                <TableCell className="text-xs max-w-[150px] truncate">{record.productName}</TableCell>
                                <TableCell className="text-xs text-right">{record.quantity}</TableCell>
                                <TableCell className="text-xs text-right">R$ {record.totalPrice.toLocaleString('pt-BR')}</TableCell>
                                <TableCell className="text-xs text-right text-green-600">{record.discount}%</TableCell>
                                <TableCell className="text-xs">
                                  {record.status === 'delivered' && <DeliveryBadge onTime={record.deliveredOnTime} />}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {record.qualityRating > 0 && <QualityStars rating={record.qualityRating} />}
                                </TableCell>
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

          {/* Analytics Tab */}
          <TabsContent value="analises" className="space-y-6">
            {/* Monthly Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Volume por Mês */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      Volume Financeiro por Período
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Clique nas barras para ver detalhes</p>
                  </div>
                </div>
                {chartData.monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData.monthlyTrend} onClick={(e) => e?.activePayload && handleDrilldown('month', e.activePayload[0].payload)}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                        tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        name="Valor (R$)" 
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        strokeWidth={2}
                        style={{ cursor: 'pointer' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                    <p className="text-sm">Sem dados para o período selecionado</p>
                  </div>
                )}
              </Card>

              {/* Quantidade por Mês */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                      Volume de Itens por Período
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Clique nas barras para ver detalhes</p>
                  </div>
                </div>
                {chartData.monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData.monthlyTrend} onClick={(e) => e?.activePayload && handleDrilldown('month', e.activePayload[0].payload)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="quantity" 
                        name="Quantidade" 
                        fill="hsl(221, 83%, 53%)" 
                        radius={[4, 4, 0, 0]}
                        style={{ cursor: 'pointer' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                    <p className="text-sm">Sem dados para o período selecionado</p>
                  </div>
                )}
              </Card>
            </div>

            {/* Price Evolution */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Evolução do Preço Médio
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Clique nos pontos para ver detalhes do mês</p>
                </div>
              </div>
              {chartData.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData.monthlyTrend} onClick={(e) => e?.activePayload && handleDrilldown('month', e.activePayload[0].payload)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                      tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="avgPrice" 
                      name="Preço Médio (R$)" 
                      stroke="hsl(142, 76%, 36%)" 
                      strokeWidth={2}
                      dot={{ r: 4, fill: 'hsl(142, 76%, 36%)', cursor: 'pointer' }}
                      style={{ cursor: 'pointer' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                  <p className="text-sm">Sem dados para o período selecionado</p>
                </div>
              )}
            </Card>

            {/* Category and Supplier Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Por Categoria */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      Distribuição por Categoria
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Clique nas barras para ver detalhes</p>
                  </div>
                </div>
                {chartData.byCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData.byCategory} layout="vertical" onClick={(e) => e?.activePayload && handleDrilldown('category', e.activePayload[0].payload)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        type="number" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                        tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="category" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                        width={100}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Valor (R$)" radius={[0, 4, 4, 0]} style={{ cursor: 'pointer' }}>
                        {chartData.byCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                    <p className="text-sm">Sem dados para o período selecionado</p>
                  </div>
                )}
              </Card>

              {/* Por Fornecedor */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-600" />
                      Volume por Fornecedor
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Clique nas barras para ver detalhes</p>
                  </div>
                </div>
                {chartData.bySupplier.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData.bySupplier} layout="vertical" onClick={(e) => e?.activePayload && handleDrilldown('supplier', e.activePayload[0].payload)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        type="number" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                        tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="supplier" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                        width={100}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Valor (R$)" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} style={{ cursor: 'pointer' }} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                    <p className="text-sm">Sem dados para o período selecionado</p>
                  </div>
                )}
              </Card>
            </div>

            {/* Supplier Metrics Table */}
            <Card className="p-0">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Percent className="w-4 h-4 text-primary" />
                  Métricas Comparativas por Fornecedor
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Análise detalhada de performance</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Fornecedor</TableHead>
                      <TableHead className="text-xs text-right">Pedidos</TableHead>
                      <TableHead className="text-xs text-right">Quantidade</TableHead>
                      <TableHead className="text-xs text-right">Volume (R$)</TableHead>
                      <TableHead className="text-xs text-right">Ticket Médio</TableHead>
                      <TableHead className="text-xs text-right">Desconto Médio</TableHead>
                      <TableHead className="text-xs">Participação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartData.bySupplier.map((supplier, idx) => {
                      const totalValue = chartData.bySupplier.reduce((sum, s) => sum + s.value, 0);
                      const share = totalValue > 0 ? (supplier.value / totalValue) * 100 : 0;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-sm font-medium">{supplier.supplier}</TableCell>
                          <TableCell className="text-sm text-right">{supplier.orders}</TableCell>
                          <TableCell className="text-sm text-right">{supplier.quantity.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-sm text-right font-medium">R$ {supplier.value.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-sm text-right">R$ {(supplier.value / supplier.orders).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</TableCell>
                          <TableCell className="text-sm text-right text-green-600">{supplier.avgDiscount.toFixed(1)}%</TableCell>
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

          {/* All Records Tab */}
          <TabsContent value="registros" className="space-y-4">
            <Card className="p-0">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Todos os Registros de Compra</h3>
                <p className="text-xs text-muted-foreground">
                  {filteredPurchaseRecords.length} registros {hasActiveFilters && `(filtrado de ${purchaseRecords.length})`} • Vinculados ao Bitrix24 (Mock)
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Pedido</TableHead>
                      <TableHead className="text-xs">Bitrix ID</TableHead>
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
                    {filteredPurchaseRecords.map(record => (
                      <TableRow key={record.id}>
                        <TableCell className="text-xs font-medium">#{record.orderNumber}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px] bg-blue-500/5 text-blue-600">
                            {record.bitrixDealId}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{record.productName}</TableCell>
                        <TableCell className="text-xs">{record.supplierName}</TableCell>
                        <TableCell className="text-xs text-right">{record.quantity}</TableCell>
                        <TableCell className="text-xs text-right">R$ {record.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right font-medium">R$ {record.totalPrice.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-xs text-right text-green-600">{record.discount}%</TableCell>
                        <TableCell className="text-xs">{new Date(record.purchaseDate).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-xs">
                          {record.status === 'delivered' && <DeliveryBadge onTime={record.deliveredOnTime} />}
                        </TableCell>
                        <TableCell className="text-xs">
                          {record.qualityRating > 0 ? <QualityStars rating={record.qualityRating} /> : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <StatusBadge status={record.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Drill-down Modal */}
        <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {drilldownType === 'month' && <Calendar className="w-5 h-5 text-primary" />}
                {drilldownType === 'category' && <Package className="w-5 h-5 text-purple-600" />}
                {drilldownType === 'supplier' && <Building2 className="w-5 h-5 text-amber-600" />}
                Detalhes: {drilldownType === 'month' && drilldownData?.month}
                {drilldownType === 'category' && drilldownData?.category}
                {drilldownType === 'supplier' && drilldownData?.supplier}
              </DialogTitle>
            </DialogHeader>
            
            {drilldownData && (
              <div className="flex-1 overflow-hidden flex flex-col gap-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold text-foreground">
                      R$ {drilldownRecords.reduce((sum, r) => sum + r.totalPrice, 0).toLocaleString('pt-BR')}
                    </p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Pedidos</p>
                    <p className="text-lg font-bold text-foreground">{drilldownRecords.length}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Quantidade</p>
                    <p className="text-lg font-bold text-foreground">
                      {drilldownRecords.reduce((sum, r) => sum + r.quantity, 0).toLocaleString('pt-BR')}
                    </p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Desconto Médio</p>
                    <p className="text-lg font-bold text-green-600">
                      {drilldownRecords.length > 0 
                        ? (drilldownRecords.reduce((sum, r) => sum + r.discount, 0) / drilldownRecords.length).toFixed(1)
                        : 0}%
                    </p>
                  </Card>
                </div>

                {/* Records Table */}
                <div className="flex-1 overflow-hidden border border-border rounded-lg">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs sticky top-0 bg-muted/30">Pedido</TableHead>
                          <TableHead className="text-xs sticky top-0 bg-muted/30">Bitrix ID</TableHead>
                          <TableHead className="text-xs sticky top-0 bg-muted/30">Produto</TableHead>
                          <TableHead className="text-xs sticky top-0 bg-muted/30">Fornecedor</TableHead>
                          <TableHead className="text-xs text-right sticky top-0 bg-muted/30">Qtd</TableHead>
                          <TableHead className="text-xs text-right sticky top-0 bg-muted/30">Preço Unit.</TableHead>
                          <TableHead className="text-xs text-right sticky top-0 bg-muted/30">Total</TableHead>
                          <TableHead className="text-xs text-right sticky top-0 bg-muted/30">Desc.</TableHead>
                          <TableHead className="text-xs sticky top-0 bg-muted/30">Data</TableHead>
                          <TableHead className="text-xs sticky top-0 bg-muted/30">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drilldownRecords.map(record => (
                          <TableRow key={record.id}>
                            <TableCell className="text-xs font-medium">#{record.orderNumber}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="text-[10px] bg-blue-500/5 text-blue-600">
                                {record.bitrixDealId}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate">{record.productName}</TableCell>
                            <TableCell className="text-xs">{record.supplierName}</TableCell>
                            <TableCell className="text-xs text-right">{record.quantity}</TableCell>
                            <TableCell className="text-xs text-right">R$ {record.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-xs text-right font-medium">R$ {record.totalPrice.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="text-xs text-right text-green-600">{record.discount}%</TableCell>
                            <TableCell className="text-xs">{new Date(record.purchaseDate).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell className="text-xs">
                              <StatusBadge status={record.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default HistoricoCompras;
