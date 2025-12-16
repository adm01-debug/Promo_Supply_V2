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
  RefreshCw
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
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

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

  // Summary stats
  const summaryStats = useMemo(() => ({
    totalProducts: productsHistory.length,
    totalSuppliers: suppliersHistory.length,
    totalOrders: purchaseRecords.length,
    totalSpent: purchaseRecords.reduce((sum, r) => sum + r.totalPrice, 0),
    avgDiscount: purchaseRecords.reduce((sum, r) => sum + r.discount, 0) / purchaseRecords.length,
    onTimeRate: (purchaseRecords.filter(r => r.deliveredOnTime && r.status === 'delivered').length /
      purchaseRecords.filter(r => r.status === 'delivered').length) * 100
  }), []);

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
            <TabsList className="grid w-full sm:w-auto grid-cols-3">
              <TabsTrigger value="produtos" className="gap-2">
                <Package className="w-4 h-4" />
                Produtos
              </TabsTrigger>
              <TabsTrigger value="fornecedores" className="gap-2">
                <Building2 className="w-4 h-4" />
                Fornecedores
              </TabsTrigger>
              <TabsTrigger value="registros" className="gap-2">
                <FileText className="w-4 h-4" />
                Registros
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              {activeTab === 'produtos' && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {productCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

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

          {/* All Records Tab */}
          <TabsContent value="registros" className="space-y-4">
            <Card className="p-0">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Todos os Registros de Compra</h3>
                <p className="text-xs text-muted-foreground">{purchaseRecords.length} registros • Vinculados ao Bitrix24 (Mock)</p>
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
                    {purchaseRecords.map(record => (
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
      </div>
    </MainLayout>
  );
};

export default HistoricoCompras;
