import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch all rows from a Supabase table, bypassing the 1000-row default limit.
 * Uses cursor-based pagination with .range() to fetch in batches.
 */
export async function fetchAllRows<T = Record<string, unknown>>(
  table: string,
  select: string,
  options?: {
    filters?: Array<{ column: string; operator: string; value: string }>;
    pageSize?: number;
  }
): Promise<T[]> {
  const pageSize = options?.pageSize || 1000;
  let allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from(table).select(select).range(from, from + pageSize - 1);

    if (options?.filters) {
      for (const filter of options.filters) {
        query = query.filter(filter.column, filter.operator, filter.value);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }
    allData = [...allData, ...(data as T[])];
    if (data.length < pageSize) hasMore = false;
    from += pageSize;
  }

  return allData;
}
