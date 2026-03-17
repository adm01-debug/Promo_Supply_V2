import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface Solicitacao {
  id: string;
  numero: string;
  titulo: string;
  descricao: string | null;
  tipo: 'material' | 'servico' | 'equipamento' | 'urgente' | 'contrato';
  status: 'pendente' | 'em_cotacao' | 'aprovada' | 'rejeitada' | 'em_andamento' | 'concluida' | 'cancelada';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  valor_estimado: number | null;
  valor_aprovado: number | null;
  quantidade: number;
  unidade: string | null;
  data_necessidade: string | null;
  data_aprovacao: string | null;
  data_conclusao: string | null;
  solicitante_id: string | null;
  aprovador_id: string | null;
  fornecedor_id: string | null;
  categoria_id: string | null;
  departamento: string | null;
  centro_custo: string | null;
  justificativa: string | null;
  observacoes: string | null;
  anexos: Json | null;
  created_at: string;
  updated_at: string;
  fornecedor?: { razao_social: string; nome_fantasia: string | null; } | null;
  categoria?: { nome: string; } | null;
}

export interface CreateSolicitacaoInput {
  titulo: string;
  descricao?: string;
  tipo: Solicitacao['tipo'];
  prioridade?: Solicitacao['prioridade'];
  valor_estimado?: number;
  quantidade?: number;
  unidade?: string;
  data_necessidade?: string;
  departamento?: string;
  centro_custo?: string;
  justificativa?: string;
  categoria_id?: string;
}

export interface SolicitacaoFilters {
  search?: string;
  status?: string;
  tipo?: string;
  prioridade?: string;
  dateFrom?: string;
  dateTo?: string;
  valorMin?: number;
  valorMax?: number;
  page?: number;
  pageSize?: number;
}

const VALID_SOLICITACAO_TRANSITIONS: Record<string, string[]> = {
  pendente: ['em_cotacao', 'aprovada', 'rejeitada', 'cancelada'],
  em_cotacao: ['aprovada', 'rejeitada', 'cancelada'],
  aprovada: ['em_andamento', 'cancelada'],
  em_andamento: ['concluida', 'cancelada'],
  rejeitada: ['pendente'],
  concluida: [],
  cancelada: [],
};

async function fetchSolicitacoesData(userId: string | undefined, filters?: SolicitacaoFilters) {
  if (!userId) return { data: [], totalCount: 0 };

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 100;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('solicitacoes')
    .select(`
      *,
      fornecedor:fornecedores(razao_social, nome_fantasia),
      categoria:categorias(nome)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters?.status && filters.status !== 'todas') query = query.eq('status', filters.status);
  if (filters?.tipo && filters.tipo !== 'todos') query = query.eq('tipo', filters.tipo);
  if (filters?.prioridade && filters.prioridade !== 'todas') query = query.eq('prioridade', filters.prioridade);
  if (filters?.search) query = query.or(`titulo.ilike.%${filters.search}%,numero.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%`);
  if (filters?.dateFrom) query = query.gte('data_necessidade', filters.dateFrom);
  if (filters?.dateTo) query = query.lte('data_necessidade', filters.dateTo);
  if (filters?.valorMin !== undefined) query = query.gte('valor_estimado', filters.valorMin);
  if (filters?.valorMax !== undefined) query = query.lte('valor_estimado', filters.valorMax);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Solicitacao[]) || [], totalCount: count || 0 };
}

export function useSolicitacoes(filters?: SolicitacaoFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => [
    'solicitacoes', user?.id,
    filters?.status, filters?.tipo, filters?.prioridade, filters?.search,
    filters?.dateFrom, filters?.dateTo, filters?.valorMin, filters?.valorMax,
    filters?.page, filters?.pageSize,
  ], [user?.id, filters]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchSolicitacoesData(user?.id, filters),
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const solicitacoes = data?.data || [];
  const totalCount = data?.totalCount || 0;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
  }, [queryClient]);

  const createSolicitacao = useCallback(async (input: CreateSolicitacaoInput) => {
    if (!user) { toast.error('Você precisa estar logado'); return null; }
    try {
      const { data: numData } = await supabase.rpc('generate_sequential_number', { prefix: 'SOL', table_name: 'solicitacoes' });
      const numero = numData || `SOL-${Date.now()}`;
      const { data, error } = await supabase
        .from('solicitacoes')
        .insert({
          numero, titulo: input.titulo, descricao: input.descricao, tipo: input.tipo,
          prioridade: input.prioridade || 'media', valor_estimado: input.valor_estimado,
          quantidade: input.quantidade || 1, unidade: input.unidade || 'un',
          data_necessidade: input.data_necessidade, departamento: input.departamento,
          centro_custo: input.centro_custo, justificativa: input.justificativa,
          categoria_id: input.categoria_id, solicitante_id: user.id,
        })
        .select().single();
      if (error) throw error;
      toast.success('Solicitação criada com sucesso!');
      invalidate();
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao criar solicitação: ' + msg);
      return null;
    }
  }, [user, invalidate]);

  const updateSolicitacao = useCallback(async (id: string, updates: Partial<Solicitacao>) => {
    try {
      const { error } = await supabase.from('solicitacoes').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Solicitação atualizada!');
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao atualizar: ' + msg);
      return false;
    }
  }, [invalidate]);

  const updateStatus = useCallback(async (id: string, newStatus: Solicitacao['status']) => {
    const sol = solicitacoes.find(s => s.id === id);
    if (sol) {
      const allowed = VALID_SOLICITACAO_TRANSITIONS[sol.status];
      if (allowed && !allowed.includes(newStatus)) {
        toast.error(`Transição inválida: ${sol.status} → ${newStatus}`);
        return false;
      }
    }
    return updateSolicitacao(id, { status: newStatus });
  }, [solicitacoes, updateSolicitacao]);

  const deleteSolicitacao = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('solicitacoes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Solicitação excluída!');
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao excluir: ' + msg);
      return false;
    }
  }, [invalidate]);

  const bulkDelete = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase.from('solicitacoes').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} solicitação(ões) excluída(s)!`);
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao excluir: ' + msg);
      return false;
    }
  }, [invalidate]);

  const bulkUpdateStatus = useCallback(async (ids: string[], newStatus: Solicitacao['status']) => {
    try {
      const { error } = await supabase.from('solicitacoes').update({ status: newStatus }).in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} solicitação(ões) atualizada(s)!`);
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao atualizar: ' + msg);
      return false;
    }
  }, [invalidate]);

  const duplicateSolicitacao = useCallback(async (id: string) => {
    const original = solicitacoes.find(s => s.id === id);
    if (!original) { toast.error('Solicitação não encontrada'); return null; }
    return createSolicitacao({
      titulo: `${original.titulo} (Cópia)`,
      descricao: original.descricao || undefined,
      tipo: original.tipo,
      prioridade: original.prioridade,
      valor_estimado: original.valor_estimado || undefined,
      quantidade: original.quantidade,
      unidade: original.unidade || undefined,
      departamento: original.departamento || undefined,
      centro_custo: original.centro_custo || undefined,
      justificativa: original.justificativa || undefined,
      categoria_id: original.categoria_id || undefined,
    });
  }, [solicitacoes, createSolicitacao]);

  // Realtime handled by useRealtimeSubscription in pages that use this hook

  return {
    solicitacoes, totalCount, loading: isLoading, error: error?.message || null,
    refetch, createSolicitacao, updateSolicitacao, updateStatus,
    deleteSolicitacao, bulkDelete, bulkUpdateStatus, duplicateSolicitacao,
  };
}

// Hook for KPIs
export function useSolicitacoesKPIs() {
  const { user } = useAuth();

  const { data: kpis = { total: 0, pendentes: 0, emCotacao: 0, aprovadas: 0, concluidas: 0, valorTotal: 0 }, isLoading } = useQuery({
    queryKey: ['solicitacoes-kpis', user?.id],
    queryFn: async () => {
      let allData: { status: string; valor_estimado: number | null }[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('solicitacoes').select('status, valor_estimado').range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) { hasMore = false; break; }
        allData = [...allData, ...data];
        if (data.length < pageSize) hasMore = false;
        from += pageSize;
      }

      return {
        total: allData.length,
        pendentes: allData.filter(s => s.status === 'pendente').length,
        emCotacao: allData.filter(s => s.status === 'em_cotacao').length,
        aprovadas: allData.filter(s => s.status === 'aprovada').length,
        concluidas: allData.filter(s => s.status === 'concluida').length,
        valorTotal: allData.reduce((sum, s) => sum + (s.valor_estimado || 0), 0),
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { kpis, loading: isLoading };
}
