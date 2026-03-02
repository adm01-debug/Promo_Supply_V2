import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PedidoParaPagamento {
  id: string;
  numero: string;
  fornecedor_id: string;
  valor_total: number;
  valor_frete: number;
  desconto: number;
  condicao_pagamento: string | null;
  fornecedor?: {
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
}

export interface DadosPagamentoSugerido {
  pedido_id: string;
  fornecedor_id: string;
  valor: number;
  data_vencimento: string;
  forma_pagamento: 'boleto' | 'pix' | 'transferencia' | 'cartao' | 'cheque' | null;
  condicao_pagamento: string | null;
}

/**
 * Calcula a data de vencimento baseado na condição de pagamento
 */
function calcularDataVencimento(condicaoPagamento: string | null): string {
  const hoje = new Date();
  let diasParaVencimento = 30; // Default

  if (condicaoPagamento) {
    const condicaoLower = condicaoPagamento.toLowerCase();
    
    // Padrões comuns de condição de pagamento
    const patterns: Record<string, number> = {
      'à vista': 0,
      'a vista': 0,
      'avista': 0,
      'imediato': 0,
      '7 dias': 7,
      '7dias': 7,
      '07 dias': 7,
      '15 dias': 15,
      '15dias': 15,
      '21 dias': 21,
      '28 dias': 28,
      '30 dias': 30,
      '30dias': 30,
      '30/60': 30, // Primeira parcela
      '30/60/90': 30,
      '45 dias': 45,
      '60 dias': 60,
      '90 dias': 90,
    };

    // Busca match
    for (const [pattern, dias] of Object.entries(patterns)) {
      if (condicaoLower.includes(pattern)) {
        diasParaVencimento = dias;
        break;
      }
    }

    // Tenta extrair número de dias se tiver formato "XX dias"
    const match = condicaoLower.match(/(\d+)\s*dias?/);
    if (match) {
      diasParaVencimento = parseInt(match[1], 10);
    }
  }

  const dataVencimento = new Date(hoje);
  dataVencimento.setDate(dataVencimento.getDate() + diasParaVencimento);
  
  return dataVencimento.toISOString().split('T')[0];
}

/**
 * Infere a forma de pagamento baseado na condição
 */
function inferirFormaPagamento(condicaoPagamento: string | null): DadosPagamentoSugerido['forma_pagamento'] {
  if (!condicaoPagamento) return 'boleto';

  const condicaoLower = condicaoPagamento.toLowerCase();

  if (condicaoLower.includes('pix')) return 'pix';
  if (condicaoLower.includes('transferência') || condicaoLower.includes('transferencia') || condicaoLower.includes('ted') || condicaoLower.includes('doc')) return 'transferencia';
  if (condicaoLower.includes('cartão') || condicaoLower.includes('cartao') || condicaoLower.includes('crédito') || condicaoLower.includes('credito')) return 'cartao';
  if (condicaoLower.includes('cheque')) return 'cheque';

  return 'boleto'; // Default
}

export function useAutoPagamento() {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Gera sugestão de dados para pagamento baseado no pedido
   */
  const sugerirDadosPagamento = useCallback((pedido: PedidoParaPagamento): DadosPagamentoSugerido => {
    const valorLiquido = pedido.valor_total - (pedido.desconto || 0);
    
    return {
      pedido_id: pedido.id,
      fornecedor_id: pedido.fornecedor_id,
      valor: valorLiquido,
      data_vencimento: calcularDataVencimento(pedido.condicao_pagamento),
      forma_pagamento: inferirFormaPagamento(pedido.condicao_pagamento),
      condicao_pagamento: pedido.condicao_pagamento,
    };
  }, []);

  /**
   * Cria pagamento automaticamente para um pedido entregue
   */
  const criarPagamentoAutomatico = useCallback(async (
    pedido: PedidoParaPagamento,
    dadosAdicionais?: Partial<DadosPagamentoSugerido>
  ): Promise<string | null> => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return null;
    }

    try {
      setIsCreating(true);

      // Verificar se já existe pagamento para este pedido
      const { data: pagamentoExistente } = await supabase
        .from('pagamentos')
        .select('id, numero')
        .eq('pedido_id', pedido.id)
        .single();

      if (pagamentoExistente) {
        toast.info(`Já existe pagamento ${pagamentoExistente.numero} para este pedido`);
        return pagamentoExistente.id;
      }

      // Gerar sugestão e mesclar com dados adicionais
      const sugestao = sugerirDadosPagamento(pedido);
      const dados = { ...sugestao, ...dadosAdicionais };

      // Gerar número sequencial
      const { data: numData } = await supabase.rpc('generate_sequential_number', {
        prefix: 'PAG',
        table_name: 'pagamentos'
      });
      const numero = numData || `PAG-${Date.now()}`;

      // Criar pagamento
      const { data: novoPagamento, error } = await supabase
        .from('pagamentos')
        .insert({
          numero,
          pedido_id: dados.pedido_id,
          fornecedor_id: dados.fornecedor_id,
          valor: dados.valor,
          data_vencimento: dados.data_vencimento,
          forma_pagamento: dados.forma_pagamento,
          status: 'pendente',
          created_by: user.id,
          observacoes: `Pagamento criado automaticamente ao confirmar entrega do pedido ${pedido.numero}`,
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar no audit log
      await (supabase.from('audit_logs') as any).insert({
        action_type: 'create',
        entity_type: 'pagamento',
        entity_id: novoPagamento.id,
        user_id: user.id,
        metadata: {
          trigger: 'pedido_entregue',
          pedido_id: pedido.id,
          pedido_numero: pedido.numero,
          valor: dados.valor,
          vencimento: dados.data_vencimento,
        },
      });

      toast.success(
        `Pagamento ${numero} criado automaticamente!`,
        { 
          description: `Vencimento: ${new Date(dados.data_vencimento).toLocaleDateString('pt-BR')}`,
          duration: 5000 
        }
      );

      return novoPagamento.id;

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error creating auto payment:', err);
      toast.error('Erro ao criar pagamento: ' + errorMessage);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [user, sugerirDadosPagamento]);

  /**
   * Verifica se deve criar pagamento e solicita confirmação
   * Retorna true se usuário confirmar, false se cancelar
   */
  const solicitarCriacaoPagamento = useCallback(async (
    pedido: PedidoParaPagamento
  ): Promise<boolean> => {
    const sugestao = sugerirDadosPagamento(pedido);
    
    // Aqui você pode implementar um modal de confirmação
    // Por enquanto, retorna true para criar automaticamente
    // Em produção, isso seria um dialog interativo
    
    return true;
  }, [sugerirDadosPagamento]);

  /**
   * Handler completo para quando pedido é marcado como entregue
   */
  const onPedidoEntregue = useCallback(async (
    pedidoId: string,
    criarPagamentoAuto: boolean = true
  ): Promise<{ pagamentoId: string | null }> => {
    if (!criarPagamentoAuto) {
      return { pagamentoId: null };
    }

    try {
      // Buscar dados completos do pedido
      const { data: pedido, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero,
          fornecedor_id,
          valor_total,
          valor_frete,
          desconto,
          condicao_pagamento,
          fornecedor:fornecedores(razao_social, nome_fantasia)
        `)
        .eq('id', pedidoId)
        .single();

      if (error || !pedido) {
        console.error('Pedido não encontrado:', error);
        return { pagamentoId: null };
      }

      // Criar pagamento
      const pagamentoId = await criarPagamentoAutomatico(pedido as PedidoParaPagamento);
      
      return { pagamentoId };

    } catch (err) {
      console.error('Error in onPedidoEntregue:', err);
      return { pagamentoId: null };
    }
  }, [criarPagamentoAutomatico]);

  /**
   * Cria pagamentos em lote para pedidos já entregues sem pagamento
   */
  const criarPagamentosPendentes = useCallback(async (): Promise<number> => {
    try {
      setIsCreating(true);

      // Buscar pedidos entregues sem pagamento
      const { data: pedidosSemPagamento, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero,
          fornecedor_id,
          valor_total,
          valor_frete,
          desconto,
          condicao_pagamento,
          fornecedor:fornecedores(razao_social, nome_fantasia)
        `)
        .eq('status', 'entregue')
        .is('id', null); // Isso não vai funcionar assim, precisa de uma subconsulta

      // Alternativa: buscar pedidos e filtrar os que não têm pagamento
      const { data: todosPedidosEntregues } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero,
          fornecedor_id,
          valor_total,
          valor_frete,
          desconto,
          condicao_pagamento,
          fornecedor:fornecedores(razao_social, nome_fantasia)
        `)
        .eq('status', 'entregue');

      const { data: pagamentosExistentes } = await supabase
        .from('pagamentos')
        .select('pedido_id')
        .not('pedido_id', 'is', null);

      const pedidosComPagamento = new Set(pagamentosExistentes?.map(p => p.pedido_id) || []);
      
      const pedidosPendentes = (todosPedidosEntregues || []).filter(
        p => !pedidosComPagamento.has(p.id)
      );

      if (pedidosPendentes.length === 0) {
        toast.info('Não há pedidos entregues pendentes de pagamento');
        return 0;
      }

      let criados = 0;
      for (const pedido of pedidosPendentes) {
        const resultado = await criarPagamentoAutomatico(pedido as PedidoParaPagamento);
        if (resultado) criados++;
      }

      toast.success(`${criados} pagamento(s) criado(s) com sucesso!`);
      return criados;

    } catch (err) {
      console.error('Error creating pending payments:', err);
      toast.error('Erro ao criar pagamentos pendentes');
      return 0;
    } finally {
      setIsCreating(false);
    }
  }, [criarPagamentoAutomatico]);

  return {
    // Estado
    isCreating,
    // Funções principais
    sugerirDadosPagamento,
    criarPagamentoAutomatico,
    solicitarCriacaoPagamento,
    onPedidoEntregue,
    criarPagamentosPendentes,
    // Utilitários expostos
    calcularDataVencimento,
    inferirFormaPagamento,
  };
}

// Exportar funções utilitárias para uso externo
export { calcularDataVencimento, inferirFormaPagamento };
