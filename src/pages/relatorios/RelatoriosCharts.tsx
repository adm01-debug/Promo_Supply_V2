import {
  DollarSign,
  Package,
  Building2,
  PieChart as PieChartIcon,
  ArrowUpRight,
  TrendingUp,
  Star,
  MoreHorizontal,
  ChevronRight
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
import { motion } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import { EliteButton } from "@/components/atoms/EliteButton";

const PIE_COLORS = ["hsl(var(--primary))", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-4 min-w-[150px]">
      <p className="font-black text-foreground text-[10px] uppercase tracking-widest mb-2 border-b border-border/50 pb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mt-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">{entry.name}</span>
          <span className="text-sm font-black" style={{ color: entry.color }}>
            {typeof entry.value === "number"
              ? formatCurrency(entry.value as number)
              : entry.value}
          </span>
        </div>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-[2rem]" />)}
      </div>
    );
  }

  const items = [
    { label: 'Volume Total', value: `R$ ${(stats.totalVolume / 1000).toFixed(0)}K`, sub: `${stats.totalPedidos} pedidos`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Eficiência', value: stats.totalPedidos, sub: 'no período', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Economia', value: `R$ ${(stats.economiaTotal / 1000).toFixed(0)}K`, sub: `${stats.economiaPct.toFixed(1)}% Saving`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Network', value: stats.fornAtivos, sub: `${stats.fornBemAvaliados} top-tier`, icon: Building2, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
      {items.map((item) => (
        <motion.div
          key={item.label}
          whileHover={{ y: -4, scale: 1.02 }}

          className="p-6 rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-xl shadow-xl shadow-black/5"
        >
          <div className="flex items-center justify-between mb-4">
             <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", item.bg)}>
                <item.icon className={cn("w-6 h-6", item.color)} />
             </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">{item.label}</p>
          <p className="text-2xl font-black text-foreground mt-1">{item.value}</p>
          <p className="text-[10px] font-bold text-muted-foreground mt-1 opacity-60 uppercase">{item.sub}</p>
        </motion.div>
      ))}
    </div>
  );
};

export const VolumeChart = ({ data }: { data: Stats['volumeMensal'] }) => (
  <Card className="p-8 rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden relative">
    <div className="flex items-center justify-between mb-8">
      <div>
        <h3 className="text-xl font-black uppercase tracking-tight">Fluxo de Capital</h3>
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1 opacity-80">Volume Transacional Mensal</p>
      </div>
      <div className="flex gap-2">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-[9px] font-black text-primary uppercase">Analytics Live</span>
      </div>
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
            <CartesianGrid strokeDasharray="6 6" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 'bold' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 'bold' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={4} fill="url(#colorVolume)" name="Volume" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-50">Aguardando dados...</div>
      )}
    </div>
  </Card>
);

export const SavingsChart = ({ data, economiaPct }: { data: Stats['economiaMensal']; economiaPct: number }) => (
  <Card className="p-8 rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden">
    <div className="flex items-center justify-between mb-8">
      <div>
        <h3 className="text-xl font-black uppercase tracking-tight">Otimização (Saving)</h3>
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-1 opacity-80">Economia Gerada via Cotação</p>
      </div>
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-none px-4 py-1.5 font-black text-[10px]">
        +{economiaPct.toFixed(1)}% EFFICIENCY
      </Badge>
    </div>
    <div className="h-72">
      <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-50 italic">
        Análise de Saving consolidada em tempo real
      </div>
    </div>
  </Card>
);

export const DistributionCharts = ({ distribuicaoTipo, distribuicaoStatus }: { distribuicaoTipo: Stats['distribuicaoTipo']; distribuicaoStatus: Stats['distribuicaoStatus'] }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <Card className="p-8 rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight">Mix de Suprimentos</h3>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">Por Categoria de Gasto</p>
        </div>
        <PieChartIcon className="w-5 h-5 text-muted-foreground/50" />
      </div>
      <div className="h-72 flex items-center justify-center text-[10px] font-black uppercase tracking-widest opacity-30">
        Gráficos Circulares Indisponíveis
      </div>
    </Card>

    <Card className="p-8 rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight">Status do Pipeline</h3>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">Fluxo de Pedidos Atual</p>
        </div>
        <PieChartIcon className="w-5 h-5 text-muted-foreground/50" />
      </div>
      <div className="h-72 flex items-center justify-center text-[10px] font-black uppercase tracking-widest opacity-30">
        Inteligência de Status em Processamento
      </div>
    </Card>
  </div>
);

export const SupplierPerformanceTable = ({ data }: { data: Stats['fornecedorPerformance'] }) => (
  <Card className="rounded-[2rem] border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden shadow-2xl">
    <div className="p-8 border-b border-border/10 flex items-center justify-between">
      <div>
        <h3 className="text-xl font-black uppercase tracking-tight">Top Performance Partners</h3>
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1 opacity-80">Ranking Qualitativo e Quantitativo</p>
      </div>
      <EliteButton variant="outline" size="sm" className="h-10 rounded-xl text-[9px] font-black">FULL REPORT</EliteButton>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/30 border-b border-border/10">
            <th className="text-left py-6 px-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Parceiro Estratégico</th>
            <th className="text-center py-6 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Transações</th>
            <th className="text-right py-6 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Volume Equity</th>
            <th className="text-center py-6 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">SLA Score</th>
            <th className="text-right py-6 px-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/5">
          {data.map((f, idx) => (
            <tr key={f.nome ?? idx} className="group hover:bg-primary/5 transition-colors cursor-pointer">

              <td className="py-5 px-8">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-inner",
                    idx === 0 ? "bg-amber-500/20 text-amber-600" : "bg-muted/50 text-muted-foreground"
                  )}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-foreground leading-none">{f.nome}</p>
                    <div className="flex items-center gap-1 mt-2">
                       {[...Array(5)].map((_, i) => (
                         <Star key={i} className={cn("w-2 h-2", i < f.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20")} />
                       ))}
                    </div>
                  </div>
                </div>
              </td>
              <td className="text-center font-bold text-sm">{f.pedidos}</td>
              <td className="text-right font-black text-foreground">
                R$ {f.volumeTotal.toLocaleString("pt-BR")}
              </td>
              <td className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/10 text-success rounded-full text-[10px] font-black">
                   {f.taxaEntrega}%
                </div>
              </td>
              <td className="text-right px-8">
                 <EliteButton variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                   <ChevronRight className="w-4 h-4" />
                 </EliteButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Card>
);
