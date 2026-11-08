import { describe, it, expect, beforeEach } from 'vitest';
import { generateQuotesFromSuppliers } from '../priceComparatorHelpers';
import type { ComparisonResult } from '../priceComparatorHelpers';

// Controlled supplier fixtures
const makeSupplier = (id: string, name: string) => ({
  id,
  razao_social: name,
  nome_fantasia: null,
  prazo_medio_entrega: null,
  condicoes_pagamento: null,
  avaliacao: 4,
});

const makeLinked = (fornecedor_id: string, preco_custo: number, lead_time_estimado: number) => ({
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

// ─── generateQuotesFromSuppliers ──────────────────────────────────────────────

describe('generateQuotesFromSuppliers', () => {
  let result: ComparisonResult;

  beforeEach(() => {
    result = generateQuotesFromSuppliers(SUPPLIERS, PRODUCT, QTY, LINKED);
  });

  it('passes product name through', () => {
    expect(result.product).toBe(PRODUCT);
  });

  it('passes quantity through', () => {
    expect(result.quantity).toBe(QTY);
  });

  it('returns one quote per supplier', () => {
    expect(result.quotes).toHaveLength(SUPPLIERS.length);
  });

  it('quotes are sorted by totalPrice ascending', () => {
    const prices = result.quotes.map(q => q.totalPrice);
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });

  it('marks first (cheapest) quote as recommended', () => {
    expect(result.quotes[0].recommended).toBe(true);
  });

  it('no other quote is recommended', () => {
    result.quotes.slice(1).forEach(q => {
      expect(q.recommended).toBe(false);
    });
  });

  it('bestPrice is the name of the cheapest supplier', () => {
    // Beta has preco_custo=80 (cheapest), totalPrice = 80*10 = 800
    expect(result.bestPrice).toBe('Beta');
  });

  it('bestDelivery is the name of the fastest-delivery supplier', () => {
    // Gamma has lead_time=3 (fastest)
    expect(result.bestDelivery).toBe('Gamma');
  });

  it('priceRange.min equals the cheapest totalPrice', () => {
    const expectedMin = 80 * QTY;
    expect(result.priceRange.min).toBe(expectedMin);
  });

  it('priceRange.max equals the most expensive totalPrice', () => {
    const expectedMax = 120 * QTY;
    expect(result.priceRange.max).toBe(expectedMax);
  });

  it('averagePrice equals arithmetic mean of totalPrices', () => {
    const prices = [100 * QTY, 80 * QTY, 120 * QTY];
    const expected = Number((prices.reduce((s, p) => s + p, 0) / prices.length).toFixed(2));
    expect(result.averagePrice).toBe(expected);
  });

  it('each quote has all required fields', () => {
    result.quotes.forEach(q => {
      expect(typeof q.supplierId).toBe('string');
      expect(typeof q.supplierName).toBe('string');
      expect(typeof q.unitPrice).toBe('number');
      expect(typeof q.totalPrice).toBe('number');
      expect(typeof q.deliveryDays).toBe('number');
      expect(typeof q.savings).toBe('number');
      expect(typeof q.savingsPercent).toBe('number');
      expect(Array.isArray(q.pros)).toBe(true);
      expect(Array.isArray(q.cons)).toBe(true);
    });
  });

  it('totalPrice equals unitPrice * quantity', () => {
    // Check Alpha: unitPrice=100, totalPrice=1000
    const alpha = result.quotes.find(q => q.supplierId === 's1');
    expect(alpha?.unitPrice).toBe(100);
    expect(alpha?.totalPrice).toBe(1000);
  });

  it('uses nome_fantasia when available', () => {
    const withFantasia = [{ ...makeSupplier('s9', 'Razão'), nome_fantasia: 'Fantasia' }];
    const linked = [makeLinked('s9', 50, 7)];
    const r = generateQuotesFromSuppliers(withFantasia, PRODUCT, 1, linked);
    expect(r.quotes[0].supplierName).toBe('Fantasia');
  });

  it('falls back to razao_social when nome_fantasia is null', () => {
    expect(result.quotes.map(q => q.supplierName)).toContain('Beta');
  });

  it('quotes with linked data have pros starting with "Preço contratado em sistema"', () => {
    result.quotes.forEach(q => {
      expect(q.pros[0]).toBe('Preço contratado em sistema');
    });
  });

  it('insights array has 3 entries', () => {
    expect(result.insights).toHaveLength(3);
  });

  it('first insight mentions saving amount', () => {
    expect(result.insights[0]).toContain('Economia potencial');
  });

  it('second insight names the fastest-delivery supplier', () => {
    expect(result.insights[1]).toContain('Gamma');
  });

  it('third insight mentions average star rating', () => {
    expect(result.insights[2]).toContain('estrelas');
  });

  it('returns valid result with single supplier', () => {
    const r = generateQuotesFromSuppliers(
      [makeSupplier('x', 'Solo')],
      'Item',
      5,
      [makeLinked('x', 10, 2)]
    );
    expect(r.quotes).toHaveLength(1);
    expect(r.quotes[0].recommended).toBe(true);
    expect(r.priceRange.min).toBe(r.priceRange.max);
  });
});
