import { useCallback, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ConfirmClearFiltersDialog } from '@/components/filters/ConfirmClearFiltersDialog';
import { useUndoStore } from '@/stores/undoStore';
import {
  buildClearReport,
  formatClearReportDescription,
  type FilterFieldDescriptor,
} from '@/lib/filterClearReporter';

interface UseClearFiltersFlowOptions<T> {
  /** Per-screen scope (e.g. 'historico-compras'). Used for sessionStorage of "don't ask again". */
  scope: string;
  /** Snapshot describing current filter values (for the modal listing + report) */
  describeActiveFilters: () => FilterFieldDescriptor[];
  /** Snapshot of the current state to restore on undo */
  takeSnapshot: () => T;
  /** Apply a snapshot 1:1 (used by undo) */
  applySnapshot: (snapshot: T) => void;
  /**
   * Performs the actual clear. May return additional storage keys removed
   * (e.g. localStorage migration leftovers) so the toast can list them.
   */
  performClear: () => Promise<string[]> | string[];
  /** Optional human label for the screen, used in the toast title */
  screenLabel?: string;
}

interface UseClearFiltersFlowResult {
  /** Call this from your "Limpar filtros" button. Opens the modal (or runs immediately if user opted out). */
  requestClear: () => void;
  /** Render slot for the confirmation dialog */
  ConfirmDialog: ReactNode;
}

const SKIP_PREFIX = 'skipClearConfirm:';
const UNDO_TIMEOUT_MS = 6000;

export function useClearFiltersFlow<T>(
  opts: UseClearFiltersFlowOptions<T>,
): UseClearFiltersFlowResult {
  const { scope, describeActiveFilters, takeSnapshot, applySnapshot, performClear, screenLabel } = opts;
  const [open, setOpen] = useState(false);
  const [activeLines, setActiveLines] = useState<string[]>([]);
  const addAction = useUndoStore((s) => s.addAction);
  const undo = useUndoStore((s) => s.undo);
  const removeAction = useUndoStore((s) => s.removeAction);

  const runClear = useCallback(async () => {
    const fields = describeActiveFilters();
    const snapshot = takeSnapshot();

    const removedKeys = await Promise.resolve(performClear());
    const report = buildClearReport(fields, removedKeys);

    if (!report.hadActiveFilters && removedKeys.length === 0) {
      toast.info('Nenhum filtro ativo');
      return;
    }

    // Register undo
    let actionId: string | null = null;
    actionId = addAction({
      type: 'clear-filters',
      description: screenLabel ? `Filtros limpos em ${screenLabel}` : 'Filtros limpos',
      undo: () => applySnapshot(snapshot),
    });

    const description = formatClearReportDescription(report);

    toast.success('Filtros limpos', {
      description: <pre className="whitespace-pre-wrap font-sans text-xs">{description}</pre>,
      duration: UNDO_TIMEOUT_MS,
      action: {
        label: 'Desfazer',
        onClick: () => {
          void undo();
        },
      },
    });

    // Drop the undo entry once the toast disappears
    setTimeout(() => {
      if (actionId) removeAction(actionId);
    }, UNDO_TIMEOUT_MS + 200);
  }, [describeActiveFilters, takeSnapshot, performClear, addAction, undo, removeAction, applySnapshot, screenLabel]);

  const requestClear = useCallback(() => {
    const fields = describeActiveFilters();
    const lines = fields
      .filter((f) => {
        const v = f.value;
        if (v === null || v === undefined) return false;
        if (typeof v === 'string') return v.trim() !== '' && v !== 'all' && v !== 'todas' && v !== 'todos';
        if (Array.isArray(v)) return v.length > 0;
        return true;
      })
      .map((f) => `${f.label}: ${f.format ? f.format(f.value) : String(f.value)}`);

    if (lines.length === 0) {
      toast.info('Nenhum filtro ativo');
      return;
    }

    let skip = false;
    try {
      skip = sessionStorage.getItem(SKIP_PREFIX + scope) === '1';
    } catch {
      /* ignore */
    }

    if (skip) {
      void runClear();
      return;
    }

    setActiveLines(lines);
    setOpen(true);
  }, [describeActiveFilters, scope, runClear]);

  const handleConfirm = useCallback(
    (skipNextTime: boolean) => {
      setOpen(false);
      if (skipNextTime) {
        try {
          sessionStorage.setItem(SKIP_PREFIX + scope, '1');
        } catch {
          /* ignore */
        }
      }
      void runClear();
    },
    [scope, runClear],
  );

  return {
    requestClear,
    ConfirmDialog: (
      <ConfirmClearFiltersDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
        filterLines={activeLines}
        scope={scope}
      />
    ),
  };
}
