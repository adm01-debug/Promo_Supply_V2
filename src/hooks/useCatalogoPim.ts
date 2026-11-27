/**
 * useCatalogoPim
 *
 * Hook para leitura do catálogo de produtos e faixas de preço de personalização
 * diretamente do PIM (Promo Gifts V4) via edge function external-db-bridge.
 *
 * Nenhum dado de catálogo é armazenado no Promo Supply V2 — a fonte canônica
 * é o banco do Promo Gifts V4, acessado via views públicas:
 *   - v_compras_catalogo       (PR 1.1 do plano Promo Supply V2 → só compras)
 *   - v_compras_precos_faixa   (PR 1.2 do plano Promo Supply V2 → só compras)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { mensagemDeErroDaEdge } from '@/lib/invokeEdge';

// ---------------------------------------------------------------------------
// Tipos — colunas espelhadas das views no PIM
// ---------------------------------------------------------------------------

export interface PimProdutoCatalogo {
  /** PK do produto no PIM */
  pim_product_id: string;
  /** PK da variante no PIM (null = registro de produto sem variante ativa) */
  pim_variant_id: string | null;
  sku: string;
  sku_promo: string | null;
  name: string;
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  /** supplier_sku da variante ou supplier_reference do produto */
  supplier_reference: string | null;
  cost_price: number | null;
  sale_price: number | null;
  suggested_price: number | null;
  ipi_rate: number | null;
  ncm_code: string | null;
  min_quantity: number | null;
  min_order_quantity: number | null;
  min_order_value: number | null;
  stock_quantity: number | null;
  is_stockout: boolean;
  last_stock_update_at: string | null;
  color_id: string | null;
  color_name: string | null;
  color_code: string | null;
  color_hex: string | null;
  size_code: string | null;
  image_url: string | null;
  lead_time_days: number | null;
  price_updated_at: string | null;
  updated_at: string | null;
}

export interface PimPrecoFaixa {
  pim_product_id: string;
  pim_variant_id: string | null;
  qty_min: number;
  /** null = faixa aberta (sem limite superior) */
  qty_max: number | null;
  unit_cost: number;
  unit_price: number | null;
  /** origem da regra, ex: 'spot_customization' */
  source: string;
  service_code: string | null;
  table_code: string | null;
  component: string | null;
  location: string | null;
  handling_cost: number | null;
  table_max_area_cm2: number | null;
  max_stitches: number | null;
  hotspot: string | null;
  currency: string | null;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

interface BridgeBody {
  operation: 'select';
  table: string;
  selectColumns?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}

interface BridgeResponse<T> {
  data: T[];
  count: number | null;
  meta: { durationMs: number; status: number; recordCount: number };
}

class PimBridgeError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'PimBridgeError';
  }
}

async function invokeBridge<T>(body: BridgeBody): Promise<BridgeResponse<T>> {
  const { data, error } = await supabase.functions.invoke<BridgeResponse<T>>(
    'external-db-bridge',
    { body },
  );
  if (error) throw new PimBridgeError(await mensagemDeErroDaEdge(error, 'Falha ao consultar o catálogo externo.'));
  if (!data) throw new PimBridgeError('Resposta vazia do external-db-bridge');
  return data;
}

// ---------------------------------------------------------------------------
// invokeBridgeSelect
// Leitura pontual da view, fora de um componente (ex.: hook do catálogo SPOT
// usa dentro de queryFn). Mesmo envelope e mesmo tratamento de erro.
// ---------------------------------------------------------------------------
export async function invokeBridgeSelect<T = Record<string, unknown>>(
  table: string,
  opts: { filters?: Record<string, unknown>; limit?: number; offset?: number; selectColumns?: string } = {},
): Promise<T[]> {
  const resp = await invokeBridge<T>({
    operation: 'select',
    table,
    selectColumns: opts.selectColumns ?? '*',
    limit: opts.limit ?? 100,
    offset: opts.offset ?? 0,
    filters: opts.filters ?? {},
  });
  return resp.data;
}

// ---------------------------------------------------------------------------
// buscarProdutoPorIdEstrito
// Mesma consulta de buscarProdutoPorId, mas deixa o PimBridgeError subir.
// Quem congela dado fiscal na OC (NCM, IPI, codigo do fornecedor) nao pode
// confundir "PIM fora do ar" com "produto sem dado fiscal" -- o hook devolve
// null nos dois casos para nao quebrar telas de leitura.
// ---------------------------------------------------------------------------
export async function buscarProdutoPorIdEstrito(
  pimProductId: string,
): Promise<PimProdutoCatalogo | null> {
  const resp = await invokeBridge<PimProdutoCatalogo>({
    operation: 'select',
    table: 'v_compras_catalogo',
    selectColumns: '*',
    limit: 1,
    offset: 0,
    filters: { pim_product_id: pimProductId },
  });
  return resp.data[0] ?? null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCatalogoPim() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // -------------------------------------------------------------------------
  // buscarProdutos
  // Retorna lista paginada de produtos do catálogo PIM.
  // -------------------------------------------------------------------------
  const buscarProdutos = useCallback(
    async (
      opts: {
        limit?: number;
        offset?: number;
        filters?: Record<string, unknown>;
      } = {},
    ): Promise<PimProdutoCatalogo[]> => {
      setLoading(true);
      setError(null);
      try {
        const resp = await invokeBridge<PimProdutoCatalogo>({
          operation: 'select',
          table: 'v_compras_catalogo',
          selectColumns: '*',
          limit: opts.limit ?? 100,
          offset: opts.offset ?? 0,
          filters: opts.filters ?? {},
        });
        return resp.data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (mounted.current) setError(msg);
        return [];
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // buscarProdutoPorId
  // Retorna um único produto (ou null) pelo pim_product_id.
  // -------------------------------------------------------------------------
  const buscarProdutoPorId = useCallback(
    async (pimProductId: string): Promise<PimProdutoCatalogo | null> => {
      setLoading(true);
      setError(null);
      try {
        const resp = await invokeBridge<PimProdutoCatalogo>({
          operation: 'select',
          table: 'v_compras_catalogo',
          selectColumns: '*',
          limit: 1,
          offset: 0,
          filters: { pim_product_id: pimProductId },
        });
        return resp.data[0] ?? null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (mounted.current) setError(msg);
        return null;
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // buscarFaixasPreco
  // Retorna todas as faixas de preço de personalização de um produto PIM.
  // -------------------------------------------------------------------------
  const buscarFaixasPreco = useCallback(
    async (pimProductId: string): Promise<PimPrecoFaixa[]> => {
      setLoading(true);
      setError(null);
      try {
        const resp = await invokeBridge<PimPrecoFaixa>({
          operation: 'select',
          table: 'v_compras_precos_faixa',
          selectColumns: '*',
          limit: 500,
          offset: 0,
          filters: { pim_product_id: pimProductId },
        });
        return resp.data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (mounted.current) setError(msg);
        return [];
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    error,
    buscarProdutos,
    buscarProdutoPorId,
    buscarFaixasPreco,
  };
}
