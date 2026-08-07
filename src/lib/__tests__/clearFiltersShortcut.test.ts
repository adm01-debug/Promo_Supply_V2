import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_CLEAR_FILTERS_SHORTCUT,
  RESERVED_SHORTCUTS,
  isSameCombo,
  findReservedConflict,
  isInvalidCombo,
  formatCombo,
  getClearFiltersShortcut,
  setClearFiltersShortcut,
  resetClearFiltersShortcut,
} from '../clearFiltersShortcut';
import type { ShortcutCombo } from '../clearFiltersShortcut';

// ─── DEFAULT_CLEAR_FILTERS_SHORTCUT ───────────────────────────────────────────

describe('DEFAULT_CLEAR_FILTERS_SHORTCUT', () => {
  it('uses key "l"', () => {
    expect(DEFAULT_CLEAR_FILTERS_SHORTCUT.key).toBe('l');
  });

  it('requires ctrl', () => {
    expect(DEFAULT_CLEAR_FILTERS_SHORTCUT.ctrl).toBe(true);
  });

  it('requires shift', () => {
    expect(DEFAULT_CLEAR_FILTERS_SHORTCUT.shift).toBe(true);
  });

  it('does not require alt', () => {
    expect(DEFAULT_CLEAR_FILTERS_SHORTCUT.alt).toBe(false);
  });
});

// ─── RESERVED_SHORTCUTS ───────────────────────────────────────────────────────

describe('RESERVED_SHORTCUTS', () => {
  it('has 16 entries', () => {
    expect(RESERVED_SHORTCUTS).toHaveLength(16);
  });

  it('all entries have combo and description', () => {
    RESERVED_SHORTCUTS.forEach(r => {
      expect(typeof r.description).toBe('string');
      expect(r.description.length).toBeGreaterThan(0);
      expect(typeof r.combo.key).toBe('string');
    });
  });

  it('includes Nova Solicitação (Ctrl+Shift+N)', () => {
    const entry = RESERVED_SHORTCUTS.find(r => r.description === 'Nova Solicitação');
    expect(entry).toBeDefined();
    expect(entry!.combo.key).toBe('n');
    expect(entry!.combo.ctrl).toBe(true);
    expect(entry!.combo.shift).toBe(true);
  });

  it('includes Busca Global (Ctrl+K)', () => {
    const entry = RESERVED_SHORTCUTS.find(r => r.description === 'Busca Global');
    expect(entry).toBeDefined();
    expect(entry!.combo.key).toBe('k');
    expect(entry!.combo.ctrl).toBe(true);
    expect(entry!.combo.shift).toBe(false);
  });

  it('includes Voltar (Alt+Backspace)', () => {
    const entry = RESERVED_SHORTCUTS.find(r => r.description === 'Voltar');
    expect(entry).toBeDefined();
    expect(entry!.combo.key).toBe('Backspace');
    expect(entry!.combo.alt).toBe(true);
  });

  it('includes Mostrar atalhos (Shift+?)', () => {
    const entry = RESERVED_SHORTCUTS.find(r => r.description === 'Mostrar atalhos');
    expect(entry).toBeDefined();
    expect(entry!.combo.key).toBe('?');
    expect(entry!.combo.shift).toBe(true);
  });

  it('includes Alt+1 through Alt+9 navigation shortcuts', () => {
    for (let d = 1; d <= 9; d++) {
      const entry = RESERVED_SHORTCUTS.find(r => r.combo.key === String(d) && r.combo.alt);
      expect(entry).toBeDefined();
    }
  });
});

// ─── isSameCombo ─────────────────────────────────────────────────────────────

describe('isSameCombo', () => {
  const base: ShortcutCombo = { key: 'l', ctrl: true, shift: true, alt: false };

  it('returns true for identical combos', () => {
    expect(isSameCombo(base, { ...base })).toBe(true);
  });

  it('returns false when keys differ', () => {
    expect(isSameCombo(base, { ...base, key: 'k' })).toBe(false);
  });

  it('is case-insensitive for single-letter keys', () => {
    expect(isSameCombo({ ...base, key: 'L' }, { ...base, key: 'l' })).toBe(true);
  });

  it('returns false when ctrl differs', () => {
    expect(isSameCombo(base, { ...base, ctrl: false })).toBe(false);
  });

  it('returns false when shift differs', () => {
    expect(isSameCombo(base, { ...base, shift: false })).toBe(false);
  });

  it('returns false when alt differs', () => {
    expect(isSameCombo(base, { ...base, alt: true })).toBe(false);
  });

  it('matches named keys case-insensitively', () => {
    const a: ShortcutCombo = { key: 'backspace', ctrl: false, shift: false, alt: true };
    const b: ShortcutCombo = { key: 'Backspace', ctrl: false, shift: false, alt: true };
    expect(isSameCombo(a, b)).toBe(true);
  });
});

// ─── findReservedConflict ─────────────────────────────────────────────────────

describe('findReservedConflict', () => {
  it('returns description for Ctrl+Shift+N (Nova Solicitação)', () => {
    const combo: ShortcutCombo = { key: 'n', ctrl: true, shift: true, alt: false };
    expect(findReservedConflict(combo)).toBe('Nova Solicitação');
  });

  it('returns description for Ctrl+K (Busca Global)', () => {
    const combo: ShortcutCombo = { key: 'k', ctrl: true, shift: false, alt: false };
    expect(findReservedConflict(combo)).toBe('Busca Global');
  });

  it('returns description for Alt+Backspace (Voltar)', () => {
    const combo: ShortcutCombo = { key: 'Backspace', ctrl: false, shift: false, alt: true };
    expect(findReservedConflict(combo)).toBe('Voltar');
  });

  it('returns null for non-reserved combo', () => {
    const combo: ShortcutCombo = { key: 'z', ctrl: true, shift: true, alt: false };
    expect(findReservedConflict(combo)).toBeNull();
  });

  it('returns null for the default shortcut (not reserved)', () => {
    expect(findReservedConflict(DEFAULT_CLEAR_FILTERS_SHORTCUT)).toBeNull();
  });

  it('returns description for Alt+5 (navigation)', () => {
    const combo: ShortcutCombo = { key: '5', ctrl: false, shift: false, alt: true };
    expect(findReservedConflict(combo)).toBe('Navegação Alt+5');
  });
});

// ─── isInvalidCombo ───────────────────────────────────────────────────────────

describe('isInvalidCombo', () => {
  it('returns error when no modifier (no ctrl and no alt)', () => {
    const combo: ShortcutCombo = { key: 'l', ctrl: false, shift: true, alt: false };
    expect(isInvalidCombo(combo)).toBeTruthy();
  });

  it('returns null for valid ctrl combo', () => {
    const combo: ShortcutCombo = { key: 'l', ctrl: true, shift: false, alt: false };
    expect(isInvalidCombo(combo)).toBeNull();
  });

  it('returns null for valid alt combo', () => {
    const combo: ShortcutCombo = { key: 'z', ctrl: false, shift: false, alt: true };
    expect(isInvalidCombo(combo)).toBeNull();
  });

  it('returns error for empty key', () => {
    const combo: ShortcutCombo = { key: '', ctrl: true, shift: false, alt: false };
    expect(isInvalidCombo(combo)).toBeTruthy();
  });

  it('returns error when key is "Control"', () => {
    const combo: ShortcutCombo = { key: 'Control', ctrl: true, shift: false, alt: false };
    expect(isInvalidCombo(combo)).toBeTruthy();
  });

  it('returns error when key is "Shift"', () => {
    const combo: ShortcutCombo = { key: 'Shift', ctrl: true, shift: true, alt: false };
    expect(isInvalidCombo(combo)).toBeTruthy();
  });

  it('returns error when key is "Alt"', () => {
    const combo: ShortcutCombo = { key: 'Alt', ctrl: false, shift: false, alt: true };
    expect(isInvalidCombo(combo)).toBeTruthy();
  });

  it('returns error when key is "Meta"', () => {
    const combo: ShortcutCombo = { key: 'Meta', ctrl: true, shift: false, alt: false };
    expect(isInvalidCombo(combo)).toBeTruthy();
  });

  it('returns null for default shortcut (valid)', () => {
    expect(isInvalidCombo(DEFAULT_CLEAR_FILTERS_SHORTCUT)).toBeNull();
  });

  it('returns a string (error message) when invalid', () => {
    const combo: ShortcutCombo = { key: 'l', ctrl: false, shift: false, alt: false };
    expect(typeof isInvalidCombo(combo)).toBe('string');
  });
});

// ─── formatCombo ─────────────────────────────────────────────────────────────

describe('formatCombo', () => {
  it('formats default shortcut as "Ctrl/⌘ + Shift + L"', () => {
    expect(formatCombo(DEFAULT_CLEAR_FILTERS_SHORTCUT)).toBe('Ctrl/⌘ + Shift + L');
  });

  it('formats Ctrl+K without shift or alt', () => {
    const combo: ShortcutCombo = { key: 'k', ctrl: true, shift: false, alt: false };
    expect(formatCombo(combo)).toBe('Ctrl/⌘ + K');
  });

  it('formats Alt+Backspace (named key not uppercased)', () => {
    const combo: ShortcutCombo = { key: 'Backspace', ctrl: false, shift: false, alt: true };
    expect(formatCombo(combo)).toBe('Alt + Backspace');
  });

  it('uppercases single character keys', () => {
    const combo: ShortcutCombo = { key: 'z', ctrl: true, shift: false, alt: false };
    expect(formatCombo(combo)).toBe('Ctrl/⌘ + Z');
  });

  it('includes all three modifiers when all are set', () => {
    const combo: ShortcutCombo = { key: 'x', ctrl: true, shift: true, alt: true };
    expect(formatCombo(combo)).toBe('Ctrl/⌘ + Shift + Alt + X');
  });

  it('returns a non-empty string', () => {
    expect(formatCombo(DEFAULT_CLEAR_FILTERS_SHORTCUT).length).toBeGreaterThan(0);
  });
});

// ─── getClearFiltersShortcut / setClearFiltersShortcut ────────────────────────

describe('getClearFiltersShortcut', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default when nothing is stored', () => {
    const result = getClearFiltersShortcut();
    expect(result).toEqual(DEFAULT_CLEAR_FILTERS_SHORTCUT);
  });

  it('returns stored combo when valid', () => {
    const custom: ShortcutCombo = { key: 'g', ctrl: true, shift: false, alt: false };
    localStorage.setItem('shortcut:clear-filters', JSON.stringify(custom));
    expect(getClearFiltersShortcut()).toEqual(custom);
  });

  it('returns default when stored JSON is malformed', () => {
    localStorage.setItem('shortcut:clear-filters', 'not-json');
    expect(getClearFiltersShortcut()).toEqual(DEFAULT_CLEAR_FILTERS_SHORTCUT);
  });

  it('returns default when stored object has no key field', () => {
    localStorage.setItem('shortcut:clear-filters', JSON.stringify({ ctrl: true }));
    expect(getClearFiltersShortcut()).toEqual(DEFAULT_CLEAR_FILTERS_SHORTCUT);
  });
});

describe('setClearFiltersShortcut', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists combo to localStorage', () => {
    const custom: ShortcutCombo = { key: 'm', ctrl: true, shift: false, alt: false };
    setClearFiltersShortcut(custom);
    expect(getClearFiltersShortcut()).toEqual(custom);
  });
});

describe('resetClearFiltersShortcut', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes stored combo so default is returned', () => {
    const custom: ShortcutCombo = { key: 'g', ctrl: true, shift: false, alt: false };
    setClearFiltersShortcut(custom);
    resetClearFiltersShortcut();
    expect(getClearFiltersShortcut()).toEqual(DEFAULT_CLEAR_FILTERS_SHORTCUT);
  });
});
