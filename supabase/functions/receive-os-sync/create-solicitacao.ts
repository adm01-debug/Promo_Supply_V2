import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildSolicitacaoDraft, type OsPayload, toInsertRow } from "./mapping.ts";

/**
 * Cria a solicitacao. Devolve o id e o numero, ou lanca para o chamador
 * decidir o status da resposta.
 */
export async function createSolicitacao(
  admin: SupabaseClient,
  payload: OsPayload,
  tenantId: string,
): Promise<{ id: string; numero: string }> {
  // generate_sequential_number trava o advisory lock na propria transacao do
  // RPC, que termina antes do INSERT daqui. Duas chamadas simultaneas recebem o
  // mesmo numero e a segunda quebra em solicitacoes_numero_key. Regerar e
  // tentar de novo resolve: a tentativa seguinte ja enxerga a linha comitada.
  const MAX_TENTATIVAS_NUMERO = 5;

  for (let tentativa = 1; ; tentativa += 1) {
    const { data: numeroData, error: numeroError } = await admin.rpc(
      "generate_sequential_number",
      { prefix: "SOL", table_name: "solicitacoes" },
    );
    if (numeroError) throw new Error(`numero: ${numeroError.message}`);

    const draft = buildSolicitacaoDraft(payload, {
      numero: String(numeroData),
      tenantId,
    });

    const { data, error } = await admin
      .from("solicitacoes")
      .insert(toInsertRow(draft))
      .select("id, numero")
      .single();

    if (!error) {
      return { id: data.id as string, numero: data.numero as string };
    }

    if (error.code === "23505") {
      // 23505 = reenvio concorrente ja inseriu com o mesmo external_ref.
      // Nao e falha: devolvemos a linha existente para a resposta ser idempotente.
      const { data: existing } = await admin
        .from("solicitacoes")
        .select("id, numero")
        .eq("external_ref", draft.external_ref)
        .maybeSingle();
      if (existing) {
        return { id: existing.id as string, numero: existing.numero as string };
      }
      if (tentativa < MAX_TENTATIVAS_NUMERO) {
        await new Promise((resolve) => setTimeout(resolve, 25 * tentativa));
        continue;
      }
      throw new Error(
        `insert solicitacoes: ${error.message} (apos ${tentativa} tentativas de numero)`,
      );
    }

    throw new Error(`insert solicitacoes: ${error.message}`);
  }
}