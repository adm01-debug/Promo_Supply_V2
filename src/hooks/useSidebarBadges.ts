import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  return useQuery<SidebarBadges>({
    queryKey: ['sidebar-badges'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { solicitacoes: 0, cotacoes: 0, pagamentos: 0, aprovacoes: 0 };

      const [solRes, cotRes, pagRes, apvRes] = await Promise.all([
        supabase.from('solicitacoes').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('cotacoes').select('id', { count: 'exact', head: true }).in('status', ['pendente', 'aberta', 'em_analise']),
        supabase.from('pagamentos').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('workflow_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

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
