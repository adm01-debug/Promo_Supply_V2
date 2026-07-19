import { describe, it, expect } from 'vitest';
import { STATUS_CONFIG, extractSpotProductId } from '../spotHelpers';

// ─── STATUS_CONFIG ────────────────────────────────────────────────────────────

describe('STATUS_CONFIG', () => {
  const expectedKeys = [
    'Submetida',
    'Em processamento',
    'Processada',
    'Aguardando Pagamento',
    'Pago',
    'Pendencia Layout',
    'Em Separação',
    'Em Produção',
    'Expedida',
    'Anulada',
  ];

  it('has 10 entries', () => {
    expect(Object.keys(STATUS_CONFIG)).toHaveLength(10);
  });

  it.each(expectedKeys)('has key "%s"', (key) => {
    expect(STATUS_CONFIG).toHaveProperty(key);
  });

  it('each entry has a variant and label', () => {
    Object.entries(STATUS_CONFIG).forEach(([, entry]) => {
      expect(typeof entry.label).toBe('string');
      expect(['default', 'secondary', 'destructive', 'outline']).toContain(entry.variant);
    });
  });

  it('Anulada is destructive', () => {
    expect(STATUS_CONFIG['Anulada'].variant).toBe('destructive');
  });

  it('Pago is default', () => {
    expect(STATUS_CONFIG['Pago'].variant).toBe('default');
  });

  it('label matches readable text', () => {
    expect(STATUS_CONFIG['Pendencia Layout'].label).toBe('Pendência Layout');
  });
});

// ─── extractSpotProductId ─────────────────────────────────────────────────────

describe('extractSpotProductId', () => {
  it('extracts numeric id from pathname', () => {
    expect(extractSpotProductId('https://www.spotgifts.com.br/produtos/12345')).toBe('12345');
  });

  it('extracts numeric id from pathname with trailing slash', () => {
    expect(extractSpotProductId('https://www.spotgifts.com.br/produtos/99999/')).toBe('99999');
  });

  it('extracts prod param when no numeric path segment', () => {
    expect(extractSpotProductId('https://www.spotgifts.com.br/busca?prod=777')).toBe('777');
  });

  it('returns fallback for unrecognized URL', () => {
    expect(extractSpotProductId('https://www.spotgifts.com.br/sem-id', 'N/A')).toBe('N/A');
  });

  it('returns empty string fallback by default when no id found', () => {
    expect(extractSpotProductId('https://www.spotgifts.com.br/')).toBe('');
  });

  it('handles relative path — resolves against base and extracts id', () => {
    expect(extractSpotProductId('/produtos/42')).toBe('42');
  });

  it('handles invalid URL with fallback', () => {
    expect(extractSpotProductId('not a url', 'fallback')).toBe('fallback');
  });

  it('returns empty string default fallback for invalid URL', () => {
    expect(extractSpotProductId(':::bad:::')).toBe('');
  });

  it('numeric id in deeper nested path', () => {
    expect(extractSpotProductId('/categoria/brindes/123')).toBe('123');
  });

  it('uses prod param over fallback when available', () => {
    expect(extractSpotProductId('/page?prod=555', 'fallback')).toBe('555');
  });
});
