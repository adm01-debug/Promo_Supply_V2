import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { montarPessoas, type PessoaDaEmpresa } from '../pessoasDaEmpresa';

/**
 * Pessoas da empresa que o usuario pode ver, para escolher o "Gestor
 * Responsavel". A policy de `profiles` libera os perfis das empresas do grupo
 * do usuario (`tenant_in_my_group`), entao a leitura sai direto do banco -
 * sem lista fixa no cliente.
 *
 * O id devolvido e `profiles.user_id`, que e o valor gravado em
 * `solicitacoes.aprovador_id`.
 */
export function usePessoasDaEmpresa(tenantIds: string | string[] | null) {
  const ids = (Array.isArray(tenantIds) ? tenantIds : tenantIds ? [tenantIds] : []).filter(Boolean);
  const { data, isLoading, error } = useQuery({
    queryKey: ['pessoas-da-empresa', ids],
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PessoaDaEmpresa[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, display_name, email, tenant_id')
        .in('tenant_id', ids)
        .order('full_name', { ascending: true })
        .limit(200);
      if (error) throw error;
      return montarPessoas(data ?? []);
    },
  });

  return {
    pessoas: data ?? [],
    loading: isLoading,
    erro: error as Error | null,
  };
}
