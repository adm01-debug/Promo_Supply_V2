import { useMemo, useCallback } from 'react';
import { useRecentlyViewed } from './useRecentlyViewed';

interface SmartDefaultsOptions {
  useRecent?: boolean;
  useMostCommon?: boolean;
  maxHistory?: number;
}

interface FieldHistory {
  value: string;
  count: number;
  lastUsed: string;
}

const STORAGE_KEY = 'smart_defaults_history';

/**
 * Hook para fornecer valores padrão inteligentes baseados no histórico do usuário
 * Aprende com as escolhas do usuário e sugere valores mais prováveis
 */
export function useSmartDefaults(options: SmartDefaultsOptions = {}) {
  const { useRecent = true, useMostCommon = true, maxHistory = 50 } = options;

  // Load history from localStorage
  const loadHistory = useCallback((fieldKey: string): FieldHistory[] => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${fieldKey}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load smart defaults history:', error);
    }
    return [];
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((fieldKey: string, history: FieldHistory[]) => {
    try {
      // Keep only maxHistory items, sorted by last used
      const trimmed = history
        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
        .slice(0, maxHistory);
      localStorage.setItem(`${STORAGE_KEY}_${fieldKey}`, JSON.stringify(trimmed));
    } catch (error) {
      console.warn('Failed to save smart defaults history:', error);
    }
  }, [maxHistory]);

  // Record a value selection
  const recordSelection = useCallback((fieldKey: string, value: string) => {
    const history = loadHistory(fieldKey);
    const existing = history.find(h => h.value === value);
    
    if (existing) {
      existing.count++;
      existing.lastUsed = new Date().toISOString();
    } else {
      history.push({
        value,
        count: 1,
        lastUsed: new Date().toISOString(),
      });
    }
    
    saveHistory(fieldKey, history);
  }, [loadHistory, saveHistory]);

  // Get smart default for a field
  const getSmartDefault = useCallback((
    fieldKey: string, 
    fallbackDefault?: string
  ): string | undefined => {
    const history = loadHistory(fieldKey);
    
    if (history.length === 0) {
      return fallbackDefault;
    }

    if (useRecent) {
      // Return most recently used value
      const sortedByRecent = [...history].sort(
        (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      );
      return sortedByRecent[0]?.value;
    }

    if (useMostCommon) {
      // Return most commonly used value
      const sortedByCount = [...history].sort((a, b) => b.count - a.count);
      return sortedByCount[0]?.value;
    }

    return fallbackDefault;
  }, [loadHistory, useRecent, useMostCommon]);

  // Get suggestions for a field (top N most likely values)
  const getSuggestions = useCallback((
    fieldKey: string, 
    maxSuggestions = 5
  ): string[] => {
    const history = loadHistory(fieldKey);
    
    // Score by combining recency and frequency
    const scored = history.map(h => {
      const recencyScore = 1 / (1 + Math.log(1 + (Date.now() - new Date(h.lastUsed).getTime()) / (1000 * 60 * 60 * 24)));
      const frequencyScore = Math.log(1 + h.count);
      return {
        value: h.value,
        score: recencyScore * 0.4 + frequencyScore * 0.6,
      };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map(s => s.value);
  }, [loadHistory]);

  // Clear history for a specific field
  const clearFieldHistory = useCallback((fieldKey: string) => {
    localStorage.removeItem(`${STORAGE_KEY}_${fieldKey}`);
  }, []);

  // Clear all smart defaults history
  const clearAllHistory = useCallback(() => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }, []);

  return {
    recordSelection,
    getSmartDefault,
    getSuggestions,
    clearFieldHistory,
    clearAllHistory,
  };
}

/**
 * Hook específico para formulários com suporte a smart defaults
 */
export function useSmartFormDefaults<T extends Record<string, string>>(
  formId: string,
  fieldKeys: (keyof T)[]
) {
  const { getSmartDefault, recordSelection, getSuggestions } = useSmartDefaults();

  // Get smart defaults for all fields
  const defaults = useMemo(() => {
    const result: Partial<T> = {};
    fieldKeys.forEach(key => {
      const smartDefault = getSmartDefault(`${formId}_${String(key)}`);
      if (smartDefault) {
        result[key] = smartDefault as T[keyof T];
      }
    });
    return result;
  }, [formId, fieldKeys, getSmartDefault]);

  // Record selection for a field
  const recordFieldSelection = useCallback((field: keyof T, value: string) => {
    recordSelection(`${formId}_${String(field)}`, value);
  }, [formId, recordSelection]);

  // Get suggestions for a field
  const getFieldSuggestions = useCallback((field: keyof T, maxSuggestions = 5) => {
    return getSuggestions(`${formId}_${String(field)}`, maxSuggestions);
  }, [formId, getSuggestions]);

  return {
    defaults,
    recordFieldSelection,
    getFieldSuggestions,
  };
}

// Preset field configurations
export const smartDefaultFields = {
  solicitacao: ['departamento', 'centro_custo', 'prioridade', 'tipo'],
  pedido: ['condicao_pagamento', 'endereco_entrega'],
  fornecedor: ['segmento', 'tipo', 'estado'],
  pagamento: ['forma_pagamento'],
} as const;
