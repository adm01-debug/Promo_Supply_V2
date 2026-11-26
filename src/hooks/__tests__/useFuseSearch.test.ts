import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFuseSearch, normalizeText, createSearchIndex } from '@/hooks/useFuseSearch';

const ITEMS = [
  { id: '1', title: 'Caneta Esferográfica Azul', subtitle: 'BIC', type: 'produto', keywords: ['escrita', 'papelaria'] },
  { id: '2', title: 'Caneta Hidrográfica Verde', subtitle: 'Faber-Castell', type: 'produto', keywords: ['escrita', 'arte'] },
  { id: '3', title: 'Borracha Escolar Branca', subtitle: 'Staedtler', type: 'produto', keywords: ['escrita', 'papelaria'] },
  { id: '4', title: 'Lápis Grafite 2B', subtitle: 'Faber-Castell', type: 'produto' },
];

describe('normalizeText', () => {
  it('lowercases and removes accents', () => {
    expect(normalizeText('Canção')).toBe('cancao');
    expect(normalizeText('São Paulo')).toBe('sao paulo');
    expect(normalizeText('AÇÃO')).toBe('acao');
  });

  it('strips special characters', () => {
    expect(normalizeText('Faber-Castell')).toBe('faber castell');
  });

  it('collapses whitespace', () => {
    expect(normalizeText('hello   world')).toBe('hello world');
  });
});

describe('useFuseSearch', () => {
  it('returns empty array for blank query', () => {
    const { result } = renderHook(() => useFuseSearch(ITEMS));
    expect(result.current.search('')).toHaveLength(0);
    expect(result.current.search('   ')).toHaveLength(0);
  });

  it('finds items by title', () => {
    const { result } = renderHook(() => useFuseSearch(ITEMS));
    const results = result.current.search('caneta');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(r => r.item.id === '1' || r.item.id === '2')).toBe(true);
  });

  it('deduplicates results', () => {
    const { result } = renderHook(() => useFuseSearch(ITEMS));
    const results = result.current.search('Faber');
    const ids = results.map(r => r.item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('score is in range [0, 1] and higher is better', () => {
    const { result } = renderHook(() => useFuseSearch(ITEMS));
    const results = result.current.search('caneta azul');
    results.forEach(r => {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    });
    if (results.length > 1) {
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    }
  });

  it('respects limit parameter', () => {
    const { result } = renderHook(() => useFuseSearch(ITEMS));
    const results = result.current.search('caneta', 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it('itemCount reflects input array length', () => {
    const { result } = renderHook(() => useFuseSearch(ITEMS));
    expect(result.current.itemCount).toBe(ITEMS.length);
  });

  it('getHighlightRanges returns full text as non-highlighted when no match', () => {
    const { result } = renderHook(() => useFuseSearch(ITEMS));
    const ranges = result.current.getHighlightRanges('Caneta', undefined);
    expect(ranges).toEqual([{ text: 'Caneta', highlighted: false }]);
  });
});

describe('createSearchIndex', () => {
  it('maps fields correctly', () => {
    const data = [{ pid: 'p1', name: 'Camiseta', brand: 'Nike', desc: 'Algodão', tag: 'roupas' }];
    const index = createSearchIndex(data, {
      idField: 'pid',
      titleField: 'name',
      subtitleField: 'brand',
      descriptionField: 'desc',
      typeValue: 'produto',
      keywordFields: ['tag'],
    });

    expect(index).toHaveLength(1);
    expect(index[0].id).toBe('p1');
    expect(index[0].title).toBe('Camiseta');
    expect(index[0].subtitle).toBe('Nike');
    expect(index[0].description).toBe('Algodão');
    expect(index[0].type).toBe('produto');
    expect(index[0].keywords).toContain('roupas');
  });

  it('handles missing optional fields gracefully', () => {
    const data = [{ id: 'x1', label: 'Produto X' }];
    const index = createSearchIndex(data, {
      idField: 'id',
      titleField: 'label',
      typeValue: 'misc',
    });
    expect(index[0].subtitle).toBeUndefined();
    expect(index[0].description).toBeUndefined();
    expect(index[0].keywords).toBeUndefined();
  });
});
