import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// PERF-06 (etapa 219): sem debounce, cada tecla criava uma chave nova de consulta
// e uma requisicao nova ao cache local da SPOT.
const espiao = vi.hoisted(() => ({ buscas: [] as string[] }));

vi.mock('../useSpotCatalog', () => ({
  SPOT_CATALOG_PAGE_SIZE: 60,
  useSpotProducts: (filters: { search: string }) => {
    espiao.buscas.push(filters.search);
    return { data: [], isLoading: false };
  },
  useSpotSkus: () => ({ data: [] }),
  useSpotStock: () => ({ data: [] }),
}));

import { SpotCatalogTab } from '../SpotCatalogTab';

describe('SpotCatalogTab / espera antes de buscar (PERF-06)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    espiao.buscas.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('digitar seis letras gera uma unica busca efetiva', () => {
    render(<SpotCatalogTab onAddToCart={() => {}} />);
    const input = screen.getByRole('textbox');

    for (const parcial of ['c', 'ca', 'can', 'cane', 'canet', 'caneta']) {
      fireEvent.change(input, { target: { value: parcial } });
    }

    expect([...new Set(espiao.buscas)]).toEqual(['']);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect([...new Set(espiao.buscas)]).toEqual(['', 'caneta']);
  });

  it('digitar e apagar tudo nao chega a buscar o termo intermediario', () => {
    render(<SpotCatalogTab onAddToCart={() => {}} />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'bolsa' } });
    fireEvent.change(input, { target: { value: '' } });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect([...new Set(espiao.buscas)]).toEqual(['']);
  });
});
