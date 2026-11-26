import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// INT-11 (etapa 183): a tela exibia a quantidade do cache local como se fosse
// verdade corrente. O carimbo `synced_at` do lote agora aparece na tela e a
// defasagem vira aviso explicito.
const estado = vi.hoisted(() => ({ estoque: [] as Array<Record<string, unknown>> }));

vi.mock('../useSpotCatalog', () => ({
  SPOT_CATALOG_PAGE_SIZE: 60,
  useSpotProducts: () => ({
    data: [
      {
        reference: '81198',
        name: 'Caneta executiva',
        category_name: 'Canetas',
        brand: 'SPOT',
        main_image_url: null,
        catalogs: [],
        type_code_legacy: null,
        type_code_new: null,
        country_of_origin: null,
        synced_at: '2026-11-26T06:00:00.000Z',
      },
    ],
    isLoading: false,
  }),
  useSpotSkus: () => ({ data: [] }),
  useSpotStock: () => ({ data: estado.estoque }),
}));

import { SpotCatalogTab } from '../SpotCatalogTab';

const linhaDeEstoque = (syncedAt: string) => ({
  sku: '81198-AZUL',
  product_reference: '81198',
  quantity: 120,
  incoming_date: null,
  synced_at: syncedAt,
});

describe('SpotCatalogTab / idade do estoque (INT-11)', () => {
  beforeEach(() => {
    estado.estoque = [];
  });

  it('estoque recem-sincronizado mostra a data e nao avisa de defasagem', () => {
    estado.estoque = [linhaDeEstoque(new Date().toISOString())];

    render(<SpotCatalogTab onAddToCart={() => {}} />);

    const faixa = screen.getByTestId('spot-stock-freshness');
    expect(faixa.textContent).toContain('Estoque sincronizado em');
    expect(faixa.textContent).not.toContain('podem estar desatualizadas');
    expect(faixa.getAttribute('role')).toBeNull();
  });

  it('estoque parado ha mais de 45 min avisa que as quantidades podem estar velhas', () => {
    const tresHorasAtras = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    estado.estoque = [linhaDeEstoque(tresHorasAtras)];

    render(<SpotCatalogTab onAddToCart={() => {}} />);

    const faixa = screen.getByTestId('spot-stock-freshness');
    expect(faixa.textContent).toContain('Estoque defasado');
    expect(faixa.textContent).toContain('podem estar desatualizadas');
    expect(faixa.getAttribute('role')).toBe('status');
  });

  it('sem estoque em cache nao inventa data nem aviso', () => {
    render(<SpotCatalogTab onAddToCart={() => {}} />);

    expect(screen.queryByTestId('spot-stock-freshness')).toBeNull();
  });
});