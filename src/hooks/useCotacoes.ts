import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface Cotacao {
  id: string;
  numero: string;
  solicitacao_id: string | null;
  fornecedor_id: string | null;
  valor_unitario: number;
  quantidade: number;
  valor_total: number;
  valor_frete: number;
  desconto_percentual: number;
  prazo_entrega: number;
  validade_proposta: string | null;
  condicao_pagamento: string | null;
  status: 'pendente' | 'analisando' | 'aprovada' | 'rejeitada' | 'expirada';
  selecionada: boolean;
  score_preco: number;
  score_prazo: number;
  score_qualidade: number;
  score_total: number;
  observacoes: string | null;
  anexos: Json | null;
  avaliador_id: string | null;
  data_avaliacao: string | null;
  created_at: string;
  updated_at: string;
  fornecedor?: { id: string; razao_social: string; nome_fantasia: string | null; } | null;
  solicitacao?: { id: string; numero: string; titulo: string; } | null;
}

export interface CreateCotacaoInput {
  solicitacao_id?: string;
  fornecedor_id?: string;
  valor_unitario: number;
  quantidade?: number;
  valor_frete?: number;
  desconto_percentual?: number;
  prazo_entrega?: number;
  validade_proposta?: string;
  condicao_pagamento?: string;
  observacoes?: string;
}

export interface CotacaoFilters {
  solicitacao_id?: string;
  fornecedor_id?: string;
  status?: string;
}

async function fetchCotacoesData(userId: string | undefined, filters?: CotacaoFilters) {
  if (!userId) return [];

  let query = supabase
    .from('cotacoes')
    .select(`
      *,
      fornecedor:fornecedores(id, razao_social, nome_fantasia),
      solicitacao:solicitacoes(id, numero, titulo)
    `)
    .order('score_total', { ascending: false });

  if (filters?.solicitacao_id) query = query.eq('solicitacao_id', filters.solicitacao_id);
  if (filters?.fornecedor_id) query = query.eq('fornecedor_id', filters.fornecedor_id);
  if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Cotacao[]) || [];
}

export function useCotacoes(filters?: CotacaoFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => [
    'cotacoes', user?.id, filters?.solicitacao_id, filters?.fornecedor_id, filters?.status,
  ], [user?.id, filters]);

  const { data: cotacoes = [], isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchCotacoesData(user?.id, filters),
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cotacoes'] });
  }, [queryClient]);

  const createCotacao = useCallback(async (input: CreateCotacaoInput) => {
    if (!user) { toast.error('Você precisa estar logado'); return null; }
    try {
      const { data: numData } = await supabase.rpc('generate_sequential_number', { prefix: 'COT', table_name: 'cotacoes' });
      const numero = numData || `COT-${Date.now()}`;
      const quantidade = input.quantidade || 1;
      const valorTotal = (input.valor_unitario * quantidade) + (input.valor_frete || 0);

      const { data, error } = await supabase
        .from('cotacoes')
        .insert({
          numero, solicitacao_id: input.solicitacao_id, fornecedor_id: input.fornecedor_id,
          valor_unitario: input.valor_unitario, quantidade, valor_total: valorTotal,
          valor_frete: input.valor_frete || 0, desconto_percentual: input.desconto_percentual || 0,
          prazo_entrega: input.prazo_entrega || 7, validade_proposta: input.validade_proposta,
          condicao_pagamento: input.condicao_pagamento, observacoes: input.observacoes,
        })
        .select().single();
      if (error) throw error;
      toast.success('Cotação adicionada com sucesso!');
      invalidate();
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao adicionar cotação: ' + msg);
      return null;
    }
  }, [user, invalidate]);

  const updateCotacao = useCallback(async (id: string, updates: Partial<Cotacao>) => {
    try {
      const { error } = await supabase.from('cotacoes').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Cotação atualizada!');
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao atualizar: ' + msg);
      return false;
    }
  }, [invalidate]);

  const selectCotacao = useCallback(async (id: string) => {
    try {
      const cotacao = cotacoes.find(c => c.id === id);
      if (cotacao?.solicitacao_id) {
        await supabase.from('cotacoes').update({ selecionada: false }).eq('solicitacao_id', cotacao.solicitacao_id);
      }
      const { error } = await supabase.from('cotacoes').update({ selecionada: true, status: 'aprovada' }).eq('id', id);
      if (error) throw error;
      toast.success('Fornecedor selecionado!');
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao selecionar: ' + msg);
      return false;
    }
  }, [cotacoes, invalidate]);

  const deleteCotacao = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('cotacoes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Cotação excluída!');
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao excluir: ' + msg);
      return false;
    }
  }, [invalidate]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('cotacoes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotacoes' }, () => {
        invalidate();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, invalidate]);

  return {
    cotacoes, loading: isLoading, error: error?.message || null,
    refetch, createCotacao, updateCotacao, selectCotacao, deleteCotacao,
  };
}
