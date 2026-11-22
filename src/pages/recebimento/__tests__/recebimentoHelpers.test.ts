import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OFFLINE_STORAGE_KEY,
  getOfflineEntries,
  saveOfflineEntries,
  isLineComplete,
  statusFromReceived,
  buildReceivingObservation,
} from '../recebimentoHelpers';
import type { ReceivingEntry } from '../recebimentoHelpers';

const makeEntry = (overrides: Partial<ReceivingEntry> = {}): ReceivingEntry => ({
  pedido_id: 'PED-001',
  pedido_numero: 'OC-001',
  items: [{ item_id: 'ITEM-1', quantidade_recebida: 5, observacao: '' }],
  observacao_geral: '',
  timestamp: '2024-06-15T10:00:00Z',
  synced: false,
  ...overrides,
});

// â”€â”€â”€ OFFLINE_STORAGE_KEY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('OFFLINE_STORAGE_KEY', () => {
  it('is a non-empty string', () => {
    expect(typeof OFFLINE_STORAGE_KEY).toBe('string');
    expect(OFFLINE_STORAGE_KEY.length).toBeGreaterThan(0);
  });

  it('equals "offline-receiving-entries"', () => {
    expect(OFFLINE_STORAGE_KEY).toBe('offline-receiving-entries');
  });

  it('uses kebab-case (no spaces, no underscores)', () => {
    expect(OFFLINE_STORAGE_KEY).not.toContain(' ');
    expect(OFFLINE_STORAGE_KEY).not.toContain('_');
    expect(OFFLINE_STORAGE_KEY).toMatch(/^[a-z-]+$/);
  });
});

// â”€â”€â”€ getOfflineEntries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('getOfflineEntries', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when nothing is stored', () => {
    const result = getOfflineEntries();
    expect(result).toEqual([]);
  });

  it('returns stored entries', () => {
    const entries = [makeEntry(), makeEntry({ pedido_id: 'PED-002', synced: true })];
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(entries));
    const result = getOfflineEntries();
    expect(result).toHaveLength(2);
  });

  it('preserves entry fields', () => {
    const entry = makeEntry({ pedido_id: 'PED-X', synced: true, observacao_geral: 'ok' });
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify([entry]));
    const result = getOfflineEntries();
    expect(result[0].pedido_id).toBe('PED-X');
    expect(result[0].synced).toBe(true);
    expect(result[0].observacao_geral).toBe('ok');
  });

  it('returns empty array when JSON is malformed', () => {
    localStorage.setItem(OFFLINE_STORAGE_KEY, 'not-valid-json');
    const result = getOfflineEntries();
    expect(result).toEqual([]);
  });

  it('returns empty array when key contains "[]"', () => {
    localStorage.setItem(OFFLINE_STORAGE_KEY, '[]');
    const result = getOfflineEntries();
    expect(result).toEqual([]);
  });

  it('returns array type', () => {
    expect(Array.isArray(getOfflineEntries())).toBe(true);
  });

  it('returns single entry array', () => {
    const entry = makeEntry();
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify([entry]));
    expect(getOfflineEntries()).toHaveLength(1);
  });

  it('returns entries with items array', () => {
    const entry = makeEntry({
      items: [
        { item_id: 'A', quantidade_recebida: 3, observacao: 'bom' },
        { item_id: 'B', quantidade_recebida: 7, observacao: '' },
      ],
    });
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify([entry]));
    const result = getOfflineEntries();
    expect(result[0].items).toHaveLength(2);
    expect(result[0].items[0].item_id).toBe('A');
  });
});

// â”€â”€â”€ saveOfflineEntries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('saveOfflineEntries', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores entries in localStorage', () => {
    const entries = [makeEntry()];
    saveOfflineEntries(entries);
    const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
    expect(raw).not.toBeNull();
  });

  it('stored value can be parsed back', () => {
    const entries = [makeEntry({ pedido_id: 'PED-SAVE' })];
    saveOfflineEntries(entries);
    const parsed = JSON.parse(localStorage.getItem(OFFLINE_STORAGE_KEY)!);
    expect(parsed[0].pedido_id).toBe('PED-SAVE');
  });

  it('overwrites previously stored entries', () => {
    saveOfflineEntries([makeEntry({ pedido_id: 'OLD' })]);
    saveOfflineEntries([makeEntry({ pedido_id: 'NEW-1' }), makeEntry({ pedido_id: 'NEW-2' })]);
    const result = getOfflineEntries();
    expect(result).toHaveLength(2);
    expect(result[0].pedido_id).toBe('NEW-1');
  });

  it('stores empty array', () => {
    saveOfflineEntries([]);
    expect(getOfflineEntries()).toEqual([]);
  });

  it('round-trips synced flag correctly', () => {
    const entry = makeEntry({ synced: true });
    saveOfflineEntries([entry]);
    expect(getOfflineEntries()[0].synced).toBe(true);
  });

  it('round-trips timestamp correctly', () => {
    const ts = '2024-12-25T00:00:00Z';
    saveOfflineEntries([makeEntry({ timestamp: ts })]);
    expect(getOfflineEntries()[0].timestamp).toBe(ts);
  });

  it('stores multiple entries correctly', () => {
    const entries = [
      makeEntry({ pedido_id: 'P1' }),
      makeEntry({ pedido_id: 'P2' }),
      makeEntry({ pedido_id: 'P3' }),
    ];
    saveOfflineEntries(entries);
    const result = getOfflineEntries();
    expect(result).toHaveLength(3);
    expect(result.map(e => e.pedido_id)).toEqual(['P1', 'P2', 'P3']);
  });

  it('getOfflineEntries is idempotent (same result called twice)', () => {
    const entries = [makeEntry({ pedido_id: 'IDEM' })];
    saveOfflineEntries(entries);
    const r1 = getOfflineEntries();
    const r2 = getOfflineEntries();
    expect(r1).toEqual(r2);
  });

  it('round-trips items array with observacao values', () => {
    const entry = makeEntry({
      items: [{ item_id: 'Z', quantidade_recebida: 10, observacao: 'com avaria' }],
    });
    saveOfflineEntries([entry]);
    const result = getOfflineEntries();
    expect(result[0].items[0].observacao).toBe('com avaria');
    expect(result[0].items[0].quantidade_recebida).toBe(10);
  });
});

// ─── statusFromReceived / isLineComplete ────────────────────────────────────

describe('statusFromReceived', () => {
  const items = [
    { id: 'A', quantidade: 100 },
    { id: 'B', quantidade: 50 },
  ];

  it('marca parcial quando recebe 1 de 100 (nao entregue)', () => {
    expect(statusFromReceived(items, { A: 1, B: 0 })).toBe('parcial');
  });

  it('so marca entregue quando todas as linhas cobrem a quantidade pedida', () => {
    expect(statusFromReceived(items, { A: 100, B: 50 })).toBe('entregue');
  });

  it('marca parcial quando uma linha esta completa e a outra nao', () => {
    expect(statusFromReceived(items, { A: 100, B: 10 })).toBe('parcial');
  });

  it('nao mexe no status quando nada foi recebido', () => {
    expect(statusFromReceived(items, { A: 0, B: 0 })).toBeUndefined();
  });

  it('aceita recebimento acima do pedido como completo', () => {
    expect(statusFromReceived(items, { A: 120, B: 50 })).toBe('entregue');
  });

  it('isLineComplete compara com a quantidade pedida, nao com zero', () => {
    expect(isLineComplete({ quantidade: 10 }, 1)).toBe(false);
    expect(isLineComplete({ quantidade: 10 }, 10)).toBe(true);
  });
});

describe('buildReceivingObservation', () => {
  it('devolve null quando nao ha observacao', () => {
    expect(buildReceivingObservation({ A: '', B: '   ' }, '')).toBeNull();
  });

  it('consolida observacoes de itens e a geral', () => {
    expect(buildReceivingObservation({ A: 'caixa amassada' }, 'entregar depois'))
      .toBe('Itens: caixa amassada — entregar depois');
  });

  it('usa so a observacao geral quando nao ha nota por item', () => {
    expect(buildReceivingObservation({}, 'faltou 1 unidade')).toBe('faltou 1 unidade');
  });
});
