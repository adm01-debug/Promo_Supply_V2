import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nomeDaPessoa, type ProfileRow } from '../pessoasDaEmpresa';

/** Mapa vazio estavel - evita recriar a dependencia do `useMemo` a cada render. */
const SEM_NOMES: ReadonlyMap<string, string> = new Map<string, string>();

/**
 * Mapa `aprovador_id -> nome` para a lista de solicitacoes.
 *
 * `solicitacoes.aprovador_id` guarda `profiles.user_id`, mas nao existe FK para
 * `profiles` nos types gerados: o join do PostgREST nao devolve o nome, entao a
 * resolucao e no cliente, pelos ids da pagina atual.
 */
export function useNomesDeGestor(gestorIds: Array<string | null | undefined>): ReadonlyMap<string, string> {
  const ids = Array.from(new Set(gestorIds.map((id) => (id ?? '').trim()).filter(Boolean))).sort();
  const { data } = useQuery({
    queryKey: ['nomes-de-gestor', ids],
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, display_name, email')
        .in('user_id', ids)
        .limit(200);
      if (error) throw error;
      const nomes = new Map<string, string>();
      for (const row of (data ?? []) as ProfileRow[]) {
        const id = (row.user_id ?? '').trim();
        if (id && !nomes.has(id)) nomes.set(id, nomeDaPessoa(row));
      }
      return nomes;
    },
  });
  return data ?? SEM_NOMES;
}
