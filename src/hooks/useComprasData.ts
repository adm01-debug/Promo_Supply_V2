/**
 * Hook para buscar dados reais do sistema de Compras
 * MIGRAÇÃO: Mock → Produção
 * Substitui: src/data/mockData.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================
// TYPES (mantidos do mock para compatibilidade)
// ============================================

export interface Solicitacao {
  id: string;
  item_number: string;
  empresa: string;
  produto: string;
  quantidade: number;
  quantidade_real: number;
  tipo: 'PE_LISO' | 'FAB_LISO' | 'FAB_PERSONALIZADO';
  status: 'AGUARDANDO_COTACAO' | 'EM_COTACAO' | 'FORNECEDOR_SELECIONADO' | 'PEDIDO_GERADO' | 'AGUARDANDO_PAGAMENTO' | 'PAGO' | 'EM_TRANSITO' | 'ENTREGUE';
  vendedor: string;
  prazo_entrega: string;
  fornecedor_selecionado?: string;
  valor_unitario?: number;
  valor_total?: number;
  created_at: string;
}

export interface Cotacao {
  id: string;
  solicitacao_id: string;
  fornecedor: string;
  valor_unitario: number;
  valor_total: number;
  prazo_entrega: string;
  condicao_pagamento: string;
  observacoes?: string;
  selecionada: boolean;
  created_at: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  categoria: string;
  avaliacao: number;
  ativo: boolean;
}

// ============================================
// HOOKS - DADOS REAIS DO SUPABASE
// ============================================

// Hook para Solicitações
export function useSolicitacoes(filters?: { status?: string; vendedor?: string }) {
  return useQuery({
    queryKey: ['solicitacoes', filters],
    queryFn: async () => {
      let query = supabase.from('solicitacoes').select('*').order('created_at', { ascending: false });
      
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.vendedor) query = query.eq('vendedor', filters.vendedor);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Solicitacao[];
    },
  });
}

// Hook para Cotações
export function useCotacoes(solicitacaoId?: string) {
  return useQuery({
    queryKey: ['cotacoes', solicitacaoId],
    queryFn: async () => {
      let query = supabase.from('cotacoes').select('*').order('valor_unitario', { ascending: true });
      
      if (solicitacaoId) query = query.eq('solicitacao_id', solicitacaoId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Cotacao[];
    },
    enabled: !!solicitacaoId,
  });
}

// Hook para Fornecedores
export function useFornecedores(categoria?: string) {
  return useQuery({
    queryKey: ['fornecedores', categoria],
    queryFn: async () => {
      let query = supabase.from('fornecedores').select('*').eq('ativo', true).order('avaliacao', { ascending: false });
      
      if (categoria) query = query.eq('categoria', categoria);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Fornecedor[];
    },
  });
}

// Hook para criar Solicitação
export function useCreateSolicitacao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (solicitacao: Omit<Solicitacao, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('solicitacoes').insert(solicitacao).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      toast.success('Solicitação criada com sucesso!');
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });
}

// Hook para atualizar Status
export function useUpdateSolicitacaoStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Solicitacao['status'] }) => {
      const { data, error } = await supabase.from('solicitacoes').update({ status }).eq('id', id).select().single();
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
    mutationFn: async (cotacao: Omit<Cotacao, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('cotacoes').insert(cotacao).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotacoes'] });
      toast.success('Cotação adicionada!');
    },
  });
}

// Hook para selecionar Fornecedor (atualiza solicitação e cotação)
export function useSelecionarFornecedor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ solicitacaoId, cotacaoId, fornecedor, valorUnitario, valorTotal }: {
      solicitacaoId: string;
      cotacaoId: string;
      fornecedor: string;
      valorUnitario: number;
      valorTotal: number;
    }) => {
      // Atualizar cotação como selecionada
      await supabase.from('cotacoes').update({ selecionada: true }).eq('id', cotacaoId);
      
      // Atualizar solicitação
      const { data, error } = await supabase.from('solicitacoes').update({
        status: 'FORNECEDOR_SELECIONADO',
        fornecedor_selecionado: fornecedor,
        valor_unitario: valorUnitario,
        valor_total: valorTotal,
      }).eq('id', solicitacaoId).select().single();
      
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
      const { data: solicitacoes } = await supabase.from('solicitacoes').select('status, valor_total');
      
      if (!solicitacoes) return { total: 0, emAberto: 0, valorTotal: 0 };
      
      return {
        total: solicitacoes.length,
        emAberto: solicitacoes.filter(s => !['ENTREGUE', 'PAGO'].includes(s.status)).length,
        valorTotal: solicitacoes.reduce((acc, s) => acc + (s.valor_total || 0), 0),
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
