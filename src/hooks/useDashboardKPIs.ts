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
  urgentItems: any[];
  charts: {
    monthlyTrends: { month: string; pedidos: number; cotacoes: number; economia: number }[];
    cotacaoStatus: { name: string; value: number; color: string }[];
    topCategories: { name: string; value: number; percentage: number }[];
  };
}

export function useDashboardKPIs(filters?: { category?: string; supplier?: string; period?: string }) {
  const { tenantId, user } = useAuth();
  
  const categoryId = (filters?.category && filters.category !== 'all') ? filters.category : null;
  const supplierId = (filters?.supplier && filters.supplier !== 'all') ? filters.supplier : null;
  const period = filters?.period || '6m';

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-metrics-optimized', tenantId, period, categoryId, supplierId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase.rpc('get_compras_dashboard_metrics', {
        p_organization_id: tenantId,
        p_period: period,
        p_category_id: (categoryId as string | undefined),
        p_supplier_id: (supplierId as string | undefined)
      });

      if (error) {
        logger.error('Error fetching dashboard metrics via RPC', { error });
        throw error;
      }

      const rpcData = data as any;
      
      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
      };

      const generateSparkline = (base: number, count: number = 7) => {
        return Array.from({ length: count }).map((_, i) => {
          const factor = 0.8 + (Math.random() * 0.4);
          return Math.round(base * factor);
        });
      };

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
        economiaPercentual: rpcData.kpis.volume.current > 0 
          ? Math.round((rpcData.kpis.economia.current / rpcData.kpis.volume.current) * 100) 
          : 0,
        avgSla: 1.8,
        taxaSlaReal: 85,
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
            current: 85,
            previous: 82,
            trend: 3,
            sparkline: [80, 82, 81, 84, 83, 85, 85]
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
    enabled: !!tenantId && !!user,
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
    pipeline: data?.pipeline || fallbackKPIs.pipeline,
    urgentItems: data?.urgentItems || [],
    loading: isLoading,
    error 
  };
}
