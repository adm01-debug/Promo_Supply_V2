import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/feedbackToast';
import type { Database } from '@/integrations/supabase/types';

export type Licitacao = Database['public']['Tables']['licitacoes']['Row'] & {
  fornecedor_vencedor?: { razao_social: string } | null;
  propostas_count?: number;
};

export type LicitacaoProposta = Database['public']['Tables']['licitacao_propostas']['Row'] & {
  fornecedor?: { razao_social: string; cnpj: string | null } | null;
};

export function useLicitacoes() {
  const { user, tenantId, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const { data: licitacoes = [], isLoading } = useQuery({
    queryKey: ['licitacoes', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('licitacoes')
        .select('*, fornecedor_vencedor:fornecedores!licitacoes_fornecedor_vencedor_id_fkey(razao_social)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Licitacao[];
    },
    enabled: !!user && !!tenantId,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
  }, [queryClient]);

  const createLicitacao = useCallback(async (input: Partial<Licitacao>) => {
    if (!user || !tenantId) { toast.error('Login necessário'); return null; }
    try {
      const { data: numData } = await supabase.rpc('generate_sequential_number', { prefix: 'LIC', table_name: 'licitacoes' });
      const numero = numData || `LIC-${Date.now()}`;
      
      const { data, error } = await supabase
        .from('licitacoes')
        .insert({ 
          ...input, 
          numero, 
          created_by: user.id, 
          responsavel_id: user.id, 
          tenant_id: tenantId,
          organization_id: organizationId || tenantId
        } as any)
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
  }, [user, tenantId, invalidate]);

  const updateLicitacao = useCallback(async (id: string, updates: Partial<Licitacao>) => {
    try {
      const { error } = await supabase.from('licitacoes').update(updates).eq('id', id);
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
      const { error } = await supabase.from('licitacoes').delete().eq('id', id);
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
      const { data, error } = await supabase
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
    if (!licitacaoId) return null;
    try {
      const { data, error } = await supabase
        .from('licitacao_propostas')
        .insert({ ...input, licitacao_id: licitacaoId } as any)
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
    if (!licitacaoId) return false;
    try {
      // Mark winner
      await supabase.from('licitacao_propostas').update({ vencedora: false }).eq('licitacao_id', licitacaoId);
      await supabase.from('licitacao_propostas').update({ vencedora: true, status: 'vencedora' }).eq('id', propostaId);
      // Update licitação
      await supabase.from('licitacoes').update({
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

export interface SourcingEvent {
  id: string;
  numero: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'in_progress' | 'evaluation' | 'awarded';
  type: 'rfp' | 'rfq' | 'auction';
  category_id: string | null;
  category?: { nome: string } | null;
  lots?: Database['public']['Tables']['sourcing_event_lots']['Row'][];
  questions?: Database['public']['Tables']['sourcing_event_questions']['Row'][];
  criteria?: Database['public']['Tables']['sourcing_event_criteria']['Row'][];
  invitations?: (Database['public']['Tables']['sourcing_invitations']['Row'] & { fornecedor?: { razao_social: string } | null })[];
  responses?: (Database['public']['Tables']['sourcing_responses']['Row'] & { fornecedor?: { razao_social: string } | null })[];
  created_at: string;
  closes_at: string;
  award_deadline: string | null;
  budget_estimate: number | null;
  currency: string;
  sealed_bid?: boolean;
}

export function useSourcingEvents() {
  const { user, tenantId, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['sourcing-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sourcing_events')
        .select('*, category:categorias(nome)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SourcingEvent[];
    },
    enabled: !!user,
  });

  const createEvent = useMutation({
    mutationFn: async (event: Partial<SourcingEvent>) => {
      const { data, error } = await supabase.from('sourcing_events').insert({
        ...event,
        organization_id: organizationId || tenantId,
        tenant_id: tenantId || organizationId
      } as any).select().single();
      if (error) throw error;
      return data as unknown as SourcingEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sourcing-events'] });
      toast.success('Evento de sourcing criado!');
    },
    onError: (err: Error) => toast.error('Erro: ' + err.message)
  });

  return { events, isLoading, createEvent };
}

export function useSourcingEventDetails(eventId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ['sourcing-event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from('sourcing_events')
        .select('*, category:categorias(nome), lots:sourcing_event_lots(*), questions:sourcing_event_questions(*), criteria:sourcing_event_criteria(*), invitations:sourcing_invitations(*, fornecedor:fornecedores(razao_social)), responses:sourcing_responses(*, fornecedor:fornecedores(razao_social))')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      return data as unknown as SourcingEvent;
    },
    enabled: !!user && !!eventId,
  });

  return { event, loadingEvent };
}

export function useLicitacaoLances(licitacaoId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: lances = [], isLoading } = useQuery({
    queryKey: ['licitacao-lances', licitacaoId],
    queryFn: async () => {
      if (!licitacaoId) return [];
      const { data, error } = await supabase
        .from('licitacao_lances')
        .select('*, fornecedor:fornecedores(razao_social)')
        .eq('licitacao_id', licitacaoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!licitacaoId,
  });

  const placeBid = useCallback(async (valor: number, fornecedorId: string) => {
    if (!licitacaoId) return false;
    try {
      const { error } = await supabase.from('licitacao_lances').insert({
        licitacao_id: licitacaoId,
        fornecedor_id: fornecedorId,
        valor_lance: valor
      });
      if (error) throw error;
      toast.success('Lance enviado!');
      queryClient.invalidateQueries({ queryKey: ['licitacao-lances', licitacaoId] });
      queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
      return true;
    } catch (err: unknown) {
      toast.error('Erro ao enviar lance: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      return false;
    }
  }, [licitacaoId, queryClient]);

  // Subscribe to real-time bids
  const subscribeToBids = useCallback(() => {
    if (!licitacaoId) return () => {};
    const channel = supabase
      .channel(`licitacao-bids-${licitacaoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'licitacao_lances', filter: `licitacao_id=eq.${licitacaoId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['licitacao-lances', licitacaoId] });
          queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [licitacaoId, queryClient]);

  return { lances, isLoading, placeBid, subscribeToBids };
}