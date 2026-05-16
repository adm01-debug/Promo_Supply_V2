import { Card } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Timer, 
  Target, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight 
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  trendValue?: string;
  trendIcon?: any;
  variant?: 'default' | 'info' | 'success' | 'destructive';
}

const StatCard = ({ title, value, icon: Icon, trend, trendValue, trendIcon: TrendIcon, variant = 'default' }: StatCardProps) => {
  const variantColors = {
    default: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${variantColors[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </div>
      {trend && (
        <div className={`mt-2 flex items-center gap-1 text-xs ${trend === 'up' ? 'text-success' : 'text-destructive'}`}>
          {TrendIcon && <TrendIcon className="w-3 h-3" />}
          {trendValue}
        </div>
      )}
    </Card>
  );
};

export const ApprovalKPIs = ({ metrics }: { metrics: any }) => (
  <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
    <StatCard 
      title="Taxa de Aprovação"
      value={`${metrics.taxaAprovacao.toFixed(1)}%`}
      icon={Target}
      trend="up"
      trendValue="+2.3% vs período anterior"
      trendIcon={ArrowUpRight}
    />
    <StatCard 
      title="Tempo Médio"
      value={`${metrics.tempoMedioGeral.toFixed(1)}h`}
      icon={Timer}
      trend="down"
      trendValue="-0.8h vs período anterior"
      trendIcon={TrendingDown}
      variant="info"
    />
    <StatCard 
      title="Total Aprovadas"
      value={metrics.totalAprovadas}
      icon={CheckCircle2}
      variant="success"
    />
    <StatCard 
      title="Total Rejeitadas"
      value={metrics.totalRejeitadas}
      icon={XCircle}
      variant="destructive"
    />
  </div>
);
