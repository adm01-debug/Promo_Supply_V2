import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { auditHelpers } from '@/services/auditService';
import { useEffect } from 'react';

export interface Pedido {
  id: string;
  numero: string;
  solicitacao_id: string | null;
  cotacao_id: string | null;
  fornecedor_id: string;
  valor_total: number;
  valor_frete: number;
  desconto: number;
  status: 'pendente' | 'aprovado' | 'enviado' | 'em_transito' | 'entregue' | 'parcial' | 'cancelado';
  data_emissao: string;
  data_previsao: string | null;
  data_entrega: string | null;
  codigo_rastreamento: string | null;
  transportadora: string | null;
  endereco_entrega: string | null;
  condicao_pagamento: string | null;
  observacoes: string | null;
  comprador_id: string | null;
  aprovador_id: string | null;
  created_at: string;
  updated_at: string;
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

export interface PedidoItem {
  id: string;
  pedido_id: string;
  produto_id: string | null;
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
  quantidade_recebida: number;
  created_at: string;
}

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

async function fetchPedidosData(userId: string | undefined, filters?: PedidoFilters) {
  if (!userId) return { data: [], totalCount: 0 };

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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => [
    'pedidos', user?.id,
    filters?.status, filters?.fornecedor_id, filters?.search,
    filters?.dateFrom, filters?.dateTo, filters?.page, filters?.pageSize,
  ], [user?.id, filters]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchPedidosData(user?.id, filters),
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const pedidos = data?.data || [];
  const totalCount = data?.totalCount || 0;

  // Create new pedido
  const createPedido = useCallback(async (input: CreatePedidoInput) => {
    if (!user) { toast.error('Você precisa estar logado'); return null; }

    try {
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
        })
        .select().single();

      if (error) throw error;

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
        }));
        await supabase.from('pedido_itens').insert(itensToInsert);
      }

      toast.success('Pedido criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao criar pedido: ' + msg);
      return null;
    }
  }, [user, queryClient]);

  // Update pedido
  const updatePedido = useCallback(async (id: string, updates: Partial<Pedido>) => {
    try {
      const { error } = await supabase.from('pedidos').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Pedido atualizado!');
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao atualizar: ' + msg);
      return false;
    }
  }, [queryClient]);

  // Update status with transition validation
  const updateStatus = useCallback(async (id: string, newStatus: Pedido['status']) => {
    const pedido = pedidos.find(p => p.id === id);
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
      const { error } = await supabase.from('pedidos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Pedido excluído!');
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
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

// Hook for KPIs
export function usePedidosKPIs() {
  const { user } = useAuth();

  const { data: kpis = { total: 0, pendentes: 0, emTransito: 0, entregues: 0, valorTotal: 0 }, isLoading } = useQuery({
    queryKey: ['pedidos-kpis', user?.id],
    queryFn: async () => {
      let allData: { status: string; valor_total: number }[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('pedidos')
          .select('status, valor_total')
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) { hasMore = false; break; }
        allData = [...allData, ...data];
        if (data.length < pageSize) hasMore = false;
        from += pageSize;
      }

      return {
        total: allData.length,
        pendentes: allData.filter(p => p.status === 'pendente' || p.status === 'aprovado').length,
        emTransito: allData.filter(p => p.status === 'em_transito' || p.status === 'enviado').length,
        entregues: allData.filter(p => p.status === 'entregue').length,
        valorTotal: allData.reduce((sum, p) => sum + (p.valor_total || 0), 0),
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { kpis, loading: isLoading };
}
