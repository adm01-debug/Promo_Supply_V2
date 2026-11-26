import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/feedbackToast';
import { auditHelpers } from '@/services/auditService';
import { escapeIlike } from '@/lib/supabaseQuery';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import type { Database } from '@/integrations/supabase/types';
import {
  STATUS_PEDIDO_EXCLUIVEL,
  MOTIVO_EXCLUSAO_BLOQUEADA,
  mensagemExclusaoParcial,
  MOTIVO_EXCLUSAO_COM_CHECKLIST,
} from '@/features/pedidos/exclusaoPedido';
import { transicaoDeStatusPermitida } from '../statusTransitions';

/**
 * receiving_checklists.pedido_id esta em ON DELETE CASCADE: excluir o pedido
 * apagava a conferencia de recebimento (quantidade e divergencia recebidas).
 * O filtro por status ja barra pedido recebido; esta guarda cobre o caso de
 * checklist criado antes da transicao de status.
 */
async function pedidosComChecklist(ids: string[]): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('receiving_checklists')
    .select('pedido_id')
    .in('pedido_id', ids);
  if (error) throw error;
  return new Set(
    ((data ?? []) as Array<{ pedido_id: string | null }>)
      .map((linha) => linha.pedido_id)
      .filter((id): id is string => Boolean(id)),
  );
}

export type Pedido = Database['public']['Tables']['pedidos']['Row'] & {
  fornecedor?: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
    email: string | null;
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
    pim_product_id?: string;
    pim_variant_id?: string;
    codigo_fornecedor?: string;
    ncm?: string;
    ipi_rate?: number;
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
  empresaIds?: string[] | null;
}

async function fetchPedidosData(userId: string | undefined, tenantId: string | null | undefined, filters?: PedidoFilters) {
  if (!userId || !tenantId) return { data: [], totalCount: 0 };

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('pedidos')
    .select(`
      id, numero, status, fornecedor_id, solicitacao_id, cotacao_id,
      valor_total, valor_frete, desconto, data_emissao, data_previsao, data_entrega,
      condicao_pagamento, endereco_entrega, observacoes, comprador_id,
      organization_id, tenant_id, created_at, updated_at,
      fornecedor:fornecedores(id, razao_social, nome_fantasia, email),
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
    query = query.or(`numero.ilike.%${escapeIlike(filters.search)}%`);
  }
  if (filters?.dateFrom) {
    query = query.gte('data_emissao', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('data_emissao', filters.dateTo);
  }
  if (filters?.empresaIds) {
    query = query.in('tenant_id', filters.empresaIds);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return { data: (data as Pedido[]) || [], totalCount: count || 0 };
}

export function usePedidos(filters?: PedidoFilters) {
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => [
    'pedidos', user?.id, organizationId,
    filters?.status, filters?.fornecedor_id, filters?.search,
    filters?.dateFrom, filters?.dateTo, filters?.page, filters?.pageSize,
    filters?.empresaIds ?? 'all',
  ], [user?.id, organizationId, filters]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchPedidosData(user?.id, organizationId, filters),
    enabled: !!user && !!organizationId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const pedidos = useMemo(() => data?.data ?? [], [data]);
  const totalCount = data?.totalCount || 0;

  // Create new pedido
  const createPedido = useCallback(async (input: CreatePedidoInput) => {
    if (!user || !organizationId) { toast.error('Você precisa estar logado em uma organização'); return null; }

    try {
      logger.info('Iniciando criação de pedido de compra', { solicitacaoId: input.solicitacao_id, fornecedorId: input.fornecedor_id, valorTotal: input.valor_total });
      if (input.solicitacao_id) {
        const { data: solicitacao } = await supabase
          .from('solicitacoes')
          .select('status')
          .eq('id', input.solicitacao_id)
          .single();

        if (solicitacao?.status !== 'aprovada') {
          toast.error('Só é possível gerar ordem de compra de uma solicitação aprovada');
          logger.warn('Pedido recusado: solicitacao nao aprovada', { solicitacaoId: input.solicitacao_id, status: solicitacao?.status });
          return null;
        }
      }
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
          tenant_id: organizationId,
          organization_id: organizationId,
        })
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
          tenant_id: organizationId,
          pim_product_id: item.pim_product_id ?? null,
          pim_variant_id: item.pim_variant_id ?? null,
          codigo_fornecedor: item.codigo_fornecedor ?? null,
          ncm: item.ncm ?? null,
          ipi_rate: item.ipi_rate ?? null,
        }));
        // Etapa 170 (INT-07 parte 2/2): o insert dos itens nao checava erro. Se o banco
        // recusasse (policy/RLS/constraint), o pedido ficava gravado sem nenhum item e a
        // tela ainda exibia "Pedido criado com sucesso!" -- a OC ia ao fornecedor vazia.
        // Sem `.select('id')`: a policy de SELECT de pedido_itens e restrita por papel
        // (admin/coordinator/buyer/finance), entao quem insere sem esse papel veria erro
        // de leitura com os itens gravados. O INSERT recusado pelo banco ja vem como erro.
        const { error: itensError } = await supabase.from('pedido_itens').insert(itensToInsert);

        if (itensError) {
          logger.error('Pedido gravado sem itens: falha no insert de pedido_itens', {
            error: itensError, pedidoId: data.id, numero: data.numero, itens: itensToInsert.length,
          });
          // O pedido existe no banco: devolver null faria o operador gerar outro pedido
          // duplicado. O aviso e explicito e o pedido volta para a lista para correcao.
          toast.error(
            `Pedido ${data.numero} foi gravado, mas os ${itensToInsert.length} item(ns) NAO foram: ${itensError.message}. `
            + 'Corrija os itens antes de enviar ao fornecedor.',
          );
          queryClient.invalidateQueries({ queryKey: ['pedidos'] });
          return data;
        }
      } else {
        logger.warn('Pedido criado sem itens: entrada sem lista de itens', {
          pedidoId: data.id, numero: data.numero,
        });
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
  }, [user, organizationId, queryClient]);

  // Update pedido
  const updatePedido = useCallback(async (id: string, updates: Database['public']['Tables']['pedidos']['Update']) => {
    try {
      logger.info('Atualizando pedido', { id, updates });
      // O PostgREST devolve 0 linhas e nenhum erro quando o RLS barra o update:
      // sem `select('id')` a tela comemorava "Pedido atualizado!" sem gravar nada.
      const { data, error } = await supabase.from('pedidos').update(updates).eq('id', id).select('id');
      if (error) {
        logger.error('Erro ao atualizar pedido no banco', { error, id, updates });
        throw error;
      }
      if (!data?.length) {
        logger.error('Pedido nao atualizado: 0 linhas afetadas (RLS)', { id, updates });
        toast.error('Pedido não foi atualizado: você não tem permissão para alterar este pedido.');
        return false;
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

    if (!transicaoDeStatusPermitida(pedido.status, newStatus)) {
      toast.error(`Transição inválida: ${pedido.status} → ${newStatus}`);
      return false;
    }

    const updates: Database['public']['Tables']['pedidos']['Update'] = { status: newStatus };
    if (newStatus === 'entregue') {
      updates.data_entrega = new Date().toISOString().split('T')[0];
    }
    return updatePedido(id, updates);
  }, [pedidos, updatePedido]);

  // Bulk update status
  const bulkUpdateStatus = useCallback(async (ids: string[], newStatus: Pedido['status']) => {
    try {
      const updates: Database['public']['Tables']['pedidos']['Update'] = { status: newStatus };
      if (newStatus === 'entregue') updates.data_entrega = new Date().toISOString().split('T')[0];
      // 0 linhas afetadas = RLS barrou: nunca comemorar sem gravar (mesmo criterio
      // de bulkDelete). O parcial tambem precisa ser contado, nao presumido.
      const { data, error } = await supabase.from('pedidos').update(updates).in('id', ids).select('id');
      if (error) throw error;
      const atualizados = data?.length ?? 0;
      if (atualizados > 0) queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      if (atualizados === 0) {
        logger.error('Nenhum pedido atualizado: 0 linhas afetadas (RLS)', { ids, newStatus });
        toast.error('Nenhum pedido foi atualizado: você não tem permissão para alterar estes pedidos.');
        return false;
      }
      if (atualizados < ids.length) {
        toast.warning(`${atualizados} de ${ids.length} pedido(s) atualizado(s). Os demais não foram alterados: sem permissão.`);
        return false;
      }
      toast.success(`${atualizados} pedido(s) atualizado(s)!`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao atualizar pedidos: ' + msg);
      return false;
    }
  }, [queryClient]);

  // Bulk delete
  const bulkDelete = useCallback(async (ids: string[]) => {
    let comChecklist: Set<string>;
    try {
      comChecklist = await pedidosComChecklist(ids);
    } catch {
      toast.error('Não foi possível conferir o recebimento dos pedidos. Exclusão cancelada.');
      return false;
    }
    if (comChecklist.size > 0) {
      toast.error(MOTIVO_EXCLUSAO_COM_CHECKLIST);
      return false;
    }
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .delete()
        .in('id', ids)
        .in('status', [...STATUS_PEDIDO_EXCLUIVEL])
        .select('id');
      if (error) throw error;
      const excluidos = data?.length ?? 0;
      if (excluidos > 0) queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      if (excluidos === 0) {
        toast.error(MOTIVO_EXCLUSAO_BLOQUEADA);
        return false;
      }
      if (excluidos < ids.length) {
        toast.warning(mensagemExclusaoParcial(excluidos, ids.length));
        return false;
      }
      toast.success(`${excluidos} pedido(s) excluído(s)!`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao excluir pedidos: ' + msg);
      return false;
    }
  }, [queryClient]);

  // Delete pedido
  const deletePedido = useCallback(async (id: string) => {
    let comChecklist: Set<string>;
    try {
      comChecklist = await pedidosComChecklist([id]);
    } catch {
      toast.error('Não foi possível conferir o recebimento do pedido. Exclusão cancelada.');
      return false;
    }
    if (comChecklist.has(id)) {
      logger.warn('Exclusao de pedido bloqueada por checklist de recebimento', { id });
      toast.error(MOTIVO_EXCLUSAO_COM_CHECKLIST);
      return false;
    }
    try {
      logger.info('Excluindo pedido', { id });
      const { data, error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', id)
        .in('status', [...STATUS_PEDIDO_EXCLUIVEL])
        .select('id');
      if (error) {
        logger.error('Erro ao excluir pedido no banco', { error, id });
        throw error;
      }
      if (!data?.length) {
        logger.warn('Exclusao de pedido bloqueada pelo status', { id });
        toast.error(MOTIVO_EXCLUSAO_BLOQUEADA);
        return false;
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

  useRealtimeSubscription({
    tables: ['pedidos'],
    queryKeysToInvalidate: [['pedidos']],
    enabled: !!user,
  });

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
    // Mesma razão da chave de `usePagamentosKPIs`: o prefixo `['pedidos']` (mutações e
    // realtime) só alcança as chaves que começam por ele.
    queryKey: ['pedidos', 'kpis', user?.id, organizationId],
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
