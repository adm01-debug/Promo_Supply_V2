import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { solicitacoesMock, Solicitacao } from '@/data/mockData';
import { useSLASettings } from '@/stores/slaSettingsStore';

type SLAStatus = 'ok' | 'warning' | 'critical' | 'overdue';

const parsePrazoToDays = (prazo: string): number => {
  const match = prazo.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 14;
};

const calculateSLAStatus = (
  solicitacao: Solicitacao,
  warningDays: number,
  criticalDays: number
): SLAStatus | null => {
  const activeStatuses = ['AGUARDANDO_COTACAO', 'EM_COTACAO', 'FORNECEDOR_SELECIONADO', 'PEDIDO_GERADO', 'AGUARDANDO_PAGAMENTO', 'EM_TRANSITO'];
  if (!activeStatuses.includes(solicitacao.status)) {
    return null;
  }

  const prazoDays = parsePrazoToDays(solicitacao.prazoEntrega);
  const createdDate = new Date(solicitacao.createdAt);
  const deadline = new Date(createdDate);
  deadline.setDate(deadline.getDate() + prazoDays);
  
  const now = new Date();
  const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDeadline < 0) return 'overdue';
  if (daysUntilDeadline <= criticalDays) return 'critical';
  if (daysUntilDeadline <= warningDays) return 'warning';
  return 'ok';
};

const STATUS_CONFIG = {
  ok: {
    label: 'No Prazo',
    color: 'hsl(142, 71%, 45%)',
    icon: CheckCircle,
  },
  warning: {
    label: 'Atenção',
    color: 'hsl(38, 92%, 50%)',
    icon: Clock,
  },
  critical: {
    label: 'Crítico',
    color: 'hsl(0, 84%, 60%)',
    icon: AlertTriangle,
  },
  overdue: {
    label: 'Atrasado',
    color: 'hsl(0, 0%, 30%)',
    icon: AlertCircle,
  },
};

export const SLADistributionChart = () => {
  const { settings } = useSLASettings();

  const distributionData = useMemo(() => {
    const counts: Record<SLAStatus, number> = {
      ok: 0,
      warning: 0,
      critical: 0,
      overdue: 0,
    };

    solicitacoesMock.forEach((sol) => {
      const status = calculateSLAStatus(
        sol,
        settings.warningThresholdDays,
        settings.criticalThresholdDays
      );
      if (status) {
        counts[status]++;
      }
    });

    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([key, value]) => ({
        name: STATUS_CONFIG[key as SLAStatus].label,
        value,
        status: key as SLAStatus,
        color: STATUS_CONFIG[key as SLAStatus].color,
      }));
  }, [settings.warningThresholdDays, settings.criticalThresholdDays]);

  const total = distributionData.reduce((acc, item) => acc + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} pedidos ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Distribuição de SLA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-4">
          {/* Chart */}
          <div className="w-full lg:w-1/2 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="w-full lg:w-1/2 space-y-2">
            {distributionData.map((item) => {
              const Icon = STATUS_CONFIG[item.status].icon;
              const percentage = ((item.value / total) * 100).toFixed(0);
              return (
                <div
                  key={item.status}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <Icon className="h-4 w-4" style={{ color: item.color }} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.value}
                    </Badge>
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
            
            {/* Total */}
            <div className="flex items-center justify-between p-2 pt-3 border-t border-border mt-2">
              <span className="text-sm font-semibold">Total Ativos</span>
              <Badge className="text-xs">{total}</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
