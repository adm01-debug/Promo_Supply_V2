import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchAllRows } from '@/lib/paginatedFetch';
import { subMonths, startOfMonth as fnsStartOfMonth, endOfMonth, isWithinInterval, subDays, format } from 'date-fns';

export interface DashboardKPIs {
  aguardandoCotacao: number;
  aguardandoPagamento: number;
  emTransito: number;
  finalizados: number;
  volumeMes: number;
  atrasados: number;
  taxaEntrega: number;
  totalSolicitacoes: number;
  totalFornecedores: number;
  totalPedidos: number;
  pendingApprovals: number;
  economiaGerada: number;
  economiaPercentual: number;
}

export interface KPIComparison {
  current: number;
  previous: number;
  trend: number;
  sparkline: number[];
}

export interface DashboardKPIsExtended extends DashboardKPIs {
  comparisons: {
    aguardando: KPIComparison;
    volume: KPIComparison;
    economia: KPIComparison;
    sla: KPIComparison;
  };
}

export interface PipelineData {
  solicitacao: number;
  cotacao: number;
  pedido: number;
  pagamento: number;
  transito: number;
  entregue: number;
}

export function useDashboardKPIs() {
  const { data: solicitacoes, isLoading: loadingSol } = useQuery({
    queryKey: ['dashboard-solicitacoes'],
    queryFn: () => fetchAllRows<{ id: string; numero: string; titulo: string; status: string; valor_estimado: number | null; valor_aprovado: number | null; created_at: string; data_necessidade: string | null }>('solicitacoes', 'id, numero, titulo, status, valor_estimado, valor_aprovado, created_at, data_necessidade'),
    staleTime: 30000,
  });

  const { data: pedidos, isLoading: loadingPed } = useQuery({
    queryKey: ['dashboard-pedidos'],
    queryFn: () => fetchAllRows<{ id: string; status: string; valor_total: number; data_emissao: string; data_previsao: string | null; data_entrega: string | null; created_at: string }>('pedidos', 'id, status, valor_total, data_emissao, data_previsao, data_entrega, created_at'),
    staleTime: 30000,
  });

  const { data: pagamentos, isLoading: loadingPag } = useQuery({
    queryKey: ['dashboard-pagamentos'],
    queryFn: () => fetchAllRows<{ id: string; status: string; valor: number; valor_pago: number | null; data_vencimento: string; created_at: string }>('pagamentos', 'id, status, valor, valor_pago, data_vencimento, created_at'),
    staleTime: 30000,
  });

  const { data: cotacoes, isLoading: loadingCot } = useQuery({
    queryKey: ['dashboard-cotacoes'],
    queryFn: () => fetchAllRows<{ id: string; status: string; valor_total: number; selecionada: boolean | null; created_at: string }>('cotacoes', 'id, status, valor_total, selecionada, created_at'),
    staleTime: 30000,
  });

  const { data: fornecedores, isLoading: loadingForn } = useQuery({
    queryKey: ['dashboard-fornecedores'],
    queryFn: () => fetchAllRows<{ id: string; status: string }>('fornecedores', 'id, status'),
    staleTime: 60000,
  });

  const { data: workflows, isLoading: loadingWf } = useQuery({
    queryKey: ['dashboard-workflows'],
    queryFn: () => fetchAllRows<{ id: string; status: string }>('approval_workflows', 'id, status', {
      filters: [{ column: 'status', operator: 'eq', value: 'pending' }],
    }),
    staleTime: 30000,
  });

  const result = useMemo(() => {
    const sol = solicitacoes || [];
    const ped = pedidos || [];
    const pag = pagamentos || [];
    const forn = fornecedores || [];
    const wf = workflows || [];

    const now = new Date();
    const currentMonthStart = fnsStartOfMonth(now);
    const previousMonthStart = fnsStartOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    // Helper to calculate KPIs for a specific period
    const calculatePeriodKPIs = (startDate: Date, endDate?: Date) => {
      const pSol = sol.filter(s => {
        const d = new Date(s.created_at);
        return endDate ? isWithinInterval(d, { start: startDate, end: endDate }) : d >= startDate;
      });
      const pPed = ped.filter(p => {
        const d = new Date(p.data_emissao);
        return endDate ? isWithinInterval(d, { start: startDate, end: endDate }) : d >= startDate;
      });

      const aguardandoCotacao = pSol.filter(s => s.status === 'pendente' || s.status === 'em_cotacao').length;
      const volumeMes = pPed.reduce((sum, p) => sum + (Number(p.valor_total) || 0), 0);
      
      const totalEstimado = pSol.reduce((sum, s) => sum + (Number(s.valor_estimado) || 0), 0);
      const totalAprovado = pSol.filter(s => s.valor_aprovado != null).reduce((sum, s) => sum + (Number(s.valor_aprovado) || 0), 0);
      const economiaGerada = totalEstimado > 0 ? Math.max(0, totalEstimado - totalAprovado) : 0;
      
      const entregues = pPed.filter(p => p.status === 'entregue');
      const entreguesNoPrazo = entregues.filter(p => p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao).length;
      const taxaEntrega = entregues.length > 0 ? Math.round((entreguesNoPrazo / entregues.length) * 100) : 100;

      return { aguardandoCotacao, volumeMes, economiaGerada, taxaEntrega };
    };

    const currentKpis = calculatePeriodKPIs(currentMonthStart);
    const previousKpis = calculatePeriodKPIs(previousMonthStart, previousMonthEnd);

    // Sparklines (last 7 days)
    const generateSparkline = (key: 'aguardandoCotacao' | 'volumeMes' | 'economiaGerada' | 'taxaEntrega') => {
      return Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(now, 6 - i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        
        if (key === 'volumeMes') {
          return ped.filter(p => {
            const d = new Date(p.data_emissao);
            return isWithinInterval(d, { start: dayStart, end: dayEnd });
          }).reduce((sum, p) => sum + (Number(p.valor_total) || 0), 0);
        }
        if (key === 'aguardandoCotacao') {
          return sol.filter(s => {
            const d = new Date(s.created_at);
            return isWithinInterval(d, { start: dayStart, end: dayEnd }) && (s.status === 'pendente' || s.status === 'em_cotacao');
          }).length;
        }
        if (key === 'economiaGerada') {
          const dailySol = sol.filter(s => {
            const d = new Date(s.created_at);
            return isWithinInterval(d, { start: dayStart, end: dayEnd });
          });
          const totalEstimado = dailySol.reduce((sum, s) => sum + (Number(s.valor_estimado) || 0), 0);
          const totalAprovado = dailySol.filter(s => s.valor_aprovado != null).reduce((sum, s) => sum + (Number(s.valor_aprovado) || 0), 0);
          return totalEstimado > 0 ? Math.max(0, totalEstimado - totalAprovado) : 0;
        }
        if (key === 'taxaEntrega') {
          const dailyPed = ped.filter(p => {
            const d = new Date(p.data_emissao);
            return isWithinInterval(d, { start: dayStart, end: dayEnd });
          });
          const entregues = dailyPed.filter(p => p.status === 'entregue');
          const noPrazo = entregues.filter(p => p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao).length;
          return entregues.length > 0 ? Math.round((noPrazo / entregues.length) * 100) : 100;
        }
        return 0;
      });
    };

    const kpis: DashboardKPIsExtended = {
      ...currentKpis,
      aguardandoPagamento: pag.filter(p => p.status === 'pendente').length,
      emTransito: ped.filter(p => p.status === 'enviado' || p.status === 'em_transito').length,
      finalizados: ped.filter(p => p.status === 'entregue').length,
      atrasados: ped.filter(p => p.data_previsao && p.data_previsao < now.toISOString().split('T')[0] && p.status !== 'entregue' && p.status !== 'cancelado').length,
      totalSolicitacoes: sol.length,
      totalFornecedores: forn.filter(f => f.status === 'ativo').length,
      totalPedidos: ped.length,
      pendingApprovals: wf.length,
      economiaPercentual: currentKpis.volumeMes > 0 ? Math.round((currentKpis.economiaGerada / currentKpis.volumeMes) * 100) : 0,
      comparisons: {
        aguardando: {
          current: currentKpis.aguardandoCotacao,
          previous: previousKpis.aguardandoCotacao,
          trend: previousKpis.aguardandoCotacao > 0 ? ((currentKpis.aguardandoCotacao - previousKpis.aguardandoCotacao) / previousKpis.aguardandoCotacao) * 100 : 0,
          sparkline: generateSparkline('aguardandoCotacao')
        },
        volume: {
          current: currentKpis.volumeMes,
          previous: previousKpis.volumeMes,
          trend: previousKpis.volumeMes > 0 ? ((currentKpis.volumeMes - previousKpis.volumeMes) / previousKpis.volumeMes) * 100 : 0,
          sparkline: generateSparkline('volumeMes')
        },
        economia: {
          current: currentKpis.economiaGerada,
          previous: previousKpis.economiaGerada,
          trend: previousKpis.economiaGerada > 0 ? ((currentKpis.economiaGerada - previousKpis.economiaGerada) / previousKpis.economiaGerada) * 100 : 0,
          sparkline: generateSparkline('economiaGerada')
        },
        sla: {
          current: currentKpis.taxaEntrega,
          previous: previousKpis.taxaEntrega,
          trend: currentKpis.taxaEntrega - previousKpis.taxaEntrega,
          sparkline: generateSparkline('taxaEntrega')
        }
      }
    };

    const pipeline: PipelineData = {
      solicitacao: sol.filter(s => s.status === 'pendente' || s.status === 'em_cotacao').length,
      cotacao: sol.filter(s => s.status === 'em_cotacao' || s.status === 'aprovada').length,
      pedido: ped.filter(p => p.status === 'pendente' || p.status === 'aprovado').length,
      pagamento: pag.filter(p => p.status === 'pendente' || p.status === 'aprovado' || p.status === 'agendado').length,
      transito: ped.filter(p => p.status === 'enviado' || p.status === 'em_transito').length,
      entregue: ped.filter(p => p.status === 'entregue').length,
    };

    const urgentItems = sol
      .filter(s => s.status !== 'concluida' && s.status !== 'cancelada' && s.data_necessidade && (new Date(s.data_necessidade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 3)
      .slice(0, 5);

    return { kpis, pipeline, urgentItems };
  }, [solicitacoes, pedidos, pagamentos, cotacoes, fornecedores, workflows]);

  const loading = loadingSol || loadingPed || loadingPag || loadingCot || loadingForn || loadingWf;

  return { ...result, loading };
}
