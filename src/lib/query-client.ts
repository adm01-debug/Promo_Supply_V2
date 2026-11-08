import { QueryClient, keepPreviousData } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/** Transactional data (orders, quotes, payments) — refresh often */
export const DEFAULT_STALE_TIME = 30_000;

/** Reference data (suppliers, categories, cost centers) — rarely changes */
export const REFERENCE_STALE_TIME = 5 * 60_000;

/** Static config (org settings, feature flags) — almost never changes */
export const STATIC_STALE_TIME = 30 * 60_000;

/** Inactive queries are garbage-collected after this period */
export const DEFAULT_GC_TIME = 10 * 60_000;

/**
 * React Query Client instance with global defaults.
 *
 * `placeholderData: keepPreviousData` makes paginated / filtered queries
 * keep showing the previous result while the new one is fetched, eliminating
 * the blank-flash that hurts perceived navigation fluidity.
 *
 * `networkMode: 'offlineFirst'` lets the PWA serve cached data without
 * throwing a network error when offline — the service worker has the data.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME,
      gcTime: DEFAULT_GC_TIME,
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      placeholderData: keepPreviousData,
    },
  },
});


/**
 * Persister for React Query to sync cache with localStorage.
 * Used for offline support and faster subsequent loads.
 */
export const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'PROMO_SUPPLY_CACHE',
});
