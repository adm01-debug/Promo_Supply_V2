/**
 * Registry of route → dynamic import for JS chunk pre-warming.
 *
 * Vite/Rollup dedupe chunks by module specifier, so calling `import()` here
 * with the SAME specifier used in AppRoutes warms the exact same chunk.
 *
 * Usage:
 *   import { prefetchRouteChunk, warmTopRoutes } from "@/lib/routePrefetch";
 *   prefetchRouteChunk("/pedidos");
 */

type Loader = () => Promise<unknown>;

// Keep specifiers identical to AppRoutes.tsx lazy() calls.
const loaders: Record<string, Loader> = {
  "/compras": () => import("@/pages/dashboard/ComprasDashboard"),
  "/dashboard-executivo": () => import("@/pages/dashboard/DashboardExecutivo"),
  "/cotacao": () => import("@/pages/cotacao/Cotacao"),
  "/solicitacoes": () => import("@/pages/solicitacoes/Solicitacoes"),
  "/pedidos": () => import("@/pages/pedidos/Pedidos"),
  "/pagamentos": () => import("@/pages/pagamentos/Pagamentos"),
  "/fornecedores": () => import("@/pages/fornecedores/Fornecedores"),
  "/acompanhamento": () => import("@/pages/acompanhamento/Acompanhamento"),
  "/gerar-ordem": () => import("@/pages/gerar-ordem/GerarOrdem"),
  "/relatorios": () => import("@/pages/relatorios/Relatorios"),
  "/aprovacoes": () => import("@/pages/aprovacoes/Aprovacoes"),
  "/contratos": () => import("@/pages/contratos/Contratos"),
  "/historico-compras": () => import("@/pages/historico/HistoricoCompras"),
  "/kanban": () => import("@/pages/kanban/KanbanWorkflow"),
  "/catalogo-produtos": () => import("@/pages/catalogo-produtos/CatalogoProdutos"),
  "/estoque": () => import("@/pages/estoque/GestaoEstoque"),
  "/devolucoes": () => import("@/pages/devolucoes/Devolucoes"),
};

const warmed = new Set<string>();

/** Match dynamic routes like /cotacao/:id back to the root key. */
function normalize(route: string): string {
  if (route in loaders) return route;
  // Strip trailing /<id> segments.
  const root = "/" + route.split("/").filter(Boolean)[0];
  return root;
}

export function prefetchRouteChunk(route: string): void {
  const key = normalize(route);
  if (warmed.has(key)) return;
  const loader = loaders[key];
  if (!loader) return;
  warmed.add(key);
  // Fire-and-forget; swallow errors (offline, chunk 404 on stale build).
  loader().catch(() => warmed.delete(key));
}

/**
 * Warm the top likely-next routes during browser idle time.
 * Called once after the shell mounts.
 */
export function warmTopRoutes(routes: string[] = [
  "/compras",
  "/solicitacoes",
  "/pedidos",
  "/fornecedores",
  "/pagamentos",
]): void {
  if (typeof window === "undefined") return;
  const schedule =
    (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
  schedule(() => {
    for (const r of routes) prefetchRouteChunk(r);
  }, { timeout: 2000 } as never);
}
