import { useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuthContext';

/**
 * Hook central para filtragem por empresa nas queries.
 *
 * Retorna:
 * - `empresaIds`: lista de IDs a filtrar. `null` = "Todas as empresas do grupo"
 *   (não aplique nenhum filtro — a RLS já restringe ao grupo do usuário).
 * - `selectedEmpresaId`: a empresa em foco (ou null para visão consolidada).
 * - `allEmpresaIds`: todos os IDs do grupo (útil para visualizações que sempre
 *   precisam de tudo, mesmo quando uma empresa está selecionada).
 *
 * Padrão de uso em queries TanStack:
 * ```ts
 * const { empresaIds, queryKeyPart } = useEmpresaFilter();
 * useQuery({
 *   queryKey: ['pedidos', queryKeyPart],
 *   queryFn: () => {
 *     let q = supabase.from('pedidos').select('*');
 *     if (empresaIds) q = q.in('tenant_id', empresaIds);
 *     return q;
 *   },
 * });
 * ```
 */
export function useEmpresaFilter() {
  const { selectedEmpresaId, availableEmpresas } = useAuth();

  return useMemo(() => {
    const allEmpresaIds = availableEmpresas.map((e) => e.id);
    const empresaIds = selectedEmpresaId ? [selectedEmpresaId] : null;
    const queryKeyPart = selectedEmpresaId ?? 'all';
    const isConsolidatedView = selectedEmpresaId === null;
    const selectedEmpresa = selectedEmpresaId
      ? availableEmpresas.find((e) => e.id === selectedEmpresaId) ?? null
      : null;

    return {
      empresaIds,
      selectedEmpresaId,
      selectedEmpresa,
      allEmpresaIds,
      availableEmpresas,
      isConsolidatedView,
      queryKeyPart,
    };
  }, [selectedEmpresaId, availableEmpresas]);
}
