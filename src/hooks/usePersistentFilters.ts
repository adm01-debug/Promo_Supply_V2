import { useState, useEffect, useCallback } from 'react';

type FilterValue = string | number | boolean | null | undefined | string[] | number[];

interface PersistentFiltersOptions<T extends Record<string, FilterValue>> {
  key: string;
  defaultValues: T;
  storage?: 'localStorage' | 'sessionStorage';
  debounceMs?: number;
}

interface PersistentFiltersReturn<T extends Record<string, FilterValue>> {
  filters: T;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setFilters: (newFilters: Partial<T>) => void;
  resetFilters: () => void;
  resetFilter: <K extends keyof T>(key: K) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  getFilterSnapshot: () => T;
  restoreFilters: (snapshot: T) => void;
}

/**
 * Hook para persistir filtros entre sessões
 * Salva automaticamente no localStorage/sessionStorage
 */
export function usePersistentFilters<T extends Record<string, FilterValue>>(
  options: PersistentFiltersOptions<T>
): PersistentFiltersReturn<T> {
  const { key, defaultValues, storage = 'localStorage', debounceMs = 500 } = options;
  
  const storageKey = `filters_${key}`;
  const storageApi = storage === 'localStorage' ? localStorage : sessionStorage;

  // Initialize state from storage or defaults
  const [filters, setFiltersState] = useState<T>(() => {
    try {
      const stored = storageApi.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new filter keys
        return { ...defaultValues, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load filters from storage:', error);
    }
    return defaultValues;
  });

  // Debounced save to storage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        storageApi.setItem(storageKey, JSON.stringify(filters));
      } catch (error) {
        console.warn('Failed to save filters to storage:', error);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [filters, storageKey, debounceMs, storageApi]);

  // Set a single filter
  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  }, []);

  // Set multiple filters at once
  const setFilters = useCallback((newFilters: Partial<T>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset all filters to defaults
  const resetFilters = useCallback(() => {
    setFiltersState(defaultValues);
    storageApi.removeItem(storageKey);
  }, [defaultValues, storageKey, storageApi]);

  // Reset a single filter to default
  const resetFilter = useCallback(<K extends keyof T>(key: K) => {
    setFiltersState(prev => ({ ...prev, [key]: defaultValues[key] }));
  }, [defaultValues]);

  // Clear all filters (set to empty/null values)
  const clearAllFilters = useCallback(() => {
    const cleared = Object.keys(defaultValues).reduce((acc, key) => {
      const defaultValue = defaultValues[key as keyof T];
      if (Array.isArray(defaultValue)) {
        return { ...acc, [key]: [] };
      }
      if (typeof defaultValue === 'string') {
        return { ...acc, [key]: '' };
      }
      if (typeof defaultValue === 'number') {
        return { ...acc, [key]: 0 };
      }
      if (typeof defaultValue === 'boolean') {
        return { ...acc, [key]: false };
      }
      return { ...acc, [key]: null };
    }, {} as T);
    setFiltersState(cleared);
  }, [defaultValues]);

  // Calculate active filters
  const { hasActiveFilters, activeFilterCount } = (() => {
    let count = 0;
    for (const key of Object.keys(filters)) {
      const currentValue = filters[key as keyof T];
      const defaultValue = defaultValues[key as keyof T];
      
      if (Array.isArray(currentValue)) {
        if (currentValue.length > 0) count++;
      } else if (currentValue !== defaultValue && currentValue !== null && currentValue !== '' && currentValue !== undefined) {
        count++;
      }
    }
    return { hasActiveFilters: count > 0, activeFilterCount: count };
  })();

  // Get current filter snapshot for saving
  const getFilterSnapshot = useCallback(() => {
    return { ...filters };
  }, [filters]);

  // Restore filters from a snapshot
  const restoreFilters = useCallback((snapshot: T) => {
    setFiltersState(snapshot);
  }, []);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    resetFilter,
    clearAllFilters,
    hasActiveFilters,
    activeFilterCount,
    getFilterSnapshot,
    restoreFilters,
  };
}

// Preset filter configurations for common use cases
export const createFilterPresets = <T extends Record<string, FilterValue>>(
  defaultValues: T
) => ({
  solicitacoes: {
    key: 'solicitacoes',
    defaultValues: {
      ...defaultValues,
      status: '',
      prioridade: '',
      departamento: '',
      dateRange: null,
    } as T,
  },
  pedidos: {
    key: 'pedidos',
    defaultValues: {
      ...defaultValues,
      status: '',
      fornecedor: '',
      dateRange: null,
    } as T,
  },
  fornecedores: {
    key: 'fornecedores',
    defaultValues: {
      ...defaultValues,
      status: '',
      segmento: '',
      avaliacao: 0,
    } as T,
  },
  pagamentos: {
    key: 'pagamentos',
    defaultValues: {
      ...defaultValues,
      status: '',
      fornecedor: '',
      vencimento: '',
    } as T,
  },
});
