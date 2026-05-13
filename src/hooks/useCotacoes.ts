import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { auditHelpers } from '@/services/auditService';
import type { Json, Database } from '@/integrations/supabase/types';

export type Cotacao = Database['public']['Tables']['cotacoes']['Row'] & {
  fornecedor?: { id: string; razao_social: string; nome_fantasia: string | null; } | null;
  solicitacao?: { id: string; numero: string; titulo: string; } | null;
};

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

async function fetchCotacoesData(userId: string | undefined, organizationId: string | null | undefined, filters?: CotacaoFilters) {
  if (!userId || !organizationId) return [];

  let query = supabase
    .from('cotacoes')
    .select(`
      *,
      fornecedor:fornecedores(id, razao_social, nome_fantasia),
      solicitacao:solicitacoes(id, numero, titulo)
    `)
    .order('score_total', { ascending: false })
    .eq('organization_id', organizationId);

  if (filters?.solicitacao_id) query = query.eq('solicitacao_id', filters.solicitacao_id);
  if (filters?.fornecedor_id) query = query.eq('fornecedor_id', filters.fornecedor_id);
  if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Cotacao[]) || [];
}

export function useCotacoes(filters?: CotacaoFilters) {
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => [
    'cotacoes', user?.id, organizationId, filters?.solicitacao_id, filters?.fornecedor_id, filters?.status,
  ], [user?.id, organizationId, filters]);

  const { data: cotacoes = [], isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchCotacoesData(user?.id, organizationId, filters),
    enabled: !!user && !!organizationId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cotacoes'] });
  }, [queryClient]);

  const createCotacao = useCallback(async (input: CreateCotacaoInput) => {
    if (!user || !organizationId) { toast.error('Você precisa estar logado em uma organização'); return null; }
    try {
      logger.info('Adicionando nova cotação', { solicitacaoId: input.solicitacao_id, fornecedorId: input.fornecedor_id });
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
          organization_id: organizationId,
          tenant_id: organizationId as any,
        } as any)
        .select().single();
      if (error) {
        logger.error('Erro ao inserir cotação no banco', { error, input });
        throw error;
      }
      
      // Audit Log
      await auditHelpers.logCreate(
        'cotacao', 
        data.id, 
        `Cotação ${data.numero} criada por ${user.email}`,
        data
      );

      logger.info('Cotação criada com sucesso', { id: data.id, numero: data.numero });

      toast.success('Cotação adicionada com sucesso!');
      invalidate();
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro fatal ao adicionar cotação', { error: msg, input });
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

  const selectCotacao = useCallback(async (id: string, justificativa?: string) => {
    try {
      const cotacao = cotacoes.find(c => c.id === id);
      logger.info('Selecionando cotação vencedora', { cotacaoId: id, solicitacaoId: cotacao?.solicitacao_id });
      if (cotacao?.solicitacao_id) {
        await supabase.from('cotacoes').update({ selecionada: false }).eq('solicitacao_id', cotacao.solicitacao_id);
      }
      const { error } = await supabase.from('cotacoes').update({ 
        selecionada: true, 
        status: 'aprovada',
        justificativa_selecao: justificativa || null
      }).eq('id', id);
      if (error) {
        logger.error('Erro ao atualizar status da cotação selecionada', { error, cotacaoId: id });
        throw error;
      }

      // Audit Log
      await auditHelpers.logApprove(
        'cotacao',
        id,
        `Cotação selecionada como vencedora para solicitação ${cotacao?.solicitacao?.numero}`,
        { cotacao_id: id, justificativa }
      );

      logger.info('Fornecedor selecionado com sucesso', { cotacaoId: id });
      toast.success('Fornecedor selecionado!');
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro fatal ao selecionar cotação', { error: msg, cotacaoId: id });
      toast.error('Erro ao selecionar: ' + msg);
      return false;
    }
  }, [cotacoes, invalidate]);

  const deleteCotacao = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('cotacoes').delete().eq('id', id);
      if (error) {
        logger.error('Erro ao excluir cotação', { error, cotacaoId: id });
        throw error;
      }
      logger.info('Cotação excluída com sucesso', { cotacaoId: id });
      toast.success('Cotação excluída!');
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro fatal ao excluir cotação', { error: msg, cotacaoId: id });
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
