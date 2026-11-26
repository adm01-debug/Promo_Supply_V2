import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth";

export interface Produto {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  unidade: string;
  categoria_id: string | null;
  preco_medio: number | null;
  preco_referencia: number | null;
  ultimo_preco: number | null;
  estoque_minimo: number | null;
  codigo_unspsc: string | null;
  codigo_cnae: string | null;
  codigo_ncm: string | null;
  ativo: boolean | null;
  imagem_url: string | null;
  tags: string[] | null;
  fornecedor_preferencial_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  categoria_nome?: string;
  fornecedor_nome?: string;
}

export function useProdutos() {
  const { organizationId, tenantId } = useAuth();

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos", organizationId, tenantId],
    queryFn: async () => {
      // Explicit columns: drops ~30% payload vs `*` on wide table.
      const { data, error } = await supabase
        .from("produtos")
        .select(`
          id, codigo, nome, descricao, unidade, categoria_id,
          preco_medio, preco_referencia, ultimo_preco, estoque_minimo,
          codigo_unspsc, codigo_cnae, codigo_ncm, ativo, imagem_url, tags,
          fornecedor_preferencial_id, created_at, updated_at,
          categorias(nome),
          fornecedores!produtos_fornecedor_preferencial_id_fkey(razao_social)
        `)
        .eq('organization_id', organizationId!)
        .order("nome");
      if (error) throw error;
      return (data || []).map((p) => ({
        ...p,
        categoria_nome: (p as { categorias?: { nome?: string } | null }).categorias?.nome ?? null,
        fornecedor_nome: (p as { fornecedores?: { razao_social?: string } | null }).fornecedores?.razao_social ?? null,
      })) as Produto[];
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias-list", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("id, nome").eq("ativo", true)
        .eq('organization_id', organizationId!)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 300_000,
  });

  // Leitura apenas: o cadastro/edição de produto vive no PIM (Promo Gifts V4).
  return { produtos, isLoading, categorias };
}
