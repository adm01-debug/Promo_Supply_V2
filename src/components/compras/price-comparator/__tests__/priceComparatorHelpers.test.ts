import { describe, it, expect } from 'vitest';
import { generateQuotesFromSuppliers } from '../priceComparatorHelpers';
import type { ComparisonResult } from '../priceComparatorHelpers';

const makeSupplier = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  razao_social: name,
  nome_fantasia: null as string | null,
  prazo_medio_entrega: null as number | null,
  condicoes_pagamento: null as string | null,
  avaliacao: 4 as number | string | null,
  ...extra,
});

const makeLinked = (fornecedor_id: string, preco_custo: number | null, lead_time_estimado: number | null) => ({
  fornecedor_id,
  preco_custo,
  lead_time_estimado,
});

const SUPPLIERS = [
  makeSupplier('s1', 'Alpha'),
  makeSupplier('s2', 'Beta'),
  makeSupplier('s3', 'Gamma'),
];

const LINKED = [
  makeLinked('s1', 100, 10),
  makeLinked('s2', 80, 5),
  makeLinked('s3', 120, 3),
];

const QTY = 10;
const PRODUCT = 'Canetas';

describe('generateQuotesFromSuppliers', () => {
  let result: ComparisonResult;

  const build = () => generateQuotesFromSuppliers(SUPPLIERS, PRODUCT, QTY, LINKED);

  it('passes product name and quantity through', () => {
    result = build();
    expect(result.product).toBe(PRODUCT);
    expect(result.quantity).toBe(QTY);
  });

  it('returns one quote per supplier', () => {
    expect(build().quotes).toHaveLength(SUPPLIERS.length);
  });

  it('quotes are sorted by totalPrice ascending when prices exist', () => {
    const priced = build().quotes.filter(q => q.totalPrice !== null);
    const prices = priced.map(q => q.totalPrice as number);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('marks the cheapest quote as recommended', () => {
    const r = build();
    const cheapest = r.quotes.find(q => q.recommended);
    expect(cheapest?.supplierName).toBe('Beta');
  });

  it('no other quote is recommended', () => {
    build()
      .quotes.slice(1)
      .forEach(q => expect(q.recommended).toBe(false));
  });

  it('bestPrice names the cheapest supplier and priceRange reflects real prices', () => {
    const r = build();
    expect(r.bestPrice).toBe('Beta');
    expect(r.priceRange?.min).toBe(80 * QTY);
    expect(r.priceRange?.max).toBe(120 * QTY);
  });

  it('bestDelivery names the supplier with the smallest known lead time', () => {
    expect(build().bestDelivery).toBe('Gamma');
  });

  it('averagePrice is the mean of the priced quotes only', () => {
    const r = build();
    const expected = Number(((100 * QTY + 80 * QTY + 120 * QTY) / 3).toFixed(2));
    expect(r.averagePrice).toBe(expected);
  });

  it('totalPrice equals unitPrice * quantity', () => {
    const alpha = build().quotes.find(q => q.supplierId === 's1');
    expect(alpha?.unitPrice).toBe(100);
    expect(alpha?.totalPrice).toBe(1000);
    expect(alpha?.priceSource).toBe('contratado');
  });

  it('uses nome_fantasia when available', () => {
    const withFantasia = [{ ...makeSupplier('s9', 'Razao'), nome_fantasia: 'Fantasia' }];
    const r = generateQuotesFromSuppliers(withFantasia, PRODUCT, 1, [makeLinked('s9', 50, 7)]);
    expect(r.quotes[0].supplierName).toBe('Fantasia');
  });

  it('insights describe the real gap, the fastest supplier and the average rating', () => {
    const r = build();
    expect(r.insights).toHaveLength(3);
    expect(r.insights[0]).toContain('Diferenca');
    expect(r.insights[1]).toContain('Gamma');
    expect(r.insights[2]).toContain('estrelas');
  });

  it('returns valid result with a single priced supplier', () => {
    const r = generateQuotesFromSuppliers([makeSupplier('x', 'Solo')], 'Item', 5, [makeLinked('x', 10, 2)]);
    expect(r.quotes).toHaveLength(1);
    expect(r.quotes[0].recommended).toBe(true);
    expect(r.priceRange?.min).toBe(r.priceRange?.max);
  });
});

describe('generateQuotesFromSuppliers sem preco registrado', () => {
  const SUPPLIERS_NO_PRICE = [makeSupplier('n1', 'Sem Preco', { avaliacao: 3.5 })];

  it('never invents a unit price', () => {
    const r = generateQuotesFromSuppliers(SUPPLIERS_NO_PRICE, PRODUCT, QTY, []);
    expect(r.quotes[0].unitPrice).toBeNull();
    expect(r.quotes[0].totalPrice).toBeNull();
    expect(r.quotes[0].priceSource).toBe('ausente');
    expect(r.quotes[0].recommended).toBe(false);
    expect(r.quotes[0].cons).toContain('Sem preco contratado nem cotacao registrada');
  });

  it('leaves the comparison empty instead of fabricating numbers', () => {
    const r = generateQuotesFromSuppliers(SUPPLIERS_NO_PRICE, PRODUCT, QTY, []);
    expect(r.bestPrice).toBeNull();
    expect(r.averagePrice).toBeNull();
    expect(r.priceRange).toBeNull();
    expect(r.coverage).toEqual({ withPrice: 0, withoutPrice: 1 });
    expect(r.insights[0]).toContain('Nenhum fornecedor tem preco');
  });

  it('is deterministic — two calls produce identical output', () => {
    const a = generateQuotesFromSuppliers(SUPPLIERS_NO_PRICE, PRODUCT, QTY, []);
    const b = generateQuotesFromSuppliers(SUPPLIERS_NO_PRICE, PRODUCT, QTY, []);
    expect(a).toEqual(b);
  });

  it('falls back to the registered payment terms and average lead time', () => {
    const r = generateQuotesFromSuppliers(
      [makeSupplier('n2', 'Com Cadastro', { condicoes_pagamento: '30/60 dias', prazo_medio_entrega: 14 })],
      PRODUCT,
      QTY,
      []
    );
    expect(r.quotes[0].paymentTerms).toBe('30/60 dias');
    expect(r.quotes[0].deliveryDays).toBe(14);
  });
});

describe('generateQuotesFromSuppliers com cotacoes registradas', () => {
  const QUOTED = [
    { fornecedor_id: 's1', valor_unitario: 90, prazo_entrega: '7 dias' },
    { fornecedor_id: 's2', valor_unitario: null, prazo_entrega: null },
  ];

  it('uses the quoted price when there is no contracted price', () => {
    const r = generateQuotesFromSuppliers(SUPPLIERS.slice(0, 2), PRODUCT, QTY, [], QUOTED);
    const s1 = r.quotes.find(q => q.supplierId === 's1');
    expect(s1?.unitPrice).toBe(90);
    expect(s1?.priceSource).toBe('cotado');
    expect(s1?.deliveryDays).toBe(7);
  });

  it('counts suppliers without any price source in coverage', () => {
    const r = generateQuotesFromSuppliers(SUPPLIERS.slice(0, 2), PRODUCT, QTY, [], QUOTED);
    expect(r.coverage).toEqual({ withPrice: 1, withoutPrice: 1 });
    expect(r.bestPrice).toBe('Alpha');
  });

  it('prefers the contracted price over the quoted one', () => {
    const r = generateQuotesFromSuppliers(
      SUPPLIERS.slice(0, 1),
      PRODUCT,
      QTY,
      [makeLinked('s1', 100, 10)],
      QUOTED
    );
    expect(r.quotes[0].unitPrice).toBe(100);
    expect(r.quotes[0].priceSource).toBe('contratado');
  });
});
