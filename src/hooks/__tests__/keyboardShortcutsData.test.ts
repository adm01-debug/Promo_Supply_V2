import { describe, it, expect, vi } from 'vitest';

vi.mock('react-router-dom', () => ({ useNavigate: vi.fn(() => vi.fn()) }));
vi.mock('@/lib/clearFiltersShortcut', () => ({
  formatCombo: vi.fn(() => 'Ctrl + Shift + L'),
  getClearFiltersShortcut: vi.fn(() => ({ key: 'l', ctrl: true, shift: true, alt: false })),
  subscribeToShortcutChanges: vi.fn(() => () => {}),
}));

import { getShortcutsList, shortcutsList } from '../useKeyboardShortcuts';

// ─── getShortcutsList ─────────────────────────────────────────────────────────

describe('getShortcutsList', () => {
  it('is a function', () => {
    expect(typeof getShortcutsList).toBe('function');
  });

  it('returns an array', () => {
    expect(Array.isArray(getShortcutsList())).toBe(true);
  });

  it('returns 4 categories', () => {
    expect(getShortcutsList()).toHaveLength(4);
  });

  it('every category has a string category label', () => {
    getShortcutsList().forEach(cat => {
      expect(typeof cat.category).toBe('string');
      expect(cat.category.length).toBeGreaterThan(0);
    });
  });

  it('every category has an items array', () => {
    getShortcutsList().forEach(cat => {
      expect(Array.isArray(cat.items)).toBe(true);
    });
  });

  it('every item has keys and description strings', () => {
    getShortcutsList().forEach(cat => {
      cat.items.forEach(item => {
        expect(typeof item.keys).toBe('string');
        expect(typeof item.description).toBe('string');
        expect(item.keys.length).toBeGreaterThan(0);
        expect(item.description.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('getShortcutsList — Navegação category', () => {
  const nav = () => getShortcutsList().find(c => c.category.startsWith('Navegação (Alt'));

  it('exists', () => {
    expect(nav()).toBeDefined();
  });

  it('has 9 navigation items (Alt + 1..9)', () => {
    expect(nav()!.items).toHaveLength(9);
  });

  it('first item is Alt + 1 → Dashboard', () => {
    const first = nav()!.items[0];
    expect(first.keys).toBe('Alt + 1');
    expect(first.description).toBe('Dashboard');
  });

  it('last item is Alt + 9 → Relatórios', () => {
    const last = nav()!.items[8];
    expect(last.keys).toBe('Alt + 9');
    expect(last.description).toBe('Relatórios');
  });
});

describe('getShortcutsList — Ações Rápidas category', () => {
  const quick = () => getShortcutsList().find(c => c.category === 'Ações Rápidas');

  it('exists', () => {
    expect(quick()).toBeDefined();
  });

  it('has 6 items', () => {
    expect(quick()!.items).toHaveLength(6);
  });

  it('includes Busca Global item', () => {
    expect(quick()!.items.some(i => i.description === 'Busca Global')).toBe(true);
  });

  it('includes Nova Solicitação item', () => {
    expect(quick()!.items.some(i => i.description === 'Nova Solicitação')).toBe(true);
  });

  it('includes Limpar filtros item that uses formatted combo', () => {
    const item = quick()!.items.find(i => i.description.includes('Limpar'));
    expect(item).toBeDefined();
    expect(item!.keys).toBe('Ctrl + Shift + L');
  });
});

describe('getShortcutsList — back navigation category', () => {
  const back = () => getShortcutsList().find(c => c.category === 'Navegação');

  it('exists', () => {
    expect(back()).toBeDefined();
  });

  it('has 1 item — Voltar', () => {
    expect(back()!.items).toHaveLength(1);
    expect(back()!.items[0].description).toBe('Voltar');
    expect(back()!.items[0].keys).toBe('Alt + Backspace');
  });
});

describe('getShortcutsList — Ajuda category', () => {
  const help = () => getShortcutsList().find(c => c.category === 'Ajuda');

  it('exists', () => {
    expect(help()).toBeDefined();
  });

  it('has Mostrar atalhos item', () => {
    expect(help()!.items.some(i => i.description === 'Mostrar atalhos')).toBe(true);
  });
});

// ─── shortcutsList static export ──────────────────────────────────────────────

describe('shortcutsList', () => {
  it('is an array', () => {
    expect(Array.isArray(shortcutsList)).toBe(true);
  });

  it('has the same length as getShortcutsList()', () => {
    expect(shortcutsList.length).toBe(getShortcutsList().length);
  });

  it('every category has items', () => {
    shortcutsList.forEach(cat => {
      expect(cat.items.length).toBeGreaterThan(0);
    });
  });
});
