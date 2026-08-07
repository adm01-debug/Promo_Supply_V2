/**
 * User-configurable keyboard shortcut for "Clear filters".
 *
 * Persisted in localStorage (per browser, per request from the user).
 * Other shortcuts in the app are fixed; this one can be overridden.
 */

const STORAGE_KEY = 'shortcut:clear-filters';
const CHANGE_EVENT = 'clear-filters-shortcut-changed';

export interface ShortcutCombo {
  /** Single character or named key (e.g. "l", "Backspace"). Lowercased for letters. */
  key: string;
  ctrl: boolean; // true matches Ctrl OR Cmd (Meta) on macOS
  shift: boolean;
  alt: boolean;
}

export const DEFAULT_CLEAR_FILTERS_SHORTCUT: ShortcutCombo = {
  key: 'l',
  ctrl: true,
  shift: true,
  alt: false,
};

/** Other shortcuts in the app that the user must NOT collide with. */
export const RESERVED_SHORTCUTS: Array<{ combo: ShortcutCombo; description: string }> = [
  // Quick actions (Ctrl/Cmd + Shift)
  { combo: { key: 'n', ctrl: true, shift: true, alt: false }, description: 'Nova Solicitação' },
  { combo: { key: 'p', ctrl: true, shift: true, alt: false }, description: 'Novo Pedido' },
  { combo: { key: 'f', ctrl: true, shift: true, alt: false }, description: 'Novo Fornecedor' },
  { combo: { key: 'c', ctrl: true, shift: true, alt: false }, description: 'Novo Contrato' },
  // Global search (handled elsewhere, but commonly bound to Ctrl/Cmd + K)
  { combo: { key: 'k', ctrl: true, shift: false, alt: false }, description: 'Busca Global' },
  // Navigation (Alt + 1..9 + Backspace)
  ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => ({
    combo: { key: d, ctrl: false, shift: false, alt: true },
    description: `Navegação Alt+${d}`,
  })),
  { combo: { key: 'Backspace', ctrl: false, shift: false, alt: true }, description: 'Voltar' },
  // Help
  { combo: { key: '?', ctrl: false, shift: true, alt: false }, description: 'Mostrar atalhos' },
];

export function isSameCombo(a: ShortcutCombo, b: ShortcutCombo): boolean {
  return (
    a.key.toLowerCase() === b.key.toLowerCase() &&
    a.ctrl === b.ctrl &&
    a.shift === b.shift &&
    a.alt === b.alt
  );
}

/** Returns the description of the first reserved shortcut that conflicts, or null. */
export function findReservedConflict(combo: ShortcutCombo): string | null {
  for (const { combo: r, description } of RESERVED_SHORTCUTS) {
    if (isSameCombo(combo, r)) return description;
  }
  return null;
}

/** Combos that should never be allowed (would break basic browser/OS behavior). */
export function isInvalidCombo(combo: ShortcutCombo): string | null {
  // Must use at least one modifier — single letter shortcuts would fire while typing.
  if (!combo.ctrl && !combo.alt) {
    return 'Use ao menos Ctrl/⌘ ou Alt na combinação.';
  }
  if (!combo.key || combo.key.length === 0) {
    return 'Selecione uma tecla.';
  }
  // Bare modifier captured.
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(combo.key)) {
    return 'Pressione uma tecla além dos modificadores.';
  }
  return null;
}

export function formatCombo(combo: ShortcutCombo): string {
  const parts: string[] = [];
  if (combo.ctrl) parts.push('Ctrl/⌘');
  if (combo.shift) parts.push('Shift');
  if (combo.alt) parts.push('Alt');
  parts.push(combo.key.length === 1 ? combo.key.toUpperCase() : combo.key);
  return parts.join(' + ');
}

export function getClearFiltersShortcut(): ShortcutCombo {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CLEAR_FILTERS_SHORTCUT;
    const parsed = JSON.parse(raw) as Partial<ShortcutCombo>;
    if (typeof parsed.key !== 'string') return DEFAULT_CLEAR_FILTERS_SHORTCUT;
    return {
      key: parsed.key,
      ctrl: !!parsed.ctrl,
      shift: !!parsed.shift,
      alt: !!parsed.alt,
    };
  } catch {
    return DEFAULT_CLEAR_FILTERS_SHORTCUT;
  }
}

export function setClearFiltersShortcut(combo: ShortcutCombo): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(combo));
  } catch {
    /* ignore quota errors */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: combo }));
}

export function resetClearFiltersShortcut(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, { detail: DEFAULT_CLEAR_FILTERS_SHORTCUT }),
  );
}

/** Subscribe to changes (cross-tab via 'storage' + same-tab via custom event). */
export function subscribeToShortcutChanges(cb: (combo: ShortcutCombo) => void): () => void {
  const onCustom = (e: Event) => {
    const detail = (e as CustomEvent<ShortcutCombo>).detail;
    cb(detail ?? getClearFiltersShortcut());
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb(getClearFiltersShortcut());
  };
  window.addEventListener(CHANGE_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
