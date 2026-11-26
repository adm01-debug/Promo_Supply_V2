import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type FiscalDocumentInsert = Database["public"]["Tables"]["fiscal_documents"]["Insert"];

/** "atualizar": reimportacao sobrescreve a nota. "ignorar": reimportacao nao toca na nota existente. */
export type ModoAoExistir = "atualizar" | "ignorar";

export interface ResultadoPersistenciaFiscal {
  id: string;
  situacao: "criado" | "atualizado" | "ignorado";
}

const CODIGO_UNIQUE_VIOLATION = "23505";

const chaveDeAcesso = (payload: FiscalDocumentInsert) => (payload.chave_acesso ?? "").trim();

// Os indices unicos de fiscal_documents sao parciais (uq_fiscal_documents_chave:
// chave_acesso IS NOT NULL AND chave_acesso <> ''; uq_fiscal_documents_nf:
// fornecedor_id IS NOT NULL), e ON CONFLICT nao casa com indice parcial no Postgres:
// "there is no unique or exclusion constraint matching the ON CONFLICT specification".
// Por isso a idempotencia e resolvida aqui: localiza a nota pela chave natural, atualiza
// se existir e insere se nao existir. O indice do banco continua sendo a rede de seguranca
// contra a corrida entre duas importacoes simultaneas (erro 23505).
async function localizarDocumentoId(payload: FiscalDocumentInsert): Promise<string | null> {
  const chave = chaveDeAcesso(payload);
  const serie = (payload.serie ?? "").trim();

  let consulta = supabase.from("fiscal_documents").select("id");

  if (chave) {
    consulta = consulta.eq("chave_acesso", chave);
  } else if (payload.fornecedor_id && payload.numero_nf) {
    consulta = consulta.eq("fornecedor_id", payload.fornecedor_id).eq("numero_nf", payload.numero_nf);
    if (serie) consulta = consulta.eq("serie", serie);
  } else if (payload.numero_nf) {
    consulta = consulta.eq("numero_nf", payload.numero_nf);
    if (payload.tenant_id) consulta = consulta.eq("tenant_id", payload.tenant_id);
    if (serie) consulta = consulta.eq("serie", serie);
  } else {
    return null;
  }

  const { data, error } = await consulta.limit(1).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function salvarDocumentoFiscal(
  payload: FiscalDocumentInsert,
  modo: ModoAoExistir = "atualizar",
): Promise<ResultadoPersistenciaFiscal> {
  const existenteId = await localizarDocumentoId(payload);

  if (existenteId) {
    if (modo === "ignorar") return { id: existenteId, situacao: "ignorado" };
    const { error } = await supabase.from("fiscal_documents").update(payload).eq("id", existenteId);
    if (error) throw error;
    return { id: existenteId, situacao: "atualizado" };
  }

  const { data, error } = await supabase
    .from("fiscal_documents")
    .insert(payload)
    .select("id")
    .single();

  if (!error) return { id: data.id, situacao: "criado" };

  if ((error as { code?: string }).code !== CODIGO_UNIQUE_VIOLATION) throw error;

  // Outra importacao gravou a mesma nota entre o SELECT e o INSERT.
  const idDaCorrida = await localizarDocumentoId(payload);
  if (!idDaCorrida) throw error;
  if (modo === "ignorar") return { id: idDaCorrida, situacao: "ignorado" };

  const { error: erroAtualizacao } = await supabase
    .from("fiscal_documents")
    .update(payload)
    .eq("id", idDaCorrida);
  if (erroAtualizacao) throw erroAtualizacao;
  return { id: idDaCorrida, situacao: "atualizado" };
}