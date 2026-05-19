import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
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
  economiaPercentual: number;
  economiaGerada: number;
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
  
  const categoryId = filters?.category !== 'all' ? filters?.category : null;
  const supplierId = filters?.supplier !== 'all' ? filters?.supplier : null;
  const period = filters?.period || '6m';

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-metrics-optimized', tenantId, period, categoryId, supplierId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      logger.info('Fetching optimized dashboard metrics', { period, categoryId, supplierId });
      
      const { data, error } = await supabase.rpc('get_compras_dashboard_metrics', {
        p_organization_id: tenantId,
        p_period: period,
        p_category_id: categoryId,
        p_supplier_id: supplierId
      });

      if (error) {
        logger.error('Error fetching dashboard metrics via RPC', { error });
        throw error;
      }

      // Process and format the RPC response to match expected UI structure
      const rpcData = data as any;
      
      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
      };

      const extended: DashboardKPIsExtended = {
        economiaGerada: rpcData.kpis.economia.current,
        economiaPercentual: rpcData.kpis.volume.current > 0 
          ? Math.round((rpcData.kpis.economia.current / rpcData.kpis.volume.current) * 100) 
          : 0,
        avgSla: 1.8, // Fallback as SLA needs more complex calc or stored values
        taxaSlaReal: 85,
        comparisons: {
          aguardando: {
            current: rpcData.kpis.aguardando.current,
            previous: rpcData.kpis.aguardando.previous,
            trend: calculateTrend(rpcData.kpis.aguardando.current, rpcData.kpis.aguardando.previous),
            sparkline: [4, 6, 8, 5, 9, 12, rpcData.kpis.aguardando.current] // Dummy sparkline for now
          },
          volume: {
            current: rpcData.kpis.volume.current,
            previous: rpcData.kpis.volume.previous,
            trend: calculateTrend(rpcData.kpis.volume.current, rpcData.kpis.volume.previous),
            sparkline: [12000, 15000, 14000, 18000, 16000, 19000, rpcData.kpis.volume.current]
          },
          economia: {
            current: rpcData.kpis.economia.current,
            previous: rpcData.kpis.economia.previous,
            trend: calculateTrend(rpcData.kpis.economia.current, rpcData.kpis.economia.previous),
            sparkline: [2000, 3000, 2500, 4000, 3500, 4500, rpcData.kpis.economia.current]
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
    staleTime: 120_000, // 2 minutes stale time for dashboard metrics
  });

  return { 
    kpis: data || {
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
    },
    pipeline: data?.pipeline || { solicitacao: 0, cotacao: 0, pedido: 0, pagamento: 0, transito: 0, entregue: 0 },
    urgentItems: data?.urgentItems || [],
    loading: isLoading,
    error 
  };
}
