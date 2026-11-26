import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth";
import { toast } from "@/lib/feedbackToast";

export interface ProdutoFornecedor {
  id: string;
  produto_id: string;
  fornecedor_id: string;
  preco_custo: number | null;
  lead_time_estimado: number | null;
  codigo_no_fornecedor: string | null;
  preferencial: boolean;
  ultima_cotacao_id: string | null;
  // Joined
  fornecedor_nome?: string;
  fornecedor_email?: string;
  fornecedor_rating?: number;
}

export function useProdutoFornecedores(produtoId?: string) {
  const { tenantId, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ["produto-fornecedores", produtoId, tenantId],
    queryFn: async () => {
      if (!produtoId || !tenantId) return [];
      
      const { data, error } = await supabase
        .from("produto_fornecedores")
        .select(`
          *,
          fornecedores (
            razao_social,
            email,
            avaliacao
          )
        `)
        .eq("produto_id", produtoId)
        .eq("organization_id", tenantId);

      if (error) throw error;
      
      return (data || []).map((pf) => ({
        ...pf,
        fornecedor_nome: (pf as { fornecedores?: { razao_social?: string; email?: string; avaliacao?: number | null } | null }).fornecedores?.razao_social,
        fornecedor_email: (pf as { fornecedores?: { razao_social?: string; email?: string; avaliacao?: number | null } | null }).fornecedores?.email,
        fornecedor_rating: (pf as { fornecedores?: { razao_social?: string; email?: string; avaliacao?: number | null } | null }).fornecedores?.avaliacao,
      })) as ProdutoFornecedor[];
    },
    enabled: !!produtoId && !!tenantId,
  });

  const linkFornecedor = useMutation({
    mutationFn: async (input: Omit<ProdutoFornecedor, 'id' | 'preferencial' | 'ultima_cotacao_id'>) => {
      if (!tenantId) throw new Error("Tenant ID missing");
      
      const { data, error } = await supabase
        .from("produto_fornecedores")
        .insert({
          produto_id: input.produto_id,
          fornecedor_id: input.fornecedor_id,
          preco_custo: input.preco_custo,
          lead_time_estimado: input.lead_time_estimado,
          codigo_no_fornecedor: input.codigo_no_fornecedor ?? null,
          organization_id: tenantId,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produto-fornecedores", produtoId] });
      toast.success("Fornecedor vinculado ao produto!");
    },
    onError: (err: Error) => toast.error("Erro ao vincular fornecedor: " + err.message),
  });

  const removeLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("produto_fornecedores")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produto-fornecedores", produtoId] });
      toast.success("Vínculo removido!");
    },
  });

  return { fornecedores, isLoading, linkFornecedor, removeLink };
}
