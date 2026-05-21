import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch all rows from a Supabase table, bypassing the 1000-row default limit.
 * Uses cursor-based pagination with .range() to fetch in batches.
 * Optimized: pre-allocates array and avoids spread operator in loop.
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
  const allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table as never).select(select).range(from, from + pageSize - 1);

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

    // Push items directly instead of spread to avoid stack overflow on large sets
    for (let i = 0; i < data.length; i++) {
      allData.push(data[i] as T);
    }

    // Stop only when the page is fully empty. Previously the loop stopped at
    // `data.length < pageSize`, which dropped the rest of the result set when
    // RLS filtered a partial page mid-fetch.
    from += data.length;
  }

  return allData;
}
