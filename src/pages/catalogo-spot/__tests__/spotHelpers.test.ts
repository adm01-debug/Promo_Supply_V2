import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/feedbackToast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { STATUS_CONFIG, extractSpotProductId, openExternalSpotUrl } from '../spotHelpers';
import { toast } from '@/lib/feedbackToast';

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

// ─── openExternalSpotUrl ──────────────────────────────────────────────────────

describe('openExternalSpotUrl', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let windowOpenSpy: any;

  beforeEach(() => {
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.clearAllMocks();
  });

  it('opens valid spotgifts.com.br URL in new tab', () => {
    openExternalSpotUrl('https://www.spotgifts.com.br/produto/123');
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://www.spotgifts.com.br/produto/123',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('accepts spotgifts.com.br without www', () => {
    openExternalSpotUrl('https://spotgifts.com.br/produto/456');
    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('resolves relative URL against spotgifts.com.br base', () => {
    openExternalSpotUrl('/produto/789');
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://www.spotgifts.com.br/produto/789',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('blocks external hostname with error toast', () => {
    openExternalSpotUrl('https://evil.example.com/payload');
    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('URL externa inválida bloqueada por segurança');
  });

  it('blocks http://spotgifts.evil.com (subdomain attack)', () => {
    openExternalSpotUrl('https://spotgifts.evil.com/path');
    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('resolves colon-prefixed string as relative path against base (opens window)', () => {
    openExternalSpotUrl(':::not-a-url:::');
    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
