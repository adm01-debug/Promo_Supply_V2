import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  TooltipProps,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { TrendingUp, BarChart3, AlertTriangle } from "lucide-react";
import { 
  ApprovalTrendItem, 
  StatusDistributionItem, 
  BottleneckItem 
} from "../types/approval.types";

interface PayloadEntry {
  name: string;
  value: number | string;
  color: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground">{label}</p>
        {(payload as PayloadEntry[]).map((entry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}{String(entry.name).includes('Tempo') ? 'h' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ApprovalTrendChart = ({ data }: { data: ApprovalTrendItem[] }) => (
  <Card className="p-6">
    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
      <TrendingUp className="w-4 h-4 text-primary" />
      Tendência de Aprovações
    </h3>
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorAprovadas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorRejeitadas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Area type="monotone" dataKey="aprovadas" name="Aprovadas" stroke="#10b981" fill="url(#colorAprovadas)" strokeWidth={2} />
        <Area type="monotone" dataKey="rejeitadas" name="Rejeitadas" stroke="#ef4444" fill="url(#colorRejeitadas)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  </Card>
);

export const StatusDistributionChart = ({ data }: { data: StatusDistributionItem[] }) => (
  <Card className="p-6">
    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
      <BarChart3 className="w-4 h-4 text-primary" />
      Distribuição por Status
    </h3>
    <div className="flex items-center">
      <ResponsiveContainer width="50%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm">{item.name}</span>
            </div>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

export const BottleneckAnalysis = ({ data }: { data: BottleneckItem[] }) => (
  <Card className="p-6">
    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-warning" />
      Análise de Gargalos
    </h3>
    <div className="space-y-4">
      {data.map((item, idx) => (
        <div key={idx}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-foreground">{item.etapa}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{item.tempo}h média</span>
              <Badge variant="outline" className="text-xs">{item.percentual}%</Badge>
            </div>
          </div>
          <Progress value={item.percentual} className="h-2" />
        </div>
      ))}
    </div>
    <p className="text-xs text-muted-foreground mt-4">
      * Tempos baseados na média dos últimos 30 dias.
    </p>
  </Card>
);
