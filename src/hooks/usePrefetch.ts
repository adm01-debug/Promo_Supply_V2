/**
 * Hook para prefetch de dados críticos
 * Melhora a percepção de velocidade pré-carregando dados quando o usuário hover em links
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Configurações de prefetch
const PREFETCH_STALE_TIME = 30 * 1000; // 30 segundos
const PREFETCH_CACHE_TIME = 5 * 60 * 1000; // 5 minutos

export function usePrefetch() {
  const queryClient = useQueryClient();

  // Prefetch solicitações
  const prefetchSolicitacoes = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['solicitacoes', undefined],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('solicitacoes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return data || [];
      },
      staleTime: PREFETCH_STALE_TIME,
      gcTime: PREFETCH_CACHE_TIME,
    });
  }, [queryClient]);

  // Prefetch pedidos
  const prefetchPedidos = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['pedidos', undefined],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('pedidos')
          .select('*, fornecedores(*)')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return data || [];
      },
      staleTime: PREFETCH_STALE_TIME,
      gcTime: PREFETCH_CACHE_TIME,
    });
  }, [queryClient]);

  // Prefetch fornecedores
  const prefetchFornecedores = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['fornecedores', undefined],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('fornecedores')
          .select('*')
          .eq('status', 'ativo')
          .order('avaliacao', { ascending: false })
          .limit(100);
        if (error) throw error;
        return data || [];
      },
      staleTime: PREFETCH_STALE_TIME,
      gcTime: PREFETCH_CACHE_TIME,
    });
  }, [queryClient]);

  // Prefetch pagamentos
  const prefetchPagamentos = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['pagamentos', undefined],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('pagamentos')
          .select('*, fornecedores(*)')
          .order('data_vencimento', { ascending: true })
          .limit(50);
        if (error) throw error;
        return data || [];
      },
      staleTime: PREFETCH_STALE_TIME,
      gcTime: PREFETCH_CACHE_TIME,
    });
  }, [queryClient]);

  // Prefetch cotações
  const prefetchCotacoes = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['cotacoes', undefined],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('cotacoes')
          .select('*, fornecedores(*)')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return data || [];
      },
      staleTime: PREFETCH_STALE_TIME,
      gcTime: PREFETCH_CACHE_TIME,
    });
  }, [queryClient]);

  // Prefetch contratos
  const prefetchContratos = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['contracts'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return data || [];
      },
      staleTime: PREFETCH_STALE_TIME,
      gcTime: PREFETCH_CACHE_TIME,
    });
  }, [queryClient]);

  // Prefetch dashboard stats
  const prefetchDashboard = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['dashboard-stats'],
      queryFn: async () => {
        const { data: solicitacoes } = await supabase
          .from('solicitacoes')
          .select('status, valor_estimado');

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
  }, [queryClient]);

  // Mapa de rotas para prefetch
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

  // Prefetch todas as rotas críticas (útil no login)
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
