import { useMemo, useCallback, createElement } from 'react';
import Fuse, { IFuseOptions, FuseResult } from 'fuse.js';

// Types for search results
export interface FuseSearchItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  type: string;
  keywords?: string[];
   
  [key: string]: any;
}

export interface FuseSearchResult<T> {
  item: T;
  score: number;
  matches?: {
    key: string;
    value: string;
    indices: [number, number][];
  }[];
}

// Default Fuse.js options optimized for Brazilian Portuguese
const defaultFuseOptions: IFuseOptions<any> = {
  // Search configuration
  isCaseSensitive: false,
  includeScore: true,
  includeMatches: true,
  shouldSort: true,
  
  // Fuzzy matching settings
  threshold: 0.4, // 0.0 = exact match, 1.0 = match anything
  location: 0, // Where to start searching in the string
  distance: 100, // How far to search from the location
  minMatchCharLength: 2, // Minimum character length to match
  
  // Field boosting - higher weight = more important
  keys: [
    { name: 'title', weight: 2.0 },
    { name: 'subtitle', weight: 1.5 },
    { name: 'description', weight: 1.0 },
    { name: 'keywords', weight: 1.8 },
    { name: 'numero', weight: 2.0 },
    { name: 'cnpj', weight: 1.5 },
  ],
  
  // Use extended search for advanced queries
  useExtendedSearch: true,
  
  // Ignore field length normalization for more consistent scoring
  ignoreFieldNorm: false,
  fieldNormWeight: 1,
};

// Brazilian Portuguese accent normalization
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, ' ') // Replace special chars with space
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim();
};

// Create a normalized version of items for better Portuguese search
const createNormalizedItems = <T extends FuseSearchItem>(items: T[]): (T & { _normalized: Record<string, string> })[] => {
  return items.map(item => ({
    ...item,
    _normalized: {
      title: normalizeText(item.title || ''),
      subtitle: normalizeText(item.subtitle || ''),
      description: normalizeText(item.description || ''),
      keywords: (item.keywords || []).map(normalizeText).join(' '),
    },
  }));
};

// Hook for creating a Fuse instance
export function useFuseSearch<T extends FuseSearchItem>(
  items: T[],
  options?: Partial<IFuseOptions<T>>,
  enableNormalization = true
) {
  // Create normalized items for Portuguese search
  const processedItems = useMemo(() => {
    if (enableNormalization) {
      return createNormalizedItems(items);
    }
    return items;
  }, [items, enableNormalization]);

  // Merge options with defaults
  const fuseOptions = useMemo(() => {
    const keys = options?.keys || defaultFuseOptions.keys;
    
    // Add normalized keys if normalization is enabled
    const enhancedKeys = enableNormalization
      ? [
          ...keys!,
          { name: '_normalized.title', weight: 1.8 },
          { name: '_normalized.subtitle', weight: 1.3 },
          { name: '_normalized.description', weight: 0.8 },
          { name: '_normalized.keywords', weight: 1.5 },
        ]
      : keys;

    return {
      ...defaultFuseOptions,
      ...options,
      keys: enhancedKeys,
    } as IFuseOptions<T>;
  }, [options, enableNormalization]);

  // Create Fuse instance
  const fuse = useMemo(() => {
    return new Fuse(processedItems, fuseOptions);
  }, [processedItems, fuseOptions]);

  // Search function
  const search = useCallback((
    query: string,
    limit = 20
  ): FuseSearchResult<T>[] => {
    if (!query.trim()) {
      return [];
    }

    // Normalize query for Portuguese
    const normalizedQuery = enableNormalization ? normalizeText(query) : query;
    
    // Perform search with both original and normalized query
    const results = fuse.search(query, { limit });
    
    // If normalization is enabled, also search with normalized query
    let normalizedResults: FuseResult<T>[] = [];
    if (enableNormalization && normalizedQuery !== query.toLowerCase()) {
      normalizedResults = fuse.search(normalizedQuery, { limit });
    }

    // Merge and deduplicate results
    const seenIds = new Set<string>();
    const mergedResults: FuseSearchResult<T>[] = [];

    const processResult = (result: FuseResult<T>) => {
      const item = result.item as T;
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        mergedResults.push({
          item,
          score: 1 - (result.score || 0), // Convert to 0-1 where 1 is best
          matches: result.matches?.map(m => ({
            key: m.key || '',
            value: m.value || '',
            indices: m.indices as [number, number][],
          })),
        });
      }
    };

    results.forEach(processResult);
    normalizedResults.forEach(processResult);

    // Sort by score (highest first)
    return mergedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }, [fuse, enableNormalization]);

  // Highlight matched text - returns array of strings and highlight info
  const getHighlightRanges = useCallback((
    text: string,
    matches?: { key: string; value: string; indices: [number, number][] }[],
    targetKey?: string
  ): { text: string; highlighted: boolean }[] => {
    if (!matches || !text) {
      return [{ text, highlighted: false }];
    }

    const relevantMatch = matches.find(m => 
      m.key === targetKey || 
      m.value.toLowerCase() === text.toLowerCase()
    );

    if (!relevantMatch) {
      return [{ text, highlighted: false }];
    }

    const result: { text: string; highlighted: boolean }[] = [];
    let lastIndex = 0;

    // Sort indices by start position
    const sortedIndices = [...relevantMatch.indices].sort((a, b) => a[0] - b[0]);

    sortedIndices.forEach(([start, end]) => {
      // Add non-matched text before this match
      if (start > lastIndex) {
        result.push({ text: text.slice(lastIndex, start), highlighted: false });
      }
      // Add matched text with highlight
      result.push({ text: text.slice(start, end + 1), highlighted: true });
      lastIndex = end + 1;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      result.push({ text: text.slice(lastIndex), highlighted: false });
    }

    return result;
  }, []);

  return {
    fuse,
    search,
    getHighlightRanges,
    itemCount: items.length,
  };
}

// Hook for multi-collection search
export function useMultiCollectionSearch<T extends FuseSearchItem>(
  collections: { name: string; items: T[]; weight?: number }[],
  options?: Partial<IFuseOptions<T>>
) {
  // Create Fuse instances for each collection
  const fuseInstances = useMemo(() => {
    return collections.map(collection => ({
      name: collection.name,
      weight: collection.weight || 1,
      fuse: new Fuse(createNormalizedItems(collection.items), {
        ...defaultFuseOptions,
        ...options,
      } as IFuseOptions<T>),
    }));
  }, [collections, options]);

  // Multi-collection search
  const searchAll = useCallback((
    query: string,
    limit = 20
  ): { collection: string; results: FuseSearchResult<T>[] }[] => {
    if (!query.trim()) {
      return [];
    }

    const normalizedQuery = normalizeText(query);

    return fuseInstances.map(({ name, weight, fuse }) => {
      const results = fuse.search(query, { limit });
      const normalizedResults = fuse.search(normalizedQuery, { limit });

      // Merge results
      const seenIds = new Set<string>();
      const mergedResults: FuseSearchResult<T>[] = [];

      [...results, ...normalizedResults].forEach(result => {
        const item = result.item as T;
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          mergedResults.push({
            item,
            score: (1 - (result.score || 0)) * weight,
            matches: result.matches?.map(m => ({
              key: m.key || '',
              value: m.value || '',
              indices: m.indices as [number, number][],
            })),
          });
        }
      });

      return {
        collection: name,
        results: mergedResults.sort((a, b) => b.score - a.score).slice(0, limit),
      };
    });
  }, [fuseInstances]);

  // Flat search across all collections
  const searchFlat = useCallback((
    query: string,
    limit = 20
  ): (FuseSearchResult<T> & { collection: string })[] => {
    const allResults = searchAll(query, limit * 2);
    
    const flatResults = allResults.flatMap(({ collection, results }) =>
      results.map(result => ({ ...result, collection }))
    );

    return flatResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }, [searchAll]);

  return {
    searchAll,
    searchFlat,
  };
}

// Utility for creating search index from Supabase data
export function createSearchIndex<T extends Record<string, any>>(
  data: T[],
  config: {
    idField: string;
    titleField: string;
    subtitleField?: string;
    descriptionField?: string;
    typeValue: string;
    keywordFields?: string[];
  }
): FuseSearchItem[] {
  return data.map(item => ({
    id: String(item[config.idField]),
    title: String(item[config.titleField] || ''),
    subtitle: config.subtitleField ? String(item[config.subtitleField] || '') : undefined,
    description: config.descriptionField ? String(item[config.descriptionField] || '') : undefined,
    type: config.typeValue,
    keywords: config.keywordFields?.map(field => String(item[field] || '')).filter(Boolean),
    _original: item,
  }));
}

// Component helper for highlighting text
export function HighlightedText({ 
  ranges 
}: { 
  ranges: { text: string; highlighted: boolean }[] 
}) {
  return createElement(
    'span',
    null,
    ranges.map((range, i) =>
      range.highlighted
        ? createElement('mark', {
            key: i,
            className: 'bg-primary/20 text-primary font-medium rounded-sm px-0.5',
          }, range.text)
        : range.text
    )
  );
}

export default useFuseSearch;
