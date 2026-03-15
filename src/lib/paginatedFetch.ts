import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

/**
 * Fetch all rows from a Supabase table, bypassing the 1000-row default limit.
 * Uses cursor-based pagination with .range() to fetch in batches.
 */
export async function fetchAllRows<T extends TableName>(
  table: T,
  select: string,
  options?: {
    filters?: Array<{ column: string; operator: string; value: string }>;
    pageSize?: number;
  }
): Promise<Partial<TableRow<T>>[]> {
  const pageSize = options?.pageSize || 1000;
  let allData: Partial<TableRow<T>>[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1);

    if (options?.filters) {
      for (const filter of options.filters) {
        query = query.filter(filter.column, filter.operator as 'eq', filter.value);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }
    allData = [...allData, ...(data as Partial<TableRow<T>>[])];
    if (data.length < pageSize) hasMore = false;
    from += pageSize;
  }

  return allData;
}
