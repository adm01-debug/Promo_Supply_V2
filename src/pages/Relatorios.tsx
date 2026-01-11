import { useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Package,
  Building2,
  Calendar,
  Download,
  Filter,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Scale,
  Check,
  Clock,
  Boxes
} from "lucide-react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { SLABySupplierAnalysis } from "@/components/compras/SLABySupplierAnalysis";
import { AdvancedProcurementKPIs } from "@/components/compras/AdvancedProcurementKPIs";
import { DemandPredictionPanel } from "@/components/compras/DemandPredictionPanel";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
  TooltipProps
} from "recharts";
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { solicitacoesMock, fornecedoresMock } from "@/data/mockData";

// Dados mock para gráficos
const volumeMensal = [
  { mes: "Jul", volume: 45000, pedidos: 28 },
  { mes: "Ago", volume: 52000, pedidos: 35 },
  { mes: "Set", volume: 48000, pedidos: 31 },
  { mes: "Out", volume: 61000, pedidos: 42 },
  { mes: "Nov", volume: 78000, pedidos: 56 },
  { mes: "Dez", volume: 92000, pedidos: 68 },
];

const economiaGerada = [
  { mes: "Jul", economia: 3200, percentual: 6.8 },
  { mes: "Ago", economia: 4100, percentual: 7.3 },
  { mes: "Set", economia: 3800, percentual: 7.1 },
  { mes: "Out", economia: 5200, percentual: 7.9 },
  { mes: "Nov", economia: 6800, percentual: 8.2 },
  { mes: "Dez", economia: 8500, percentual: 8.5 },
];

const distribuicaoTipo = [
  { name: "P.E. Liso", value: 45, color: "#3b82f6" },
  { name: "Fab. Liso", value: 30, color: "#8b5cf6" },
  { name: "Fab. Personalizado", value: 25, color: "#10b981" },
];

const distribuicaoStatus = [
  { name: "Entregue", value: 156, color: "#10b981" },
  { name: "Em Trânsito", value: 12, color: "#8b5cf6" },
  { name: "Pagamento", value: 8, color: "#f59e0b" },
  { name: "Cotação", value: 15, color: "#3b82f6" },
];

const performanceFornecedores = [
  { 
    nome: "XBZ Brindes", 
    pedidos: 42, 
    volumeTotal: 128500, 
    prazoMedio: 2.1,
    taxaEntrega: 98,
    rating: 5,
    economia: 12500
  },
  { 
    nome: "Tech Brindes", 
    pedidos: 35, 
    volumeTotal: 98000, 
    prazoMedio: 2.4,
    taxaEntrega: 96,
    rating: 4,
    economia: 8200
  },
  { 
    nome: "Stricker / Spot Gifts", 
    pedidos: 31, 
    volumeTotal: 76500, 
    prazoMedio: 2.8,
    taxaEntrega: 97,
    rating: 4,
    economia: 6800
  },
  { 
    nome: "Premium Gifts", 
    pedidos: 28, 
    volumeTotal: 89000, 
    prazoMedio: 3.2,
    taxaEntrega: 99,
    rating: 5,
    economia: 9100
  },
  { 
    nome: "Asia Import", 
    pedidos: 26, 
    volumeTotal: 54000, 
    prazoMedio: 4.5,
    taxaEntrega: 94,
    rating: 4,
    economia: 5400
  },
  { 
    nome: "Eco Brindes", 
    pedidos: 22, 
    volumeTotal: 42000, 
    prazoMedio: 3.8,
    taxaEntrega: 95,
    rating: 5,
    economia: 4200
  },
];

const topProdutos = [
  { produto: "Mochila Executiva", quantidade: 2500, valor: 125000 },
  { produto: "Caneta Metal", quantidade: 8500, valor: 42500 },
  { produto: "Squeeze 500ml", quantidade: 4200, valor: 50400 },
  { produto: "Carregador Portátil", quantidade: 1200, valor: 66000 },
  { produto: "Caderno A5", quantidade: 3500, valor: 52500 },
];

// Comparativo de preços entre fornecedores
const comparativoPrecos = [
  {
    produto: "Mochila Executiva",
    categoria: "Bolsas",
    fornecedores: [
      { nome: "XBZ Brindes", preco: 45.00, prazo: 2, estoque: 1500, melhorPreco: true },
      { nome: "Asia Import", preco: 48.50, prazo: 5, estoque: 800, melhorPreco: false },
      { nome: "Só Marcas", preco: 52.00, prazo: 3, estoque: 1200, melhorPreco: false },
    ]
  },
  {
    produto: "Caneta Metal Premium",
    categoria: "Escritório",
    fornecedores: [
      { nome: "Stricker / Spot Gifts", preco: 4.50, prazo: 3, estoque: 5000, melhorPreco: true },
      { nome: "XBZ Brindes", preco: 4.80, prazo: 2, estoque: 3000, melhorPreco: false },
      { nome: "Asia Import", preco: 5.20, prazo: 5, estoque: 8000, melhorPreco: false },
    ]
  },
  {
    produto: "Squeeze 500ml",
    categoria: "Utilidades",
    fornecedores: [
      { nome: "Asia Import", preco: 11.00, prazo: 5, estoque: 4000, melhorPreco: true },
      { nome: "Eco Brindes", preco: 12.50, prazo: 4, estoque: 2000, melhorPreco: false },
      { nome: "XBZ Brindes", preco: 13.00, prazo: 2, estoque: 1500, melhorPreco: false },
    ]
  },
  {
    produto: "Carregador Portátil 10000mAh",
    categoria: "Eletrônicos",
    fornecedores: [
      { nome: "Tech Brindes", preco: 52.00, prazo: 3, estoque: 800, melhorPreco: true },
      { nome: "XBZ Brindes", preco: 58.00, prazo: 2, estoque: 500, melhorPreco: false },
      { nome: "Asia Import", preco: 55.00, prazo: 6, estoque: 1200, melhorPreco: false },
    ]
  },
  {
    produto: "Camiseta Polo",
    categoria: "Têxtil",
    fornecedores: [
      { nome: "Estrela Brindes", preco: 38.00, prazo: 7, estoque: 2000, melhorPreco: true },
      { nome: "Só Marcas", preco: 42.00, prazo: 5, estoque: 1500, melhorPreco: false },
      { nome: "Premium Gifts", preco: 45.00, prazo: 4, estoque: 800, melhorPreco: false },
    ]
  },
  {
    produto: "Boné Trucker",
    categoria: "Têxtil",
    fornecedores: [
      { nome: "Estrela Brindes", preco: 16.50, prazo: 5, estoque: 3000, melhorPreco: true },
      { nome: "Só Marcas", preco: 18.00, prazo: 4, estoque: 2500, melhorPreco: false },
      { nome: "XBZ Brindes", preco: 19.50, prazo: 2, estoque: 1000, melhorPreco: false },
    ]
  },
];

const comparativoBarChart = [
  { produto: "Mochila", XBZ: 45, Asia: 48.5, SoMarcas: 52 },
  { produto: "Caneta", Stricker: 4.5, XBZ: 4.8, Asia: 5.2 },
  { produto: "Squeeze", Asia: 11, Eco: 12.5, XBZ: 13 },
  { produto: "Carregador", Tech: 52, XBZ: 58, Asia: 55 },
  { produto: "Camiseta", Estrela: 38, SoMarcas: 42, Premium: 45 },
];

const Relatorios = () => {
  const [periodo, setPeriodo] = useState("6m");
  const [activeTab, setActiveTab] = useState("geral");

  // KPIs calculados
  const totalVolume = volumeMensal.reduce((acc, m) => acc + m.volume, 0);
  const totalPedidos = volumeMensal.reduce((acc, m) => acc + m.pedidos, 0);
  const totalEconomia = economiaGerada.reduce((acc, m) => acc + m.economia, 0);
  const mediaEconomia = economiaGerada.reduce((acc, m) => acc + m.percentual, 0) / economiaGerada.length;

  interface PayloadEntry {
    color: string;
    name: string;
    dataKey: string;
    value: number;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{label}</p>
          {(payload as PayloadEntry[]).map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes("R$") || entry.dataKey === "volume" || entry.dataKey === "economia" 
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Relatórios e Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Análise de performance, volume de compras e economia gerada
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-40">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Último mês</SelectItem>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
                <SelectItem value="12m">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-auto p-1">
            <TabsTrigger value="geral" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Visão</span> Geral
            </TabsTrigger>
            <TabsTrigger value="kpis" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              KPIs
            </TabsTrigger>
            <TabsTrigger value="previsao" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Previsão</span> IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kpis" className="mt-6">
            <AdvancedProcurementKPIs />
          </TabsContent>

          <TabsContent value="geral" className="mt-6 space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Card className="p-3 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Volume Total</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-1 truncate">
                  R$ {(totalVolume / 1000).toFixed(0)}K
                </p>
                <div className="hidden sm:flex items-center gap-1 mt-2 text-success text-xs sm:text-sm">
                  <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>+18%</span>
                </div>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Pedidos</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">{totalPedidos}</p>
                <div className="hidden sm:flex items-center gap-1 mt-2 text-success text-xs sm:text-sm">
                  <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>+24%</span>
                </div>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 sm:w-6 sm:h-6 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Economia</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-1 truncate">
                  R$ {(totalEconomia / 1000).toFixed(0)}K
                </p>
                <div className="hidden sm:flex items-center gap-1 mt-2 text-success text-xs sm:text-sm">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{mediaEconomia.toFixed(1)}%</span>
                </div>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-success" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Fornecedores</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">{fornecedoresMock.length}</p>
                <div className="hidden sm:flex items-center gap-1 mt-2 text-muted-foreground text-xs sm:text-sm">
                  <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{performanceFornecedores.filter(f => f.rating >= 4).length} ★≥4</span>
                </div>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 sm:w-6 sm:h-6 text-purple-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Gráficos Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Volume de Compras */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground">Volume de Compras</h3>
                <p className="text-sm text-muted-foreground">Evolução mensal do volume</p>
              </div>
              <Badge variant="outline">Mensal</Badge>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeMensal}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v/1000)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#colorVolume)" 
                    name="Volume (R$)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Economia Gerada */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground">Economia Gerada</h3>
                <p className="text-sm text-muted-foreground">Economia através de cotações competitivas</p>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                +{mediaEconomia.toFixed(1)}%
              </Badge>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={economiaGerada}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v/1000)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="economia" 
                    fill="hsl(var(--success))" 
                    radius={[4, 4, 0, 0]}
                    name="Economia (R$)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Distribuições */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Por Tipo */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground">Distribuição por Tipo</h3>
                <p className="text-sm text-muted-foreground">Pedidos por tipo de compra</p>
              </div>
              <PieChartIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribuicaoTipo}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {distribuicaoTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Por Status */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground">Distribuição por Status</h3>
                <p className="text-sm text-muted-foreground">Pedidos por estágio do pipeline</p>
              </div>
              <PieChartIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribuicaoStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {distribuicaoStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* SLA Analysis by Supplier */}
        <SLABySupplierAnalysis />

        {/* Performance de Fornecedores */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Performance de Fornecedores</h3>
              <p className="text-sm text-muted-foreground">Ranking por volume, prazo e economia</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtrar
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fornecedor</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Pedidos</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Volume Total</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Prazo Médio</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Taxa Entrega</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Rating</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Economia</th>
                </tr>
              </thead>
              <tbody>
                {performanceFornecedores.map((fornecedor, index) => (
                  <tr key={fornecedor.nome} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-amber-600' : 'bg-muted-foreground/30'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-foreground">{fornecedor.nome}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge variant="secondary">{fornecedor.pedidos}</Badge>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-foreground">
                      R$ {fornecedor.volumeTotal.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`font-medium ${fornecedor.prazoMedio <= 3 ? 'text-success' : 'text-orange-500'}`}>
                        {fornecedor.prazoMedio} dias
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Progress value={fornecedor.taxaEntrega} className="h-2 flex-1" />
                        <span className="text-sm font-medium text-foreground w-12 text-right">
                          {fornecedor.taxaEntrega}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {Array.from({ length: fornecedor.rating }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-medium text-success">
                        R$ {fornecedor.economia.toLocaleString('pt-BR')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Produtos */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Top Produtos</h3>
              <p className="text-sm text-muted-foreground">Produtos mais comprados no período</p>
            </div>
          </div>

          <div className="space-y-4">
            {topProdutos.map((produto, index) => (
              <div key={produto.produto} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{produto.produto}</span>
                    <span className="text-sm text-muted-foreground">{produto.quantidade.toLocaleString('pt-BR')} un</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={(produto.valor / topProdutos[0].valor) * 100} className="h-2 flex-1" />
                    <span className="text-sm font-medium text-foreground w-24 text-right">
                      R$ {produto.valor.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Comparativo de Preços */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Comparativo de Preços entre Fornecedores
              </h3>
              <p className="text-sm text-muted-foreground">Compare preços do mesmo produto em diferentes fornecedores</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtrar categoria
            </Button>
          </div>

          <div className="space-y-6">
            {comparativoPrecos.map((item) => {
              const menorPreco = Math.min(...item.fornecedores.map(f => f.preco));
              const maiorPreco = Math.max(...item.fornecedores.map(f => f.preco));
              const economiaMaxima = ((maiorPreco - menorPreco) / maiorPreco * 100).toFixed(1);

              return (
                <div key={item.produto} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-foreground">{item.produto}</h4>
                      <Badge variant="outline" className="mt-1 text-xs">{item.categoria}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Economia potencial</p>
                      <p className="text-lg font-bold text-success">até {economiaMaxima}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {item.fornecedores.map((fornecedor, idx) => (
                      <div 
                        key={fornecedor.nome}
                        className={`relative p-4 rounded-lg border transition-all ${
                          fornecedor.melhorPreco 
                            ? 'border-success bg-success/5 ring-1 ring-success/20' 
                            : 'border-border bg-muted/30'
                        }`}
                      >
                        {fornecedor.melhorPreco && (
                          <div className="absolute -top-2 -right-2">
                            <Badge className="bg-success text-success-foreground text-xs gap-1">
                              <Check className="w-3 h-3" />
                              Melhor preço
                            </Badge>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            idx === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                            idx === 1 ? 'bg-gray-200 text-gray-600' :
                            'bg-amber-600/20 text-amber-700'
                          }`}>
                            {idx + 1}º
                          </div>
                          <span className="font-medium text-foreground text-sm">{fornecedor.nome}</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              Preço unitário
                            </span>
                            <span className={`font-bold ${fornecedor.melhorPreco ? 'text-success' : 'text-foreground'}`}>
                              R$ {fornecedor.preco.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Prazo
                            </span>
                            <span className="text-sm text-foreground">{fornecedor.prazo} dias</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Boxes className="w-3 h-3" />
                              Estoque
                            </span>
                            <span className="text-sm text-foreground">{fornecedor.estoque.toLocaleString('pt-BR')} un</span>
                          </div>
                        </div>

                        {!fornecedor.melhorPreco && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                              +R$ {(fornecedor.preco - menorPreco).toFixed(2)} vs melhor preço
                              <span className="text-orange-500 ml-1">
                                (+{((fornecedor.preco - menorPreco) / menorPreco * 100).toFixed(1)}%)
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Gráfico Comparativo de Preços */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Comparativo Visual de Preços</h3>
              <p className="text-sm text-muted-foreground">Preços por produto e fornecedor</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativoBarChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `R$ ${v}`} />
                <YAxis dataKey="produto" type="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={80} />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="XBZ" fill="#3b82f6" name="XBZ Brindes" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Asia" fill="#10b981" name="Asia Import" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Stricker" fill="#8b5cf6" name="Stricker" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Tech" fill="#f59e0b" name="Tech Brindes" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Eco" fill="#06b6d4" name="Eco Brindes" radius={[0, 4, 4, 0]} />
                <Bar dataKey="SoMarcas" fill="#ec4899" name="Só Marcas" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Premium" fill="#84cc16" name="Premium Gifts" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Estrela" fill="#f97316" name="Estrela Brindes" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
          </TabsContent>

          {/* Tab: Previsão IA */}
          <TabsContent value="previsao" className="mt-6">
            <DemandPredictionPanel />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Relatorios;