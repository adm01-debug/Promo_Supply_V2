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
    queryKey: ['licitacoes', user?.id, tenantId, organizationId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('licitacoes')
        .select('id, numero, objeto, modalidade, status, tipo, data_abertura, data_encerramento, valor_estimado, valor_vencedor, fornecedor_vencedor_id, responsavel_id, created_by, created_at, updated_at, tenant_id, organization_id, fornecedor_vencedor:fornecedores!licitacoes_fornecedor_vencedor_id_fkey(razao_social)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Licitacao[];
    },
    enabled: !!user && !!tenantId,
    staleTime: 60_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['licitacoes'] });
  }, [queryClient]);

  const createLicitacao = useCallback(async (input: Partial<Licitacao>) => {
    if (!user || !tenantId) { toast.error('Login necessário'); return null; }
    try {
      const { data: numData } = await supabase.rpc('generate_sequential_number', { prefix: 'LIC', table_name: 'licitacoes' });
      const numero = numData || `LIC-${Date.now()}`;
      
      // Strip joined/computed fields before inserting into the DB table
      const { fornecedor_vencedor: _fv, propostas_count: _pc, ...inputData } = input;
      const { data, error } = await supabase
        .from('licitacoes')
        .insert({
          ...inputData,
          numero,
          created_by: user.id,
          responsavel_id: user.id,
          tenant_id: tenantId,
          organization_id: organizationId || tenantId
        } as never)
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
  }, [user, tenantId, invalidate, organizationId]);

  const updateLicitacao = useCallback(async (id: string, updates: Database['public']['Tables']['licitacoes']['Update']) => {
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
      // Strip joined/computed fields before inserting into the DB table
      const { fornecedor: _f, ...inputData } = input;
      const { data, error } = await supabase
        .from('licitacao_propostas')
        .insert({ ...inputData, licitacao_id: licitacaoId } as never)
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

type SourcingEventRow = Database['public']['Tables']['sourcing_events']['Row'];
type SourcingEventInsert = Database['public']['Tables']['sourcing_events']['Insert'];

export type SourcingEvent = SourcingEventRow & {
  category?: { nome: string } | null;
  lots?: Database['public']['Tables']['sourcing_event_lots']['Row'][];
  questions?: Database['public']['Tables']['sourcing_event_questions']['Row'][];
  criteria?: Database['public']['Tables']['sourcing_event_criteria']['Row'][];
  invitations?: (Database['public']['Tables']['sourcing_invitations']['Row'] & { fornecedor?: { razao_social: string } | null })[];
  responses?: (Database['public']['Tables']['sourcing_responses']['Row'] & { fornecedor?: { razao_social: string } | null })[];
};

export function useSourcingEvents() {
  const { user, tenantId, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery<SourcingEvent[]>({
    queryKey: ['sourcing-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sourcing_events')
        .select('*, category:categorias(nome)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SourcingEvent[];
    },
    enabled: !!user,
  });

  const createEvent = useMutation({
    mutationFn: async (event: Partial<SourcingEventInsert>) => {
      const payload: SourcingEventInsert = {
        ...event,
        organization_id: organizationId || tenantId || '',
        tenant_id: tenantId || organizationId || '',
      } as SourcingEventInsert;
      const { data, error } = await supabase.from('sourcing_events').insert(payload).select().single();
      if (error) throw error;
      return data as SourcingEvent;
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

  const { data: event, isLoading: loadingEvent } = useQuery<SourcingEvent | null>({
    queryKey: ['sourcing-event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from('sourcing_events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      if (!data) return null;

      // Fetch related child rows separately to avoid nested embed FK issues
      const eventIdValue = (data as { id: string }).id;
      const [categoryRes, lotsRes, questionsRes, criteriaRes, invitationsRes, responsesRes] = await Promise.all([
        (data as { category_id?: string | null }).category_id
          ? supabase.from('categorias').select('id, nome').eq('id', (data as { category_id: string }).category_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('sourcing_event_lots').select('*').eq('event_id', eventIdValue),
        supabase.from('sourcing_event_questions').select('*').eq('event_id', eventIdValue),
        supabase.from('sourcing_event_criteria').select('*').eq('event_id', eventIdValue),
        supabase.from('sourcing_invitations').select('*').eq('event_id', eventIdValue),
        supabase.from('sourcing_responses').select('*').eq('event_id', eventIdValue),
      ]);

      // Collect fornecedor ids from invitations + responses
      const fornecedorIds = [
        ...new Set([
          ...((invitationsRes.data ?? []) as Array<{ fornecedor_id?: string | null }>)
            .map(i => i.fornecedor_id).filter(Boolean),
          ...((responsesRes.data ?? []) as Array<{ fornecedor_id?: string | null }>)
            .map(r => r.fornecedor_id).filter(Boolean),
        ]),
      ] as string[];

      const fornecedoresRes = fornecedorIds.length
        ? await supabase.from('fornecedores').select('id, razao_social').in('id', fornecedorIds)
        : { data: [] as Array<{ id: string; razao_social: string }>, error: null };

      const fornecedoresMap = new Map((fornecedoresRes.data || []).map(f => [f.id, f]));

      return {
        ...(data as Record<string, unknown>),
        category: categoryRes.data,
        lots: lotsRes.data ?? [],
        questions: questionsRes.data ?? [],
        criteria: criteriaRes.data ?? [],
        invitations: ((invitationsRes.data ?? []) as Array<Record<string, unknown>>).map(inv => ({
          ...inv,
          fornecedor: (inv as { fornecedor_id?: string | null }).fornecedor_id
            ? fornecedoresMap.get((inv as { fornecedor_id: string }).fornecedor_id) ?? null
            : null,
        })),
        responses: ((responsesRes.data ?? []) as Array<Record<string, unknown>>).map(resp => ({
          ...resp,
          fornecedor: (resp as { fornecedor_id?: string | null }).fornecedor_id
            ? fornecedoresMap.get((resp as { fornecedor_id: string }).fornecedor_id) ?? null
            : null,
        })),
      } as SourcingEvent;
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