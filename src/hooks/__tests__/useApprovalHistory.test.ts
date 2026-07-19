import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApprovalHistory } from '@/hooks/useApprovalHistory';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}));

function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, () => unknown> = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data, error }),
    // fetchHistory ends with order (no limit)
  };
  chain.order = () => Promise.resolve({ data, error });
  return chain;
}

describe('useApprovalHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchHistory returns sorted history for a workflow', async () => {
    const fakeHistory = [
      { id: 'h1', workflow_id: 'wf1', acao: 'created', created_at: '2024-01-01T00:00:00Z' },
      { id: 'h2', workflow_id: 'wf1', acao: 'approved', created_at: '2024-01-02T00:00:00Z' },
    ];
    mockFrom.mockReturnValue(makeChain(fakeHistory));

    const { result } = renderHook(() => useApprovalHistory());
    let history: unknown[] = [];
    await act(async () => {
      history = await result.current.fetchHistory('wf1');
    });

    expect(history).toHaveLength(2);
    expect((history[0] as { acao: string }).acao).toBe('created');
  });

  it('fetchHistory returns [] on error', async () => {
    mockFrom.mockReturnValue(makeChain(null, new Error('DB error')));

    const { result } = renderHook(() => useApprovalHistory());
    let history: unknown[] = [];
    await act(async () => {
      history = await result.current.fetchHistory('wf-bad');
    });

    expect(history).toHaveLength(0);
  });

  it('fetchAllHistory populates allHistory state', async () => {
    const fakeAll = [
      { id: 'h3', acao: 'rejected', created_at: '2024-01-03T00:00:00Z' },
    ];
    const chain = makeChain(fakeAll);
    // fetchAllHistory uses .order().limit() — patch limit to resolve
    const limitFn = vi.fn(() => Promise.resolve({ data: fakeAll, error: null }));
    (chain as Record<string, unknown>).limit = limitFn;
    // order must return chain (with limit), not resolve directly
    (chain as Record<string, unknown>).order = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useApprovalHistory());
    await act(async () => {
      await result.current.fetchAllHistory();
    });

    expect(result.current.allHistory).toHaveLength(1);
    expect(result.current.allHistory[0].acao).toBe('rejected');
  });

  it('fetchAllHistory keeps allHistory empty on error', async () => {
    const chain = makeChain(null, new Error('fail'));
    const limitFn = vi.fn(() => Promise.resolve({ data: null, error: new Error('fail') }));
    (chain as Record<string, unknown>).limit = limitFn;
    (chain as Record<string, unknown>).order = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useApprovalHistory());
    await act(async () => {
      await result.current.fetchAllHistory();
    });

    expect(result.current.allHistory).toHaveLength(0);
  });
});
