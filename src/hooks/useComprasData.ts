/**
 * Hook para buscar dados reais do sistema de Compras
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

// ============================================
// TYPES - Usando tipos do Supabase
// ============================================

export type Solicitacao = Tables<'solicitacoes'>;
export type CotacaoDB = Tables<'cotacoes'>;
export type FornecedorDB = Tables<'fornecedores'>;

// Tipos adaptados para compatibilidade com UI
export interface Cotacao extends CotacaoDB {
  fornecedor?: string;
}

export interface Fornecedor extends FornecedorDB {
  nome?: string;
  categoria?: string;
  ativo?: boolean;
}

// ============================================
// HOOKS - DADOS REAIS DO SUPABASE
// ============================================

// Hook para Solicitações
export function useSolicitacoes(filters?: { status?: string; vendedor?: string }) {
  return useQuery({
    queryKey: ['solicitacoes', filters],
    queryFn: async () => {
      let query = supabase
        .from('solicitacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Solicitacao[];
    },
  });
}

// Hook para Cotações
export function useCotacoes(solicitacaoId?: string) {
  return useQuery({
    queryKey: ['cotacoes', solicitacaoId],
    queryFn: async () => {
      let query = supabase
        .from('cotacoes')
        .select('*')
        .order('valor_unitario', { ascending: true });

      if (solicitacaoId) query = query.eq('solicitacao_id', solicitacaoId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Cotacao[];
    },
    enabled: !!solicitacaoId,
  });
}

// Hook para Fornecedores
export function useFornecedores(categoria?: string) {
  return useQuery({
    queryKey: ['fornecedores', categoria],
    queryFn: async () => {
      let query = supabase
        .from('fornecedores')
        .select('*')
        .eq('status', 'ativo')
        .order('avaliacao', { ascending: false });

      if (categoria) query = query.eq('segmento', categoria);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Fornecedor[];
    },
  });
}

// Hook para criar Solicitação
export function useCreateSolicitacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (solicitacao: Partial<Solicitacao>) => {
      const { data, error } = await supabase
        .from('solicitacoes')
        .insert(solicitacao as Tables<'solicitacoes'>)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      toast.success('Solicitação criada com sucesso!');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

// Hook para atualizar Status
export function useUpdateSolicitacaoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('solicitacoes')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      toast.success('Status atualizado!');
    },
  });
}

// Hook para criar Cotação
export function useCreateCotacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cotacao: Partial<CotacaoDB>) => {
      const { data, error } = await supabase
        .from('cotacoes')
        .insert(cotacao as Tables<'cotacoes'>)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotacoes'] });
      toast.success('Cotação adicionada!');
    },
  });
}

// Hook para selecionar Fornecedor
export function useSelecionarFornecedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      solicitacaoId,
      cotacaoId,
      fornecedor,
    }: {
      solicitacaoId: string;
      cotacaoId: string;
      fornecedor: string;
    }) => {
      // Atualizar cotação como selecionada
      await supabase.from('cotacoes').update({ selecionada: true }).eq('id', cotacaoId);

      // Atualizar solicitação
      const { data, error } = await supabase
        .from('solicitacoes')
        .update({
          status: 'aprovada',
          fornecedor_id: fornecedor,
        })
        .eq('id', solicitacaoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['cotacoes'] });
      toast.success('Fornecedor selecionado!');
    },
  });
}

// Dashboard Stats
export function useDashboardStats() {
  return useQuery({
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
  });
}

export default {
  useSolicitacoes,
  useCotacoes,
  useFornecedores,
  useCreateSolicitacao,
  useUpdateSolicitacaoStatus,
  useCreateCotacao,
  useSelecionarFornecedor,
  useDashboardStats,
};
