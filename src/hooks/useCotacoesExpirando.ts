import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CotacaoExpirando {
  id: string;
  numero: string;
  valor_total: number;
  validade_proposta: string;
  dias_restantes: number;
  urgencia: 'critico' | 'alerta' | 'atencao' | 'normal';
  fornecedor: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  solicitacao: {
    id: string;
    numero: string;
    titulo: string;
  } | null;
}

export interface CotacoesExpirandoStats {
  total: number;
  criticas: number; // Vencem hoje ou amanhã
  alertas: number;  // Vencem em 2-3 dias
  atencao: number;  // Vencem em 4-7 dias
  expiradas: number; // Já venceram mas ainda estão pendentes
}

export function useCotacoesExpirando() {
  const { user } = useAuth();
  const [cotacoes, setCotacoes] = useState<CotacaoExpirando[]>([]);
  const [stats, setStats] = useState<CotacoesExpirandoStats>({
    total: 0,
    criticas: 0,
    alertas: 0,
    atencao: 0,
    expiradas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calcularDiasRestantes = (validadeProposta: string): number => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const validade = new Date(validadeProposta);
    validade.setHours(0, 0, 0, 0);
    const diffTime = validade.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calcularUrgencia = (diasRestantes: number): CotacaoExpirando['urgencia'] => {
    if (diasRestantes <= 1) return 'critico';
    if (diasRestantes <= 3) return 'alerta';
    if (diasRestantes <= 7) return 'atencao';
    return 'normal';
  };

  const fetchCotacoesExpirando = useCallback(async () => {
    if (!user) {
      setCotacoes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar cotações pendentes com data de validade nos próximos 7 dias
      const hoje = new Date();
      const limiteSuperior = new Date();
      limiteSuperior.setDate(limiteSuperior.getDate() + 7);

      const { data, error: fetchError } = await supabase
        .from('cotacoes')
        .select(`
          id,
          numero,
          valor_total,
          validade_proposta,
          fornecedor:fornecedores(id, razao_social, nome_fantasia),
          solicitacao:solicitacoes(id, numero, titulo)
        `)
        .in('status', ['pendente', 'analisando'])
        .not('validade_proposta', 'is', null)
        .lte('validade_proposta', limiteSuperior.toISOString().split('T')[0])
        .order('validade_proposta', { ascending: true });

      if (fetchError) throw fetchError;

      // Processar cotações
      const cotacoesProcessadas: CotacaoExpirando[] = (data || []).map(cot => {
        const diasRestantes = calcularDiasRestantes(cot.validade_proposta!);
        return {
          id: cot.id,
          numero: cot.numero,
          valor_total: cot.valor_total,
          validade_proposta: cot.validade_proposta!,
          dias_restantes: diasRestantes,
          urgencia: calcularUrgencia(diasRestantes),
          fornecedor: cot.fornecedor as CotacaoExpirando['fornecedor'],
          solicitacao: cot.solicitacao as CotacaoExpirando['solicitacao'],
        };
      });

      // Calcular estatísticas
      const newStats: CotacoesExpirandoStats = {
        total: cotacoesProcessadas.length,
        criticas: cotacoesProcessadas.filter(c => c.urgencia === 'critico').length,
        alertas: cotacoesProcessadas.filter(c => c.urgencia === 'alerta').length,
        atencao: cotacoesProcessadas.filter(c => c.urgencia === 'atencao').length,
        expiradas: cotacoesProcessadas.filter(c => c.dias_restantes < 0).length,
      };

      setCotacoes(cotacoesProcessadas);
      setStats(newStats);

      // Mostrar toast se houver cotações críticas
      if (newStats.criticas > 0) {
        toast.warning(
          `${newStats.criticas} cotação(ões) vencem hoje ou amanhã!`,
          { duration: 5000 }
        );
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error fetching expiring cotacoes:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Marcar cotação como expirada
  const marcarComoExpirada = useCallback(async (cotacaoId: string) => {
    try {
      const { error } = await supabase
        .from('cotacoes')
        .update({ status: 'expirada' })
        .eq('id', cotacaoId);

      if (error) throw error;

      toast.success('Cotação marcada como expirada');
      fetchCotacoesExpirando();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao marcar cotação: ' + errorMessage);
      return false;
    }
  }, [fetchCotacoesExpirando]);

  // Marcar múltiplas cotações expiradas de uma vez
  const marcarExpiradas = useCallback(async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('cotacoes')
        .update({ status: 'expirada' })
        .in('status', ['pendente', 'analisando'])
        .lt('validade_proposta', hoje)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        toast.success(`${data.length} cotação(ões) marcada(s) como expirada(s)`);
        
        // Registrar no audit log
        await (supabase.from('audit_logs') as any).insert({
          action_type: 'update',
          entity_type: 'cotacao',
          metadata: { count: data.length, ids: data.map(c => c.id) },
          user_id: user?.id,
        });
      }

      fetchCotacoesExpirando();
      return data?.length || 0;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao marcar cotações: ' + errorMessage);
      return 0;
    }
  }, [user, fetchCotacoesExpirando]);

  // Fetch inicial
  useEffect(() => {
    fetchCotacoesExpirando();
  }, [fetchCotacoesExpirando]);

  // Realtime subscription para atualizar quando cotações mudarem
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('cotacoes-expirando')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cotacoes',
        },
        () => {
          fetchCotacoesExpirando();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCotacoesExpirando]);

  // Verificar a cada hora
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCotacoesExpirando();
    }, 60 * 60 * 1000); // 1 hora

    return () => clearInterval(interval);
  }, [fetchCotacoesExpirando]);

  return {
    cotacoes,
    stats,
    loading,
    error,
    refetch: fetchCotacoesExpirando,
    marcarComoExpirada,
    marcarExpiradas,
  };
}
