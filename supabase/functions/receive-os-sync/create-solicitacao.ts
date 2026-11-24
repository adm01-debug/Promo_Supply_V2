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
  // O numero NAO e' gerado aqui: quem preenche e' o trigger BEFORE INSERT
  // trg_assign_numero_solicitacao, dentro da transacao do INSERT. Antes, o
  // generate_sequential_number por RPC soltava o advisory lock no fim da
  // transacao do RPC e duas entregas simultaneas pegavam o mesmo numero.
  // O retry abaixo e' rede de seguranca para colisao residual (tela gravando
  // numero por fora enquanto a entrega acontece).
  const MAX_TENTATIVAS_NUMERO = 5;
  // Preenchido so quando o banco ainda nao tem o trigger (migration pendente).
  let numeroDeReserva: string | null = null;

  for (let tentativa = 1; ; tentativa += 1) {
    const draft = buildSolicitacaoDraft(payload, {
      numero: numeroDeReserva,
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

    // 23502 = numero NOT NULL violado -> o trigger do banco nao existe ainda.
    // Gera pelo RPC e tenta de novo, para a entrega funcionar com ou sem a
    // migration aplicada.
    if (
      error.code === "23502" && /numero/.test(error.message) &&
      numeroDeReserva === null
    ) {
      const { data: gerado, error: erroNumero } = await admin.rpc(
        "generate_sequential_number",
        { prefix: "SOL", table_name: "solicitacoes" },
      );
      if (erroNumero) throw new Error(`numero: ${erroNumero.message}`);
      numeroDeReserva = String(gerado);
      continue;
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
        `insert solicitacoes: ${error.message} (apos ${tentativa} tentativas)`,
      );
    }

    throw new Error(`insert solicitacoes: ${error.message}`);
  }
}