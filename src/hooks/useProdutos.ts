import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*, categorias(nome), fornecedores!produtos_fornecedor_preferencial_id_fkey(razao_social)")
        .order("nome");
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        categoria_nome: p.categorias?.nome || null,
        fornecedor_nome: p.fornecedores?.razao_social || null,
      })) as Produto[];
    },
    staleTime: 60_000,
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data || [];
    },
    staleTime: 300_000,
  });

  const createProduto = useMutation({
    mutationFn: async (produto: Partial<Produto>) => {
      const { data, error } = await supabase.from("produtos").insert(produto as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto criado com sucesso!");
    },
    onError: (err: Error) => toast.error("Erro ao criar produto: " + err.message),
  });

  const updateProduto = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Produto> & { id: string }) => {
      const { data, error } = await supabase.from("produtos").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto atualizado!");
    },
    onError: (err: Error) => toast.error("Erro ao atualizar: " + err.message),
  });

  return { produtos, isLoading, categorias, createProduto, updateProduto };
}
