
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import type { Database } from '@/integrations/supabase/types';

export type PortalPedido = Database['public']['Tables']['pedidos']['Row'];
export type PortalCotacao = Database['public']['Tables']['cotacoes']['Row'] & {
  solicitacao?: { titulo?: string | null; numero?: string | null } | null;
};
export type PortalContrato = {
  id: string;
  contract_number: string | null;
  title: string | null;
  status: string | null;
  start_date: string;
  end_date: string;
  total_value: number | null;
};

export function usePortalFornecedorData(fornecedorId: string | null) {
  const { user } = useAuth();

  const { data: fornecedor, isLoading: loadingFornecedor } = useQuery({
    queryKey: ['portal-fornecedor', fornecedorId],
    queryFn: async () => {
      if (!fornecedorId) return null;
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('id', fornecedorId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!fornecedorId,
  });

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['portal-pedidos', fornecedorId],
    queryFn: async () => {
      if (!fornecedorId) return [];
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('fornecedor_id', fornecedorId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!fornecedorId,
  });

  const { data: cotacoes = [], isLoading: loadingCotacoes } = useQuery({
    queryKey: ['portal-cotacoes', fornecedorId],
    queryFn: async () => {
      if (!fornecedorId) return [];
      const { data, error } = await supabase
        .from('cotacoes')
        .select('*, solicitacao:solicitacoes(titulo, numero)')
        .eq('fornecedor_id', fornecedorId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!fornecedorId,
  });

  const { data: contratos = [] } = useQuery({
    queryKey: ['portal-contratos', fornecedorId],
    queryFn: async () => {
      if (!fornecedorId) return [];
      const { data, error } = await (supabase as any)
        .from('contracts')
        .select('id, contract_number, title, status, start_date, end_date, total_value')
        .eq('supplier_id', fornecedorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!fornecedorId,
  });

  const { data: qualScore } = useQuery({
    queryKey: ['portal-qual', fornecedorId],
    queryFn: async () => {
      if (!fornecedorId) return null;
      const { data, error } = await supabase
        .from('supplier_qualification_scores')
        .select('*')
        .eq('fornecedor_id', fornecedorId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!fornecedorId,
  });

  return {
    fornecedor,
    pedidos,
    cotacoes,
    contratos,
    qualScore,
    isLoading: loadingFornecedor || loadingPedidos || loadingCotacoes,
  };
}

export const statusPedido: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  em_transito: { label: 'Em Trânsito', variant: 'default' },
  entregue: { label: 'Entregue', variant: 'outline' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};

export const statusCotacao: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  enviada: { label: 'Enviada', variant: 'default' },
  aprovada: { label: 'Aprovada', variant: 'default' },
  rejeitada: { label: 'Rejeitada', variant: 'destructive' },
};

