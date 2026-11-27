import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mensagemDeErroDaEdge } from '@/lib/invokeEdge';
import { escapeIlike } from '@/lib/supabaseQuery';
import { invokeBridgeSelect } from '@/hooks/useCatalogoPim';

/**
 * Leitura do catálogo de compras (INT-01).
 *
 * Até a etapa 163/164 o catálogo vinha do espelho local que os crons da edge
 * `spot-api` enchem: `spot_produtos`/`spot_skus`/`spot_estoque` e as ações
 * `syncCatalog`/`syncCustomization`/`syncStock`. O catálogo daqui pra frente é
 * o do PIM (Promo Gifts V4), lido pela view `v_compras_catalogo` via
 * `external-db-bridge` — o mesmo caminho que `useCatalogoPim` já usa em Gerar
 * Ordem e Recompra. Nada de catálogo é gravado neste banco.
 *
 * O que continua local: `spot_api_sync_log`, porque é a contabilidade da cota
 * da API oficial para as ações transacionais (pedidos, carrinho). A fonte
 * dessas linhas é o `pg_cron`, não a tela.
 */

/** Cota dos endpoints de catálogo da SPOT — se um dia voltarem a ser chamados. */
export const SPOT_QUOTA_CATALOGO_DIA = 22;

/** A API oficial do SPOT é o fornecedor; as linhas do PIM para ele carregam este código. */
export const SPOT_SUPPLIER_CODE = 'SPOT';

/**
 * Grafias do fornecedor SPOT presentes no PIM. Hoje as linhas do Spot chegam com
 * `supplier_code = 'STRICKER'` (razão social "Spot | Stricker"); `'SPOT'` fica na
 * lista para quando o PIM padronizar o código. Ordem: o mais específico primeiro.
 */
export const SPOT_SUPPLIER_CODES: readonly string[] = [SPOT_SUPPLIER_CODE, 'STRICKER'];

export interface SpotCachedProduct {
  reference: string;
  name: string;
  category_name: string | null;
  type_code_legacy: string | null;
  type_code_new: string | null;
  catalogs: string[];
  brand: string | null;
  country_of_origin: string | null;
  main_image_url: string | null;
  synced_at: string;
  /** Menor preço de compra entre as variantes do produto (vem de `agruparProdutosPim`). */
  your_price?: number | null;
  color_name?: string | null;
  color_hex?: string | null;
  no_replenishment?: boolean;
  em_estoque?: boolean;
}

export interface SpotCachedSku {
  sku: string;
  product_reference: string;
  color_name: string | null;
  color_hex: string | null;
  your_price: number | null;
  handling_costs: number | null;
  no_replenishment: boolean;
}

export interface SpotStockRow {
  sku: string;
  product_reference: string | null;
  quantity: number;
  incoming_date: string | null;
  synced_at: string;
}

export interface SpotSyncStatus {
  endpoint: string;
  called_at: string;
  status: string;
  records_processed: number;
  error_message: string | null;
}

export const SPOT_CATALOG_PAGE_SIZE = 60;

/** Rótulo da coleção quando o produto não traz coleção (o filtro da tela usa este rótulo). */
export const SPOT_COLECAO_PADRAO = 'SPOT';

export interface SpotCatalogFilters {
  search: string;
  collection: string | null;
  /** Códigos aceitos para a categoria — a busca usa OR entre legado e novo. */
  typeCodes: { legacy: string | null; modern: string[] } | null;
}

/** O bridge recusa `select` acima disso (`MAX_SELECT_LIMIT` em `external-bridge-allowlist.ts`). */
const SPOT_BRIDGE_PAGE = 500;

/**
 * Teto de leitura da tela; acima disso a busca é que deve recortar.
 * Medido no PIM em 28/11/2026: 3.663 variantes do fornecedor SPOT, então o teto
 * precisa ficar acima disso para não sumir com produto da tela.
 */
const SPOT_BRIDGE_MAX_ROWS = 6000;

const numeroOuNulo = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};

type BridgeRow = Record<string, unknown>;

const textoOuNulo = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v : null;

/** Agrupa as linhas da view por produto: preço mínimo e estoque somado das variantes. */
export function agruparProdutosPim(rows: BridgeRow[]): SpotCachedProduct[] {
  const porProduto = new Map<string, SpotCachedProduct & { _estoque: number }>();

  for (const row of rows) {
    const reference = textoOuNulo(row.supplier_reference) ?? textoOuNulo(row.sku);
    if (!reference) continue;

    const estoque = numeroOuNulo(row.stock_quantity) ?? 0;
    const preco = numeroOuNulo(row.cost_price);
    const atual = porProduto.get(reference);

    if (!atual) {
      porProduto.set(reference, {
        reference,
        name: textoOuNulo(row.name) ?? reference,
        category_name: textoOuNulo(row.category_name),
        type_code_legacy: textoOuNulo(row.type_code_legacy),
        type_code_new: textoOuNulo(row.type_code_new),
        catalogs: [SPOT_COLECAO_PADRAO],
        main_image_url: textoOuNulo(row.image_url),
        brand: textoOuNulo(row.supplier_name),
        country_of_origin: null,
        synced_at: textoOuNulo(row.updated_at) ?? new Date().toISOString(),
        color_name: textoOuNulo(row.color_name),
        color_hex: textoOuNulo(row.color_hex),
        your_price: preco,
        no_replenishment: row.is_stockout === true,
        _estoque: estoque,
      });
      continue;
    }

    if (preco !== null && (atual.your_price === null || atual.your_price === undefined || preco < atual.your_price)) {
      atual.your_price = preco;
    }
    atual._estoque += estoque;
    atual.color_name ??= textoOuNulo(row.color_name);
    atual.color_hex ??= textoOuNulo(row.color_hex);
    atual.no_replenishment = atual.no_replenishment === true && row.is_stockout === true;
    atual.main_image_url ??= textoOuNulo(row.image_url);
    atual.type_code_legacy ??= textoOuNulo(row.type_code_legacy);
    atual.type_code_new ??= textoOuNulo(row.type_code_new);
    const colecoes = row.catalogs;
    if (Array.isArray(colecoes)) {
      for (const colecao of colecoes) {
        if (typeof colecao === 'string' && !atual.catalogs.includes(colecao)) atual.catalogs.push(colecao);
      }
    }
  }

  return [...porProduto.values()].map(({ _estoque, ...produto }) => ({
    ...produto,
    em_estoque: _estoque > 0,
  }));
}

/** Lê o catálogo do SPOT no PIM, paginando até esgotar (ou bater o teto da tela). */
async function lerCatalogoSpot(termo: string): Promise<BridgeRow[]> {
  const base: Record<string, unknown> = {
    supplier_code: { operator: 'in', value: SPOT_SUPPLIER_CODES },
  };
  if (termo) {
    // O helper do projeto escapa \ % _ , ( ) * — mesmo padrao dos outros filtros ilike.
    base.name = { operator: 'ilike', value: `%${escapeIlike(termo)}%` };
  }

  const todos: BridgeRow[] = [];
  for (let offset = 0; offset < SPOT_BRIDGE_MAX_ROWS; offset += SPOT_BRIDGE_PAGE) {
    const pagina = await invokeBridgeSelect<BridgeRow>('v_compras_catalogo', {
      filters: base,
      limit: SPOT_BRIDGE_PAGE,
      offset,
    });
    todos.push(...pagina);
    if (pagina.length < SPOT_BRIDGE_PAGE) break;
  }
  return todos;
}

/**
 * A categoria da tela é um recorte do catálogo SPOT (caneca, garrafa, ecobag...).
 * A view do PIM expõe `supplier_reference`; quando ela trouxer o código de tipo do
 * produto (`type_code_legacy`) o código serve de filtro. Sem código, nada é escondido.
 */
function filtrarPorCategoria(
  produtos: SpotCachedProduct[],
  typeCodes: SpotCatalogFilters['typeCodes'],
): SpotCachedProduct[] {
  if (!typeCodes) return produtos;
  const aceitos = [typeCodes.legacy, ...typeCodes.modern].filter((c): c is string => Boolean(c));
  if (aceitos.length === 0) return produtos;

  const comCodigo = produtos.filter((p) => (p.type_code_legacy ?? '') !== '');
  // O filtro só vale quando o PIM entrega o código; senão zeraria a tela.
  if (comCodigo.length === 0) return produtos;

  const aceita = (p: SpotCachedProduct) =>
    aceitos.some((codigo) => (p.type_code_legacy ?? '').startsWith(codigo));
  return comCodigo.some(aceita) ? produtos.filter(aceita) : produtos;
}

export function useSpotProducts(filters: SpotCatalogFilters) {
  return useQuery({
    queryKey: ['spot-produtos', filters],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SpotCachedProduct[]> => {
      const termo = filters.search.trim();
      // Etapa QA 060 (SEC-10): o termo vai como filtro estruturado ao bridge, que
      // valida coluna e operador — nunca interpolado em texto de query.
      const rows = await lerCatalogoSpot(termo);
      const produtos = agruparProdutosPim(rows);
      const daColecao = filters.collection
        ? produtos.filter((p) => p.catalogs.includes(filters.collection as string))
        : produtos;
      return filtrarPorCategoria(daColecao, filters.typeCodes);
    },
  });
}

export function useSpotSkus(productReferences: string[]) {
  return useQuery({
    queryKey: ['spot-skus', productReferences],
    enabled: productReferences.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SpotCachedSku[]> => {
      const alvo = new Set(productReferences);
      const rows = await lerCatalogoSpot('');
      const skus: SpotCachedSku[] = [];
      for (const row of rows) {
        const referencia = textoOuNulo(row.supplier_reference);
        const sku = textoOuNulo(row.sku);
        if (!referencia || !sku || !alvo.has(referencia)) continue;
        skus.push({
          sku,
          product_reference: referencia,
          color_name: textoOuNulo(row.color_name),
          color_hex: textoOuNulo(row.color_hex),
          your_price: numeroOuNulo(row.cost_price),
          handling_costs: null,
          no_replenishment: row.is_stockout === true,
        });
      }
      return skus;
    },
  });
}

export function useSpotStock(productReferences: string[]) {
  return useQuery({
    queryKey: ['spot-estoque', productReferences],
    enabled: productReferences.length > 0,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SpotStockRow[]> => {
      const alvo = new Set(productReferences);
      const rows = await lerCatalogoSpot('');
      const estoque: SpotStockRow[] = [];
      for (const row of rows) {
        const referencia = textoOuNulo(row.supplier_reference);
        const sku = textoOuNulo(row.sku);
        if (!referencia || !sku || !alvo.has(referencia)) continue;
        estoque.push({
          sku,
          product_reference: referencia,
          quantity: numeroOuNulo(row.stock_quantity) ?? 0,
          incoming_date: null,
          synced_at: textoOuNulo(row.last_stock_update_at) ?? textoOuNulo(row.updated_at) ?? new Date().toISOString(),
        });
      }
      return estoque;
    },
  });
}

export function useSpotSyncStatus() {
  return useQuery({
    queryKey: ['spot-sync-status'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SpotSyncStatus[]> => {
      const { data, error } = await supabase
        .from('spot_api_sync_log')
        .select('endpoint,called_at,status,records_processed,error_message')
        .order('called_at', { ascending: false })
        .limit(40);
      if (error) throw new Error(error.message);
      return (data ?? []) as SpotSyncStatus[];
    },
  });
}

export type SpotSyncAction = 'getOrders';

/**
 * Ação transacional da edge `spot-api` (catálogo não é mais sincronizado aqui:
 * vem do PIM sob demanda). Mantido porque `getOrders` ainda depende da cota da
 * API oficial e a tela mostra quando foi a última rodada.
 */
export function useTriggerSpotSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: SpotSyncAction) => {
      const { data, error } = await supabase.functions.invoke('spot-api', { body: { action } });
      if (error) throw new Error(await mensagemDeErroDaEdge(error, 'Sincronização recusada'));
      const resposta = data as { success?: boolean; error?: string; records?: number } | null;
      if (resposta?.success === false) throw new Error(resposta.error ?? 'Sincronização recusada');
      return { action, records: resposta?.records ?? null };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['spot-sync-status'] });
      void queryClient.invalidateQueries({ queryKey: ['spot-produtos'] });
      void queryClient.invalidateQueries({ queryKey: ['spot-skus'] });
      void queryClient.invalidateQueries({ queryKey: ['spot-estoque'] });
    },
  });
}

/** Última sincronização bem-sucedida por endpoint. */
export function latestSuccessByEndpoint(rows: SpotSyncStatus[]): Record<string, SpotSyncStatus> {
  const out: Record<string, SpotSyncStatus> = {};
  for (const row of rows) {
    if (row.status !== 'success') continue;
    if (!out[row.endpoint]) out[row.endpoint] = row;
  }
  return out;
}

export type CacheFreshness = 'fresh' | 'stale' | 'missing';

/** Catálogo é sincronizado 1×/dia; estoque em rodadas periódicas agendadas (ver `Checklist de conclusão` do cron em supabase/migrations). */
export function evaluateFreshness(lastSync: string | undefined, maxAgeMinutes: number): CacheFreshness {
  if (!lastSync) return 'missing';
  const ageMinutes = (Date.now() - new Date(lastSync).getTime()) / 60000;
  return ageMinutes <= maxAgeMinutes ? 'fresh' : 'stale';
}
