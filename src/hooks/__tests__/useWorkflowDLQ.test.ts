import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkflowDLQ } from '@/hooks/useWorkflowDLQ';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('useWorkflowDLQ', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('starts with empty queue', () => {
    const { result } = renderHook(() => useWorkflowDLQ());
    expect(result.current.dlqEntries).toHaveLength(0);
  });

  it('pushToDLQ adds entry and persists to localStorage', () => {
    const { result } = renderHook(() => useWorkflowDLQ());

    act(() => {
      result.current.pushToDLQ('approve_step', { stepId: 'abc', userId: 'u1' }, 'network error');
    });

    expect(result.current.dlqEntries).toHaveLength(1);
    const entry = result.current.dlqEntries[0];
    expect(entry.type).toBe('approve_step');
    expect(entry.payload.stepId).toBe('abc');
    expect(entry.lastError).toBe('network error');
    expect(entry.retryCount).toBe(0);

    // Verify persistence
    const stored = JSON.parse(localStorageMock.getItem('workflow_dead_letter_queue')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].type).toBe('approve_step');
  });

  it('hydrates from localStorage on mount', () => {
    localStorageMock.setItem('workflow_dead_letter_queue', JSON.stringify([{
      id: 'wdlq_test', type: 'create_workflow', payload: {}, failedAt: Date.now(),
      retryCount: 0, lastError: 'timeout', nextRetryAt: Date.now() - 1000,
    }]));

    const { result } = renderHook(() => useWorkflowDLQ());
    expect(result.current.dlqEntries).toHaveLength(1);
    expect(result.current.dlqEntries[0].id).toBe('wdlq_test');
  });

  it('retryEntry removes entry on success', async () => {
    const { result } = renderHook(() => useWorkflowDLQ());

    act(() => {
      result.current.pushToDLQ('reject_step', { stepId: 'xyz' }, 'db error');
    });

    const entryId = result.current.dlqEntries[0].id;
    let success = false;
    await act(async () => {
      success = await result.current.retryEntry(entryId, async () => true);
    });

    expect(success).toBe(true);
    expect(result.current.dlqEntries).toHaveLength(0);
  });

  it('retryEntry increments retryCount on failure', async () => {
    const { result } = renderHook(() => useWorkflowDLQ());

    act(() => {
      result.current.pushToDLQ('approve_step', {}, 'err');
    });

    const entryId = result.current.dlqEntries[0].id;
    await act(async () => {
      await result.current.retryEntry(entryId, async () => false);
    });

    expect(result.current.dlqEntries[0].retryCount).toBe(1);
  });

  it('retryEntry blocks after MAX_RETRIES (3)', async () => {
    const { result } = renderHook(() => useWorkflowDLQ());
    act(() => { result.current.pushToDLQ('escalate', {}, 'err'); });
    const entryId = result.current.dlqEntries[0].id;

    // Exhaust retries
    for (let i = 0; i < 3; i++) {
      await act(async () => { await result.current.retryEntry(entryId, async () => false); });
    }

    // 4th attempt should return false immediately (exceeded)
    let blocked = false;
    await act(async () => {
      blocked = !(await result.current.retryEntry(entryId, async () => true));
    });
    expect(blocked).toBe(true);
    expect(result.current.dlqEntries[0].retryCount).toBe(3);
  });

  it('removeEntry deletes specific entry', () => {
    const { result } = renderHook(() => useWorkflowDLQ());
    act(() => {
      result.current.pushToDLQ('approve_step', {}, 'e1');
      result.current.pushToDLQ('reject_step', {}, 'e2');
    });

    const first = result.current.dlqEntries[0].id;
    act(() => { result.current.removeEntry(first); });

    expect(result.current.dlqEntries).toHaveLength(1);
    expect(result.current.dlqEntries[0].type).toBe('reject_step');
  });

  it('clearDLQ empties queue and localStorage', () => {
    const { result } = renderHook(() => useWorkflowDLQ());
    act(() => {
      result.current.pushToDLQ('approve_step', {}, 'err');
      result.current.pushToDLQ('reject_step', {}, 'err2');
    });

    act(() => { result.current.clearDLQ(); });

    expect(result.current.dlqEntries).toHaveLength(0);
    expect(JSON.parse(localStorageMock.getItem('workflow_dead_letter_queue')!)).toHaveLength(0);
  });

  it('retryableEntries filters by retryCount and nextRetryAt', () => {
    const past = Date.now() - 1000;
    const future = Date.now() + 60_000;

    localStorageMock.setItem('workflow_dead_letter_queue', JSON.stringify([
      { id: 'a', type: 'approve_step', payload: {}, failedAt: past, retryCount: 0, lastError: 'e', nextRetryAt: past },
      { id: 'b', type: 'approve_step', payload: {}, failedAt: past, retryCount: 0, lastError: 'e', nextRetryAt: future },
      { id: 'c', type: 'approve_step', payload: {}, failedAt: past, retryCount: 3, lastError: 'e', nextRetryAt: past },
    ]));

    const { result } = renderHook(() => useWorkflowDLQ());
    // Only 'a' qualifies: retryCount < 3 AND nextRetryAt <= now
    expect(result.current.retryableEntries).toHaveLength(1);
    expect(result.current.retryableEntries[0].id).toBe('a');
  });
});
