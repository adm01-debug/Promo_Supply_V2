/**
 * FINANCE HUB - Hook para Busca Fulltext
 * 
 * @module hooks/useSearch
 * @description Busca em múltiplas colunas com debounce
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// TIPOS
// ============================================

export interface SearchOptions {
  /** Colunas para buscar */
  columns: string[];
  /** Mínimo de caracteres para iniciar busca */
  minChars?: number;
  /** Tempo de debounce em ms */
  debounceMs?: number;
  /** Limite de resultados */
  limit?: number;
  /** Ordenação */
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
}

interface UseSearchResult<T> {
  results: T[];
  isLoading: boolean;
  error: Error | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  clearSearch: () => void;
  hasResults: boolean;
}

// ============================================
// HOOK DE DEBOUNCE
// ============================================

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useSearch<T extends Record<string, unknown>>(
  tableName: string,
  options: SearchOptions
): UseSearchResult<T> {
  const {
    columns,
    minChars = 2,
    debounceMs = 300,
    limit = 50,
    orderBy,
  } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedTerm = useDebouncedValue(searchTerm, debounceMs);

  const shouldSearch = debouncedTerm.length >= minChars;

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', tableName, debouncedTerm, columns],
    queryFn: async () => {
      if (!shouldSearch) return [];

      // Construir query OR para múltiplas colunas
      const orConditions = columns
        .map((col) => `${col}.ilike.%${debouncedTerm}%`)
        .join(',');

      let query = supabase
        .from(tableName)
        .select('*')
        .or(orConditions)
        .limit(limit);

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as T[];
    },
    enabled: shouldSearch,
    staleTime: 1000 * 60, // 1 minuto
  });

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const results = useMemo(() => data ?? [], [data]);

  return {
    results,
    isLoading: shouldSearch && isLoading,
    error: error as Error | null,
    searchTerm,
    setSearchTerm,
    clearSearch,
    hasResults: results.length > 0,
  };
}

// ============================================
// HOOK PARA BUSCA LOCAL (em memória)
// ============================================

export function useLocalSearch<T extends Record<string, unknown>>(
  data: T[],
  options: Omit<SearchOptions, 'orderBy' | 'limit'>
): UseSearchResult<T> {
  const { columns, minChars = 2, debounceMs = 300 } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedTerm = useDebouncedValue(searchTerm, debounceMs);

  const results = useMemo(() => {
    if (debouncedTerm.length < minChars) return data;

    const lowerTerm = debouncedTerm.toLowerCase();
    
    return data.filter((item) =>
      columns.some((col) => {
        const value = item[col];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowerTerm);
      })
    );
  }, [data, debouncedTerm, columns, minChars]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    results,
    isLoading: false,
    error: null,
    searchTerm,
    setSearchTerm,
    clearSearch,
    hasResults: results.length > 0 && debouncedTerm.length >= minChars,
  };
}

export default useSearch;
