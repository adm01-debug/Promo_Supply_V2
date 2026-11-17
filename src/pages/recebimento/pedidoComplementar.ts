import { supabase } from "@/integrations/supabase/client";
import { buildPendingLines, defaultForecastDate, type PendingOrder } from "./recebimentoHelpers";

/**
 * Pedido complementar: quando um recebimento e parcial, gera automaticamente um
 * novo pedido com o saldo nao entregue, herdando fornecedor, cotacao e condicoes
 * do pedido original.
 *
 * A regra foi escrita em `src/components/compras/ReceivingModal.tsx`, um
 * componente que nunca chegou a ser importado em lugar nenhum -- a tela oficial
 * de recebimento e `/recebimento` (RecebimentoOffline). A logica foi portada
 * para ca com duas correcoes em relacao ao original:
 *
 * 1. O original usava `tenant_id: originalPedido.tenant_id || '00000000-...'`.
 *    Esse fallback grava um pedido real sob um tenant sentinela, furando o
 *    isolamento entre empresas. Aqui, pedido sem tenant_id aborta a geracao.
 * 2. O original nao tratava falha do insert dos itens, podendo deixar um pedido
 *    complementar vazio no banco. Aqui o pedido orfao e removido.
 */

export interface ComplementaryResult {
  created: boolean;
  numero?: string;
  itemCount?: number;
  reason?: "no-pending" | "no-tenant" | "error";
  error?: string;
}

export async function createComplementaryOrder(
  order: PendingOrder,
  receivedQty: Record<string, number>,
): Promise<ComplementaryResult> {
  const lines = buildPendingLines(order.itens, receivedQty);
  if (lines.length === 0) return { created: false, reason: "no-pending" };

  try {
    const { data: original, error: fetchError } = await supabase
      .from("pedidos")
      .select(
        "fornecedor_id, solicitacao_id, cotacao_id, condicao_pagamento, endereco_entrega, tenant_id",
      )
      .eq("id", order.id)
      .single();

    if (fetchError || !original) {
      return { created: false, reason: "error", error: fetchError?.message };
    }
    if (!original.tenant_id) {
      return { created: false, reason: "no-tenant" };
    }

    const total = lines.reduce((sum, line) => sum + line.valor_total, 0);

    const { data: numData } = await supabase.rpc("generate_sequential_number", {
      prefix: "PED",
      table_name: "pedidos",
    });
    const numero = numData || `PED-${Date.now()}`;

    const { data: created, error: pedidoError } = await supabase
      .from("pedidos")
      .insert({
        numero,
        fornecedor_id: original.fornecedor_id,
        solicitacao_id: original.solicitacao_id,
        cotacao_id: original.cotacao_id,
        valor_total: total,
        condicao_pagamento: original.condicao_pagamento,
        endereco_entrega: original.endereco_entrega,
        observacoes: `Pedido complementar ref. ${order.numero} - saldo de recebimento parcial`,
        data_previsao: defaultForecastDate(),
        tenant_id: original.tenant_id,
      })
      .select("id")
      .single();

    if (pedidoError || !created) {
      return { created: false, reason: "error", error: pedidoError?.message };
    }

    const { error: itemsError } = await supabase.from("pedido_itens").insert(
      lines.map((line) => ({
        pedido_id: created.id,
        tenant_id: original.tenant_id,
        ...line,
      })),
    );

    if (itemsError) {
      // Nao deixar pedido complementar vazio no banco.
      await supabase.from("pedidos").delete().eq("id", created.id);
      return { created: false, reason: "error", error: itemsError.message };
    }

    return { created: true, numero, itemCount: lines.length };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return { created: false, reason: "error", error: message };
  }
}