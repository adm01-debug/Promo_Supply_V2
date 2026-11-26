import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { useEmpresaFilter } from '@/features/empresas/hooks/useEmpresaFilter';

export interface SidebarBadges {
  solicitacoes: number;
  cotacoes: number;
  pagamentos: number;
  aprovacoes: number;
}

/**
 * Fetches live pending-item counts for sidebar badges.
 * Refreshes every 30 s; individual queries run in parallel.
 */
export function useSidebarBadges() {
  const { organizationId } = useAuth();
  const { empresaIds, queryKeyPart } = useEmpresaFilter();

  return useQuery<SidebarBadges>({
    queryKey: ['sidebar-badges', organizationId, queryKeyPart],
    queryFn: async () => {
      if (!organizationId) return { solicitacoes: 0, cotacoes: 0, pagamentos: 0, aprovacoes: 0 };

      let solQ = supabase.from('solicitacoes').select('id', { count: 'exact', head: true }).eq('status', 'pendente').eq('organization_id', organizationId);
      let cotQ = supabase.from('cotacoes').select('id', { count: 'exact', head: true }).in('status', ['pendente', 'aberta', 'em_analise']).eq('organization_id', organizationId);
      let pagQ = supabase.from('pagamentos').select('id', { count: 'exact', head: true }).eq('status', 'pendente').eq('organization_id', organizationId);
      let apvQ = supabase.from('approval_workflows').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('organization_id', organizationId);
      if (empresaIds) {
        solQ = solQ.in('tenant_id', empresaIds);
        cotQ = cotQ.in('tenant_id', empresaIds);
        pagQ = pagQ.in('tenant_id', empresaIds);
        apvQ = apvQ.in('tenant_id', empresaIds);
      }
      const [solRes, cotRes, pagRes, apvRes] = await Promise.all([solQ, cotQ, pagQ, apvQ]);

            // Com erro o supabase-js devolve `count: null`, e o `?? 0` transformava a falha em
            // "nenhuma pendencia": o badge sumia e o menu afirmava zero. Lancar deixa o
            // consumidor distinguir "zero" de "nao consegui contar".
            const firstError = solRes.error ?? cotRes.error ?? pagRes.error ?? apvRes.error;
            if (firstError) throw firstError;

      return {
        solicitacoes: solRes.count ?? 0,
        cotacoes: cotRes.count ?? 0,
        pagamentos: pagRes.count ?? 0,
        aprovacoes: apvRes.count ?? 0,
      };
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
