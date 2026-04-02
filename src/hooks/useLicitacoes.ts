import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Licitacao {
  id: string;
  numero: string;
  titulo: string;
  descricao: string | null;
  modalidade: string;
  tipo: string;
  status: string;
  data_publicacao: string | null;
  data_abertura: string | null;
  data_encerramento: string | null;
  valor_estimado: number;
  valor_vencedor: number | null;
  fornecedor_vencedor_id: string | null;
  objeto: string | null;
  edital_url: string | null;
  documentos_exigidos: any;
  criterios_avaliacao: any;
  observacoes: string | null;
  responsavel_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  fornecedor_vencedor?: { razao_social: string } | null;
  propostas_count?: number;
}

export interface LicitacaoProposta {
  id: string;
  licitacao_id: string;
  fornecedor_id: string;
  valor_proposta: number;
  desconto_percentual: number;
  prazo_entrega: number;
  score_tecnico: number;
  score_preco: number;
  score_total: number;
  documentos: any;
  observacoes: string | null;
  status: string;
  data_submissao: string;
  vencedora: boolean;
  desclassificada: boolean;
  motivo_desclassificacao: string | null;
  created_at: string;
  updated_at: string;
  fornecedor?: { razao_social: string; cnpj: string | null } | null;
}

export function useLicitacoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: licitacoes = [], isLoading } = useQuery({
    queryKey: ['licitacoes'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('licitacoes')
        .select('*, fornecedor_vencedor:fornecedores!licitacoes_fornecedor_vencedor_id_fkey(razao_social)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Licitacao[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
  }, [queryClient]);

  const createLicitacao = useCallback(async (input: Partial<Licitacao>) => {
    if (!user) { toast.error('Login necessário'); return null; }
    try {
      const { data: numData } = await supabase.rpc('generate_sequential_number', { prefix: 'LIC', table_name: 'licitacoes' });
      const numero = numData || `LIC-${Date.now()}`;
      const { data, error } = await (supabase as any)
        .from('licitacoes')
        .insert({ ...input, numero, created_by: user.id, responsavel_id: user.id })
        .select()
        .single();
      if (error) throw error;
      toast.success(`Licitação ${numero} criada!`);
      invalidate();
      return data;
    } catch (err: unknown) {
      toast.error('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'));
      return null;
    }
  }, [user, invalidate]);

  const updateLicitacao = useCallback(async (id: string, updates: Partial<Licitacao>) => {
    try {
      const { error } = await (supabase as any).from('licitacoes').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Licitação atualizada!');
      invalidate();
      return true;
    } catch (err: unknown) {
      toast.error('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'));
      return false;
    }
  }, [invalidate]);

  const deleteLicitacao = useCallback(async (id: string) => {
    try {
      const { error } = await (supabase as any).from('licitacoes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Licitação excluída!');
      invalidate();
      return true;
    } catch (err: unknown) {
      toast.error('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'));
      return false;
    }
  }, [invalidate]);

  return { licitacoes, isLoading, createLicitacao, updateLicitacao, deleteLicitacao, invalidate };
}

export function useLicitacaoPropostas(licitacaoId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: propostas = [], isLoading } = useQuery({
    queryKey: ['licitacao-propostas', licitacaoId],
    queryFn: async () => {
      if (!licitacaoId) return [];
      const { data, error } = await (supabase as any)
        .from('licitacao_propostas')
        .select('*, fornecedor:fornecedores(razao_social, cnpj)')
        .eq('licitacao_id', licitacaoId)
        .order('score_total', { ascending: false });
      if (error) throw error;
      return (data || []) as LicitacaoProposta[];
    },
    enabled: !!user && !!licitacaoId,
    staleTime: 30_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['licitacao-propostas', licitacaoId] });
  }, [queryClient, licitacaoId]);

  const addProposta = useCallback(async (input: Partial<LicitacaoProposta>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('licitacao_propostas')
        .insert({ ...input, licitacao_id: licitacaoId })
        .select()
        .single();
      if (error) throw error;
      toast.success('Proposta registrada!');
      invalidate();
      return data;
    } catch (err: unknown) {
      toast.error('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'));
      return null;
    }
  }, [licitacaoId, invalidate]);

  const selectWinner = useCallback(async (propostaId: string, fornecedorId: string, valor: number) => {
    try {
      // Mark winner
      await (supabase as any).from('licitacao_propostas').update({ vencedora: false }).eq('licitacao_id', licitacaoId);
      await (supabase as any).from('licitacao_propostas').update({ vencedora: true, status: 'vencedora' }).eq('id', propostaId);
      // Update licitação
      await (supabase as any).from('licitacoes').update({
        fornecedor_vencedor_id: fornecedorId,
        valor_vencedor: valor,
        status: 'homologada',
      }).eq('id', licitacaoId);
      toast.success('Vencedor homologado!');
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
      return true;
    } catch (err: unknown) {
      toast.error('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'));
      return false;
    }
  }, [licitacaoId, invalidate, queryClient]);

  return { propostas, isLoading, addProposta, selectWinner, invalidate };
}
