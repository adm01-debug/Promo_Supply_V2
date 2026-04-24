import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_CLEAR_FILTERS_SHORTCUT,
  findReservedConflict,
  formatCombo,
  getClearFiltersShortcut,
  isInvalidCombo,
  isSameCombo,
  resetClearFiltersShortcut,
  setClearFiltersShortcut,
  subscribeToShortcutChanges,
  type ShortcutCombo,
} from '@/lib/clearFiltersShortcut';

/**
 * Inline editor for the "Clear filters" keyboard shortcut.
 * Shown on the keyboard shortcuts dialog row for that action.
 */
export function ClearFiltersShortcutEditor() {
  const [combo, setCombo] = useState<ShortcutCombo>(() => getClearFiltersShortcut());
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<ShortcutCombo | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => subscribeToShortcutChanges(setCombo), []);

  useEffect(() => {
    if (!editing) return;

    captureRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      // Allow Escape to cancel.
      if (e.key === 'Escape') {
        e.preventDefault();
        setEditing(false);
        setPending(null);
        return;
      }
      // Ignore bare modifier presses; wait for an actual key.
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setPending({
        key: e.key.length === 1 ? e.key.toLowerCase() : e.key,
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
      });
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [editing]);

  const startEditing = () => {
    setPending(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setPending(null);
  };

  const save = () => {
    if (!pending) {
      cancelEditing();
      return;
    }

    const invalidReason = isInvalidCombo(pending);
    if (invalidReason) {
      toast.error('Combinação inválida', { description: invalidReason });
      return;
    }

    const conflict = findReservedConflict(pending);
    if (conflict) {
      toast.error('Atalho em uso', {
        description: `Esta combinação já está atribuída a "${conflict}". Escolha outra.`,
      });
      return;
    }

    setClearFiltersShortcut(pending);
    setEditing(false);
    setPending(null);
    toast.success('Atalho atualizado', {
      description: `"Limpar filtros" agora responde a ${formatCombo(pending)}.`,
    });
  };

  const reset = () => {
    if (isSameCombo(combo, DEFAULT_CLEAR_FILTERS_SHORTCUT)) return;
    resetClearFiltersShortcut();
    toast.success('Atalho restaurado', {
      description: `Voltou para o padrão (${formatCombo(DEFAULT_CLEAR_FILTERS_SHORTCUT)}).`,
    });
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <kbd className="inline-flex items-center gap-1 px-2 py-1 rounded border bg-muted font-mono text-xs">
          {formatCombo(combo)}
        </kbd>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Editar atalho de Limpar filtros"
          onClick={startEditing}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {!isSameCombo(combo, DEFAULT_CLEAR_FILTERS_SHORTCUT) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Restaurar padrão do atalho"
            onClick={reset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={captureRef}
      tabIndex={-1}
      role="group"
      aria-label="Pressione a nova combinação de teclas"
      className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 outline-none ring-2 ring-primary/40"
    >
      <kbd className="inline-flex items-center gap-1 px-2 py-1 rounded border bg-muted font-mono text-xs min-w-[110px] justify-center">
        {pending ? formatCombo(pending) : 'Pressione…'}
      </kbd>
      <Button type="button" size="sm" variant="default" onClick={save} disabled={!pending}>
        Salvar
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        aria-label="Cancelar edição"
        onClick={cancelEditing}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
