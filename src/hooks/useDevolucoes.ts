import { useState, useCallback, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { toast } from 'sonner';
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

export function useDevolucoes(filters?: { status?: string; search?: string; fornecedor_id?: string }) {
  const { user, tenantId, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ['devolucoes', user?.id, filters?.status, filters?.search, filters?.fornecedor_id], [user?.id, filters]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('devolucoes')
        .select(`*, fornecedor:fornecedores(id, razao_social, nome_fantasia), pedido:pedidos(id, numero)`)
        .eq('tenant_id', tenantId || organizationId || '00000000-0000-0000-0000-000000000000')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status);
      if (filters?.fornecedor_id) query = query.eq('fornecedor_id', filters.fornecedor_id);
      if (filters?.search) query = query.or(`numero.ilike.%${filters.search}%,motivo_detalhe.ilike.%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Devolucao[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const devolucoes = data || [];

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
      } as any).select().single();
      if (error) throw error;

      if (input.itens.length > 0) {
        const itens = input.itens.map(i => ({
          devolucao_id: data.id,
          pedido_item_id: i.pedido_item_id,
          descricao: i.descricao,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
          valor_total: i.quantidade * i.valor_unitario,
          motivo: i.motivo || input.motivo,
        }));
        await supabase.from('devolucao_itens').insert(itens);
      }

      toast.success('Devolução criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      return data;
    } catch (err: unknown) {
      toast.error('Erro ao criar devolução: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      return null;
    }
  }, [user, queryClient]);

  const updateStatus = useCallback(async (id: string, newStatus: string) => {
    const dev = devolucoes.find(d => d.id === id);
    if (!dev) { toast.error('Devolução não encontrada'); return false; }
    const allowed = VALID_TRANSITIONS[dev.status];
    if (allowed && !allowed.includes(newStatus)) {
      toast.error(`Transição inválida: ${dev.status} → ${newStatus}`);
      return false;
    }

    try {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'aprovada') updates["data_aprovacao"] = new Date().toISOString();
      if (newStatus === 'em_transito') updates["data_envio"] = new Date().toISOString();
      if (newStatus === 'recebida_fornecedor') updates["data_recebimento_fornecedor"] = new Date().toISOString();

      const { error } = await supabase.from('devolucoes').update(updates).eq('id', id);
      if (error) throw error;

      // Auto-generate credit when status is credito_emitido
      if (newStatus === 'credito_emitido' && dev.fornecedor_id) {
        await supabase.from('creditos_fornecedor').insert({
          fornecedor_id: dev.fornecedor_id,
          devolucao_id: id,
          tipo: 'credito_devolucao',
          valor: dev.valor_total,
          saldo: dev.valor_total,
          descricao: `Crédito ref. devolução ${dev.numero}`,
          created_by: user?.id,
          tenant_id: tenantId || organizationId,
        } as any);
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
  }, [devolucoes, user, queryClient]);

  const deleteDevolucao = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('devolucoes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Devolução excluída!');
      queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      return true;
    } catch (err: unknown) {
      toast.error('Erro: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      return false;
    }
  }, [queryClient]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('devolucoes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devolucoes' }, () => {
        queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return { devolucoes, loading: isLoading, error: error?.message || null, refetch, createDevolucao, updateStatus, deleteDevolucao };
}

export function useCreditosFornecedor(fornecedorId?: string) {
  const { user, tenantId, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['creditos-fornecedor', user?.id, fornecedorId],
    queryFn: async () => {
      let query = supabase
        .from('creditos_fornecedor')
        .select(`*, fornecedor:fornecedores(id, razao_social, nome_fantasia), devolucao:devolucoes(id, numero)`)
        .order('created_at', { ascending: false });
      if (fornecedorId) query = query.eq('fornecedor_id', fornecedorId);
      query = query.eq('tenant_id', tenantId || organizationId || '00000000-0000-0000-0000-000000000000');
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as CreditoFornecedor[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const creditos = data || [];
  const saldoTotal = creditos.filter(c => c.status === 'ativo').reduce((s, c) => s + c.saldo, 0);

  const utilizarCredito = useCallback(async (creditoId: string, valor: number, pagamentoId?: string) => {
    const credito = creditos.find(c => c.id === creditoId);
    if (!credito || credito.saldo < valor) { toast.error('Saldo insuficiente'); return false; }
    try {
      const novoSaldo = credito.saldo - valor;
      const { error } = await supabase.from('creditos_fornecedor').update({
        valor_utilizado: credito.valor_utilizado + valor,
        saldo: novoSaldo,
        status: novoSaldo <= 0 ? 'utilizado' : 'ativo',
        utilizado_em_pagamento_id: pagamentoId,
      }).eq('id', creditoId);
      if (error) throw error;
      toast.success(`Crédito de R$ ${valor.toFixed(2)} utilizado!`);
      queryClient.invalidateQueries({ queryKey: ['creditos-fornecedor'] });
      return true;
    } catch (err: unknown) {
      toast.error('Erro: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      return false;
    }
  }, [creditos, queryClient]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('creditos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creditos_fornecedor' }, () => {
        queryClient.invalidateQueries({ queryKey: ['creditos-fornecedor'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return { creditos, saldoTotal, loading: isLoading, utilizarCredito };
}

export function useDevolucoesKPIs() {
  const { user, tenantId, organizationId } = useAuth();
  const { data: kpis = { total: 0, abertas: 0, emTransito: 0, concluidas: 0, valorTotal: 0, taxaDevolucao: 0 }, isLoading } = useQuery({
    queryKey: ['devolucoes-kpis', user?.id],
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
