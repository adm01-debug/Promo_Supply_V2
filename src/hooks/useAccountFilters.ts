import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type FiltersRecord = Record<string, unknown>;

interface UseAccountFiltersResult<T extends FiltersRecord> {
  /** Current filter values (already merged with defaults) */
  filters: T;
  /** Whether the initial load (from DB or localStorage) has completed */
  loading: boolean;
  /** Whether a logged-in user is driving DB persistence */
  isAuthenticated: boolean;
  /** Replace all filters at once */
  setFilters: (next: T) => void;
  /** Patch a subset of filters */
  patchFilters: (patch: Partial<T>) => void;
  /** Reset to defaults AND delete from DB / localStorage. Returns the keys removed from localStorage. */
  clearFilters: () => Promise<string[]>;
  /** Restore a previous snapshot 1:1 (used by Undo) */
  restoreFilters: (snapshot: T) => void;
  /** Returns the localStorage key used as a fallback */
  legacyStorageKey: string;
}

const DEBOUNCE_MS = 800;

/**
 * Persists a screen's filters per user in `user_filter_preferences`,
 * with one-shot migration from any legacy `filters_<scope>` localStorage key.
 *
 * If the user is not authenticated, falls back to localStorage so anonymous
 * routes still get a smooth experience.
 */
export function useAccountFilters<T extends FiltersRecord>(
  scope: string,
  defaults: T,
): UseAccountFiltersResult<T> {
  const legacyStorageKey = `filters_${scope}`;
  const [filters, setFiltersState] = useState<T>(defaults);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const isAuthenticated = userId !== null;
  const initializedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSaveRef = useRef(true); // Skip the very first save (right after hydration)

  // Load auth + initial filters
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);

      if (uid) {
        // Try DB first
        const { data: row, error } = await supabase
          .from('user_filter_preferences')
          .select('filters')
          .eq('user_id', uid)
          .eq('scope', scope)
          .maybeSingle();

        if (cancelled) return;

        if (!error && row?.filters && typeof row.filters === 'object') {
          setFiltersState({ ...defaults, ...(row.filters as FiltersRecord) } as T);
          // DB wins — but still purge any orphan legacy key from this device
          try {
            if (localStorage.getItem(legacyStorageKey) !== null) {
              localStorage.removeItem(legacyStorageKey);
            }
          } catch {
            /* ignore */
          }
        } else {
          // Try one-shot migration from localStorage
          const legacy = readLegacy<T>(legacyStorageKey);
          if (legacy) {
            const merged = { ...defaults, ...legacy } as T;
            setFiltersState(merged);
            // Upsert into DB and remove legacy key
            await supabase.from('user_filter_preferences' as any).upsert(
              [{ user_id: uid, scope, filters: merged as unknown as any }],
              { onConflict: 'user_id,scope' },
            );
            try {
              localStorage.removeItem(legacyStorageKey);
            } catch {
              /* ignore */
            }
            // Skip the autosave that the setFiltersState above would trigger,
            // so the just-removed legacy key isn't rewritten by the anonymous
            // fallback branch of persist() before userId propagates.
            skipNextSaveRef.current = true;
          }
        }
      } else {
        // Anonymous fallback
        const legacy = readLegacy<T>(legacyStorageKey);
        if (legacy) setFiltersState({ ...defaults, ...legacy } as T);
      }

      initializedRef.current = true;
      setLoading(false);
    };

    init();

    // Listen to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, legacyStorageKey]);

  // Debounced persistence
  useEffect(() => {
    if (!initializedRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persist(userId, scope, filters, legacyStorageKey);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, userId, scope, legacyStorageKey]);

  const setFilters = useCallback((next: T) => {
    setFiltersState(next);
  }, []);

  const patchFilters = useCallback((patch: Partial<T>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const restoreFilters = useCallback((snapshot: T) => {
    setFiltersState(snapshot);
  }, []);

  const clearFilters = useCallback(async (): Promise<string[]> => {
    const removedKeys: string[] = [];

    setFiltersState(defaults);

    // Delete from DB
    if (userId) {
      await supabase
        .from('user_filter_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('scope', scope);
    }

    // Remove legacy/anonymous key if present
    try {
      if (localStorage.getItem(legacyStorageKey) !== null) {
        localStorage.removeItem(legacyStorageKey);
        removedKeys.push(legacyStorageKey);
      }
    } catch {
      /* ignore */
    }

    // Skip the autosave that this state change would otherwise trigger
    skipNextSaveRef.current = true;

    return removedKeys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, scope, legacyStorageKey, JSON.stringify(defaults)]);

  return {
    filters,
    loading,
    isAuthenticated,
    setFilters,
    patchFilters,
    clearFilters,
    restoreFilters,
    legacyStorageKey,
  };
}

// --- helpers ---

function readLegacy<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function persist<T extends FiltersRecord>(
  userId: string | null,
  scope: string,
  filters: T,
  legacyKey: string,
): Promise<void> {
  if (userId) {
    await supabase.from('user_filter_preferences').upsert(
      [{ user_id: userId, scope, filters: filters as unknown as never }],
      { onConflict: 'user_id,scope' },
    );
  } else {
    try {
      localStorage.setItem(legacyKey, JSON.stringify(filters));
    } catch {
      /* ignore quota errors */
    }
  }
}
