import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

export interface KPIComparison {
  current: number;
  previous: number;
  trend: number;
  sparkline: number[];
}

export interface PipelineData {
  solicitacao: number;
  cotacao: number;
  pedido: number;
  pagamento: number;
  transito: number;
  entregue: number;
}

export interface DashboardKPIsExtended {
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
  comparisons: {
    aguardando: KPIComparison;
    volume: KPIComparison;
    economia: KPIComparison;
    sla: KPIComparison;
  };
  pipeline: PipelineData;
  urgentItems: { id: string; status: string; data_necessidade: string | null; [key: string]: unknown }[];
  charts: {
    monthlyTrends: { month: string; pedidos: number; cotacoes: number; economia: number }[];
    cotacaoStatus: { name: string; value: number; color: string }[];
    topCategories: { name: string; value: number; percentage: number }[];
  };
}

interface RpcKpi { current: number; previous: number }

interface RpcSlaMetrics {
  avgSla: number;
  taxaSlaReal: number;
  previousAvgSla: number;
  previousTaxaSlaReal: number;
  amostra: number;
  amostraAnterior: number;
}
interface RpcDashboardMetrics {
  kpis: { aguardando: RpcKpi; volume: RpcKpi; economia: RpcKpi };
  pipeline: PipelineData;
  urgentItems: DashboardKPIsExtended['urgentItems'];
  trends: DashboardKPIsExtended['charts']['monthlyTrends'];
  cotacaoStatus: DashboardKPIsExtended['charts']['cotacaoStatus'];
  topCategories: DashboardKPIsExtended['charts']['topCategories'];
}

export function useDashboardKPIs(filters?: { category?: string; supplier?: string; period?: string }) {
  const { organizationId, user } = useAuth();
  
  const categoryId = (filters?.category && filters.category !== 'all') ? filters.category : null;
  const supplierId = (filters?.supplier && filters.supplier !== 'all') ? filters.supplier : null;
  const period = filters?.period || '6m';

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-metrics-optimized', organizationId, period, categoryId, supplierId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data, error } = await supabase.rpc('get_compras_dashboard_metrics', {
        p_organization_id: organizationId,
        p_period: period,
        p_category_id: (categoryId as string | undefined),
        p_supplier_id: (supplierId as string | undefined)
      });

      if (error) {
        logger.error('Error fetching dashboard metrics via RPC', { error });
        throw error;
      }

      const rpcData = data as unknown as RpcDashboardMetrics;

      // SLA vem de RPC propria (get_compras_sla_metrics). Falha aqui nao pode
      // derrubar o dashboard inteiro: cai em 0 e registra o erro.
      const { data: slaData, error: slaError } = await supabase.rpc('get_compras_sla_metrics', {
        p_organization_id: organizationId,
        p_period: period,
        p_category_id: (categoryId as string | undefined),
        p_supplier_id: (supplierId as string | undefined),
      });
      if (slaError) logger.error('Error fetching SLA metrics', { error: slaError });
      const sla = ((slaError ? null : slaData) ?? {
        avgSla: 0, taxaSlaReal: 0, previousAvgSla: 0, previousTaxaSlaReal: 0, amostra: 0, amostraAnterior: 0,
      }) as unknown as RpcSlaMetrics;
      
      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
      };

      // Without real time-series data, return an empty sparkline. The consumer
      // renders a placeholder. (Previously Math.random() generated a new fake
      // line on every refetch, causing the UI to flicker and showing
      // misleading "data".)
      const generateSparkline = (_base: number, _count: number = 7): number[] => [];

      const extended: DashboardKPIsExtended = {
        aguardandoCotacao: rpcData.pipeline.solicitacao,
        aguardandoPagamento: rpcData.pipeline.pagamento,
        emTransito: rpcData.pipeline.transito,
        finalizados: rpcData.pipeline.entregue,
        volumeMes: rpcData.kpis.volume.current,
        atrasados: 0,
        taxaEntrega: 100,
        totalSolicitacoes: rpcData.pipeline.solicitacao + rpcData.pipeline.cotacao + rpcData.pipeline.pedido + rpcData.pipeline.entregue,
        totalFornecedores: 0,
        totalPedidos: rpcData.pipeline.pedido + rpcData.pipeline.entregue,
        pendingApprovals: 0,
        economiaGerada: rpcData.kpis.economia.current,
        // Sem arredondar aqui: o card formata com 1 casa (R$ 873,60 / R$ 296.205 = 0,3%, não 0%)
        economiaPercentual: rpcData.kpis.volume.current > 0
          ? (rpcData.kpis.economia.current / rpcData.kpis.volume.current) * 100
          : 0,
        avgSla: Number(sla.avgSla ?? 0),
        taxaSlaReal: Number(sla.taxaSlaReal ?? 0),
        comparisons: {
          aguardando: {
            current: rpcData.kpis.aguardando.current,
            previous: rpcData.kpis.aguardando.previous,
            trend: calculateTrend(rpcData.kpis.aguardando.current, rpcData.kpis.aguardando.previous),
            sparkline: generateSparkline(rpcData.kpis.aguardando.current || 5)
          },
          volume: {
            current: rpcData.kpis.volume.current,
            previous: rpcData.kpis.volume.previous,
            trend: calculateTrend(rpcData.kpis.volume.current, rpcData.kpis.volume.previous),
            sparkline: generateSparkline(rpcData.kpis.volume.current || 10000)
          },
          economia: {
            current: rpcData.kpis.economia.current,
            previous: rpcData.kpis.economia.previous,
            trend: calculateTrend(rpcData.kpis.economia.current, rpcData.kpis.economia.previous),
            sparkline: generateSparkline(rpcData.kpis.economia.current || 2000)
          },
          sla: {
            // Sparkline vazia: sem serie historica confiavel, o card renderiza
            // o placeholder em vez de uma linha inventada.
            current: Number(sla.taxaSlaReal ?? 0),
            previous: Number(sla.previousTaxaSlaReal ?? 0),
            trend: Number(sla.taxaSlaReal ?? 0) - Number(sla.previousTaxaSlaReal ?? 0),
            sparkline: []
          }
        },
        pipeline: rpcData.pipeline,
        urgentItems: rpcData.urgentItems,
        charts: {
          monthlyTrends: rpcData.trends,
          cotacaoStatus: rpcData.cotacaoStatus,
          topCategories: rpcData.topCategories
        }
      };

      return extended;
    },
    enabled: !!organizationId && !!user,
    staleTime: 120_000,
  });

  const fallbackKPIs: DashboardKPIsExtended = {
    aguardandoCotacao: 0,
    aguardandoPagamento: 0,
    emTransito: 0,
    finalizados: 0,
    volumeMes: 0,
    atrasados: 0,
    taxaEntrega: 0,
    totalSolicitacoes: 0,
    totalFornecedores: 0,
    totalPedidos: 0,
    pendingApprovals: 0,
    economiaGerada: 0,
    economiaPercentual: 0,
    avgSla: 0,
    taxaSlaReal: 0,
    comparisons: {
      aguardando: { current: 0, previous: 0, trend: 0, sparkline: [] },
      volume: { current: 0, previous: 0, trend: 0, sparkline: [] },
      economia: { current: 0, previous: 0, trend: 0, sparkline: [] },
      sla: { current: 0, previous: 0, trend: 0, sparkline: [] }
    },
    pipeline: { solicitacao: 0, cotacao: 0, pedido: 0, pagamento: 0, transito: 0, entregue: 0 },
    urgentItems: [],
    charts: { monthlyTrends: [], cotacaoStatus: [], topCategories: [] }
  };

  return { 
    kpis: data || fallbackKPIs,
    // Espelha os campos mais consumidos na raiz do retorno, para o consumidor
    // nao precisar cavar em `kpis` (e para o SLA novo ficar visivel).
    avgSla: (data || fallbackKPIs).avgSla,
    taxaSlaReal: (data || fallbackKPIs).taxaSlaReal,
    comparisons: (data || fallbackKPIs).comparisons,
    pipeline: data?.pipeline || fallbackKPIs.pipeline,
    urgentItems: data?.urgentItems || [],
    loading: isLoading,
    error 
  };
}
