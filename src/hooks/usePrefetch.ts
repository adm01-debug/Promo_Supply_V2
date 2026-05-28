/**
 * Hook para prefetch de dados críticos
 * Melhora a percepção de velocidade pré-carregando dados quando o usuário hover em links
 *
 * Prefetch keys must match the live query keys used by feature hooks so that
 * the populated cache is consumed instead of producing a separate entry.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';

const PREFETCH_STALE_TIME = 30 * 1000;
const PREFETCH_CACHE_TIME = 5 * 60 * 1000;

export function usePrefetch() {
  const queryClient = useQueryClient();
  const { user, organizationId } = useAuth();
  const canPrefetch = !!user && !!organizationId;

  // Prefetch solicitações
  const prefetchSolicitacoes = useCallback(() => {
    if (!canPrefetch) return;
    queryClient.prefetchQuery({
      queryKey: ['solicitacoes', user!.id, organizationId, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('solicitacoes')
          .select('*')
          .eq('organization_id', organizationId!)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return data || [];
      },
      staleTime: PREFETCH_STALE_TIME,
      gcTime: PREFETCH_CACHE_TIME,
    });
  }, [queryClient, user, organizationId, canPrefetch]);

  // Prefetch pedidos
  const prefetchPedidos = useCallback(() => {
    if (!canPrefetch) return;
    queryClient.prefetchQuery({
      queryKey: ['pedidos', user!.id, organizationId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('pedidos')
          .select('*, fornecedores(*)')
          .eq('organization_id', organizationId!)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return data || [];
      },
      staleTime: PREFETCH_STALE_TIME,
      gcTime: PREFETCH_CACHE_TIME,
    });
  }, [queryClient, user, organizationId, canPrefetch]);

  // Prefetch fornecedores
  const prefetchFornecedores = useCallback(() => {
    if (!canPrefetch) return;
    queryClient.prefetchQuery({
      queryKey: ['fornecedores', user!.id, organizationId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('fornecedores')
          .select('*')
          .eq('organization_id', organizationId!)
          .eq('status', 'ativo')
          .order('avaliacao', { ascending: false })
          .limit(100);
        if (error) throw error;
        return data || [];
      },
      staleTime: PREFETCH_STALE_TIME,
      gcTime: PREFETCH_CACHE_TIME,
    });
  }, [queryClient, user, organizationId, canPrefetch]);

  // Prefetch pagamentos
  const prefetchPagamentos = useCallback(() => {
    if (!canPrefetch) return;
    queryClient.prefetchQuery({
      queryKey: ['pagamentos', user!.id, organizationId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('pagamentos')
          .select('*, fornecedores(*)')
          .eq('organization_id', organizationId!)
          .order('data_vencimento', { ascending: true })
          .limit(50);
        if (error) throw error;
        return data || [];
      },
      staleTime: PREFETCH_STALE_TIME,
      gcTime: PREFETCH_CACHE_TIME,
    });
  }, [queryClient, user, organizationId, canPrefetch]);

  // Prefetch cotações
  const prefetchCotacoes = useCallback(() => {
    if (!canPrefetch) return;
    queryClient.prefetchQuery({
      queryKey: ['cotacoes', user!.id, organizationId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('cotacoes')
          .select('*, fornecedores(*)')
          .eq('organization_id', organizationId!)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return data || [];
      },
      staleTime: PREFETCH_STALE_TIME,
      gcTime: PREFETCH_CACHE_TIME,
    });
  }, [queryClient, user, organizationId, canPrefetch]);

  // Prefetch contratos
  const prefetchContratos = useCallback(() => {
    if (!canPrefetch) return;
    queryClient.prefetchQuery({
      queryKey: ['contracts', organizationId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('organization_id', organizationId!)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return data || [];
      },
      staleTime: PREFETCH_STALE_TIME,
      gcTime: PREFETCH_CACHE_TIME,
    });
  }, [queryClient, organizationId, canPrefetch]);

  // Prefetch dashboard stats
  const prefetchDashboard = useCallback(() => {
    if (!canPrefetch) return;
    queryClient.prefetchQuery({
      queryKey: ['dashboard-stats', organizationId],
      queryFn: async () => {
        const { data: solicitacoes } = await supabase
          .from('solicitacoes')
          .select('status, valor_estimado')
          .eq('organization_id', organizationId!);

        if (!solicitacoes) return { total: 0, emAberto: 0, valorTotal: 0 };

        return {
          total: solicitacoes.length,
          emAberto: solicitacoes.filter((s) => !['concluida', 'cancelada'].includes(s.status)).length,
          valorTotal: solicitacoes.reduce((acc, s) => acc + (s.valor_estimado || 0), 0),
        };
      },
      staleTime: PREFETCH_STALE_TIME,
      gcTime: PREFETCH_CACHE_TIME,
    });
  }, [queryClient, organizationId, canPrefetch]);

  const prefetchByRoute = useCallback((route: string) => {
    const prefetchMap: Record<string, () => void> = {
      '/': prefetchDashboard,
      '/compras': prefetchDashboard,
      '/solicitacoes': prefetchSolicitacoes,
      '/pedidos': prefetchPedidos,
      '/fornecedores': prefetchFornecedores,
      '/pagamentos': prefetchPagamentos,
      '/cotacao': prefetchCotacoes,
      '/contratos': prefetchContratos,
    };

    const prefetchFn = prefetchMap[route];
    if (prefetchFn) {
      prefetchFn();
    }
  }, [
    prefetchDashboard,
    prefetchSolicitacoes,
    prefetchPedidos,
    prefetchFornecedores,
    prefetchPagamentos,
    prefetchCotacoes,
    prefetchContratos,
  ]);

  const prefetchCriticalData = useCallback(() => {
    prefetchDashboard();
    prefetchSolicitacoes();
    prefetchFornecedores();
  }, [prefetchDashboard, prefetchSolicitacoes, prefetchFornecedores]);

  return {
    prefetchSolicitacoes,
    prefetchPedidos,
    prefetchFornecedores,
    prefetchPagamentos,
    prefetchCotacoes,
    prefetchContratos,
    prefetchDashboard,
    prefetchByRoute,
    prefetchCriticalData,
  };
}
