/**
 * Espelho da ficha fiscal (`getSt`) em `public.xbz_produto_fiscal` e da tabela
 * de cores (`produtosCores`) em `public.xbz_cores`.
 *
 * Motivação: as duas tabelas existem desde a migration inicial e nenhuma rotina
 * escrevia nelas. ST/IPI/MVA e o nome das cores só viviam na resposta da XBZ e
 * sumiam ao sair da tela, então todo orçamento com imposto dependia da porta
 * 5001 estar de pé.
 *
 * O espelho é *best-effort*: qualquer falha de escrita é registrada e ignorada,
 * nunca quebra a resposta ao usuário.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { toInt, toNumber, toText } from "./xbz_client.ts";

/** Linha normalizada de `public.xbz_produto_fiscal`. */
export interface XbzFiscalRow {
  tenant_id: string;
  produto_id: number;
  sku: string | null;
  ncm: string | null;
  preco_venda: number | null;
  preco_base_calculo: number | null;
  percentual_ipi: number | null;
  valor_ipi: number | null;
  valor_st: number | null;
  valor_mva: number | null;
  notas_calculo: string | null;
  raw: Record<string, unknown>;
  last_synced_at: string;
}

/** Linha normalizada de `public.xbz_cores`. */
export interface XbzCorRow {
  id: number;
  nome: string;
  sigla: string | null;
  descricao: string | null;
  last_synced_at: string;
}

/** Lê a primeira chave presente, aceitando PascalCase e camelCase. */
function pick(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    for (const k of [key, key.charAt(0).toLowerCase() + key.slice(1)]) {
      const value = raw[k];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Normaliza a resposta de `getSt`. Nomes reais dos 16 campos:
 * DOCS/INTEGRACOES/XBZ.md §4.6. O `produto_id` vem do parâmetro da chamada —
 * a resposta só traz SKU e código composto.
 *
 * Devolve `null` quando não há nada fiscal para guardar (resposta vazia ou sem
 * nenhum valor útil), para não encher a tabela de linhas só com `raw`.
 */
export function mapFiscal(
  tenantId: string,
  produtoId: number,
  raw: unknown,
  syncedAt: string = new Date().toISOString(),
): XbzFiscalRow | null {
  const obj = asObject(raw);
  if (!tenantId || !(produtoId > 0) || !obj) return null;

  const row: XbzFiscalRow = {
    tenant_id: tenantId,
    produto_id: produtoId,
    sku: toText(pick(obj, "ProdutoSku")),
    ncm: toText(pick(obj, "Ncm")),
    preco_venda: toNumber(pick(obj, "PrecoVenda")),
    preco_base_calculo: toNumber(pick(obj, "PrecoBaseCalculo")),
    percentual_ipi: toNumber(pick(obj, "PercentualIpi")),
    valor_ipi: toNumber(pick(obj, "ValorIpiCalculado")),
    valor_st: toNumber(pick(obj, "ValorStCalculado")),
    valor_mva: toNumber(pick(obj, "ValorMvaConsiderado")),
    notas_calculo: toText(pick(obj, "NotasDeCalculo")),
    raw: obj,
    last_synced_at: syncedAt,
  };

  const temConteudo = row.ncm !== null || row.sku !== null ||
    [row.preco_venda, row.preco_base_calculo, row.percentual_ipi, row.valor_ipi, row.valor_st, row.valor_mva]
      .some((v) => v !== null);
  return temConteudo ? row : null;
}

/**
 * Normaliza `produtosCores` (`Id, NomeCor, SiglaCor, Descricao, UrlCor`).
 * `UrlCor` não tem coluna em `xbz_cores` e fica só no retorno da API.
 * Linhas sem `Id` ou sem nome são descartadas (as duas colunas são NOT NULL).
 */
export function normalizeCores(
  items: unknown,
  syncedAt: string = new Date().toISOString(),
): XbzCorRow[] {
  if (!Array.isArray(items)) return [];
  const porId = new Map<number, XbzCorRow>();
  for (const item of items) {
    const obj = asObject(item);
    if (!obj) continue;
    const id = toInt(pick(obj, "Id"));
    const nome = toText(pick(obj, "NomeCor", "Nome"));
    if (id === null || id <= 0 || nome === null) continue;
    porId.set(id, {
      id,
      nome,
      sigla: toText(pick(obj, "SiglaCor", "Sigla")),
      descricao: toText(pick(obj, "Descricao")),
      last_synced_at: syncedAt,
    });
  }
  return [...porId.values()];
}

/** Grava a ficha fiscal do produto. Devolve `true` quando escreveu. */
export async function mirrorFiscal(
  admin: SupabaseClient,
  tenantId: string,
  produtoId: number,
  raw: unknown,
  onError?: (message: string) => void,
): Promise<boolean> {
  const row = mapFiscal(tenantId, produtoId, raw);
  if (!row) return false;
  const { error } = await admin
    .from("xbz_produto_fiscal")
    .upsert(row, { onConflict: "tenant_id,produto_id" });
  if (error) {
    onError?.(error.message);
    return false;
  }
  return true;
}

/** Grava a tabela de cores (global, sem tenant). Devolve quantas linhas subiram. */
export async function mirrorCores(
  admin: SupabaseClient,
  items: unknown,
  onError?: (message: string) => void,
): Promise<number> {
  const rows = normalizeCores(items);
  if (rows.length === 0) return 0;
  const { error } = await admin.from("xbz_cores").upsert(rows, { onConflict: "id" });
  if (error) {
    onError?.(error.message);
    return 0;
  }
  return rows.length;
}
