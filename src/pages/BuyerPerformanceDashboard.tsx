import { useState, useMemo } from "react";
import {
  User,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Calendar,
  Download,
  PiggyBank,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Percent,
  ShoppingCart,
  Zap,
  Users,
  GitCompare
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MainLayout } from "@/components/compras/MainLayout";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell
} from "recharts";

// Mock data para compradores
const buyersData = [
  {
    id: "ana-silva",
    nome: "Ana Silva",
    avatar: "AS",
    cargo: "Comprador Sênior",
    departamento: "Compras",
    dataAdmissao: "2022-03-15",
    meta: {
      economiaMensal: 10000,
      descontoMedio: 12,
      cotacoesMinimas: 40
    },
    performance: {
      economiaMes: 8750,
      economiaAno: 68500,
      descontoMedio: 12.3,
      melhorPrecoRate: 87,
      cotacoesRealizadas: 45,
      tempoMedioNegociacao: 2.4,
      taxaSucesso: 92,
      fornecedoresAtivos: 12
    },
    historico: [
      { mes: "Jul", economia: 5200, cotacoes: 28, desconto: 10.5 },
      { mes: "Ago", economia: 6800, cotacoes: 35, desconto: 11.2 },
      { mes: "Set", economia: 4500, cotacoes: 22, desconto: 9.8 },
      { mes: "Out", economia: 7200, cotacoes: 41, desconto: 12.1 },
      { mes: "Nov", economia: 8100, cotacoes: 48, desconto: 13.5 },
      { mes: "Dez", economia: 8750, cotacoes: 45, desconto: 12.3 }
    ],
    categorias: [
      { nome: "Mochilas", economia: 3200, percentual: 36.6 },
      { nome: "Canetas", economia: 2100, percentual: 24.0 },
      { nome: "Cadernos", economia: 1800, percentual: 20.6 },
      { nome: "Squeezes", economia: 1650, percentual: 18.8 }
    ],
    fornecedores: [
      { nome: "XBZ Brindes", economia: 3500, pedidos: 18, desconto: 14.2 },
      { nome: "Asia Import", economia: 2200, pedidos: 12, desconto: 11.5 },
      { nome: "Stricker", economia: 1800, pedidos: 10, desconto: 10.8 },
      { nome: "Só Marcas", economia: 1250, pedidos: 8, desconto: 9.5 }
    ],
    ultimasNegociacoes: [
      { produto: "Mochila Executiva", economia: 2340, percentual: 18, data: "2025-12-15" },
      { produto: "Kit Escolar", economia: 1850, percentual: 15, data: "2025-12-12" },
      { produto: "Caneta Metal Premium", economia: 1200, percentual: 12, data: "2025-12-10" },
      { produto: "Caderno Corporativo", economia: 980, percentual: 10, data: "2025-12-08" },
      { produto: "Squeeze Térmico", economia: 760, percentual: 9, data: "2025-12-05" }
    ],
    radar: [
      { subject: "Economia", value: 87, fullMark: 100 },
      { subject: "Velocidade", value: 75, fullMark: 100 },
      { subject: "Qualidade", value: 92, fullMark: 100 },
      { subject: "Volume", value: 85, fullMark: 100 },
      { subject: "Diversidade", value: 78, fullMark: 100 }
    ]
  },
  {
    id: "carlos-souza",
    nome: "Carlos Souza",
    avatar: "CS",
    cargo: "Comprador Pleno",
    departamento: "Compras",
    dataAdmissao: "2023-01-10",
    meta: {
      economiaMensal: 8000,
      descontoMedio: 10,
      cotacoesMinimas: 35
    },
    performance: {
      economiaMes: 6200,
      economiaAno: 52000,
      descontoMedio: 10.5,
      melhorPrecoRate: 82,
      cotacoesRealizadas: 38,
      tempoMedioNegociacao: 3.1,
      taxaSucesso: 85,
      fornecedoresAtivos: 9
    },
    historico: [
      { mes: "Jul", economia: 4100, cotacoes: 25, desconto: 9.2 },
      { mes: "Ago", economia: 5200, cotacoes: 30, desconto: 9.8 },
      { mes: "Set", economia: 4800, cotacoes: 28, desconto: 10.1 },
      { mes: "Out", economia: 5500, cotacoes: 35, desconto: 10.5 },
      { mes: "Nov", economia: 5900, cotacoes: 36, desconto: 10.8 },
      { mes: "Dez", economia: 6200, cotacoes: 38, desconto: 10.5 }
    ],
    categorias: [
      { nome: "Eletrônicos", economia: 2500, percentual: 40.3 },
      { nome: "Camisetas", economia: 1800, percentual: 29.0 },
      { nome: "Bonés", economia: 1200, percentual: 19.4 },
      { nome: "Outros", economia: 700, percentual: 11.3 }
    ],
    fornecedores: [
      { nome: "Tech Brindes", economia: 2500, pedidos: 15, desconto: 12.0 },
      { nome: "Estrela Brindes", economia: 1800, pedidos: 10, desconto: 9.5 },
      { nome: "Premium Gifts", economia: 1200, pedidos: 8, desconto: 10.2 },
      { nome: "XBZ Brindes", economia: 700, pedidos: 5, desconto: 8.8 }
    ],
    ultimasNegociacoes: [
      { produto: "Carregador Portátil", economia: 1650, percentual: 15, data: "2025-12-14" },
      { produto: "Camiseta Polo", economia: 1200, percentual: 12, data: "2025-12-11" },
      { produto: "Fone Bluetooth", economia: 980, percentual: 10, data: "2025-12-09" },
      { produto: "Boné Trucker", economia: 650, percentual: 8, data: "2025-12-06" },
      { produto: "Mouse Pad", economia: 420, percentual: 7, data: "2025-12-03" }
    ],
    radar: [
      { subject: "Economia", value: 77, fullMark: 100 },
      { subject: "Velocidade", value: 68, fullMark: 100 },
      { subject: "Qualidade", value: 85, fullMark: 100 },
      { subject: "Volume", value: 76, fullMark: 100 },
      { subject: "Diversidade", value: 72, fullMark: 100 }
    ]
  },
  {
    id: "maria-santos",
    nome: "Maria Santos",
    avatar: "MS",
    cargo: "Comprador Júnior",
    departamento: "Compras",
    dataAdmissao: "2024-02-20",
    meta: {
      economiaMensal: 6000,
      descontoMedio: 8,
      cotacoesMinimas: 30
    },
    performance: {
      economiaMes: 5800,
      economiaAno: 38500,
      descontoMedio: 9.8,
      melhorPrecoRate: 79,
      cotacoesRealizadas: 42,
      tempoMedioNegociacao: 3.5,
      taxaSucesso: 78,
      fornecedoresAtivos: 8
    },
    historico: [
      { mes: "Jul", economia: 3200, cotacoes: 20, desconto: 7.5 },
      { mes: "Ago", economia: 4100, cotacoes: 28, desconto: 8.2 },
      { mes: "Set", economia: 4500, cotacoes: 32, desconto: 8.8 },
      { mes: "Out", economia: 5200, cotacoes: 38, desconto: 9.2 },
      { mes: "Nov", economia: 5500, cotacoes: 40, desconto: 9.5 },
      { mes: "Dez", economia: 5800, cotacoes: 42, desconto: 9.8 }
    ],
    categorias: [
      { nome: "Escritório", economia: 2300, percentual: 39.7 },
      { nome: "Canetas", economia: 1800, percentual: 31.0 },
      { nome: "Cadernos", economia: 1100, percentual: 19.0 },
      { nome: "Outros", economia: 600, percentual: 10.3 }
    ],
    fornecedores: [
      { nome: "Stricker", economia: 2100, pedidos: 16, desconto: 10.5 },
      { nome: "Asia Import", economia: 1500, pedidos: 12, desconto: 9.2 },
      { nome: "Só Marcas", economia: 1200, pedidos: 9, desconto: 8.8 },
      { nome: "Eco Brindes", economia: 1000, pedidos: 8, desconto: 9.0 }
    ],
    ultimasNegociacoes: [
      { produto: "Caneta Roller", economia: 1100, percentual: 12, data: "2025-12-15" },
      { produto: "Agenda 2025", economia: 950, percentual: 10, data: "2025-12-13" },
      { produto: "Bloco de Notas", economia: 720, percentual: 9, data: "2025-12-10" },
      { produto: "Porta Canetas", economia: 580, percentual: 8, data: "2025-12-07" },
      { produto: "Clips Coloridos", economia: 320, percentual: 6, data: "2025-12-04" }
    ],
    radar: [
      { subject: "Economia", value: 72, fullMark: 100 },
      { subject: "Velocidade", value: 62, fullMark: 100 },
      { subject: "Qualidade", value: 78, fullMark: 100 },
      { subject: "Volume", value: 84, fullMark: 100 },
      { subject: "Diversidade", value: 65, fullMark: 100 }
    ]
  },
  {
    id: "pedro-lima",
    nome: "Pedro Lima",
    avatar: "PL",
    cargo: "Comprador Pleno",
    departamento: "Compras",
    dataAdmissao: "2023-06-01",
    meta: {
      economiaMensal: 7000,
      descontoMedio: 9,
      cotacoesMinimas: 32
    },
    performance: {
      economiaMes: 4500,
      economiaAno: 42000,
      descontoMedio: 8.2,
      melhorPrecoRate: 75,
      cotacoesRealizadas: 30,
      tempoMedioNegociacao: 2.8,
      taxaSucesso: 80,
      fornecedoresAtivos: 7
    },
    historico: [
      { mes: "Jul", economia: 3800, cotacoes: 22, desconto: 7.8 },
      { mes: "Ago", economia: 4200, cotacoes: 26, desconto: 8.0 },
      { mes: "Set", economia: 3900, cotacoes: 24, desconto: 7.5 },
      { mes: "Out", economia: 4100, cotacoes: 28, desconto: 8.2 },
      { mes: "Nov", economia: 4400, cotacoes: 30, desconto: 8.5 },
      { mes: "Dez", economia: 4500, cotacoes: 30, desconto: 8.2 }
    ],
    categorias: [
      { nome: "Couro", economia: 1800, percentual: 40.0 },
      { nome: "Mochilas", economia: 1200, percentual: 26.7 },
      { nome: "Carteiras", economia: 900, percentual: 20.0 },
      { nome: "Outros", economia: 600, percentual: 13.3 }
    ],
    fornecedores: [
      { nome: "Premium Gifts", economia: 1800, pedidos: 12, desconto: 9.5 },
      { nome: "XBZ Brindes", economia: 1200, pedidos: 8, desconto: 8.0 },
      { nome: "Só Marcas", economia: 900, pedidos: 6, desconto: 7.5 },
      { nome: "Estrela Brindes", economia: 600, pedidos: 4, desconto: 7.0 }
    ],
    ultimasNegociacoes: [
      { produto: "Carteira Couro Slim", economia: 980, percentual: 10, data: "2025-12-14" },
      { produto: "Mochila Notebook", economia: 850, percentual: 9, data: "2025-12-11" },
      { produto: "Porta Documentos", economia: 620, percentual: 8, data: "2025-12-08" },
      { produto: "Chaveiro Couro", economia: 450, percentual: 7, data: "2025-12-05" },
      { produto: "Pasta Executiva", economia: 380, percentual: 6, data: "2025-12-02" }
    ],
    radar: [
      { subject: "Economia", value: 64, fullMark: 100 },
      { subject: "Velocidade", value: 82, fullMark: 100 },
      { subject: "Qualidade", value: 75, fullMark: 100 },
      { subject: "Volume", value: 68, fullMark: 100 },
      { subject: "Diversidade", value: 58, fullMark: 100 }
    ]
  }
];

const COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(221, 83%, 53%)', 'hsl(262, 83%, 58%)'];

// Comparison metric card component
const ComparisonMetricCard = ({ 
  label, 
  icon: Icon, 
  value1, 
  value2, 
  format = "number",
  color 
}: { 
  label: string;
  icon: any;
  value1: number;
  value2: number;
  format?: "number" | "currency" | "percent";
  color: string;
}) => {
  const formatValue = (val: number) => {
    if (format === "currency") return `R$ ${val.toLocaleString('pt-BR')}`;
    if (format === "percent") return `${val}%`;
    return val.toString();
  };
  
  const diff = value1 - value2;
  const percentDiff = value2 !== 0 ? ((diff / value2) * 100).toFixed(1) : "0";
  const isPositive = diff > 0;
  
  return (
    <Card className="p-4">
      <div className={`flex items-center gap-2 ${color} mb-3`}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center border-r border-border">
          <p className={`text-xl font-bold ${color}`}>{formatValue(value1)}</p>
        </div>
        <div className="text-center">
          <p className={`text-xl font-bold ${color}`}>{formatValue(value2)}</p>
        </div>
      </div>
      <div className="mt-2 text-center">
        <Badge variant={isPositive ? "default" : "secondary"} className="text-xs">
          {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {isPositive ? "+" : ""}{percentDiff}% diferença
        </Badge>
      </div>
    </Card>
  );
};

const BuyerPerformanceDashboard = () => {
  const [selectedBuyerId, setSelectedBuyerId] = useState(buyersData[0].id);
  const [compareBuyerId, setCompareBuyerId] = useState(buyersData[1].id);
  const [compareMode, setCompareMode] = useState(false);
  const [periodo, setPeriodo] = useState("6m");

  const buyer = useMemo(() => 
    buyersData.find(b => b.id === selectedBuyerId) || buyersData[0], 
    [selectedBuyerId]
  );

  const compareBuyer = useMemo(() => 
    buyersData.find(b => b.id === compareBuyerId) || buyersData[1], 
    [compareBuyerId]
  );

  const economiaVsMeta = (buyer.performance.economiaMes / buyer.meta.economiaMensal) * 100;
  const descontoVsMeta = (buyer.performance.descontoMedio / buyer.meta.descontoMedio) * 100;
  const cotacoesVsMeta = (buyer.performance.cotacoesRealizadas / buyer.meta.cotacoesMinimas) * 100;

  // Merge radar data for comparison
  const comparisonRadarData = useMemo(() => {
    return buyer.radar.map((item, index) => ({
      subject: item.subject,
      [buyer.nome]: item.value,
      [compareBuyer.nome]: compareBuyer.radar[index]?.value || 0,
      fullMark: 100
    }));
  }, [buyer, compareBuyer]);

  // Merge historico for comparison chart
  const comparisonHistorico = useMemo(() => {
    return buyer.historico.map((item, index) => ({
      mes: item.mes,
      [`${buyer.nome} Economia`]: item.economia,
      [`${compareBuyer.nome} Economia`]: compareBuyer.historico[index]?.economia || 0,
      [`${buyer.nome} Desconto`]: item.desconto,
      [`${compareBuyer.nome} Desconto`]: compareBuyer.historico[index]?.desconto || 0
    }));
  }, [buyer, compareBuyer]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Economia') 
                ? `R$ ${entry.value.toLocaleString('pt-BR')}` 
                : entry.name.includes('Desconto') 
                  ? `${entry.value}%`
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
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Desempenho</h1>
            <p className="text-sm text-muted-foreground">
              {compareMode ? "Comparativo entre compradores" : "Análise detalhada de performance individual"}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Compare Mode Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
              <GitCompare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Comparar</span>
              <Switch checked={compareMode} onCheckedChange={setCompareMode} />
            </div>
            
            <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
              <SelectTrigger className="w-[160px]">
                <User className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Comprador 1" />
              </SelectTrigger>
              <SelectContent>
                {buyersData.map(b => (
                  <SelectItem key={b.id} value={b.id} disabled={compareMode && b.id === compareBuyerId}>
                    {b.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {compareMode && (
              <Select value={compareBuyerId} onValueChange={setCompareBuyerId}>
                <SelectTrigger className="w-[160px]">
                  <Users className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Comprador 2" />
                </SelectTrigger>
                <SelectContent>
                  {buyersData.map(b => (
                    <SelectItem key={b.id} value={b.id} disabled={b.id === selectedBuyerId}>
                      {b.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
                <SelectItem value="12m">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {compareMode ? (
          // ============ COMPARISON VIEW ============
          <>
            {/* Profile Cards Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[buyer, compareBuyer].map((b, idx) => (
                <Card key={b.id} className={`p-6 ${idx === 0 ? 'border-primary/30' : 'border-blue-500/30'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl ${idx === 0 ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-600'}`}>
                      {b.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-foreground">{b.nome}</h2>
                        <Badge variant="secondary" className="text-xs">{b.cargo}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" />
                          {b.performance.fornecedoresAtivos} fornecedores
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {b.performance.taxaSucesso}% sucesso
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {b.performance.tempoMedioNegociacao}d
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Comparison KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ComparisonMetricCard
                label="Economia do Mês"
                icon={PiggyBank}
                value1={buyer.performance.economiaMes}
                value2={compareBuyer.performance.economiaMes}
                format="currency"
                color="text-emerald-600"
              />
              <ComparisonMetricCard
                label="Desconto Médio"
                icon={Percent}
                value1={buyer.performance.descontoMedio}
                value2={compareBuyer.performance.descontoMedio}
                format="percent"
                color="text-blue-600"
              />
              <ComparisonMetricCard
                label="Cotações"
                icon={Target}
                value1={buyer.performance.cotacoesRealizadas}
                value2={compareBuyer.performance.cotacoesRealizadas}
                format="number"
                color="text-purple-600"
              />
              <ComparisonMetricCard
                label="Taxa Melhor Preço"
                icon={Award}
                value1={buyer.performance.melhorPrecoRate}
                value2={compareBuyer.performance.melhorPrecoRate}
                format="percent"
                color="text-amber-600"
              />
            </div>

            {/* Comparison Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Economia Evolution Comparison */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Comparativo de Economia Mensal
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={comparisonHistorico}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `R$${v/1000}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey={`${buyer.nome} Economia`} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={`${compareBuyer.nome} Economia`} fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Radar Comparison */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Comparativo de Competências
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={comparisonRadarData}>
                    <PolarGrid className="stroke-border" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name={buyer.nome}
                      dataKey={buyer.nome}
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Radar
                      name={compareBuyer.nome}
                      dataKey={compareBuyer.nome}
                      stroke="hsl(221, 83%, 53%)"
                      fill="hsl(221, 83%, 53%)"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Detailed Comparison Table */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Comparativo Detalhado de Métricas
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Métrica</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-primary">{buyer.nome}</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-blue-600">{compareBuyer.nome}</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Economia Mensal", v1: buyer.performance.economiaMes, v2: compareBuyer.performance.economiaMes, format: "currency" },
                      { label: "Economia Anual", v1: buyer.performance.economiaAno, v2: compareBuyer.performance.economiaAno, format: "currency" },
                      { label: "Desconto Médio", v1: buyer.performance.descontoMedio, v2: compareBuyer.performance.descontoMedio, format: "percent" },
                      { label: "Taxa Melhor Preço", v1: buyer.performance.melhorPrecoRate, v2: compareBuyer.performance.melhorPrecoRate, format: "percent" },
                      { label: "Cotações Realizadas", v1: buyer.performance.cotacoesRealizadas, v2: compareBuyer.performance.cotacoesRealizadas, format: "number" },
                      { label: "Tempo Médio (dias)", v1: buyer.performance.tempoMedioNegociacao, v2: compareBuyer.performance.tempoMedioNegociacao, format: "decimal" },
                      { label: "Taxa de Sucesso", v1: buyer.performance.taxaSucesso, v2: compareBuyer.performance.taxaSucesso, format: "percent" },
                      { label: "Fornecedores Ativos", v1: buyer.performance.fornecedoresAtivos, v2: compareBuyer.performance.fornecedoresAtivos, format: "number" },
                    ].map((row, idx) => {
                      const diff = row.v1 - row.v2;
                      const isPositive = row.label.includes("Tempo") ? diff < 0 : diff > 0;
                      const formatVal = (v: number) => {
                        if (row.format === "currency") return `R$ ${v.toLocaleString('pt-BR')}`;
                        if (row.format === "percent") return `${v}%`;
                        if (row.format === "decimal") return v.toFixed(1);
                        return v;
                      };
                      return (
                        <tr key={idx} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-foreground">{row.label}</td>
                          <td className="py-3 px-4 text-center text-sm font-semibold text-primary">{formatVal(row.v1)}</td>
                          <td className="py-3 px-4 text-center text-sm font-semibold text-blue-600">{formatVal(row.v2)}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={isPositive ? "default" : "secondary"} className="text-xs">
                              {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                              {diff > 0 ? "+" : ""}{row.format === "currency" ? `R$ ${Math.abs(diff).toLocaleString('pt-BR')}` : row.format === "percent" ? `${Math.abs(diff).toFixed(1)}pp` : Math.abs(diff).toFixed(1)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Annual Summary Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{buyer.nome}</h3>
                    <p className="text-sm text-muted-foreground">Economia Total no Ano</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">
                      R$ {buyer.performance.economiaAno.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 bg-gradient-to-r from-blue-500/5 to-blue-500/10 border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{compareBuyer.nome}</h3>
                    <p className="text-sm text-muted-foreground">Economia Total no Ano</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">
                      R$ {compareBuyer.performance.economiaAno.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : (
          // ============ INDIVIDUAL VIEW (existing) ============
          <>
            {/* Buyer Profile Card */}
            <Card className="p-6">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                  {buyer.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-foreground">{buyer.nome}</h2>
                    <Badge variant="secondary">{buyer.cargo}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{buyer.departamento} • Desde {new Date(buyer.dataAdmissao).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{buyer.performance.fornecedoresAtivos} fornecedores ativos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-muted-foreground">{buyer.performance.taxaSucesso}% taxa de sucesso</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{buyer.performance.tempoMedioNegociacao} dias tempo médio</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* KPIs com Metas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <PiggyBank className="w-4 h-4" />
                  <span className="text-xs font-medium">Economia do Mês</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  R$ {buyer.performance.economiaMes.toLocaleString('pt-BR')}
                </p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Meta: R$ {buyer.meta.economiaMensal.toLocaleString('pt-BR')}</span>
                    <span className={economiaVsMeta >= 100 ? "text-emerald-600" : "text-amber-600"}>
                      {economiaVsMeta.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={Math.min(economiaVsMeta, 100)} className="h-1.5" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Percent className="w-4 h-4" />
                  <span className="text-xs font-medium">Desconto Médio</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {buyer.performance.descontoMedio}%
                </p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Meta: {buyer.meta.descontoMedio}%</span>
                    <span className={descontoVsMeta >= 100 ? "text-emerald-600" : "text-amber-600"}>
                      {descontoVsMeta.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={Math.min(descontoVsMeta, 100)} className="h-1.5" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <Target className="w-4 h-4" />
                  <span className="text-xs font-medium">Cotações Realizadas</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {buyer.performance.cotacoesRealizadas}
                </p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Meta: {buyer.meta.cotacoesMinimas}</span>
                    <span className={cotacoesVsMeta >= 100 ? "text-emerald-600" : "text-amber-600"}>
                      {cotacoesVsMeta.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={Math.min(cotacoesVsMeta, 100)} className="h-1.5" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <Award className="w-4 h-4" />
                  <span className="text-xs font-medium">Taxa Melhor Preço</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {buyer.performance.melhorPrecoRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Frequência de escolha do melhor preço disponível
                </p>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Evolução Mensal */}
              <Card className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Evolução Mensal
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={buyer.historico}>
                    <defs>
                      <linearGradient id="colorEconomiaBuyer" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `R$${v/1000}K`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="economia" 
                      stroke="hsl(142, 76%, 36%)" 
                      fill="url(#colorEconomiaBuyer)"
                      strokeWidth={2}
                      name="Economia (R$)"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="desconto" 
                      stroke="hsl(221, 83%, 53%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(221, 83%, 53%)', strokeWidth: 2 }}
                      name="Desconto (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Radar de Competências */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Perfil de Competências
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={buyer.radar}>
                    <PolarGrid className="stroke-border" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name={buyer.nome}
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance por Categoria */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Economia por Categoria
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={buyer.categorias} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `R$${v/1000}K`} />
                    <YAxis type="category" dataKey="nome" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="economia" name="Economia (R$)" radius={[0, 4, 4, 0]}>
                      {buyer.categorias.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Performance por Fornecedor */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-emerald-500" />
                  Economia por Fornecedor
                </h3>
                <div className="space-y-4">
                  {buyer.fornecedores.map((item, index) => {
                    const maxEconomia = Math.max(...buyer.fornecedores.map(f => f.economia));
                    const progressValue = (item.economia / maxEconomia) * 100;
                    
                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{item.nome}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{item.pedidos} pedidos</span>
                            <Badge variant="outline" className="text-xs">{item.desconto}%</Badge>
                            <span className="text-sm font-bold text-emerald-600">
                              R$ {item.economia.toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <Progress value={progressValue} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Últimas Negociações */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-blue-500" />
                Últimas Negociações de Destaque
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Produto</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Desconto</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Economia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyer.ultimasNegociacoes.map((neg, index) => (
                      <tr key={index} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-foreground">{neg.produto}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(neg.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            <ArrowDownRight className="w-3 h-3 mr-1" />
                            {neg.percentual}%
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-emerald-600 flex items-center justify-end gap-1">
                            <ArrowUpRight className="w-4 h-4" />
                            R$ {neg.economia.toLocaleString('pt-BR')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Resumo Anual */}
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Economia Total no Ano</h3>
                  <p className="text-sm text-muted-foreground">Resultados acumulados de {buyer.nome}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">
                    R$ {buyer.performance.economiaAno.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    +15% vs ano anterior
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default BuyerPerformanceDashboard;
