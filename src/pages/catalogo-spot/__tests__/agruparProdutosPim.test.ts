import { describe, expect, it, vi } from 'vitest';

// O hook importa o client do Supabase; o agrupamento e funcao pura e nao usa a rede.
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: vi.fn() } } }));
import { agruparProdutosPim } from '../useSpotCatalog';

// INT-01 (etapas 163-166): o catalogo de Compras deixou de ler o espelho local
// (que ficava nestas tabelas e era reabastecido pelos crons da spot-api) e
// passou a ler a mesma view do PIM que Gerar Ordem e Recompra usam. A view entrega
// UMA LINHA POR VARIANTE; a tela sempre mostrou produto, entao o agrupamento e o
// que preserva o comportamento antigo.
const linha = (over: Record<string, unknown>) => ({
  supplier_code: 'SPOT',
  supplier_reference: 'REF-1',
  sku: 'REF-1-AZUL',
  name: 'Caneca Termica',
  cost_price: 10,
  stock_quantity: 3,
  is_stockout: false,
  color_name: 'Azul',
  color_hex: '#0000FF',
  image_url: 'https://cdn/x.png',
  supplier_name: 'SPOT',
  updated_at: '2026-11-27T10:00:00Z',
  last_stock_update_at: '2026-11-27T09:00:00Z',
  ...over,
});

describe('agruparProdutosPim', () => {
  it('junta as variantes em um produto com o menor preco e o estoque somado', () => {
    const [produto] = agruparProdutosPim([
      linha({ sku: 'REF-1-AZUL', cost_price: 12.5, stock_quantity: 4 }),
      linha({ sku: 'REF-1-VERDE', cost_price: 9.9, stock_quantity: 6, color_name: 'Verde' }),
    ]);

    expect(produto.reference).toBe('REF-1');
    expect(produto.your_price).toBe(9.9);
    expect(produto.em_estoque).toBe(true);
  });

  it('produto sem estoque em nenhuma variante sai como sem estoque', () => {
    const [produto] = agruparProdutosPim([
      linha({ sku: 'A', stock_quantity: 0, is_stockout: true }),
      linha({ sku: 'B', stock_quantity: 0, is_stockout: true }),
    ]);

    expect(produto.em_estoque).toBe(false);
    expect(produto.no_replenishment).toBe(true);
  });

  it('uma variante com estoque basta para o produto estar em estoque', () => {
    const [produto] = agruparProdutosPim([
      linha({ sku: 'A', stock_quantity: 0, is_stockout: true }),
      linha({ sku: 'B', stock_quantity: 2, is_stockout: false }),
    ]);

    expect(produto.em_estoque).toBe(true);
    expect(produto.no_replenishment).toBe(false);
  });

  it('produtos diferentes nao se misturam', () => {
    const produtos = agruparProdutosPim([
      linha({ supplier_reference: 'REF-1' }),
      linha({ supplier_reference: 'REF-2', name: 'Garrafa' }),
    ]);

    expect(produtos.map((p) => p.reference).sort()).toEqual(['REF-1', 'REF-2']);
  });

  it('linha sem referencia nem sku e descartada em vez de virar produto fantasma', () => {
    expect(agruparProdutosPim([linha({ supplier_reference: null, sku: null })])).toEqual([]);
    expect(agruparProdutosPim([linha({ supplier_reference: '  ', sku: '' })])).toEqual([]);
  });

  it('preco e estoque em texto (numeric do PIM) sao lidos como numero', () => {
    const [produto] = agruparProdutosPim([
      linha({ cost_price: '7.35', stock_quantity: '10' }),
    ]);

    expect(produto.your_price).toBe(7.35);
    expect(produto.em_estoque).toBe(true);
  });

  it('sem colecao vinda do PIM o produto continua no recorte SPOT da tela', () => {
    const [produto] = agruparProdutosPim([linha({})]);
    expect(produto.catalogs).toContain('SPOT');
  });
});

