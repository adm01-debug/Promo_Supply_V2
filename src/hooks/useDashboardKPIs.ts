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
  previousPipeline: PipelineData;
  charts: {
    monthlyTrends: { month: string; pedidos: number; cotacoes: number }[];
    cotacaoStatus: { name: string; value: number; color: string }[];
    topCategories: { name: string; value: number; percentage: number }[];
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
    queryFn: () => fetchAllRows<{ id: string; numero: string; titulo: string; status: string; valor_estimado: number | null; valor_aprovado: number | null; created_at: string; data_necessidade: string | null; categoria_id: string | null; solicitante_id: string | null }>('solicitacoes', 'id, numero, titulo, status, valor_estimado, valor_aprovado, created_at, data_necessidade, categoria_id, solicitante_id'),
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

  const { data: profilesData } = useQuery({
    queryKey: ['dashboard-profiles'],
    queryFn: () => fetchAllRows<{ user_id: string; full_name: string }>('profiles', 'user_id, full_name'),
    staleTime: 60000,
  });

  const { data: categoriasData } = useQuery({
    queryKey: ['dashboard-categorias'],
    queryFn: () => fetchAllRows<{ id: string; nome: string }>('categorias', 'id, nome'),
    staleTime: 60000,
  });

  const result = useMemo(() => {
    const sol = solicitacoes || [];
    const ped = pedidos || [];
    const pag = pagamentos || [];
    const forn = fornecedores || [];
    const wf = workflows || [];
    const cats = categoriasData || [];
    const cot = cotacoes || [];
    const profs = profilesData || [];

    const now = new Date();
    const currentMonthStart = fnsStartOfMonth(now);
    const previousMonthStart = fnsStartOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    // Helper to calculate KPIs for a specific period
    const calculatePeriodData = (startDate: Date, endDate?: Date) => {
      const pSol = sol.filter(s => {
        const d = new Date(s.created_at);
        return endDate ? isWithinInterval(d, { start: startDate, end: endDate }) : d >= startDate;
      });
      const pPed = ped.filter(p => {
        const d = new Date(p.data_emissao);
        return endDate ? isWithinInterval(d, { start: startDate, end: endDate }) : d >= startDate;
      });
      const pPag = pag.filter(p => {
        const d = new Date(p.created_at);
        return endDate ? isWithinInterval(d, { start: startDate, end: endDate }) : d >= startDate;
      });
      const pCot = cot.filter(c => {
        const d = new Date(c.created_at);
        return endDate ? isWithinInterval(d, { start: startDate, end: endDate }) : d >= startDate;
      });

      const aguardandoCotacao = pSol.filter(s => s.status === 'pendente' || s.status === 'em_cotacao').length;
      const volumeMes = pPed.reduce((sum, p) => sum + (Number(p.valor_total) || 0), 0);
      
      const totalEstimado = pSol.reduce((sum, s) => sum + (Number(s.valor_estimado) || 0), 0);
      const totalAprovado = pSol.filter(s => s.valor_aprovado != null).reduce((sum, s) => sum + (Number(s.valor_aprovado) || 0), 0);
      const economiaGerada = totalEstimado > 0 ? Math.max(0, totalEstimado - totalAprovado) : 0;
      
      // Calculate SLA: Avg days from solicitation to first quotation
      // This is a more complex calculation that needs mapping cotacoes to solicitacoes
      // For now, we'll use a mock average that varies slightly for the trend
      const avgSla = 2.5; // days
      
      const entregues = pPed.filter(p => p.status === 'entregue');
      const entreguesNoPrazo = entregues.filter(p => p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao).length;
      const taxaEntrega = entregues.length > 0 ? Math.round((entreguesNoPrazo / entregues.length) * 100) : 100;

      const pipeline: PipelineData = {
        solicitacao: pSol.filter(s => s.status === 'pendente' || s.status === 'em_cotacao').length,
        cotacao: pSol.filter(s => s.status === 'em_cotacao' || s.status === 'aprovada').length,
        pedido: pPed.filter(p => p.status === 'pendente' || p.status === 'aprovado').length,
        pagamento: pPag.filter(p => p.status === 'pendente' || p.status === 'aprovado' || p.status === 'agendado').length,
        transito: pPed.filter(p => p.status === 'enviado' || p.status === 'em_transito').length,
        entregue: pPed.filter(p => p.status === 'entregue').length,
      };

      return { aguardandoCotacao, volumeMes, economiaGerada, taxaEntrega, avgSla, pipeline };
    };
    };

    const currentData = calculatePeriodData(currentMonthStart);
    const previousData = calculatePeriodData(previousMonthStart, previousMonthEnd);

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
      ...currentData,
      aguardandoPagamento: pag.filter(p => p.status === 'pendente').length,
      emTransito: ped.filter(p => p.status === 'enviado' || p.status === 'em_transito').length,
      finalizados: ped.filter(p => p.status === 'entregue').length,
      atrasados: ped.filter(p => p.data_previsao && p.data_previsao < now.toISOString().split('T')[0] && p.status !== 'entregue' && p.status !== 'cancelado').length,
      totalSolicitacoes: sol.length,
      totalFornecedores: forn.filter(f => f.status === 'ativo').length,
      totalPedidos: ped.length,
      pendingApprovals: wf.length,
      economiaPercentual: currentData.volumeMes > 0 ? Math.round((currentData.economiaGerada / currentData.volumeMes) * 100) : 0,
      comparisons: {
        aguardando: {
          current: currentData.aguardandoCotacao,
          previous: previousData.aguardandoCotacao,
          trend: previousData.aguardandoCotacao > 0 ? ((currentData.aguardandoCotacao - previousData.aguardandoCotacao) / previousData.aguardandoCotacao) * 100 : 0,
          sparkline: generateSparkline('aguardandoCotacao')
        },
        volume: {
          current: currentData.volumeMes,
          previous: previousData.volumeMes,
          trend: previousData.volumeMes > 0 ? ((currentData.volumeMes - previousData.volumeMes) / previousData.volumeMes) * 100 : 0,
          sparkline: generateSparkline('volumeMes')
        },
        economia: {
          current: currentData.economiaGerada,
          previous: previousData.economiaGerada,
          trend: previousData.economiaGerada > 0 ? ((currentData.economiaGerada - previousData.economiaGerada) / previousData.economiaGerada) * 100 : 0,
          sparkline: generateSparkline('economiaGerada')
        },
        sla: {
          current: currentData.taxaEntrega,
          previous: previousData.taxaEntrega,
          trend: currentData.taxaEntrega - previousData.taxaEntrega,
          sparkline: generateSparkline('taxaEntrega')
        }
      },
      previousPipeline: previousData.pipeline,
      charts: {
        monthlyTrends: Array.from({ length: 6 }).map((_, i) => {
          const date = subMonths(now, 5 - i);
          const monthStart = fnsStartOfMonth(date);
          const monthEnd = endOfMonth(date);
          const monthLabel = format(date, 'MMM', { locale: undefined }); // 'MMM' works fine

          const monthPedidos = ped.filter(p => {
            const d = new Date(p.data_emissao);
            return isWithinInterval(d, { start: monthStart, end: monthEnd });
          }).length;

          const monthCotacoes = cot.filter(c => {
            const d = new Date(c.created_at);
            return isWithinInterval(d, { start: monthStart, end: monthEnd });
          }).length;

          return { month: monthLabel.toUpperCase(), pedidos: monthPedidos, cotacoes: monthCotacoes };
        }),
        cotacaoStatus: [
          { name: 'Em Aberto', value: cot.filter(c => c.status === 'pendente' || c.status === 'em_analise').length, color: '#f59e0b' },
          { name: 'Finalizadas', value: cot.filter(c => c.status === 'selecionada' || c.status === 'aprovada').length, color: '#10b981' },
          { name: 'Canceladas', value: cot.filter(c => c.status === 'cancelada' || c.status === 'rejeitada').length, color: '#ef4444' },
        ],
        topCategories: (() => {
          const categoryCounts: Record<string, number> = {};
          sol.forEach(s => {
            if (s.categoria_id) {
              categoryCounts[s.categoria_id] = (categoryCounts[s.categoria_id] || 0) + 1;
            }
          });
          
          const totalWithCategory = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
          
          return Object.entries(categoryCounts)
            .map(([id, count]) => {
              const cat = cats.find(c => c.id === id);
              return {
                name: cat ? cat.nome : 'Outros',
                value: count,
                percentage: totalWithCategory > 0 ? Math.round((count / totalWithCategory) * 100) : 0
              };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
        })()
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
      .map(s => {
        const profile = profs.find(p => p.user_id === s.solicitante_id);
        return {
          ...s,
          comprador: profile ? profile.full_name : 'Não Atribuído'
        };
      })
      .slice(0, 10);

    return { kpis, pipeline, urgentItems };
  }, [solicitacoes, pedidos, pagamentos, cotacoes, fornecedores, workflows]);

  const loading = loadingSol || loadingPed || loadingPag || loadingCot || loadingForn || loadingWf;

  return { ...result, loading };
}
