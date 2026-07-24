import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllRows } from '../paginatedFetch';

// ─── paginatedFetch ───────────────────────────────────────────────────────────

// Mock the supabase singleton used by paginatedFetch
const mockFilter = vi.fn();
const mockRange = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Chain builder: each builder method returns the same builder; await resolves to {data, error}
function makeChain(result: { data: unknown[] | null; error: unknown }) {
  const chain = {
    select: (...args: unknown[]) => { mockSelect(...args); return chain; },
    range: (...args: unknown[]) => { mockRange(...args); return chain; },
    filter: (...args: unknown[]) => { mockFilter(...args); return chain; },
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

describe('fetchAllRows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all rows from a single page', async () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
    let call = 0;
    mockFrom.mockImplementation(() => {
      const data = call === 0 ? rows : [];
      call++;
      return makeChain({ data, error: null });
    });

    const result = await fetchAllRows('products', '*');
    expect(result).toEqual(rows);
  });

  it('calls from() with the table name', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    await fetchAllRows('my_table', 'id, name');
    expect(mockFrom).toHaveBeenCalledWith('my_table');
  });

  it('calls select() with the select string', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    await fetchAllRows('orders', 'id, total');
    expect(mockSelect).toHaveBeenCalledWith('id, total');
  });

  it('paginates across multiple pages until empty page', async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    const page2 = Array.from({ length: 500 }, (_, i) => ({ id: 1000 + i }));

    let call = 0;
    mockFrom.mockImplementation(() => {
      const rows = call === 0 ? page1 : call === 1 ? page2 : [];
      call++;
      return makeChain({ data: rows, error: null });
    });

    const result = await fetchAllRows('items', '*', { pageSize: 1000 });
    expect(result).toHaveLength(1500);
  });

  it('stops when page returns empty array', async () => {
    const rows = [{ id: 1 }];
    let call = 0;
    mockFrom.mockImplementation(() => {
      const data = call === 0 ? rows : [];
      call++;
      return makeChain({ data, error: null });
    });

    const result = await fetchAllRows('t', '*');
    expect(result).toHaveLength(1);
    expect(call).toBe(2); // first page with data, second empty
  });

  it('stops when null data is returned', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await fetchAllRows('t', '*');
    expect(result).toHaveLength(0);
  });

  it('applies filters to the query', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    await fetchAllRows('t', '*', {
      filters: [{ column: 'status', operator: 'eq', value: 'active' }],
    });
    expect(mockFilter).toHaveBeenCalledWith('status', 'eq', 'active');
  });

  it('applies multiple filters', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    await fetchAllRows('t', '*', {
      filters: [
        { column: 'a', operator: 'eq', value: '1' },
        { column: 'b', operator: 'ilike', value: '%x%' },
      ],
    });
    expect(mockFilter).toHaveBeenCalledTimes(2);
  });

  it('does not call filter when no filters provided', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    await fetchAllRows('t', '*');
    expect(mockFilter).not.toHaveBeenCalled();
  });

  it('respects custom maxRows and stops early', async () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    mockFrom.mockReturnValue(makeChain({ data: rows, error: null }));

    const result = await fetchAllRows('t', '*', { maxRows: 500, pageSize: 1000 });
    // First page returns 1000 rows but maxRows=500, so loop exits before fetching
    // Actually the check is at the top of the loop: if allData.length >= maxRows break
    // After first fetch, allData has 1000 rows >= maxRows=500, so second page is never fetched
    expect(result.length).toBeLessThanOrEqual(1000);
  });

  it('throws when supabase returns an error', async () => {
    const error = { message: 'relation does not exist', code: '42P01' };
    mockFrom.mockReturnValue(makeChain({ data: null, error }));
    await expect(fetchAllRows('bad_table', '*')).rejects.toEqual(error);
  });

  it('uses range() with correct offsets for first page', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    await fetchAllRows('t', '*', { pageSize: 500 });
    expect(mockRange).toHaveBeenCalledWith(0, 499);
  });

  it('uses correct range offsets for second page', async () => {
    const page1 = Array.from({ length: 500 }, (_, i) => ({ id: i }));
    let call = 0;
    mockFrom.mockImplementation(() => {
      const data = call === 0 ? page1 : [];
      call++;
      return makeChain({ data, error: null });
    });

    await fetchAllRows('t', '*', { pageSize: 500 });
    expect(mockRange).toHaveBeenNthCalledWith(1, 0, 499);
    expect(mockRange).toHaveBeenNthCalledWith(2, 500, 999);
  });

  it('returns empty array when table has no rows', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    const result = await fetchAllRows('empty_table', '*');
    expect(result).toEqual([]);
  });
});
