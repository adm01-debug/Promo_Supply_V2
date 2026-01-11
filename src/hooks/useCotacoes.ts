import { useState, useEffect, useCallback } from 'react';
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
  // Joined fields
  fornecedor?: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  solicitacao?: {
    id: string;
    numero: string;
    titulo: string;
  } | null;
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

export function useCotacoes(filters?: CotacaoFilters) {
  const { user } = useAuth();
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCotacoes = useCallback(async () => {
    if (!user) {
      setCotacoes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('cotacoes')
        .select(`
          *,
          fornecedor:fornecedores(id, razao_social, nome_fantasia),
          solicitacao:solicitacoes(id, numero, titulo)
        `)
        .order('score_total', { ascending: false });

      // Apply filters
      if (filters?.solicitacao_id) {
        query = query.eq('solicitacao_id', filters.solicitacao_id);
      }
      if (filters?.fornecedor_id) {
        query = query.eq('fornecedor_id', filters.fornecedor_id);
      }
      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setCotacoes((data as Cotacao[]) || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error fetching cotacoes:', err);
      setError(errorMessage);
      toast.error('Erro ao carregar cotações');
    } finally {
      setLoading(false);
    }
  }, [user, filters?.solicitacao_id, filters?.fornecedor_id, filters?.status]);

  // Create new cotacao
  const createCotacao = useCallback(async (input: CreateCotacaoInput) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return null;
    }

    try {
      // Generate numero
      const { data: numData } = await supabase.rpc('generate_sequential_number', {
        prefix: 'COT',
        table_name: 'cotacoes'
      });

      const numero = numData || `COT-${Date.now()}`;
      const quantidade = input.quantidade || 1;
      const valorTotal = (input.valor_unitario * quantidade) + (input.valor_frete || 0);

      const { data, error } = await supabase
        .from('cotacoes')
        .insert({
          numero,
          solicitacao_id: input.solicitacao_id,
          fornecedor_id: input.fornecedor_id,
          valor_unitario: input.valor_unitario,
          quantidade,
          valor_total: valorTotal,
          valor_frete: input.valor_frete || 0,
          desconto_percentual: input.desconto_percentual || 0,
          prazo_entrega: input.prazo_entrega || 7,
          validade_proposta: input.validade_proposta,
          condicao_pagamento: input.condicao_pagamento,
          observacoes: input.observacoes,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Cotação adicionada com sucesso!');
      fetchCotacoes();
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error creating cotacao:', err);
      toast.error('Erro ao adicionar cotação: ' + errorMessage);
      return null;
    }
  }, [user, fetchCotacoes]);

  // Update cotacao
  const updateCotacao = useCallback(async (id: string, updates: Partial<Cotacao>) => {
    try {
      const { error } = await supabase
        .from('cotacoes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Cotação atualizada!');
      fetchCotacoes();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error updating cotacao:', err);
      toast.error('Erro ao atualizar: ' + errorMessage);
      return false;
    }
  }, [fetchCotacoes]);

  // Select cotacao
  const selectCotacao = useCallback(async (id: string) => {
    try {
      // First, unselect all cotacoes for the same solicitacao
      const cotacao = cotacoes.find(c => c.id === id);
      if (cotacao?.solicitacao_id) {
        await supabase
          .from('cotacoes')
          .update({ selecionada: false })
          .eq('solicitacao_id', cotacao.solicitacao_id);
      }

      // Then select the chosen one
      const { error } = await supabase
        .from('cotacoes')
        .update({ selecionada: true, status: 'aprovada' })
        .eq('id', id);

      if (error) throw error;

      toast.success('Fornecedor selecionado!');
      fetchCotacoes();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error selecting cotacao:', err);
      toast.error('Erro ao selecionar: ' + errorMessage);
      return false;
    }
  }, [cotacoes, fetchCotacoes]);

  // Delete cotacao
  const deleteCotacao = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('cotacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Cotação excluída!');
      fetchCotacoes();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error deleting cotacao:', err);
      toast.error('Erro ao excluir: ' + errorMessage);
      return false;
    }
  }, [fetchCotacoes]);

  // Initial fetch
  useEffect(() => {
    fetchCotacoes();
  }, [fetchCotacoes]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('cotacoes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cotacoes'
        },
        () => {
          fetchCotacoes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCotacoes]);

  return {
    cotacoes,
    loading,
    error,
    refetch: fetchCotacoes,
    createCotacao,
    updateCotacao,
    selectCotacao,
    deleteCotacao,
  };
}
