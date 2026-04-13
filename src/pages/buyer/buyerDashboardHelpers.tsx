import { toast } from "sonner";
import type { BuyerData } from "@/hooks/useBuyerPerformanceData";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

export const COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(221, 83%, 53%)', 'hsl(262, 83%, 58%)'];

export const PERIOD_MAP: Record<string, number> = { '3m': 3, '6m': 6, '12m': 12 };

export const getMetricStatus = (percentage: number): { status: 'success' | 'warning' | 'critical'; color: string } => {
  if (percentage >= 100) return { status: 'success', color: 'text-success' };
  if (percentage >= 85) return { status: 'warning', color: 'text-warning' };
  return { status: 'critical', color: 'text-destructive' };
};

export const MetricStatusIcon = ({ percentage }: { percentage: number }) => {
  const { status } = getMetricStatus(percentage);
  if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-success" />;
  if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-warning" />;
  return <AlertCircle className="w-4 h-4 text-destructive" />;
};

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
    <Skeleton className="h-24 w-full" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Skeleton className="h-80 lg:col-span-2" />
      <Skeleton className="h-80" />
    </div>
  </div>
);

export const EmptyState = () => (
  <Card className="p-12 text-center">
    <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
    <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum comprador encontrado</h3>
    <p className="text-sm text-muted-foreground">
      Cadastre perfis de compradores para visualizar métricas de performance.
    </p>
  </Card>
);

export function exportBuyerCSV(buyer: BuyerData) {
  const rows = [
    ['Métrica', 'Valor'],
    ['Nome', buyer.nome],
    ['Economia do Mês', `R$ ${buyer.performance.economiaMes.toLocaleString('pt-BR')}`],
    ['Economia do Ano', `R$ ${buyer.performance.economiaAno.toLocaleString('pt-BR')}`],
    ['Desconto Médio', `${buyer.performance.descontoMedio}%`],
    ['Taxa Melhor Preço', `${buyer.performance.melhorPrecoRate}%`],
    ['Cotações Realizadas', String(buyer.performance.cotacoesRealizadas)],
    ['Tempo Médio (dias)', String(buyer.performance.tempoMedioNegociacao)],
    ['Taxa de Sucesso', `${buyer.performance.taxaSucesso}%`],
    ['Fornecedores Ativos', String(buyer.performance.fornecedoresAtivos)],
    [''],
    ['Histórico Mensal'],
    ['Mês', 'Economia', 'Cotações', 'Desconto'],
    ...buyer.historico.map(h => [h.mes, `R$ ${h.economia}`, String(h.cotacoes), `${h.desconto}%`]),
  ];
  const bom = '\uFEFF';
  const csv = bom + rows.map(r => r.join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `performance-${buyer.nome.replace(/\s+/g, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exportado com sucesso');
}
