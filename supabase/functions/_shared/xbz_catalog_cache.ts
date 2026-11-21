/**
 * Cache/espelho do catálogo XBZ em `public.xbz_produtos`.
 *
 * Motivação: o catálogo (`mxbzConsultaEstoque`/`consultaEstoque`) depende da
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

/**
 * Lê a primeira chave presente. Aceita tanto PascalCase (`consultaEstoque`,
 * `GetListaDeProdutos`) quanto camelCase (`mxbzConsultaEstoque` bruto).
 */
function pick(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    for (const k of [key, key.charAt(0).toLowerCase() + key.slice(1)]) {
      const value = raw[k];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return null;
}

function pickObject(raw: Record<string, unknown>, ...keys: string[]): Record<string, unknown> | null {
  const value = pick(raw, ...keys);
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Normaliza um item bruto do catálogo XBZ (`consultaEstoque`, `mxbzConsultaEstoque`
 * ou `/clientes/GetListaDeProdutos`). Nomes reais dos campos: DOCS/INTEGRACOES/XBZ.md §4.3.
 * Retorna `null` quando não há `produto_id` válido — a chave natural da tabela.
 */
export function mapProduto(
  tenantId: string,
  raw: Record<string, unknown>,
  syncedAt = new Date().toISOString(),
): XbzProdutoRow | null {
  const produtoId = toInt(pick(raw, "IdProduto", "ProdutoId", "Id"));
  if (produtoId === null || produtoId <= 0) return null;

  // Cor: `CorPredominante{Id,NomeCor}` no portal; `CorWebPrincipal(Id)` na API /clientes.
  const cor = pickObject(raw, "CorPredominante");
  const preco = toNumber(pick(raw, "PrecoVenda"));
  const ipiTaxa = toNumber(pick(raw, "IpiTaxa"));

  // Estoque: `QtdDisponivel` pode vir 0 com `QtdDisponivelExibicao` "8.044" (observado 21/11/2026);
  // `QuantidadeDisponivel` é o nome na API /clientes.
  const qtd = toInt(pick(raw, "QtdDisponivel"));
  const qtdExibicao = toInt(pick(raw, "QtdDisponivelExibicao", "QuantidadeDisponivel"));
  const quantidade = qtd !== null && qtd > 0 ? qtd : qtdExibicao ?? qtd;

  return {
    tenant_id: tenantId,
    produto_id: produtoId,
    sku: toText(pick(raw, "CodigoXbz")),
    codigo_composto: toText(pick(raw, "CodigoComposto")),
    codigo_amigavel: toText(pick(raw, "CodigoAmigavel")),
    nome: toText(pick(raw, "Nome")),
    cor_id: toInt(cor ? pick(cor, "Id") : pick(raw, "CorWebPrincipalId")),
    cor_nome: toText(cor ? pick(cor, "NomeCor") : pick(raw, "CorWebPrincipal")),
    preco,
    // Preço com IPI aplicado (a XBZ informa só a alíquota, em %).
    preco_ipi: preco !== null && ipiTaxa !== null
      ? Math.round(preco * (1 + ipiTaxa / 100) * 100) / 100
      : null,
    quantidade_disponivel: quantidade,
    disponivel: toText(pick(raw, "Disponivel")),
    venda_minima: toInt(pick(raw, "VendaMinima")),
    multiplos: toInt(pick(raw, "Multiplos")),
    imagem_url: toText(pick(raw, "ImageLink")),
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
export async function readCatalogoCacheWithMeta(
  admin: SupabaseClient,
  tenantId: string,
  busca: string,
  limit = 200,
): Promise<{ items: Record<string, unknown>[]; syncedAt: string | null }> {
  const term = busca.trim().slice(0, 100);
  let query = admin
    .from("xbz_produtos")
    .select("raw, last_synced_at")
    .eq("tenant_id", tenantId)
    .order("last_synced_at", { ascending: false })
    .limit(limit);

  if (term) {
    const pattern = `%${term.replace(/[%_,]/g, " ")}%`;
    query = query.or(
      `nome.ilike.${pattern},sku.ilike.${pattern},codigo_amigavel.ilike.${pattern},codigo_composto.ilike.${pattern}`,
    );
  }

  const { data, error } = await query;
  if (error || !data) return { items: [], syncedAt: null };

  // A ordenação é decrescente por `last_synced_at`, logo o primeiro registro
  // carrega o instante mais recente de sincronização do recorte retornado.
  const syncedAt = typeof data[0]?.last_synced_at === "string"
    ? (data[0].last_synced_at as string)
    : null;

  return {
    items: data.map((r) => (r.raw ?? {}) as Record<string, unknown>),
    syncedAt,
  };
}

export async function readCatalogoCache(
  admin: SupabaseClient,
  tenantId: string,
  busca: string,
  limit = 200,
): Promise<Record<string, unknown>[]> {
  const { items } = await readCatalogoCacheWithMeta(admin, tenantId, busca, limit);
  return items;
}

