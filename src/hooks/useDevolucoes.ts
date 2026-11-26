import { useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { resolverTenantId } from '@/lib/tenant';
import { toast } from '@/lib/feedbackToast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { escapeIlike } from '@/lib/supabaseQuery';
import { calcularAbatimentoCredito } from '@/lib/creditoFornecedor';
import type { Database } from '@/integrations/supabase/types';

export type Devolucao = Database['public']['Tables']['devolucoes']['Row'] & {
  fornecedor?: { id: string; razao_social: string; nome_fantasia: string | null } | null;
  pedido?: { id: string; numero: string } | null;
};

export type DevolucaoItem = Database['public']['Tables']['devolucao_itens']['Row'];

export type CreditoFornecedor = Database['public']['Tables']['creditos_fornecedor']['Row'] & {
  fornecedor?: { id: string; razao_social: string; nome_fantasia: string | null } | null;
  devolucao?: { id: string; numero: string } | null;
};

export interface CreateDevolucaoInput {
  pedido_id?: string;
  fornecedor_id: string;
  tipo?: 'devolucao' | 'troca' | 'garantia';
  motivo: string;
  motivo_detalhe?: string;
  resolucao?: string;
  observacoes?: string;
  itens: {
    pedido_item_id?: string;
    descricao: string;
    quantidade: number;
    valor_unitario: number;
    motivo?: string;
  }[];
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  rascunho: ['solicitada', 'cancelada'],
  solicitada: ['aprovada', 'rejeitada', 'cancelada'],
  aprovada: ['em_transito', 'cancelada'],
  em_transito: ['recebida_fornecedor'],
  recebida_fornecedor: ['credito_emitido', 'reposicao_enviada', 'concluida'],
  credito_emitido: ['concluida'],
  reposicao_enviada: ['concluida'],
  concluida: [],
  rejeitada: ['solicitada'],
  cancelada: [],
};

export interface DevolucaoFilters {
  status?: string;
  search?: string;
  fornecedor_id?: string;
  /**
   * Opt-in. Com `page`, a consulta pagina no servidor (`.range` + `count`) e
   * `totalCount` passa a valer; sem `page`, a lista completa continua vindo.
   */
  page?: number;
  pageSize?: number;
}

export function useDevolucoes(filters?: DevolucaoFilters) {
  const { user, tenantId, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ['devolucoes', user?.id, filters?.status, filters?.search, filters?.fornecedor_id, filters?.page, filters?.pageSize], [user?.id, filters]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const paginar = typeof filters?.page === 'number';
      const pageSize = filters?.pageSize ?? 20;
      const from = ((filters?.page ?? 1) - 1) * pageSize;

      let query = supabase
        .from('devolucoes')
        .select('*', paginar ? { count: 'exact' } : {})
        .eq('tenant_id', tenantId || organizationId || '00000000-0000-0000-0000-000000000000')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status);
      if (filters?.fornecedor_id) query = query.eq('fornecedor_id', filters.fornecedor_id);
      if (filters?.search) {
        const s = escapeIlike(filters.search);
        query = query.or(`numero.ilike.%${s}%,motivo_detalhe.ilike.%${s}%`);
      }
      if (paginar) query = query.range(from, from + pageSize - 1);

      const { data: devRows, count, error } = await query;
      if (error) throw error;
      const rows = (devRows || []) as unknown as Database['public']['Tables']['devolucoes']['Row'][];

      // Fetch related fornecedor + pedido separately to avoid embed FK issues
      const fornecedorIds = [...new Set(rows.map(r => r.fornecedor_id).filter(Boolean))] as string[];
      const pedidoIds = [...new Set(rows.map(r => r.pedido_id).filter(Boolean))] as string[];

      const [fornecedoresRes, pedidosRes] = await Promise.all([
        fornecedorIds.length
          ? supabase.from('fornecedores').select('id, razao_social, nome_fantasia').in('id', fornecedorIds)
          : Promise.resolve({ data: [] as Array<{ id: string; razao_social: string; nome_fantasia: string | null }>, error: null }),
        pedidoIds.length
          ? supabase.from('pedidos').select('id, numero').in('id', pedidoIds)
          : Promise.resolve({ data: [] as Array<{ id: string; numero: string }>, error: null }),
      ]);

      const fornecedoresMap = new Map((fornecedoresRes.data || []).map(f => [f.id, f]));
      const pedidosMap = new Map((pedidosRes.data || []).map(p => [p.id, p]));

      const comRelacoes = rows.map(r => ({
        ...r,
        fornecedor: r.fornecedor_id ? fornecedoresMap.get(r.fornecedor_id) ?? null : null,
        pedido: r.pedido_id ? pedidosMap.get(r.pedido_id) ?? null : null,
      })) as Devolucao[];

      return { data: comRelacoes, totalCount: count ?? comRelacoes.length };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const devolucoes = useMemo(() => data?.data ?? [], [data]);
  const totalCount = data?.totalCount ?? 0;

  const createDevolucao = useCallback(async (input: CreateDevolucaoInput) => {
    if (!user) { toast.error('Você precisa estar logado'); return null; }
    try {
      const { data: numData } = await supabase.rpc('generate_sequential_number', { prefix: 'DEV', table_name: 'devolucoes' });
      const numero = numData || `DEV-${format(new Date(), 'yyyyMMddHHmmss')}`;
      const valorTotal = input.itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0);

      const { data, error } = await supabase.from('devolucoes').insert({
        numero,
        pedido_id: input.pedido_id,
        fornecedor_id: input.fornecedor_id,
        solicitante_id: user.id,
        tipo: input.tipo || 'devolucao',
        motivo: input.motivo,
        motivo_detalhe: input.motivo_detalhe,
        resolucao: input.resolucao || 'credito',
        observacoes: input.observacoes,
        valor_total: valorTotal,
        status: 'solicitada',
        tenant_id: tenantId || organizationId,
      } as never).select().single();
      if (error) throw error;

      if (input.itens.length > 0) {
        const itens = input.itens.map(i => ({
          devolucao_id: data.id,
          tenant_id: resolverTenantId(tenantId, organizationId),
          pedido_item_id: i.pedido_item_id,
          descricao: i.descricao,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
          valor_total: i.quantidade * i.valor_unitario,
          motivo: i.motivo || input.motivo,
        }));
        const { error: itensError } = await supabase.from('devolucao_itens').insert(itens);
        if (itensError) {
          // Cabecalho e itens sao um par: sem os itens a devolucao fica com
          // valor_total e nenhum item. Desfaz o cabecalho em vez de deixar a
          // linha orfa (o operador veria "erro ao criar" e criaria outra).
          const { error: desfazerError } = await supabase.from('devolucoes').delete().eq('id', data.id);
          queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
          if (desfazerError) {
            throw new Error(`Os itens da devolucao ${numero} nao foram gravados (${itensError.message}) e o cabecalho NAO foi removido: ${desfazerError.message}`);
          }
          throw new Error(`Os itens da devolucao ${numero} nao foram gravados (${itensError.message}) e a devolucao foi desfeita.`);
        }
      }

      toast.success('Devolução criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      return data;
    } catch (err: unknown) {
      toast.error('Erro ao criar devolução: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      return null;
    }
  }, [user, queryClient, tenantId, organizationId]);

  const updateStatus = useCallback(async (id: string, newStatus: string) => {
    const dev = devolucoes.find(d => d.id === id);
    if (!dev) { toast.error('Devolução não encontrada'); return false; }
    const allowed = VALID_TRANSITIONS[dev.status];
    if (allowed && !allowed.includes(newStatus)) {
      toast.error(`Transição inválida: ${dev.status} → ${newStatus}`);
      return false;
    }

    try {
      const updates: Database['public']['Tables']['devolucoes']['Update'] = { status: newStatus };
      if (newStatus === 'aprovada') updates["data_aprovacao"] = new Date().toISOString();
      if (newStatus === 'em_transito') updates["data_envio"] = new Date().toISOString();
      if (newStatus === 'recebida_fornecedor') updates["data_recebimento_fornecedor"] = new Date().toISOString();

      const { data: gravadas, error } = await supabase
        .from('devolucoes')
        .update(updates)
        .eq('id', id)
        .select('id');
      if (error) throw error;

      // UPDATE barrado por policy de RLS devolve 0 linhas e nenhum erro: sem esta
      // conferencia o hook anunciava o novo status com o banco intacto.
      if (!gravadas || gravadas.length === 0) {
        toast.error('Nada foi gravado: devolucao inexistente ou sem permissao para mudar o status.');
        return false;
      }

      // Auto-generate credit when status is credito_emitido
      if (newStatus === 'credito_emitido' && dev.fornecedor_id) {
        const { error: creditoError } = await supabase.from('creditos_fornecedor').insert({
          fornecedor_id: dev.fornecedor_id,
          devolucao_id: id,
          tipo: 'credito_devolucao',
          valor: dev.valor_total,
          saldo: dev.valor_total,
          descricao: `Crédito ref. devolução ${dev.numero}`,
          created_by: user?.id,
          tenant_id: tenantId || organizationId,
        } as never);
        if (creditoError) {
          // Credito e status sao um par: se o credito nao gravou, o status volta para o anterior
          // em vez de deixar a devolucao presa em credito_emitido sem nenhum credito.
          const { data: revertidas, error: rollbackError } = await supabase
            .from('devolucoes')
            .update({ status: dev.status })
            .eq('id', id)
            .select('id');
          queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
          const revertido = !rollbackError && (revertidas?.length ?? 0) > 0;
          toast.error(
            revertido
              ? `Credito nao gerado: ${creditoError.message}. Status mantido em "${dev.status}".`
              : `Credito nao gerado: ${creditoError.message}. Status NAO revertido: a devolucao segue em "credito_emitido".`
          );
          return false;
        }
        toast.success('Crédito gerado automaticamente!');
      }

      toast.success('Status atualizado!');
      queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      queryClient.invalidateQueries({ queryKey: ['creditos-fornecedor'] });
      return true;
    } catch (err: unknown) {
      toast.error('Erro: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      return false;
    }
  }, [devolucoes, user, queryClient, tenantId, organizationId]);

  const deleteDevolucao = useCallback(async (id: string) => {
    try {
      // Devolucao que ja gerou credito nao pode ser apagada: a FK de
      // creditos_fornecedor.devolucao_id e SET NULL e o credito ficaria orfao,
      // com saldo sem origem.
      const devolucao = devolucoes.find((item) => item.id === id);
      const { count, error: erroCredito } = await supabase
        .from('creditos_fornecedor')
        .select('id', { count: 'exact', head: true })
        .eq('devolucao_id', id);

      if (erroCredito) {
        toast.error('Nao foi possivel conferir o credito da devolucao. Exclusao cancelada.');
        return false;
      }

      if ((count ?? 0) > 0 || devolucao?.status === 'credito_emitido') {
        toast.error(
          'Devolucao com credito gerado nao pode ser excluida: o credito do fornecedor ficaria sem origem.'
        );
        return false;
      }

      const { data: excluidas, error } = await supabase.from('devolucoes').delete().eq('id', id).select('id');
      if (error) throw error;

      // DELETE barrado por policy de RLS devolve 0 linhas e nenhum erro.
      if (!excluidas || excluidas.length === 0) {
        toast.error('Nada foi excluido: devolucao inexistente ou sem permissao para excluir.');
        return false;
      }

      toast.success('Devolução excluída!');
      queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      return true;
    } catch (err: unknown) {
      toast.error('Erro: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      return false;
    }
  }, [devolucoes, queryClient]);

  useRealtimeSubscription({
    tables: ['devolucoes'],
    queryKeysToInvalidate: [['devolucoes']],
    enabled: !!user,
  });

  return { devolucoes, totalCount, loading: isLoading, error: error?.message || null, refetch, createDevolucao, updateStatus, deleteDevolucao };
}

export function useCreditosFornecedor(fornecedorId?: string) {
  const { user, tenantId, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['creditos-fornecedor', user?.id, fornecedorId],
    queryFn: async () => {
      let query = supabase
        .from('creditos_fornecedor')
        .select('*')
        .order('created_at', { ascending: false });
      if (fornecedorId) query = query.eq('fornecedor_id', fornecedorId);
      query = query.eq('tenant_id', tenantId || organizationId || '00000000-0000-0000-0000-000000000000');
      const { data: credRows, error } = await query;
      if (error) throw error;
      const rows = (credRows || []) as unknown as Database['public']['Tables']['creditos_fornecedor']['Row'][];

      // Fetch related fornecedor + devolucao separately to avoid embed FK issues
      const fornecedorIds = [...new Set(rows.map(r => r.fornecedor_id).filter(Boolean))] as string[];
      const devolucaoIds = [...new Set(rows.map(r => r.devolucao_id).filter(Boolean))] as string[];

      const [fornecedoresRes, devolucoesRes] = await Promise.all([
        fornecedorIds.length
          ? supabase.from('fornecedores').select('id, razao_social, nome_fantasia').in('id', fornecedorIds)
          : Promise.resolve({ data: [] as Array<{ id: string; razao_social: string; nome_fantasia: string | null }>, error: null }),
        devolucaoIds.length
          ? supabase.from('devolucoes').select('id, numero').in('id', devolucaoIds)
          : Promise.resolve({ data: [] as Array<{ id: string; numero: string }>, error: null }),
      ]);

      const fornecedoresMap = new Map((fornecedoresRes.data || []).map(f => [f.id, f]));
      const devolucoesMap = new Map((devolucoesRes.data || []).map(d => [d.id, d]));

      return rows.map(r => ({
        ...r,
        fornecedor: r.fornecedor_id ? fornecedoresMap.get(r.fornecedor_id) ?? null : null,
        devolucao: r.devolucao_id ? devolucoesMap.get(r.devolucao_id) ?? null : null,
      })) as CreditoFornecedor[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const creditos = useMemo(() => data ?? [], [data]);
  const saldoTotal = creditos.filter(c => c.status === 'ativo').reduce((s, c) => s + (Number(c.saldo) || 0), 0);

  const utilizarCredito = useCallback(async (creditoId: string, valor: number, pagamentoId?: string) => {
    const credito = creditos.find(c => c.id === creditoId);
    if (!credito || credito.saldo < valor) { toast.error('Saldo insuficiente'); return false; }
    try {
      const abatimento = calcularAbatimentoCredito(
        { saldo: credito.saldo, valor_utilizado: credito.valor_utilizado },
        valor,
      );
      const { data: gravados, error } = await supabase.from('creditos_fornecedor').update({
        ...abatimento,
        utilizado_em_pagamento_id: pagamentoId,
      }).eq('id', creditoId).select('id');
      if (error) throw error;

      // UPDATE barrado por RLS nao devolve erro, so 0 linhas: sem isso o app
      // anunciava o credito usado com o saldo do fornecedor intacto.
      if (!gravados || gravados.length === 0) {
        toast.error('Nada foi gravado: credito inexistente ou sem permissao para utiliza-lo.');
        return false;
      }

      toast.success(`Crédito de ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} utilizado!`);
      queryClient.invalidateQueries({ queryKey: ['creditos-fornecedor'] });
      return true;
    } catch (err: unknown) {
      toast.error('Erro: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      return false;
    }
  }, [creditos, queryClient]);

  useRealtimeSubscription({
    tables: ['creditos_fornecedor'],
    queryKeysToInvalidate: [['creditos-fornecedor']],
    enabled: !!user,
  });

  return { creditos, saldoTotal, loading: isLoading, utilizarCredito };
}

export function useDevolucoesKPIs() {
  const { user, tenantId, organizationId } = useAuth();
  const { data: kpis = { total: 0, abertas: 0, emTransito: 0, concluidas: 0, valorTotal: 0, taxaDevolucao: 0 }, isLoading } = useQuery({
    // Chave dentro do namespace `devolucoes`: as mutações (`:147,156,213,226,268`) e o
    // realtime invalidam o prefixo `['devolucoes']`, e o match do TanStack é posicional —
    // um namespace irmão (`devolucoes-kpis`) ficaria fora do alcance dos cartões.
    queryKey: ['devolucoes', 'kpis', user?.id, tenantId ?? organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.from('devolucoes').select('status, valor_total').eq('tenant_id', tenantId || organizationId || '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      const all = data || [];
      const abertas = all.filter(d => ['rascunho', 'solicitada', 'aprovada'].includes(d.status)).length;
      const emTransito = all.filter(d => d.status === 'em_transito').length;
      const concluidas = all.filter(d => d.status === 'concluida').length;
      return {
        total: all.length,
        abertas,
        emTransito,
        concluidas,
        valorTotal: all.reduce((s, d) => s + (d.valor_total || 0), 0),
        taxaDevolucao: all.length > 0 ? Math.round((concluidas / all.length) * 100) : 0,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
  return { kpis, loading: isLoading };
}
