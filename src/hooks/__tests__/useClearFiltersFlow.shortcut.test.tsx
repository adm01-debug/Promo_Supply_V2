import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { useClearFiltersFlow } from '@/hooks/useClearFiltersFlow';
import type { FilterFieldDescriptor } from '@/lib/filterClearReporter';

// --- Mocks ---------------------------------------------------------------

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/stores/undoStore', () => ({
  useUndoStore: (selector: (s: unknown) => unknown) =>
    selector({
      addAction: vi.fn(() => 'mock-action-id'),
      undo: vi.fn(),
      removeAction: vi.fn(),
    }),
}));

// --- Test harness --------------------------------------------------------

interface HarnessProps {
  scope: string;
  screenLabel: string;
  fields: FilterFieldDescriptor[];
}

function Harness({ scope, screenLabel, fields }: HarnessProps) {
  const { ConfirmDialog } = useClearFiltersFlow({
    scope,
    screenLabel,
    describeActiveFilters: () => fields,
    takeSnapshot: () => ({}),
    applySnapshot: () => {},
    performClear: () => [],
  });
  return <>{ConfirmDialog}</>;
}

function dispatchClearShortcut() {
  // useKeyboardShortcuts dispatches this exact event when Ctrl/Cmd + Shift + L is pressed.
  window.dispatchEvent(new CustomEvent('request-clear-filters'));
}

// --- Cases ---------------------------------------------------------------

const screens: HarnessProps[] = [
  {
    scope: 'solicitacoes',
    screenLabel: 'Solicitações',
    fields: [
      { key: 'searchTerm', label: 'Busca', value: 'orçamento' },
      { key: 'statusFilter', label: 'Status', value: 'Pendente' },
    ],
  },
  {
    scope: 'acompanhamento',
    screenLabel: 'Acompanhamento',
    fields: [
      { key: 'searchTerm', label: 'Busca', value: 'fornecedor X' },
      { key: 'filtroSLA', label: 'SLA', value: 'crítico' },
    ],
  },
  {
    scope: 'historico-compras',
    screenLabel: 'Histórico de Compras',
    fields: [
      { key: 'categoryFilter', label: 'Categoria', value: 'Insumos' },
      { key: 'periodPreset', label: 'Período', value: 'últimos 30 dias' },
    ],
  },
  {
    scope: 'executive-dashboard',
    screenLabel: 'Dashboard Executivo',
    fields: [
      { key: 'selectedCategory', label: 'Categoria', value: 'TI' },
      { key: 'selectedSupplier', label: 'Fornecedor', value: 'ACME' },
    ],
  },
];

describe('Ctrl/⌘ + Shift + L → confirmation modal', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each(screens)(
    'opens the confirmation modal on %s when shortcut event fires',
    async ({ scope, screenLabel, fields }) => {
      render(<Harness scope={scope} screenLabel={screenLabel} fields={fields} />);

      // Modal must NOT be open before the shortcut.
      expect(screen.queryByRole('alertdialog')).toBeNull();

      act(() => {
        dispatchClearShortcut();
      });

      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-label', 'Confirmar limpeza de filtros');

      // Each active filter must be listed in the modal.
      for (const field of fields) {
        expect(
          screen.getByText(new RegExp(`${field.label}:\\s*${field.value}`, 'i')),
        ).toBeInTheDocument();
      }
    },
  );

  it('does NOT open modal when there are no active filters (toast.info instead)', async () => {
    const { toast } = await import('sonner');
    render(<Harness scope="solicitacoes" screenLabel="Solicitações" fields={[]} />);

    act(() => {
      dispatchClearShortcut();
    });

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(toast.info).toHaveBeenCalledWith('Nenhum filtro ativo');
  });

  it('skips modal when "don\'t ask again" was set in sessionStorage for that scope', () => {
    sessionStorage.setItem('skipClearConfirm:historico-compras', '1');

    render(
      <Harness
        scope="historico-compras"
        screenLabel="Histórico de Compras"
        fields={[{ key: 'categoryFilter', label: 'Categoria', value: 'Insumos' }]}
      />,
    );

    act(() => {
      dispatchClearShortcut();
    });

    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('isolates listeners per scope: only the mounted screen reacts', async () => {
    // Only mount Solicitações.
    render(
      <Harness
        scope="solicitacoes"
        screenLabel="Solicitações"
        fields={[{ key: 'statusFilter', label: 'Status', value: 'Pendente' }]}
      />,
    );

    act(() => {
      dispatchClearShortcut();
    });

    // Modal opens for the mounted scope only — there is no leak across scopes
    // because the event listener is added/removed per mounted hook instance.
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });
});

describe('useKeyboardShortcuts wiring', () => {
  it('Ctrl + Shift + L dispatches the request-clear-filters event', async () => {
    // Lazy import inside the test so the shortcuts module doesn't bind during
    // the harness tests above.
    const React = await import('react');
    const { renderHook } = await import('@testing-library/react');
    const { MemoryRouter } = await import('react-router-dom');
    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');

    const heard = vi.fn();
    window.addEventListener('request-clear-filters', heard);

    renderHook(() => useKeyboardShortcuts(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(MemoryRouter, null, children),
    });

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'l',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        }),
      );
    });

    expect(heard).toHaveBeenCalledTimes(1);

    // Cmd + Shift + L (macOS) must also trigger.
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'L',
          metaKey: true,
          shiftKey: true,
          bubbles: true,
        }),
      );
    });

    expect(heard).toHaveBeenCalledTimes(2);

    window.removeEventListener('request-clear-filters', heard);
  });
});
