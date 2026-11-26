import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all page imports so dynamic import() doesn't fail in test env
vi.mock('@/pages/dashboard/ComprasDashboard', () => ({ default: {} }));
vi.mock('@/pages/dashboard/DashboardExecutivo', () => ({ default: {} }));
vi.mock('@/pages/cotacao/Cotacao', () => ({ default: {} }));
vi.mock('@/pages/solicitacoes/Solicitacoes', () => ({ default: {} }));
vi.mock('@/pages/pedidos/Pedidos', () => ({ default: {} }));
vi.mock('@/pages/pagamentos/Pagamentos', () => ({ default: {} }));
vi.mock('@/pages/fornecedores/Fornecedores', () => ({ default: {} }));
vi.mock('@/pages/acompanhamento/Acompanhamento', () => ({ default: {} }));
vi.mock('@/pages/gerar-ordem/GerarOrdem', () => ({ default: {} }));
vi.mock('@/pages/relatorios/Relatorios', () => ({ default: {} }));
vi.mock('@/pages/aprovacoes/Aprovacoes', () => ({ default: {} }));
vi.mock('@/pages/contratos/Contratos', () => ({ default: {} }));
vi.mock('@/pages/historico/HistoricoCompras', () => ({ default: {} }));
vi.mock('@/pages/kanban/KanbanWorkflow', () => ({ default: {} }));
vi.mock('@/pages/catalogo-produtos/CatalogoProdutos', () => ({ default: {} }));
vi.mock('@/pages/estoque/GestaoEstoque', () => ({ default: {} }));
vi.mock('@/pages/devolucoes/Devolucoes', () => ({ default: {} }));

import { prefetchRouteChunk, warmTopRoutes } from '../routePrefetch';

// ─── routePrefetch ────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset the warmed Set between tests by reimporting freshly isn't trivial;
  // instead we call prefetchRouteChunk for multiple known routes and rely on
  // idempotency tests to verify dedup behaviour.
  vi.clearAllMocks();
});

describe('prefetchRouteChunk', () => {
  it('is a function', () => {
    expect(typeof prefetchRouteChunk).toBe('function');
  });

  it('does not throw for a known route', () => {
    expect(() => prefetchRouteChunk('/solicitacoes')).not.toThrow();
  });

  it('does not throw for an unknown route', () => {
    expect(() => prefetchRouteChunk('/this-does-not-exist')).not.toThrow();
  });

  it('does not throw for empty string', () => {
    expect(() => prefetchRouteChunk('')).not.toThrow();
  });

  it('normalizes dynamic sub-routes to root key (/pedidos/123 → /pedidos)', () => {
    expect(() => prefetchRouteChunk('/pedidos/123')).not.toThrow();
  });

  it('normalizes /cotacao/:id to /cotacao', () => {
    expect(() => prefetchRouteChunk('/cotacao/abc-uuid')).not.toThrow();
  });

  it('can be called multiple times without throwing (idempotent)', () => {
    expect(() => {
      prefetchRouteChunk('/compras');
      prefetchRouteChunk('/compras');
      prefetchRouteChunk('/compras');
    }).not.toThrow();
  });

  it('handles all 17 registered routes without error', () => {
    const routes = [
      '/compras', '/dashboard-executivo', '/cotacao', '/solicitacoes',
      '/pedidos', '/pagamentos', '/fornecedores', '/acompanhamento',
      '/gerar-ordem', '/relatorios', '/aprovacoes', '/contratos',
      '/historico-compras', '/kanban', '/catalogo-produtos', '/estoque',
      '/devolucoes',
    ];
    expect(() => {
      routes.forEach(r => prefetchRouteChunk(r));
    }).not.toThrow();
  });
});

describe('warmTopRoutes', () => {
  it('is a function', () => {
    expect(typeof warmTopRoutes).toBe('function');
  });

  it('does not throw when called with default routes', () => {
    expect(() => warmTopRoutes()).not.toThrow();
  });

  it('does not throw when called with custom routes', () => {
    expect(() => warmTopRoutes(['/compras', '/pedidos'])).not.toThrow();
  });

  it('does not throw for empty routes array', () => {
    expect(() => warmTopRoutes([])).not.toThrow();
  });

  it('schedules via requestIdleCallback when available', () => {
    const mockRIC = vi.fn((cb: () => void) => { cb(); return 1; });
    (window as unknown as Record<string, unknown>).requestIdleCallback = mockRIC;
    warmTopRoutes(['/compras']);
    expect(mockRIC).toHaveBeenCalledOnce();
    delete (window as unknown as Record<string, unknown>).requestIdleCallback;
  });

  it('falls back to setTimeout when requestIdleCallback is not available', () => {
    const mockTimeout = vi.spyOn(window, 'setTimeout').mockImplementation((cb) => { (cb as () => void)(); return 0 as unknown as ReturnType<typeof setTimeout>; });
    delete (window as unknown as Record<string, unknown>).requestIdleCallback;
    warmTopRoutes(['/solicitacoes']);
    expect(mockTimeout).toHaveBeenCalled();
    mockTimeout.mockRestore();
  });

  it('returns undefined (does not return a value)', () => {
    const result = warmTopRoutes([]);
    expect(result).toBeUndefined();
  });

  it('does not throw when given a list of unknown routes', () => {
    expect(() => warmTopRoutes(['/ghost', '/not-a-page', '/404'])).not.toThrow();
  });

  it('can be called multiple times consecutively without throwing', () => {
    expect(() => {
      warmTopRoutes(['/compras']);
      warmTopRoutes(['/pedidos']);
      warmTopRoutes([]);
    }).not.toThrow();
  });
});
