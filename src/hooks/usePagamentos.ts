import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Pagamento {
  id: string;
  numero: string;
  pedido_id: string | null;
  fornecedor_id: string;
  valor: number;
  valor_pago: number;
  status: 'pendente' | 'aprovado' | 'agendado' | 'pago' | 'parcial' | 'cancelado' | 'atrasado';
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: 'boleto' | 'pix' | 'transferencia' | 'cartao' | 'cheque' | null;
  dados_bancarios: any;
  numero_nf: string | null;
  chave_nf: string | null;
  aprovador_id: string | null;
  data_aprovacao: string | null;
  observacoes: string | null;
  comprovante_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  fornecedor?: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  pedido?: {
    id: string;
    numero: string;
  } | null;
}

export interface CreatePagamentoInput {
  pedido_id?: string;
  fornecedor_id: string;
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
}

export function usePagamentos(filters?: PagamentoFilters) {
  const { user } = useAuth();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPagamentos = useCallback(async () => {
    if (!user) {
      setPagamentos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('pagamentos')
        .select(`
          *,
          fornecedor:fornecedores(id, razao_social, nome_fantasia),
          pedido:pedidos(id, numero)
        `)
        .order('data_vencimento', { ascending: true });

      // Apply filters
      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }
      if (filters?.fornecedor_id) {
        query = query.eq('fornecedor_id', filters.fornecedor_id);
      }
      if (filters?.search) {
        query = query.or(`numero.ilike.%${filters.search}%,numero_nf.ilike.%${filters.search}%`);
      }
      if (filters?.dateFrom) {
        query = query.gte('data_vencimento', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('data_vencimento', filters.dateTo);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setPagamentos((data as Pagamento[]) || []);
    } catch (err: any) {
      console.error('Error fetching pagamentos:', err);
      setError(err.message);
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  }, [user, filters?.status, filters?.fornecedor_id, filters?.search, filters?.dateFrom, filters?.dateTo]);

  // Create new pagamento
  const createPagamento = useCallback(async (input: CreatePagamentoInput) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return null;
    }

    try {
      // Generate numero
      const { data: numData } = await supabase.rpc('generate_sequential_number', {
        prefix: 'PAG',
        table_name: 'pagamentos'
      });

      const numero = numData || `PAG-${Date.now()}`;

      const { data, error } = await supabase
        .from('pagamentos')
        .insert({
          numero,
          pedido_id: input.pedido_id,
          fornecedor_id: input.fornecedor_id,
          valor: input.valor,
          data_vencimento: input.data_vencimento,
          forma_pagamento: input.forma_pagamento,
          numero_nf: input.numero_nf,
          chave_nf: input.chave_nf,
          observacoes: input.observacoes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Pagamento registrado com sucesso!');
      fetchPagamentos();
      return data;
    } catch (err: any) {
      console.error('Error creating pagamento:', err);
      toast.error('Erro ao registrar pagamento: ' + err.message);
      return null;
    }
  }, [user, fetchPagamentos]);

  // Update pagamento
  const updatePagamento = useCallback(async (id: string, updates: Partial<Pagamento>) => {
    try {
      const { error } = await supabase
        .from('pagamentos')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Pagamento atualizado!');
      fetchPagamentos();
      return true;
    } catch (err: any) {
      console.error('Error updating pagamento:', err);
      toast.error('Erro ao atualizar: ' + err.message);
      return false;
    }
  }, [fetchPagamentos]);

  // Mark as paid
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

  // Approve payment
  const approvePagamento = useCallback(async (id: string) => {
    if (!user) return false;

    return updatePagamento(id, {
      status: 'aprovado',
      aprovador_id: user.id,
      data_aprovacao: new Date().toISOString(),
    });
  }, [user, updatePagamento]);

  // Delete pagamento
  const deletePagamento = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('pagamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Pagamento excluído!');
      fetchPagamentos();
      return true;
    } catch (err: any) {
      console.error('Error deleting pagamento:', err);
      toast.error('Erro ao excluir: ' + err.message);
      return false;
    }
  }, [fetchPagamentos]);

  // Initial fetch
  useEffect(() => {
    fetchPagamentos();
  }, [fetchPagamentos]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('pagamentos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pagamentos'
        },
        () => {
          fetchPagamentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPagamentos]);

  return {
    pagamentos,
    loading,
    error,
    refetch: fetchPagamentos,
    createPagamento,
    updatePagamento,
    markAsPaid,
    approvePagamento,
    deletePagamento,
  };
}

// Hook for KPIs
export function usePagamentosKPIs() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState({
    total: 0,
    pendentes: 0,
    atrasados: 0,
    pagos: 0,
    valorPendente: 0,
    valorPago: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchKPIs = async () => {
      try {
        const { data, error } = await supabase
          .from('pagamentos')
          .select('status, valor, valor_pago, data_vencimento');

        if (error) throw error;

        const hoje = new Date().toISOString().split('T')[0];
        
        const stats = {
          total: data?.length || 0,
          pendentes: data?.filter(p => p.status === 'pendente' || p.status === 'aprovado' || p.status === 'agendado').length || 0,
          atrasados: data?.filter(p => (p.status === 'pendente' || p.status === 'aprovado') && p.data_vencimento < hoje).length || 0,
          pagos: data?.filter(p => p.status === 'pago').length || 0,
          valorPendente: data?.filter(p => p.status !== 'pago' && p.status !== 'cancelado')
            .reduce((sum, p) => sum + (p.valor - (p.valor_pago || 0)), 0) || 0,
          valorPago: data?.filter(p => p.status === 'pago')
            .reduce((sum, p) => sum + p.valor, 0) || 0,
        };

        setKpis(stats);
      } catch (err) {
        console.error('Error fetching KPIs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, [user]);

  return { kpis, loading };
}
