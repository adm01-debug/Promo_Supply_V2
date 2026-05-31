import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth";
import { toast } from "@/lib/feedbackToast";

export interface EstoqueItem {
  id: string;
  produto_id: string;
  localizacao: string;
  quantidade_atual: number;
  estoque_minimo: number | null;
  estoque_maximo: number | null;
  ponto_pedido: number | null;
  ultimo_inventario: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  produto_nome?: string;
  produto_codigo?: string;
}

export interface Movimentacao {
  id: string;
  estoque_id: string;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'reserva';
  quantidade: number;
  motivo: string | null;
  referencia_tipo: string | null;
  referencia_id: string | null;
  data_movimentacao: string;
  usuario_id: string;
}

export function useEstoque() {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();

  const { data: estoque = [], isLoading } = useQuery({
    queryKey: ["estoque", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("estoque")
        .select("*, produtos(nome, codigo)")
        .eq('organization_id', organizationId)
        .order("localizacao");
      
      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        ...item,
        produto_nome: item.produtos?.nome,
        produto_codigo: item.produtos?.codigo,
      })) as EstoqueItem[];
    },
    enabled: !!organizationId,
  });

  const movimentar = useMutation({
    mutationFn: async (mov: Omit<Movimentacao, 'id' | 'data_movimentacao' | 'usuario_id'>) => {
      if (!organizationId) throw new Error("Organization ID missing");
      
      const { data, error } = await supabase
        .from("estoque_movimentacoes")
        .insert({
          ...mov,
          organization_id: organizationId,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque", organizationId] });
      toast.success("Movimentação registrada com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao registrar movimentação: " + err.message),
  });

  const criarItemEstoque = useMutation({
    mutationFn: async (item: Partial<EstoqueItem>) => {
      if (!organizationId) throw new Error("Organization ID missing");
      
      const { data, error } = await supabase
        .from("estoque")
        .insert({
          ...item,
          organization_id: organizationId,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque", organizationId] });
      toast.success("Produto vinculado ao estoque!");
    },
    onError: (err: any) => toast.error("Erro ao vincular ao estoque: " + err.message),
  });

  return { estoque, isLoading, movimentar, criarItemEstoque };
}
