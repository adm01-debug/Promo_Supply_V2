import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Leitura do cache local da API oficial SPOT.
 * Nenhuma dessas queries fala com a SPOT: o preenchimento é feito pela edge
 * function `spot-api` em sincronizações agendadas (quota diária limitada).
 */

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
}

export interface SpotSyncStatus {
  endpoint: string;
  called_at: string;
  status: string;
  records_processed: number;
  error_message: string | null;
}

export const SPOT_CATALOG_PAGE_SIZE = 60;

export interface SpotCatalogFilters {
  search: string;
  collection: string | null;
  /** Códigos aceitos para a categoria — a busca usa OR entre legado e novo. */
  typeCodes: { legacy: string | null; modern: string[] } | null;
}

export function useSpotProducts(filters: SpotCatalogFilters) {
  return useQuery({
    queryKey: ['spot-produtos', filters],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SpotCachedProduct[]> => {
      let query = supabase
        .from('spot_produtos')
        .select('reference,name,category_name,type_code_legacy,type_code_new,catalogs,brand,country_of_origin,main_image_url,synced_at')
        .order('name')
        .limit(SPOT_CATALOG_PAGE_SIZE);

      if (filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        query = query.or(`name.ilike.${term},reference.ilike.${term}`);
      }
      if (filters.collection) {
        query = query.contains('catalogs', [filters.collection]);
      }
      if (filters.typeCodes) {
        const clauses: string[] = [];
        if (filters.typeCodes.legacy) clauses.push(`type_code_legacy.eq.${filters.typeCodes.legacy}`);
        for (const modern of filters.typeCodes.modern) clauses.push(`type_code_new.eq.${modern}`);
        if (clauses.length > 0) query = query.or(clauses.join(','));
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as SpotCachedProduct[];
    },
  });
}

export function useSpotSkus(productReferences: string[]) {
  return useQuery({
    queryKey: ['spot-skus', productReferences],
    enabled: productReferences.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SpotCachedSku[]> => {
      const { data, error } = await supabase
        .from('spot_skus')
        .select('sku,product_reference,color_name,color_hex,your_price,handling_costs,no_replenishment')
        .in('product_reference', productReferences);
      if (error) throw new Error(error.message);
      return (data ?? []) as SpotCachedSku[];
    },
  });
}

export function useSpotStock(productReferences: string[]) {
  return useQuery({
    queryKey: ['spot-estoque', productReferences],
    enabled: productReferences.length > 0,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SpotStockRow[]> => {
      const { data, error } = await supabase
        .from('spot_estoque')
        .select('sku,product_reference,quantity,incoming_date')
        .in('product_reference', productReferences);
      if (error) throw new Error(error.message);
      return (data ?? []) as SpotStockRow[];
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

/** Catálogo é sincronizado 1×/dia; estoque a cada 15 min. */
export function evaluateFreshness(lastSync: string | undefined, maxAgeMinutes: number): CacheFreshness {
  if (!lastSync) return 'missing';
  const ageMinutes = (Date.now() - new Date(lastSync).getTime()) / 60000;
  return ageMinutes <= maxAgeMinutes ? 'fresh' : 'stale';
}
