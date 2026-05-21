import { useCallback, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { security } from '@/lib/security';
import { useAuth } from '@/features/auth';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/feedbackToast';
import { auditHelpers } from '@/services/auditService';
import type { Json, Database } from '@/integrations/supabase/types';

export type Pagamento = Database['public']['Tables']['pagamentos']['Row'] & {
  fornecedor?: { id: string; razao_social: string; nome_fantasia: string | null; } | null;
  pedido?: { id: string; numero: string; } | null;
  cost_center?: { id: string; name: string; code: string; } | null;
};

export interface CreatePagamentoInput {
  pedido_id?: string;
  fornecedor_id: string;
  cost_center_id?: string;
  valor: number;
  data_vencimento: string;
  forma_pagamento?: Pagamento['forma_pagamento'];
  numero_nf?: string;
  chave_nf?: string;
  observacoes?: string;
}

export interface PagamentoFilters {
  search?: string;
  status?: string;
  fornecedor_id?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

const VALID_PAGAMENTO_TRANSITIONS: Record<string, string[]> = {
  pendente: ['aprovado', 'cancelado'],
  aprovado: ['agendado', 'pago', 'parcial', 'cancelado'],
  agendado: ['pago', 'parcial', 'cancelado'],
  pago: ['parcial'],
  parcial: ['pago', 'parcial', 'cancelado'],
  cancelado: [],
  atrasado: ['pago', 'parcial', 'cancelado'],
};

async function fetchPagamentosData(userId: string | undefined, organizationId: string | null | undefined, filters?: PagamentoFilters) {
  if (!userId || !organizationId) return { data: [], totalCount: 0 };

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('pagamentos')
    .select(`
      *,
      fornecedor:fornecedores(id, razao_social, nome_fantasia),
      pedido:pedidos(id, numero),
      cost_center:cost_centers(id, name, code)
    `, { count: 'exact' })
    .order('data_vencimento', { ascending: true })
    .eq('organization_id', organizationId)

  if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status);
  if (filters?.fornecedor_id) query = query.eq('fornecedor_id', filters.fornecedor_id);
  if (filters?.search) {
    const term = security.sanitizeSearchTerm(filters.search);
    if (term) query = query.or(`numero.ilike.%${term}%,numero_nf.ilike.%${term}%`);
  }
  if (filters?.dateFrom) query = query.gte('data_vencimento', filters.dateFrom);
  if (filters?.dateTo) query = query.lte('data_vencimento', filters.dateTo);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Pagamento[]) || [], totalCount: count || 0 };
}

export function usePagamentos(filters?: PagamentoFilters) {
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => [
    'pagamentos', user?.id, organizationId,
    filters?.status, filters?.fornecedor_id, filters?.search,
    filters?.dateFrom, filters?.dateTo, filters?.page, filters?.pageSize,
  ], [user?.id, organizationId, filters]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchPagamentosData(user?.id, organizationId, filters),
    enabled: !!user && !!organizationId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const pagamentos = data?.data || [];
  const totalCount = data?.totalCount || 0;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
  }, [queryClient]);

  const createPagamento = useCallback(async (input: CreatePagamentoInput) => {
    if (!user) { toast.error('Você precisa estar logado'); return null; }
    try {
      logger.info('Registrando novo pagamento', { pedidoId: input.pedido_id, fornecedorId: input.fornecedor_id, valor: input.valor });
      const { data: numData } = await supabase.rpc('generate_sequential_number', { prefix: 'PAG', table_name: 'pagamentos' });
      const numero = numData || `PAG-${format(new Date(), 'yyyyMMddHHmmss')}`;
      const { data, error } = await supabase
        .from('pagamentos')
        .insert({
          numero, pedido_id: input.pedido_id, fornecedor_id: input.fornecedor_id,
          valor: input.valor, data_vencimento: input.data_vencimento,
          cost_center_id: input.cost_center_id,
          forma_pagamento: input.forma_pagamento, numero_nf: input.numero_nf,
          chave_nf: input.chave_nf, observacoes: input.observacoes, created_by: user.id,
          tenant_id: organizationId,
          organization_id: organizationId,
        } as any)
        .select().single();
      if (error) {
        logger.error('Erro ao inserir pagamento no banco', { error, input });
        throw error;
      }
      
      // Audit Log
      await auditHelpers.logCreate(
        'pagamento', 
        data.id, 
        `Pagamento ${data.numero} registrado para fornecedor ${input.fornecedor_id}`,
        data
      );
      logger.info('Pagamento registrado com sucesso', { id: data.id, numero: data.numero });
      toast.success('Pagamento registrado com sucesso!');
      invalidate();
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro fatal ao registrar pagamento', { error: msg, input });
      toast.error('Erro ao registrar pagamento: ' + msg);
      return null;
    }
  }, [user, invalidate]);

  const updatePagamento = useCallback(async (id: string, updates: Partial<Pagamento>) => {
    if (updates.status) {
      const current = pagamentos.find(p => p.id === id);
      logger.info('Atualizando pagamento', { id, currentStatus: current?.status, updates });
      if (current) {
        const allowed = VALID_PAGAMENTO_TRANSITIONS[current.status];
        if (allowed && !allowed.includes(updates.status)) {
          toast.error(`Transição inválida: ${current.status} → ${updates.status}`);
          return false;
        }
      }
    }
    try {
      const { error } = await supabase.from('pagamentos').update(updates).eq('id', id);
      if (error) {
        logger.error('Erro ao atualizar pagamento no banco', { error, id, updates });
        throw error;
      }
      toast.success('Pagamento atualizado!');
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro fatal ao atualizar pagamento', { error: msg, id });
      toast.error('Erro ao atualizar: ' + msg);
      return false;
    }
  }, [pagamentos, invalidate]);

  const markAsPaid = useCallback(async (id: string, valor_pago?: number) => {
    const pagamento = pagamentos.find(p => p.id === id);
    if (!pagamento) return false;
    const valorPago = valor_pago || pagamento.valor;
    const isParcial = valorPago < pagamento.valor;
    return updatePagamento(id, {
      status: isParcial ? 'parcial' : 'pago',
      valor_pago: valorPago,
      data_pagamento: new Date().toISOString().split('T')[0],
    });
  }, [pagamentos, updatePagamento]);

  const approvePagamento = useCallback(async (id: string) => {
    if (!user) return false;
    return updatePagamento(id, {
      status: 'aprovado', aprovador_id: user.id,
      data_aprovacao: new Date().toISOString(),
    });
  }, [user, updatePagamento]);

  const bulkUpdateStatus = useCallback(async (ids: string[], newStatus: Pagamento['status']) => {
    try {
      const updates: Partial<Pagamento> = { status: newStatus };
      if (newStatus === 'pago') updates.data_pagamento = new Date().toISOString().split('T')[0];
      if (newStatus === 'aprovado' && user) {
        updates.aprovador_id = user.id;
        updates.data_aprovacao = new Date().toISOString();
      }
      const { error } = await supabase.from('pagamentos').update(updates).in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} pagamento(s) atualizado(s)!`);
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao atualizar pagamentos: ' + msg);
      return false;
    }
  }, [user, invalidate]);

  const deletePagamento = useCallback(async (id: string) => {
    try {
      logger.info('Excluindo registro de pagamento', { id });
      const { error } = await supabase.from('pagamentos').delete().eq('id', id);
      if (error) {
        logger.error('Erro ao excluir pagamento no banco', { error, id });
        throw error;
      }
      logger.info('Pagamento excluído com sucesso', { id });
      toast.success('Pagamento excluído!');
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro fatal ao excluir pagamento', { error: msg, id });
      toast.error('Erro ao excluir: ' + msg);
      return false;
    }
  }, [invalidate]);

  const bulkDelete = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase.from('pagamentos').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} pagamento(s) excluído(s)!`);
      invalidate();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao excluir pagamentos: ' + msg);
      return false;
    }
  }, [invalidate]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('pagamentos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamentos' }, () => {
        invalidate();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, invalidate]);

  return {
    pagamentos, totalCount, loading: isLoading, error: error?.message || null,
    refetch, createPagamento, updatePagamento, markAsPaid, approvePagamento,
    bulkUpdateStatus, bulkDelete, deletePagamento,
  };
}

// Hook for KPIs optimized with RPC
export function usePagamentosKPIs() {
  const { user, organizationId } = useAuth();

  const { data: kpis = { total: 0, pendentes: 0, atrasados: 0, pagos: 0, valorPendente: 0, valorPago: 0 }, isLoading } = useQuery({
    queryKey: ['pagamentos-kpis', user?.id, organizationId],
    queryFn: async () => {
      if (!organizationId) return { total: 0, pendentes: 0, atrasados: 0, pagos: 0, valorPendente: 0, valorPago: 0 };
      
      const { data, error } = await supabase.rpc('get_pagamentos_kpis', { 
        p_organization_id: organizationId 
      });

      if (error) {
        logger.error('Error fetching Pagamentos KPIs via RPC', { error });
        throw error;
      }

      return data as { 
        total: number; 
        pendentes: number; 
        atrasados: number; 
        pagos: number; 
        valorPendente: number; 
        valorPago: number; 
      };
    },
    enabled: !!user && !!organizationId,
    staleTime: 60_000,
  });

  return { kpis, loading: isLoading };
}
