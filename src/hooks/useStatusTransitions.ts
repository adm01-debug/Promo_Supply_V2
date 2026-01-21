import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Hook para gerenciar transições automáticas de status entre entidades
 * 
 * Mapeamento de transições:
 * - Cotação aprovada → Solicitação: em_andamento
 * - Pedido emitido → Solicitação: em_andamento (mantém)
 * - Pedido entregue → Solicitação: concluida
 * - Pedido cancelado → Solicitação: em_cotacao (volta)
 * - Pagamento concluído → (sem mudança na solicitação)
 */

export interface TransitionLog {
  entity_type: string;
  entity_id: string;
  from_status: string;
  to_status: string;
  trigger: string;
  trigger_entity_type: string;
  trigger_entity_id: string;
}

export function useStatusTransitions() {
  const { user } = useAuth();

  /**
   * Registra a transição no log de auditoria
   */
  const logTransition = useCallback(async (transition: TransitionLog) => {
    try {
      await supabase.from('audit_logs').insert({
        action: 'status_transition',
        entity_type: transition.entity_type,
        entity_id: transition.entity_id,
        user_id: user?.id,
        details: {
          from_status: transition.from_status,
          to_status: transition.to_status,
          trigger: transition.trigger,
          trigger_entity_type: transition.trigger_entity_type,
          trigger_entity_id: transition.trigger_entity_id,
          auto: true,
        },
      });
    } catch (error) {
      console.error('Error logging transition:', error);
    }
  }, [user]);

  /**
   * Quando uma cotação é aprovada/selecionada
   * → Solicitação muda para "em_andamento"
   */
  const onCotacaoAprovada = useCallback(async (
    cotacaoId: string, 
    solicitacaoId: string
  ): Promise<boolean> => {
    try {
      // Buscar status atual da solicitação
      const { data: solicitacao, error: fetchError } = await supabase
        .from('solicitacoes')
        .select('status')
        .eq('id', solicitacaoId)
        .single();

      if (fetchError) throw fetchError;

      const statusAtual = solicitacao?.status;

      // Só transiciona se estiver em um status que faz sentido
      if (!['em_cotacao', 'aprovada'].includes(statusAtual)) {
        console.log(`Solicitação ${solicitacaoId} não está em status válido para transição: ${statusAtual}`);
        return false;
      }

      // Atualizar status da solicitação
      const { error: updateError } = await supabase
        .from('solicitacoes')
        .update({ status: 'em_andamento' })
        .eq('id', solicitacaoId);

      if (updateError) throw updateError;

      // Registrar transição
      await logTransition({
        entity_type: 'solicitacao',
        entity_id: solicitacaoId,
        from_status: statusAtual,
        to_status: 'em_andamento',
        trigger: 'cotacao_aprovada',
        trigger_entity_type: 'cotacao',
        trigger_entity_id: cotacaoId,
      });

      toast.success('Solicitação movida para "Em Andamento"', { duration: 3000 });
      return true;
    } catch (error) {
      console.error('Error in onCotacaoAprovada:', error);
      return false;
    }
  }, [logTransition]);

  /**
   * Quando um pedido é criado
   * → Solicitação muda para "em_andamento" (se ainda não estiver)
   */
  const onPedidoCriado = useCallback(async (
    pedidoId: string, 
    solicitacaoId: string | null
  ): Promise<boolean> => {
    if (!solicitacaoId) return false;

    try {
      const { data: solicitacao, error: fetchError } = await supabase
        .from('solicitacoes')
        .select('status')
        .eq('id', solicitacaoId)
        .single();

      if (fetchError) throw fetchError;

      const statusAtual = solicitacao?.status;

      // Já está em andamento ou concluída, não precisa mudar
      if (['em_andamento', 'concluida'].includes(statusAtual)) {
        return true;
      }

      const { error: updateError } = await supabase
        .from('solicitacoes')
        .update({ status: 'em_andamento' })
        .eq('id', solicitacaoId);

      if (updateError) throw updateError;

      await logTransition({
        entity_type: 'solicitacao',
        entity_id: solicitacaoId,
        from_status: statusAtual,
        to_status: 'em_andamento',
        trigger: 'pedido_criado',
        trigger_entity_type: 'pedido',
        trigger_entity_id: pedidoId,
      });

      return true;
    } catch (error) {
      console.error('Error in onPedidoCriado:', error);
      return false;
    }
  }, [logTransition]);

  /**
   * Quando um pedido é entregue
   * → Solicitação muda para "concluida"
   */
  const onPedidoEntregue = useCallback(async (
    pedidoId: string, 
    solicitacaoId: string | null
  ): Promise<boolean> => {
    if (!solicitacaoId) return false;

    try {
      const { data: solicitacao, error: fetchError } = await supabase
        .from('solicitacoes')
        .select('status')
        .eq('id', solicitacaoId)
        .single();

      if (fetchError) throw fetchError;

      const statusAtual = solicitacao?.status;

      // Já está concluída
      if (statusAtual === 'concluida') {
        return true;
      }

      const { error: updateError } = await supabase
        .from('solicitacoes')
        .update({ 
          status: 'concluida',
          data_conclusao: new Date().toISOString(),
        })
        .eq('id', solicitacaoId);

      if (updateError) throw updateError;

      await logTransition({
        entity_type: 'solicitacao',
        entity_id: solicitacaoId,
        from_status: statusAtual,
        to_status: 'concluida',
        trigger: 'pedido_entregue',
        trigger_entity_type: 'pedido',
        trigger_entity_id: pedidoId,
      });

      toast.success('Solicitação concluída automaticamente!', { duration: 3000 });
      return true;
    } catch (error) {
      console.error('Error in onPedidoEntregue:', error);
      return false;
    }
  }, [logTransition]);

  /**
   * Quando um pedido é cancelado
   * → Solicitação volta para "em_cotacao"
   */
  const onPedidoCancelado = useCallback(async (
    pedidoId: string, 
    solicitacaoId: string | null
  ): Promise<boolean> => {
    if (!solicitacaoId) return false;

    try {
      const { data: solicitacao, error: fetchError } = await supabase
        .from('solicitacoes')
        .select('status')
        .eq('id', solicitacaoId)
        .single();

      if (fetchError) throw fetchError;

      const statusAtual = solicitacao?.status;

      // Se já está concluída, não volta
      if (statusAtual === 'concluida') {
        return false;
      }

      const { error: updateError } = await supabase
        .from('solicitacoes')
        .update({ status: 'em_cotacao' })
        .eq('id', solicitacaoId);

      if (updateError) throw updateError;

      await logTransition({
        entity_type: 'solicitacao',
        entity_id: solicitacaoId,
        from_status: statusAtual,
        to_status: 'em_cotacao',
        trigger: 'pedido_cancelado',
        trigger_entity_type: 'pedido',
        trigger_entity_id: pedidoId,
      });

      toast.info('Solicitação retornou para cotação', { duration: 3000 });
      return true;
    } catch (error) {
      console.error('Error in onPedidoCancelado:', error);
      return false;
    }
  }, [logTransition]);

  /**
   * Handler genérico para mudança de status de pedido
   */
  const handlePedidoStatusChange = useCallback(async (
    pedidoId: string,
    solicitacaoId: string | null,
    novoStatus: string,
    statusAnterior: string
  ): Promise<boolean> => {
    // Pedido entregue
    if (novoStatus === 'entregue' && statusAnterior !== 'entregue') {
      return onPedidoEntregue(pedidoId, solicitacaoId);
    }

    // Pedido cancelado
    if (novoStatus === 'cancelado' && statusAnterior !== 'cancelado') {
      return onPedidoCancelado(pedidoId, solicitacaoId);
    }

    // Pedido criado/aprovado
    if (['pendente', 'aprovado'].includes(novoStatus)) {
      return onPedidoCriado(pedidoId, solicitacaoId);
    }

    return false;
  }, [onPedidoEntregue, onPedidoCancelado, onPedidoCriado]);

  /**
   * Handler genérico para mudança de status de cotação
   */
  const handleCotacaoStatusChange = useCallback(async (
    cotacaoId: string,
    solicitacaoId: string | null,
    novoStatus: string,
    selecionada: boolean
  ): Promise<boolean> => {
    // Cotação aprovada e selecionada
    if (novoStatus === 'aprovada' && selecionada && solicitacaoId) {
      return onCotacaoAprovada(cotacaoId, solicitacaoId);
    }

    return false;
  }, [onCotacaoAprovada]);

  return {
    // Handlers específicos
    onCotacaoAprovada,
    onPedidoCriado,
    onPedidoEntregue,
    onPedidoCancelado,
    // Handlers genéricos
    handlePedidoStatusChange,
    handleCotacaoStatusChange,
    // Utilitário
    logTransition,
  };
}
