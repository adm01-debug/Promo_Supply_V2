import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PagamentoMonitorado {
  id: string;
  numero: string;
  valor: number;
  valor_pago: number;
  data_vencimento: string;
  dias_para_vencimento: number;
  status: string;
  urgencia: 'atrasado' | 'critico' | 'alerta' | 'atencao' | 'normal';
  forma_pagamento: string | null;
  numero_nf: string | null;
  fornecedor: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  pedido: {
    id: string;
    numero: string;
  } | null;
}

export interface PagamentosStats {
  total: number;
  atrasados: number;    // Venceu e não foi pago
  criticos: number;     // Vence hoje ou amanhã
  alertas: number;      // Vence em 2-3 dias
  atencao: number;      // Vence em 4-7 dias
  valorAtrasado: number;
  valorAVencer: number;
}

export function usePagamentosMonitorados() {
  const { user } = useAuth();
  const [pagamentos, setPagamentos] = useState<PagamentoMonitorado[]>([]);
  const [stats, setStats] = useState<PagamentosStats>({
    total: 0,
    atrasados: 0,
    criticos: 0,
    alertas: 0,
    atencao: 0,
    valorAtrasado: 0,
    valorAVencer: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calcularDiasParaVencimento = (dataVencimento: string): number => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(dataVencimento);
    vencimento.setHours(0, 0, 0, 0);
    const diffTime = vencimento.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calcularUrgencia = (diasParaVencimento: number): PagamentoMonitorado['urgencia'] => {
    if (diasParaVencimento < 0) return 'atrasado';
    if (diasParaVencimento <= 1) return 'critico';
    if (diasParaVencimento <= 3) return 'alerta';
    if (diasParaVencimento <= 7) return 'atencao';
    return 'normal';
  };

  const fetchPagamentosMonitorados = useCallback(async () => {
    if (!user) {
      setPagamentos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar pagamentos pendentes/aprovados/agendados nos próximos 7 dias + atrasados
      const hoje = new Date();
      const limiteSuperior = new Date();
      limiteSuperior.setDate(limiteSuperior.getDate() + 7);

      const { data, error: fetchError } = await supabase
        .from('pagamentos')
        .select(`
          id,
          numero,
          valor,
          valor_pago,
          data_vencimento,
          status,
          forma_pagamento,
          numero_nf,
          fornecedor:fornecedores(id, razao_social, nome_fantasia),
          pedido:pedidos(id, numero)
        `)
        .in('status', ['pendente', 'aprovado', 'agendado', 'atrasado'])
        .lte('data_vencimento', limiteSuperior.toISOString().split('T')[0])
        .order('data_vencimento', { ascending: true });

      if (fetchError) throw fetchError;

      // Processar pagamentos
      const pagamentosProcessados: PagamentoMonitorado[] = (data || []).map(pag => {
        const diasParaVencimento = calcularDiasParaVencimento(pag.data_vencimento);
        return {
          id: pag.id,
          numero: pag.numero,
          valor: pag.valor,
          valor_pago: pag.valor_pago || 0,
          data_vencimento: pag.data_vencimento,
          dias_para_vencimento: diasParaVencimento,
          status: pag.status,
          urgencia: calcularUrgencia(diasParaVencimento),
          forma_pagamento: pag.forma_pagamento,
          numero_nf: pag.numero_nf,
          fornecedor: pag.fornecedor as PagamentoMonitorado['fornecedor'],
          pedido: pag.pedido as PagamentoMonitorado['pedido'],
        };
      });

      // Calcular estatísticas
      const atrasados = pagamentosProcessados.filter(p => p.urgencia === 'atrasado');
      const criticos = pagamentosProcessados.filter(p => p.urgencia === 'critico');
      const alertas = pagamentosProcessados.filter(p => p.urgencia === 'alerta');
      const atencao = pagamentosProcessados.filter(p => p.urgencia === 'atencao');

      const newStats: PagamentosStats = {
        total: pagamentosProcessados.length,
        atrasados: atrasados.length,
        criticos: criticos.length,
        alertas: alertas.length,
        atencao: atencao.length,
        valorAtrasado: atrasados.reduce((sum, p) => sum + (p.valor - p.valor_pago), 0),
        valorAVencer: pagamentosProcessados
          .filter(p => p.urgencia !== 'atrasado')
          .reduce((sum, p) => sum + (p.valor - p.valor_pago), 0),
      };

      setPagamentos(pagamentosProcessados);
      setStats(newStats);

      // Mostrar toasts de alerta
      if (newStats.atrasados > 0) {
        toast.error(
          `${newStats.atrasados} pagamento(s) em atraso!`,
          { duration: 6000 }
        );
      } else if (newStats.criticos > 0) {
        toast.warning(
          `${newStats.criticos} pagamento(s) vence(m) hoje ou amanhã!`,
          { duration: 5000 }
        );
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error fetching monitored payments:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Marcar pagamento como atrasado
  const marcarComoAtrasado = useCallback(async (pagamentoId: string) => {
    try {
      const { error } = await supabase
        .from('pagamentos')
        .update({ status: 'atrasado' })
        .eq('id', pagamentoId);

      if (error) throw error;

      toast.info('Pagamento marcado como atrasado');
      
      // Registrar no audit log
      await (supabase.from('audit_logs') as any).insert({
        action_type: 'update',
        entity_type: 'pagamento',
        entity_id: pagamentoId,
        user_id: user?.id,
      });

      fetchPagamentosMonitorados();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro: ' + errorMessage);
      return false;
    }
  }, [user, fetchPagamentosMonitorados]);

  // Marcar pagamentos vencidos como atrasados em lote
  const marcarAtrasadosEmLote = useCallback(async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('pagamentos')
        .update({ status: 'atrasado' })
        .in('status', ['pendente', 'aprovado', 'agendado'])
        .lt('data_vencimento', hoje)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        toast.warning(`${data.length} pagamento(s) marcado(s) como atrasado(s)`);
        
        // Registrar no audit log
        await (supabase.from('audit_logs') as any).insert({
          action_type: 'update',
          entity_type: 'pagamento',
          metadata: { count: data.length, ids: data.map(p => p.id) },
          user_id: user?.id,
        });
      }

      fetchPagamentosMonitorados();
      return data?.length || 0;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro: ' + errorMessage);
      return 0;
    }
  }, [user, fetchPagamentosMonitorados]);

  // Marcar como pago rapidamente
  const marcarComoPago = useCallback(async (pagamentoId: string) => {
    try {
      const pagamento = pagamentos.find(p => p.id === pagamentoId);
      if (!pagamento) return false;

      const { error } = await supabase
        .from('pagamentos')
        .update({ 
          status: 'pago',
          valor_pago: pagamento.valor,
          data_pagamento: new Date().toISOString().split('T')[0],
        })
        .eq('id', pagamentoId);

      if (error) throw error;

      toast.success('Pagamento registrado com sucesso!');
      fetchPagamentosMonitorados();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro: ' + errorMessage);
      return false;
    }
  }, [pagamentos, fetchPagamentosMonitorados]);

  // Fetch inicial
  useEffect(() => {
    fetchPagamentosMonitorados();
  }, [fetchPagamentosMonitorados]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('pagamentos-monitorados')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pagamentos',
        },
        () => {
          fetchPagamentosMonitorados();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPagamentosMonitorados]);

  // Verificar a cada hora
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPagamentosMonitorados();
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchPagamentosMonitorados]);

  return {
    pagamentos,
    stats,
    loading,
    error,
    refetch: fetchPagamentosMonitorados,
    marcarComoAtrasado,
    marcarAtrasadosEmLote,
    marcarComoPago,
  };
}
