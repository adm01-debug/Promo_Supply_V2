import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/feedbackToast';
import { auditHelpers } from '@/services/auditService';
import type { Database } from '@/integrations/supabase/types';

export type Pedido = Database['public']['Tables']['pedidos']['Row'] & {
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
};

export type PedidoItem = Database['public']['Tables']['pedido_itens']['Row'];

export interface CreatePedidoInput {
  solicitacao_id?: string;
  cotacao_id?: string;
  fornecedor_id: string;
  valor_total: number;
  valor_frete?: number;
  desconto?: number;
  data_previsao?: string;
  endereco_entrega?: string;
  condicao_pagamento?: string;
  observacoes?: string;
  itens?: {
    descricao: string;
    quantidade: number;
    unidade?: string;
    valor_unitario: number;
  }[];
}

export interface PedidoFilters {
  search?: string;
  status?: string;
  fornecedor_id?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

const VALID_PEDIDO_TRANSITIONS: Record<string, string[]> = {
  pendente: ['aprovado', 'cancelado'],
  aprovado: ['enviado', 'em_transito', 'cancelado'],
  enviado: ['em_transito', 'entregue', 'cancelado'],
  em_transito: ['entregue', 'parcial', 'cancelado'],
  entregue: ['parcial'],
  parcial: ['entregue'],
  cancelado: [],
  concluido: [],
};

async function fetchPedidosData(userId: string | undefined, tenantId: string | null | undefined, filters?: PedidoFilters) {
  if (!userId || !tenantId) return { data: [], totalCount: 0 };

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('pedidos')
    .select(`
      *,
      fornecedor:fornecedores(id, razao_social, nome_fantasia),
      solicitacao:solicitacoes(id, numero, titulo)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .eq('organization_id', tenantId)
    .range(from, to);

  if (filters?.status && filters.status !== 'todos') {
    query = query.eq('status', filters.status);
  }
  if (filters?.fornecedor_id) {
    query = query.eq('fornecedor_id', filters.fornecedor_id);
  }
  if (filters?.search) {
    query = query.or(`numero.ilike.%${filters.search}%`);
  }
  if (filters?.dateFrom) {
    query = query.gte('data_emissao', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('data_emissao', filters.dateTo);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return { data: (data as Pedido[]) || [], totalCount: count || 0 };
}

export function usePedidos(filters?: PedidoFilters) {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => [
    'pedidos', user?.id, tenantId,
    filters?.status, filters?.fornecedor_id, filters?.search,
    filters?.dateFrom, filters?.dateTo, filters?.page, filters?.pageSize,
  ], [user?.id, tenantId, filters]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchPedidosData(user?.id, tenantId, filters),
    enabled: !!user && !!tenantId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const pedidos = data?.data || [];
  const totalCount = data?.totalCount || 0;

  // Create new pedido
  const createPedido = useCallback(async (input: CreatePedidoInput) => {
    if (!user || !tenantId) { toast.error('Você precisa estar logado em uma organização'); return null; }

    try {
      logger.info('Iniciando criação de pedido de compra', { solicitacaoId: input.solicitacao_id, fornecedorId: input.fornecedor_id, valorTotal: input.valor_total });
      const { data: numData } = await supabase.rpc('generate_sequential_number', {
        prefix: 'PED', table_name: 'pedidos'
      });
      const numero = numData || `PED-${Date.now()}`;

      const { data, error } = await supabase
        .from('pedidos')
        .insert({
          numero, solicitacao_id: input.solicitacao_id, cotacao_id: input.cotacao_id,
          fornecedor_id: input.fornecedor_id, valor_total: input.valor_total,
          valor_frete: input.valor_frete || 0, desconto: input.desconto || 0,
          data_previsao: input.data_previsao, endereco_entrega: input.endereco_entrega,
          condicao_pagamento: input.condicao_pagamento, observacoes: input.observacoes,
          comprador_id: user.id,
          tenant_id: tenantId,
          organization_id: tenantId,
        } as any)
        .select().single();

      if (error) {
        logger.error('Erro ao inserir pedido no banco', { error, input });
        throw error;
      }

      // Audit Log for Order Creation
      await auditHelpers.logCreate(
        'pedido', 
        data.id, 
        `Pedido de Compra ${data.numero} gerado para fornecedor ${input.fornecedor_id}`,
        data
      );

      if (input.itens && input.itens.length > 0) {
        const itensToInsert = input.itens.map(item => ({
          pedido_id: data.id, descricao: item.descricao, quantidade: item.quantidade,
          unidade: item.unidade || 'un', valor_unitario: item.valor_unitario,
          valor_total: item.quantidade * item.valor_unitario,
          tenant_id: tenantId,
        }));
        await supabase.from('pedido_itens').insert(itensToInsert as any);
      }

      logger.info('Pedido criado com sucesso', { id: data.id, numero: data.numero });
      toast.success('Pedido criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro fatal ao criar pedido', { error: msg, input });
      toast.error('Erro ao criar pedido: ' + msg);
      return null;
    }
  }, [user, queryClient]);

  // Update pedido
  const updatePedido = useCallback(async (id: string, updates: Partial<Pedido>) => {
    try {
      logger.info('Atualizando pedido', { id, updates });
      const { error } = await supabase.from('pedidos').update(updates).eq('id', id);
      if (error) {
        logger.error('Erro ao atualizar pedido no banco', { error, id, updates });
        throw error;
      }
      toast.success('Pedido atualizado!');
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro fatal ao atualizar pedido', { error: msg, id });
      toast.error('Erro ao atualizar: ' + msg);
      return false;
    }
  }, [queryClient]);

  // Update status with transition validation
  const updateStatus = useCallback(async (id: string, newStatus: Pedido['status']) => {
    const pedido = pedidos.find(p => p.id === id);
    logger.info('Alterando status do pedido', { id, oldStatus: pedido?.status, newStatus });
    if (!pedido) { toast.error('Pedido não encontrado'); return false; }

    const allowed = VALID_PEDIDO_TRANSITIONS[pedido.status];
    if (allowed && !allowed.includes(newStatus)) {
      toast.error(`Transição inválida: ${pedido.status} → ${newStatus}`);
      return false;
    }

    const updates: Partial<Pedido> = { status: newStatus };
    if (newStatus === 'entregue') {
      updates.data_entrega = new Date().toISOString().split('T')[0];
    }
    return updatePedido(id, updates);
  }, [pedidos, updatePedido]);

  // Bulk update status
  const bulkUpdateStatus = useCallback(async (ids: string[], newStatus: Pedido['status']) => {
    try {
      const updates: Partial<Pedido> = { status: newStatus };
      if (newStatus === 'entregue') updates.data_entrega = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('pedidos').update(updates).in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} pedido(s) atualizado(s)!`);
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao atualizar pedidos: ' + msg);
      return false;
    }
  }, [queryClient]);

  // Bulk delete
  const bulkDelete = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase.from('pedidos').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} pedido(s) excluído(s)!`);
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao excluir pedidos: ' + msg);
      return false;
    }
  }, [queryClient]);

  // Delete pedido
  const deletePedido = useCallback(async (id: string) => {
    try {
      logger.info('Excluindo pedido', { id });
      const { error } = await supabase.from('pedidos').delete().eq('id', id);
      if (error) {
        logger.error('Erro ao excluir pedido no banco', { error, id });
        throw error;
      }
      logger.info('Pedido excluído com sucesso', { id });
      toast.success('Pedido excluído!');
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro fatal ao excluir pedido', { error: msg, id });
      toast.error('Erro ao excluir: ' + msg);
      return false;
    }
  }, [queryClient]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('pedidos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return {
    pedidos,
    totalCount,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    createPedido,
    updatePedido,
    updateStatus,
    bulkUpdateStatus,
    bulkDelete,
    deletePedido,
  };
}

// Hook for KPIs optimized with RPC
export function usePedidosKPIs() {
  const { user, organizationId } = useAuth();

  const { data: kpis = { total: 0, pendentes: 0, emTransito: 0, entregues: 0, valorTotal: 0 }, isLoading } = useQuery({
    queryKey: ['pedidos-kpis', user?.id, organizationId],
    queryFn: async () => {
      if (!organizationId) return { total: 0, pendentes: 0, emTransito: 0, entregues: 0, valorTotal: 0 };
      
      const { data, error } = await supabase.rpc('get_pedidos_kpis', { 
        p_organization_id: organizationId 
      });

      if (error) {
        logger.error('Error fetching Pedidos KPIs via RPC', { error });
        throw error;
      }

      return data as {
        total: number;
        pendentes: number;
        emTransito: number;
        entregues: number;
        valorTotal: number;
      };
    },
    enabled: !!user && !!organizationId,
    staleTime: 60_000,
  });

  return { kpis, loading: isLoading };
}
