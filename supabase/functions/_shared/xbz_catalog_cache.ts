/**
 * Cache/espelho do catálogo XBZ em `public.xbz_produtos`.
 *
 * Motivação: `consultaEstoque` é a única rota de catálogo e depende da
 * disponibilidade da XBZ (porta 5001, circuit breaker de 30s). Espelhar cada
 * resposta permite:
 *   - degradar com elegância (servir o último snapshot quando a XBZ cai);
 *   - pesquisar por SKU, que a XBZ NÃO suporta na busca nativa.
 *
 * O espelho é *best-effort*: qualquer falha de escrita é registrada e ignorada,
 * nunca quebra a resposta ao usuário.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { toInt, toNumber, toText } from "./xbz_client.ts";

/** Linha normalizada, espelhando as colunas de `public.xbz_produtos`. */
export interface XbzProdutoRow {
  tenant_id: string;
  produto_id: number;
  sku: string | null;
  codigo_composto: string | null;
  codigo_amigavel: string | null;
  nome: string | null;
  cor_id: number | null;
  cor_nome: string | null;
  preco: number | null;
  preco_ipi: number | null;
  quantidade_disponivel: number | null;
  disponivel: string | null;
  venda_minima: number | null;
  multiplos: number | null;
  imagem_url: string | null;
  raw: Record<string, unknown>;
  last_synced_at: string;
}

function pick(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

/**
 * Normaliza um item bruto do `consultaEstoque`.
 * Retorna `null` quando não há `produto_id` válido — a chave natural da tabela.
 */
export function mapProduto(
  tenantId: string,
  raw: Record<string, unknown>,
  syncedAt = new Date().toISOString(),
): XbzProdutoRow | null {
  const produtoId = toInt(pick(raw, "ProdutoId", "Produto_Id", "Id", "IdProduto"));
  if (produtoId === null || produtoId <= 0) return null;

  return {
    tenant_id: tenantId,
    produto_id: produtoId,
    sku: toText(pick(raw, "Sku", "SKU", "Codigo")),
    codigo_composto: toText(pick(raw, "CodigoComposto", "Codigo_Composto")),
    codigo_amigavel: toText(pick(raw, "CodigoAmigavel", "Codigo_Amigavel")),
    nome: toText(pick(raw, "Nome", "Descricao", "ProdutoNome")),
    cor_id: toInt(pick(raw, "CorId", "Cor_Id", "IdCor")),
    cor_nome: toText(pick(raw, "CorNome", "Cor", "Cor_Nome")),
    preco: toNumber(pick(raw, "Preco", "PrecoUnitario", "Valor")),
    preco_ipi: toNumber(pick(raw, "PrecoIpi", "Preco_IPI", "PrecoComIpi")),
    quantidade_disponivel: toInt(pick(raw, "Quantidade", "QuantidadeDisponivel", "Estoque")),
    disponivel: toText(pick(raw, "Disponivel", "Disponibilidade")),
    venda_minima: toInt(pick(raw, "VendaMinima", "Venda_Minima")),
    multiplos: toInt(pick(raw, "Multiplos", "Multiplo")),
    imagem_url: toText(pick(raw, "Imagem", "ImagemUrl", "UrlImagem", "Foto")),
    raw,
    last_synced_at: syncedAt,
  };
}

/** Deduplica por `produto_id` — a XBZ pode repetir o mesmo produto em cores distintas. */
export function normalizeCatalogo(tenantId: string, items: unknown): XbzProdutoRow[] {
  if (!Array.isArray(items)) return [];
  const syncedAt = new Date().toISOString();
  const byId = new Map<number, XbzProdutoRow>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = mapProduto(tenantId, item as Record<string, unknown>, syncedAt);
    if (row) byId.set(row.produto_id, row);
  }
  return Array.from(byId.values());
}

const CHUNK = 500;

/**
 * Espelha o resultado do catálogo. Nunca lança: falhas viram log.
 * Retorna a quantidade de linhas efetivamente enviadas ao banco.
 */
export async function mirrorCatalogo(
  admin: SupabaseClient,
  tenantId: string,
  items: unknown,
  onError?: (message: string) => void,
): Promise<number> {
  const rows = normalizeCatalogo(tenantId, items);
  if (rows.length === 0) return 0;

  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await admin
      .from("xbz_produtos")
      .upsert(chunk, { onConflict: "tenant_id,produto_id" });
    if (error) {
      onError?.(error.message);
      break;
    }
    written += chunk.length;
  }
  return written;
}

/**
 * Fallback de leitura quando a XBZ está indisponível.
 * Ao contrário da XBZ, aceita busca por SKU e código.
 */
export async function readCatalogoCache(
  admin: SupabaseClient,
  tenantId: string,
  busca: string,
  limit = 200,
): Promise<Record<string, unknown>[]> {
  const term = busca.trim().slice(0, 100);
  let query = admin
    .from("xbz_produtos")
    .select("raw, last_synced_at")
    .eq("tenant_id", tenantId)
    .order("last_synced_at", { ascending: false })
    .limit(limit);

  if (term && term !== "a") {
    const pattern = `%${term.replace(/[%_,]/g, " ")}%`;
    query = query.or(
      `nome.ilike.${pattern},sku.ilike.${pattern},codigo_amigavel.ilike.${pattern},codigo_composto.ilike.${pattern}`,
    );
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((r) => (r.raw ?? {}) as Record<string, unknown>);
}
