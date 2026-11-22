import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import {
  buildSupplierSLAData,
  type SlaOrderInput,
  type SlaSupplierInput,
  type SupplierSLAData,
} from './slaAnalysisData';

export type SlaPeriod = '3m' | '6m' | '12m';

export const SLA_PERIOD_DAYS: Record<SlaPeriod, number> = {
  '3m': 90,
  '6m': 180,
  '12m': 365,
};

export const SLA_PERIOD_LABEL: Record<SlaPeriod, string> = {
  '3m': 'Últimos 3 meses',
  '6m': 'Últimos 6 meses',
  '12m': 'Último ano',
};

interface RawSupplier {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  prazo_medio_entrega: number | null;
  avaliacao: number | string | null;
  status: string | null;
}

interface RawOrder {
  fornecedor_id: string | null;
  status: string | null;
  data_emissao: string | null;
  data_previsao: string | null;
  data_entrega: string | null;
  created_at: string | null;
}

export interface SupplierSlaResult {
  suppliers: SupplierSLAData[];
  /** Pedidos considerados na janela, sem filtro por fornecedor. */
  ordersInWindow: number;
  /** Pedidos entregues com previsão registrada (amostra da conformidade). */
  comparableOrders: number;
}

export function useSupplierSlaData(period: SlaPeriod) {
  const { tenantId } = useAuth();
  const periodDays = SLA_PERIOD_DAYS[period];

  return useQuery<SupplierSlaResult>({
    queryKey: ['supplier-sla-analysis', period, tenantId],
    enabled: Boolean(tenantId),
    staleTime: 60_000,
    queryFn: async () => {
      const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const [fornRes, pedRes] = await Promise.all([
        supabase
          .from('fornecedores')
          .select('id, razao_social, nome_fantasia, prazo_medio_entrega, avaliacao, status')
          .eq('status', 'ativo')
          .order('razao_social', { ascending: true }),
        supabase
          .from('pedidos')
          .select('fornecedor_id, status, data_emissao, data_previsao, data_entrega, created_at')
          .or(`data_emissao.gte.${cutoff},and(data_emissao.is.null,created_at.gte.${cutoff})`),
      ]);

      if (fornRes.error) throw fornRes.error;
      if (pedRes.error) throw pedRes.error;

      const rawSuppliers = (fornRes.data ?? []) as unknown as RawSupplier[];
      const rawOrders = (pedRes.data ?? []) as unknown as RawOrder[];

      const suppliers: SlaSupplierInput[] = rawSuppliers
        .filter((f) => Boolean(f.razao_social || f.nome_fantasia))
        .map((f) => ({
          id: f.id,
          name: (f.nome_fantasia || f.razao_social || '').trim(),
          prazo_medio_entrega: f.prazo_medio_entrega,
          avaliacao: f.avaliacao,
        }));

      const orders: SlaOrderInput[] = rawOrders.map((o) => ({
        fornecedor_id: o.fornecedor_id,
        status: o.status,
        data_emissao: o.data_emissao,
        data_previsao: o.data_previsao,
        data_entrega: o.data_entrega,
        created_at: o.created_at,
      }));

      const rows = buildSupplierSLAData(suppliers, orders, periodDays);

      return {
        suppliers: rows,
        ordersInWindow: orders.length,
        comparableOrders: rawOrders.filter((o) => o.data_entrega && o.data_previsao).length,
      };
    },
  });
}
