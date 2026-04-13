import {
  DollarSign,
  Package,
  Building2,
  PieChart as PieChartIcon,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
  TooltipProps,
} from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

const PIE_COLORS = ["hsl(var(--primary))", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
      <p className="font-medium text-foreground text-sm">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number"
            ? entry.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            : entry.value}
        </p>
      ))}
    </div>
  );
};

interface Stats {
  totalVolume: number;
  totalPedidos: number;
  economiaTotal: number;
  economiaPct: number;
  fornAtivos: number;
  fornBemAvaliados: number;
  volumeMensal: Array<{ mes: string; volume: number; pedidos: number }>;
  economiaMensal: Array<{ mes: string; economia: number }>;
  distribuicaoStatus: Array<{ name: string; value: number }>;
  distribuicaoTipo: Array<{ name: string; value: number }>;
  fornecedorPerformance: Array<{ nome: string; pedidos: number; volumeTotal: number; taxaEntrega: number; rating: number }>;
}

export const KPICards = ({ stats, isLoading }: { stats: Stats; isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Card className="p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Volume Total</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">
              R$ {(stats.totalVolume / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-muted-foreground mt-1">{stats.totalPedidos} pedidos</p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Pedidos</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">{stats.totalPedidos}</p>
            <p className="text-xs text-muted-foreground mt-1">no período</p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 sm:w-6 sm:h-6 text-info" />
          </div>
        </div>
      </Card>

      <Card className="p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Economia</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">
              R$ {(stats.economiaTotal / 1000).toFixed(0)}K
            </p>
            <div className="flex items-center gap-1 mt-1 text-success text-xs">
              <ArrowUpRight className="w-3 h-3" />
              <span>{stats.economiaPct.toFixed(1)}%</span>
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
            <p className="text-xs sm:text-sm text-muted-foreground">Fornecedores</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">{stats.fornAtivos}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.fornBemAvaliados} ★≥4
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 sm:w-6 sm:h-6 text-purple-500" />
          </div>
        </div>
      </Card>
    </div>
  );
};

export const VolumeChart = ({ data }: { data: Stats['volumeMensal'] }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="font-semibold text-foreground">Volume de Compras</h3>
        <p className="text-sm text-muted-foreground">Evolução mensal do volume</p>
      </div>
      <Badge variant="outline">Mensal</Badge>
    </div>
    <div className="h-72">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorVolume)" name="Volume (R$)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Sem dados de pedidos no período
        </div>
      )}
    </div>
  </Card>
);

export const SavingsChart = ({ data, economiaPct }: { data: Stats['economiaMensal']; economiaPct: number }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="font-semibold text-foreground">Economia Gerada</h3>
        <p className="text-sm text-muted-foreground">Economia por cotações competitivas</p>
      </div>
      <Badge variant="outline" className="bg-success/10 text-success border-emerald-500/20">
        {economiaPct.toFixed(1)}%
      </Badge>
    </div>
    <div className="h-72">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="economia" fill="#10b981" radius={[4, 4, 0, 0]} name="Economia (R$)" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Sem dados de economia no período
        </div>
      )}
    </div>
  </Card>
);

export const DistributionCharts = ({ distribuicaoTipo, distribuicaoStatus }: { distribuicaoTipo: Stats['distribuicaoTipo']; distribuicaoStatus: Stats['distribuicaoStatus'] }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Distribuição por Tipo</h3>
          <p className="text-sm text-muted-foreground">Solicitações por tipo de compra</p>
        </div>
        <PieChartIcon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="h-64">
        {distribuicaoTipo.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={distribuicaoTipo} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {distribuicaoTipo.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" formatter={(v) => <span className="text-sm text-foreground">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sem dados</div>
        )}
      </div>
    </Card>

    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Distribuição por Status</h3>
          <p className="text-sm text-muted-foreground">Pedidos por estágio do pipeline</p>
        </div>
        <PieChartIcon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="h-64">
        {distribuicaoStatus.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={distribuicaoStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {distribuicaoStatus.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" formatter={(v) => <span className="text-sm text-foreground">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sem dados</div>
        )}
      </div>
    </Card>
  </div>
);

export const SupplierPerformanceTable = ({ data }: { data: Stats['fornecedorPerformance'] }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="font-semibold text-foreground">Performance de Fornecedores</h3>
        <p className="text-sm text-muted-foreground">Ranking por volume e entrega no período</p>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fornecedor</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Pedidos</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Volume Total</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Taxa Entrega</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Rating</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((f, idx) => (
              <tr key={f.nome} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-primary-foreground ${
                      idx === 0 ? "bg-warning" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-warning" : "bg-muted-foreground/30"
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="font-medium text-foreground">{f.nome}</span>
                  </div>
                </td>
                <td className="text-center py-4 px-4 text-foreground">{f.pedidos}</td>
                <td className="text-right py-4 px-4 font-semibold text-foreground">
                  R$ {f.volumeTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
                <td className="text-center py-4 px-4">
                  <Badge variant={f.taxaEntrega >= 90 ? "default" : f.taxaEntrega >= 70 ? "secondary" : "destructive"}>
                    {f.taxaEntrega}%
                  </Badge>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-warning">{"★".repeat(Math.round(f.rating))}</span>
                  <span className="text-muted-foreground ml-1 text-sm">{f.rating.toFixed(1)}</span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="text-center py-8 text-muted-foreground">
                Sem dados de fornecedores no período
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </Card>
);
