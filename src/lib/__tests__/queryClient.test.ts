import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STALE_TIME,
  REFERENCE_STALE_TIME,
  STATIC_STALE_TIME,
  DEFAULT_GC_TIME,
  queryClient,
} from '../query-client';

// ─── query-client ─────────────────────────────────────────────────────────────

describe('stale-time constants', () => {
  it('DEFAULT_STALE_TIME is 30 seconds (30_000 ms)', () => {
    expect(DEFAULT_STALE_TIME).toBe(30_000);
  });

  it('REFERENCE_STALE_TIME is 5 minutes (300_000 ms)', () => {
    expect(REFERENCE_STALE_TIME).toBe(5 * 60_000);
    expect(REFERENCE_STALE_TIME).toBe(300_000);
  });

  it('STATIC_STALE_TIME is 30 minutes (1_800_000 ms)', () => {
    expect(STATIC_STALE_TIME).toBe(30 * 60_000);
    expect(STATIC_STALE_TIME).toBe(1_800_000);
  });

  it('DEFAULT_GC_TIME is 10 minutes (600_000 ms)', () => {
    expect(DEFAULT_GC_TIME).toBe(10 * 60_000);
    expect(DEFAULT_GC_TIME).toBe(600_000);
  });

  it('REFERENCE_STALE_TIME is 10x DEFAULT_STALE_TIME', () => {
    expect(REFERENCE_STALE_TIME).toBe(DEFAULT_STALE_TIME * 10);
  });

  it('STATIC_STALE_TIME is 60x DEFAULT_STALE_TIME', () => {
    expect(STATIC_STALE_TIME).toBe(DEFAULT_STALE_TIME * 60);
  });

  it('STATIC_STALE_TIME is longer than REFERENCE_STALE_TIME', () => {
    expect(STATIC_STALE_TIME).toBeGreaterThan(REFERENCE_STALE_TIME);
  });

  it('DEFAULT_GC_TIME is longer than DEFAULT_STALE_TIME', () => {
    expect(DEFAULT_GC_TIME).toBeGreaterThan(DEFAULT_STALE_TIME);
  });
});

describe('queryClient', () => {
  it('is defined', () => {
    expect(queryClient).toBeDefined();
  });

  it('has a getDefaultOptions method', () => {
    expect(typeof queryClient.getDefaultOptions).toBe('function');
  });

  it('default staleTime equals DEFAULT_STALE_TIME', () => {
    const opts = queryClient.getDefaultOptions();
    expect(opts.queries?.staleTime).toBe(DEFAULT_STALE_TIME);
  });

  it('default gcTime equals DEFAULT_GC_TIME', () => {
    const opts = queryClient.getDefaultOptions();
    expect(opts.queries?.gcTime).toBe(DEFAULT_GC_TIME);
  });

  it('networkMode is offlineFirst', () => {
    const opts = queryClient.getDefaultOptions();
    expect(opts.queries?.networkMode).toBe('offlineFirst');
  });

  it('refetchOnWindowFocus is false', () => {
    const opts = queryClient.getDefaultOptions();
    expect(opts.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('refetchOnReconnect is "always"', () => {
    const opts = queryClient.getDefaultOptions();
    expect(opts.queries?.refetchOnReconnect).toBe('always');
  });

  it('retry is 1', () => {
    const opts = queryClient.getDefaultOptions();
    expect(opts.queries?.retry).toBe(1);
  });

  it('retryDelay uses exponential backoff capped at 10000ms', () => {
    const opts = queryClient.getDefaultOptions();
    const retryDelay = opts.queries?.retryDelay as (n: number) => number;
    expect(typeof retryDelay).toBe('function');
    expect(retryDelay(0)).toBe(1000);
    expect(retryDelay(1)).toBe(2000);
    expect(retryDelay(2)).toBe(4000);
    expect(retryDelay(10)).toBe(10000);
  });

  it('retryDelay cap is exactly 10000 regardless of large attempt index', () => {
    const opts = queryClient.getDefaultOptions();
    const retryDelay = opts.queries?.retryDelay as (n: number) => number;
    expect(retryDelay(100)).toBe(10000);
    expect(retryDelay(50)).toBe(10000);
  });

  it('has a getQueryData method (is a real QueryClient)', () => {
    expect(typeof queryClient.getQueryData).toBe('function');
  });

  it('has an invalidateQueries method', () => {
    expect(typeof queryClient.invalidateQueries).toBe('function');
  });
});
