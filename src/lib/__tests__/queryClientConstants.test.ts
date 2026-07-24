import { describe, it, expect, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn().mockImplementation(() => ({})),
  keepPreviousData: undefined,
}));
vi.mock('@tanstack/query-sync-storage-persister', () => ({
  createSyncStoragePersister: vi.fn().mockReturnValue({}),
}));

import {
  DEFAULT_STALE_TIME,
  REFERENCE_STALE_TIME,
  STATIC_STALE_TIME,
  DEFAULT_GC_TIME,
} from '../query-client';

// ─── Stale time constants ─────────────────────────────────────────────────────

describe('DEFAULT_STALE_TIME', () => {
  it('is 30 seconds in milliseconds', () => {
    expect(DEFAULT_STALE_TIME).toBe(30_000);
  });

  it('is a positive number', () => {
    expect(DEFAULT_STALE_TIME).toBeGreaterThan(0);
  });
});

describe('REFERENCE_STALE_TIME', () => {
  it('is 5 minutes in milliseconds', () => {
    expect(REFERENCE_STALE_TIME).toBe(5 * 60_000);
  });

  it('is greater than DEFAULT_STALE_TIME', () => {
    expect(REFERENCE_STALE_TIME).toBeGreaterThan(DEFAULT_STALE_TIME);
  });

  it('equals 300000ms', () => {
    expect(REFERENCE_STALE_TIME).toBe(300_000);
  });
});

describe('STATIC_STALE_TIME', () => {
  it('is 30 minutes in milliseconds', () => {
    expect(STATIC_STALE_TIME).toBe(30 * 60_000);
  });

  it('is greater than REFERENCE_STALE_TIME', () => {
    expect(STATIC_STALE_TIME).toBeGreaterThan(REFERENCE_STALE_TIME);
  });

  it('equals 1800000ms', () => {
    expect(STATIC_STALE_TIME).toBe(1_800_000);
  });
});

describe('DEFAULT_GC_TIME', () => {
  it('is 10 minutes in milliseconds', () => {
    expect(DEFAULT_GC_TIME).toBe(10 * 60_000);
  });

  it('is greater than DEFAULT_STALE_TIME', () => {
    expect(DEFAULT_GC_TIME).toBeGreaterThan(DEFAULT_STALE_TIME);
  });

  it('equals 600000ms', () => {
    expect(DEFAULT_GC_TIME).toBe(600_000);
  });
});

describe('stale time hierarchy', () => {
  it('DEFAULT_STALE_TIME < REFERENCE_STALE_TIME < STATIC_STALE_TIME', () => {
    expect(DEFAULT_STALE_TIME).toBeLessThan(REFERENCE_STALE_TIME);
    expect(REFERENCE_STALE_TIME).toBeLessThan(STATIC_STALE_TIME);
  });

  it('STATIC_STALE_TIME is 60x DEFAULT_STALE_TIME', () => {
    expect(STATIC_STALE_TIME / DEFAULT_STALE_TIME).toBe(60);
  });

  it('REFERENCE_STALE_TIME is 10x DEFAULT_STALE_TIME', () => {
    expect(REFERENCE_STALE_TIME / DEFAULT_STALE_TIME).toBe(10);
  });
});
