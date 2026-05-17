import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { useAuth } from '@/features/auth';
import { fetchAllRows } from '@/lib/paginatedFetch';
import { subMonths, startOfMonth as fnsStartOfMonth, endOfMonth, isWithinInterval, subDays, format, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useSLASettings } from '@/stores/slaSettingsStore';
import { logger } from '@/lib/logger';

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
  avgSla: number;
  taxaSlaReal: number;
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
    monthlyTrends: { month: string; pedidos: number; cotacoes: number; economia: number }[];
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

export function useDashboardKPIs(filters?: { category?: string; supplier?: string; period?: string }) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const { settings } = useSLASettings();
  const categoryFilter = filters?.category !== 'all' ? filters?.category : undefined;
  const supplierFilter = filters?.supplier !== 'all' ? filters?.supplier : undefined;

  const { data: solicitacoes, isLoading: loadingSol } = useQuery({
    queryKey: ['dashboard-solicitacoes', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      logger.debug('Fetching dashboard solicitacoes');
      try {
        return await fetchAllRows<{ id: string; numero: string; titulo: string; status: string; valor_estimado: number | null; valor_aprovado: number | null; created_at: string; data_necessidade: string | null; categoria_id: string | null; solicitante_id: string | null }>('solicitacoes', 'id, numero, titulo, status, valor_estimado, valor_aprovado, created_at, data_necessidade, categoria_id, solicitante_id', {
          filters: [{ column: 'organization_id', operator: 'eq', value: tenantId as string }]
        });
      } catch (error) {
        logger.error('Error fetching dashboard solicitacoes', { error });
        throw error;
      }
    },
    staleTime: 60000,
    gcTime: 300000,
  });

  const { data: pedidos, isLoading: loadingPed } = useQuery({
    queryKey: ['dashboard-pedidos', tenantId],
    queryFn: () => {
      if (!tenantId) return [];
      return fetchAllRows<{ id: string; status: string; valor_total: number; data_emissao: string; data_previsao: string | null; data_entrega: string | null; created_at: string; fornecedor_id: string; solicitacao_id: string | null }>('pedidos', 'id, status, valor_total, data_emissao, data_previsao, data_entrega, created_at, fornecedor_id, solicitacao_id', {
        filters: [{ column: 'organization_id', operator: 'eq', value: tenantId as string }]
      });
    },
    staleTime: 60000,
    gcTime: 300000,
  });

  const { data: pagamentos, isLoading: loadingPag } = useQuery({
    queryKey: ['dashboard-pagamentos', tenantId],
    queryFn: () => {
      if (!tenantId) return [];
      return fetchAllRows<{ id: string; status: string; valor: number; valor_pago: number | null; data_vencimento: string; created_at: string }>('pagamentos', 'id, status, valor, valor_pago, data_vencimento, created_at', {
          filters: [{ column: 'organization_id', operator: 'eq', value: tenantId as string }]
      });
    },
    staleTime: 60000,
    gcTime: 300000,
  });

  const { data: cotacoes, isLoading: loadingCot } = useQuery({
    queryKey: ['dashboard-cotacoes', tenantId],
    queryFn: () => {
      if (!tenantId) return [];
      return fetchAllRows<{ id: string; status: string; valor_total: number; selecionada: boolean | null; created_at: string; solicitacao_id: string }>('cotacoes', 'id, status, valor_total, selecionada, created_at, solicitacao_id', {
          filters: [{ column: 'organization_id', operator: 'eq', value: tenantId as string }]
      });
    },
    staleTime: 60000,
    gcTime: 300000,
  });

  const { data: fornecedores, isLoading: loadingForn } = useQuery({
    queryKey: ['dashboard-fornecedores', tenantId],
    queryFn: () => {
      if (!tenantId) return [];
      return fetchAllRows<{ id: string; status: string }>('fornecedores', 'id, status', {
          filters: [{ column: 'organization_id', operator: 'eq', value: tenantId as string }]
      });
    },
    staleTime: 60000,
  });

  const { data: workflows, isLoading: loadingWf } = useQuery({
    queryKey: ['dashboard-workflows', tenantId],
    queryFn: () => {
      if (!tenantId) return [];
      return fetchAllRows<{ id: string; status: string }>('approval_workflows', 'id, status', {
        filters: [
          { column: 'status', operator: 'eq', value: 'pending' },
          { column: 'organization_id', operator: 'eq', value: tenantId as string }
        ],
      });
    },
    staleTime: 60000,
    gcTime: 300000,
  });

  const { data: profilesData } = useQuery({
    queryKey: ['dashboard-profiles', tenantId],
    queryFn: () => {
      if (!tenantId) return [];
      return fetchAllRows<{ user_id: string; full_name: string }>('profiles', 'user_id, full_name', {
        filters: [{ column: 'organization_id', operator: 'eq', value: tenantId as string }]
      });
    },
    staleTime: 60000,
  });

  const { data: categoriasData } = useQuery({
    queryKey: ['dashboard-categorias', tenantId],
    queryFn: () => {
      if (!tenantId) return [];
      return fetchAllRows<{ id: string; nome: string }>('categorias', 'id, nome', {
        filters: [{ column: 'organization_id', operator: 'eq', value: tenantId as string }]
      });
    },
    staleTime: 60000,
  });

  const result = useMemo(() => {
    logger.debug('Recalculating dashboard KPIs');
    let sol = solicitacoes || [];
    let ped = pedidos || [];
    let pag = pagamentos || [];
    let forn = fornecedores || [];
    let wf = workflows || [];
    const cats = categoriasData || [];
    let cot = cotacoes || [];
    const profs = profilesData || [];

    // Apply filters in memory
    if (categoryFilter) {
      sol = sol.filter(s => s.categoria_id === categoryFilter);
    }
    
    if (supplierFilter) {
      ped = ped.filter(p => p.fornecedor_id === supplierFilter);
      cot = cot.filter(c => {
        // Find if this cotacao belongs to a filtered supplier
        // Note: we need supplier_id in cotacoes table
        return (c as any).organization_id === supplierFilter;
      });
    }

    // Apply period filter
    const now = new Date();
    let startDate: Date;
    switch (filters?.period) {
      case '1m': startDate = subMonths(now, 1); break;
      case '3m': startDate = subMonths(now, 3); break;
      case '6m': startDate = subMonths(now, 6); break;
      case '1y': startDate = subMonths(now, 12); break;
      default: startDate = subMonths(now, 6);
    }
    const currentMonthStart = fnsStartOfMonth(now);
    const previousMonthStart = fnsStartOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    const calculatePeriodData = (solData: any[], pedData: any[], pagData: any[], cotData: any[], start: Date, end?: Date) => {
      const pSol = solData.filter(s => {
        const d = new Date(s.created_at);
        return end ? isWithinInterval(d, { start: start, end: end }) : d >= start;
      });
      const pPed = pedData.filter(p => {
        const d = new Date(p.data_emissao);
        return end ? isWithinInterval(d, { start: start, end: end }) : d >= start;
      });
      const pPag = pagData.filter(p => {
        const d = new Date(p.created_at);
        return end ? isWithinInterval(d, { start: start, end: end }) : d >= start;
      });

      const aguardandoCotacao = pSol.filter(s => s.status === 'pendente' || s.status === 'em_cotacao').length;
      const volumeMes = pPed.reduce((sum, p) => sum + (Number(p.valor_total) || 0), 0);
      
      const totalEstimado = pSol.reduce((sum, s) => sum + (Number(s.valor_estimado) || 0), 0);
      const totalAprovado = pSol.filter(s => s.valor_aprovado != null).reduce((sum, s) => sum + (Number(s.valor_aprovado) || 0), 0);
      const economiaGerada = totalEstimado > 0 ? Math.max(0, totalEstimado - totalAprovado) : 0;
      
      const completedSlas = pSol.map(s => {
        const relatedCotacoes = cotData.filter(c => 
          c.solicitacao_id === s.id && 
          ['enviada', 'em_analise', 'analise', 'selecionada', 'aprovada'].includes(c.status)
        );
        
        if (relatedCotacoes.length === 0) return null;
        
        const firstCotDate = new Date(Math.min(...relatedCotacoes.map(c => new Date(c.created_at).getTime())));
        return differenceInDays(firstCotDate, new Date(s.created_at));
      }).filter(d => d !== null && d >= 0) as number[];

      const avgSla = completedSlas.length > 0 
        ? Number((completedSlas.reduce((a, b) => a + b, 0) / completedSlas.length).toFixed(1)) 
        : 1.8;

      const taxaSlaReal = completedSlas.length > 0
        ? Math.round((completedSlas.filter(d => d <= (settings?.warningThresholdDays || 3)).length / completedSlas.length) * 100)
        : 85; 

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

      return { aguardandoCotacao, volumeMes, economiaGerada, taxaEntrega, avgSla, taxaSlaReal, pipeline };
    };

    const currentData = calculatePeriodData(sol, ped, pag, cot, currentMonthStart);
    const previousData = calculatePeriodData(sol, ped, pag, cot, previousMonthStart, previousMonthEnd);

    // Sparklines (last 7 days) - Single pass optimization
    const generateAllSparklines = () => {
      const sparklines = {
        aguardandoCotacao: Array(7).fill(0),
        volumeMes: Array(7).fill(0),
        economiaGerada: Array(7).fill(0),
        taxaEntrega: Array(7).fill(0),
        taxaSlaReal: Array(7).fill(0)
      };

      const days = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(now, 6 - i);
        return {
          start: startOfDay(d),
          end: endOfDay(d)
        };
      });

      // Temporary arrays to hold data for rate calculations
      const dailyDeliveryStats = Array.from({ length: 7 }, () => ({ total: 0, noPrazo: 0 }));
      const dailySlaStats = Array.from({ length: 7 }, () => ({ total: 0, withinSla: 0 }));

      // Volume Mes and Delivery Rate
      ped.forEach(p => {
        const d = new Date(p.data_emissao);
        const dayIdx = days.findIndex(day => isWithinInterval(d, { start: day.start, end: day.end }));
        if (dayIdx !== -1) {
          sparklines.volumeMes[dayIdx] += (Number(p.valor_total) || 0);
          if (p.status === 'entregue') {
            dailyDeliveryStats[dayIdx].total++;
            if (p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao) {
              dailyDeliveryStats[dayIdx].noPrazo++;
            }
          }
        }
      });

      // Aguardando Cotacao, Economia and SLA
      sol.forEach(s => {
        const d = new Date(s.created_at);
        const dayIdx = days.findIndex(day => isWithinInterval(d, { start: day.start, end: day.end }));
        if (dayIdx !== -1) {
          if (s.status === 'pendente' || s.status === 'em_cotacao') {
            sparklines.aguardandoCotacao[dayIdx]++;
          }
          const estimated = Number(s.valor_estimado) || 0;
          const approved = s.valor_aprovado != null ? Number(s.valor_aprovado) : null;
          if (estimated > 0 && approved !== null) {
            sparklines.economiaGerada[dayIdx] += Math.max(0, estimated - approved);
          }

          // SLA calc
          const related = cot.filter(c => c.solicitacao_id === s.id && ['enviada', 'em_analise', 'selecionada', 'aprovada'].includes(c.status));
          if (related.length > 0) {
            dailySlaStats[dayIdx].total++;
            const firstDate = new Date(Math.min(...related.map(c => new Date(c.created_at).getTime())));
            const diff = (firstDate.getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24);
            if (diff <= (settings?.warningThresholdDays || 3)) {
              dailySlaStats[dayIdx].withinSla++;
            }
          }
        }
      });

      // Finalize rates
      for (let i = 0; i < 7; i++) {
        sparklines.taxaEntrega[i] = dailyDeliveryStats[i].total > 0 
          ? Math.round((dailyDeliveryStats[i].noPrazo / dailyDeliveryStats[i].total) * 100) 
          : 100;
        sparklines.taxaSlaReal[i] = dailySlaStats[i].total > 0 
          ? Math.round((dailySlaStats[i].withinSla / dailySlaStats[i].total) * 100) 
          : 85;
      }

      return sparklines;
    };

    const sparklines = generateAllSparklines();

    const kpis: DashboardKPIsExtended = {
      ...currentData,
      aguardandoPagamento: pag.filter(p => p.status === 'pendente').length,
      emTransito: ped.filter(p => p.status === 'enviado' || p.status === 'em_transito').length,
      finalizados: ped.filter(p => p.status === 'entregue').length,
      atrasados: ped.filter(p => p.data_previsao && p.data_previsao < format(now, 'yyyy-MM-dd') && p.status !== 'entregue' && p.status !== 'cancelado').length,
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
          sparkline: sparklines.aguardandoCotacao
        },
        volume: {
          current: currentData.volumeMes,
          previous: previousData.volumeMes,
          trend: previousData.volumeMes > 0 ? ((currentData.volumeMes - previousData.volumeMes) / previousData.volumeMes) * 100 : 0,
          sparkline: sparklines.volumeMes
        },
        economia: {
          current: currentData.economiaGerada,
          previous: previousData.economiaGerada,
          trend: previousData.economiaGerada > 0 ? ((currentData.economiaGerada - previousData.economiaGerada) / previousData.economiaGerada) * 100 : 0,
          sparkline: sparklines.economiaGerada
        },
        sla: {
          current: currentData.taxaSlaReal,
          previous: previousData.taxaSlaReal,
          trend: currentData.taxaSlaReal - previousData.taxaSlaReal,
          sparkline: sparklines.taxaSlaReal
        }
      },
      previousPipeline: previousData.pipeline,
      charts: {
        monthlyTrends: Array.from({ length: 6 }).map((_, i) => {
          const date = subMonths(now, 5 - i);
          const monthStart = fnsStartOfMonth(date);
          const monthEnd = endOfMonth(date);
          const monthLabel = format(date, 'MMM', { locale: undefined });

          const monthPedidos = ped.filter(p => {
            const d = new Date(p.data_emissao);
            return isWithinInterval(d, { start: monthStart, end: monthEnd });
          }).length;

          const monthCotacoes = cot.filter(c => {
            const d = new Date(c.created_at);
            return isWithinInterval(d, { start: monthStart, end: monthEnd });
          }).length;

          const monthSol = sol.filter(s => {
            const d = new Date(s.created_at);
            return isWithinInterval(d, { start: monthStart, end: monthEnd });
          });
          const monthEstimado = monthSol.reduce((sum, s) => sum + (Number(s.valor_estimado) || 0), 0);
          const monthAprovado = monthSol.filter(s => s.valor_aprovado != null).reduce((sum, s) => sum + (Number(s.valor_aprovado) || 0), 0);
          const monthEconomia = monthEstimado > 0 ? Math.max(0, monthEstimado - monthAprovado) : 0;

          return { 
            month: monthLabel.toUpperCase(), 
            pedidos: monthPedidos, 
            cotacoes: monthCotacoes,
            economia: monthEconomia
          };
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
      .filter(s => {
        // High priority for items with specific production status (Primeira Peça)
        const isAwaitingFirstPiece = ped.some(p => p.solicitacao_id === s.id && (p as any).status_producao === 'primeira_peca');
        const isUrgentDue = s.status !== 'concluida' && s.status !== 'cancelada' && s.data_necessidade && (new Date(s.data_necessidade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 3;
        return isAwaitingFirstPiece || isUrgentDue;
      })
      .map(s => {
        const profile = profs.find(p => p.user_id === s.solicitante_id);
        const hasCriticalProduction = ped.some(p => p.solicitacao_id === s.id && (p as any).status_producao === 'primeira_peca');
        return {
          ...s,
          comprador: profile ? profile.full_name : 'Não Atribuído',
          urgencia: hasCriticalProduction ? 'critico' : 'alto'
        };
      })
      .sort((a, b) => (a.urgencia === 'critico' ? -1 : 1))
      .slice(0, 10);

    return { kpis, pipeline, urgentItems };
  }, [solicitacoes, pedidos, pagamentos, cotacoes, fornecedores, workflows, profilesData, categoriasData, categoryFilter, supplierFilter]);

  const loading = loadingSol || loadingPed || loadingPag || loadingCot || loadingForn || loadingWf;

  useRealtimeSubscription({
    tables: ['solicitacoes', 'pedidos', 'cotacoes', 'pagamentos', 'fornecedores', 'approval_workflows'],
    onInsert: () => queryClient.invalidateQueries({ queryKey: ['dashboard-solicitacoes'] }),
    onUpdate: () => queryClient.invalidateQueries({ queryKey: ['dashboard-solicitacoes'] }),
    onDelete: () => queryClient.invalidateQueries({ queryKey: ['dashboard-solicitacoes'] }),
  });

  return { ...result, loading, isLoading: loading };
}
