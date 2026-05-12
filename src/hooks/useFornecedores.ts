import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { auditHelpers } from '@/services/auditService';
import { toast } from 'sonner';

export interface Fornecedor {
  id: string;
  codigo: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  website: string | null;
  tipo: 'nacional' | 'internacional' | 'local';
  segmento: string | null;
  avaliacao: number;
  prazo_medio_entrega: number;
  condicoes_pagamento: string | null;
  integrado_api: boolean;
  api_endpoint: string | null;
  status: 'ativo' | 'inativo' | 'bloqueado' | 'pendente';
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFornecedorInput {
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  website?: string;
  tipo?: Fornecedor['tipo'];
  segmento?: string;
  condicoes_pagamento?: string;
  observacoes?: string;
}

export interface FornecedorFilters {
  search?: string;
  tipo?: string;
  status?: string;
}

export function useFornecedores(filters?: FornecedorFilters) {
  const { user, organizationId } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFornecedores = useCallback(async () => {
    if (!user || !organizationId) {
      setFornecedores([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('fornecedores')
        .select('id, codigo, razao_social, nome_fantasia, cnpj, email, telefone, endereco, cidade, estado, cep, website, tipo, segmento, status, avaliacao, condicoes_pagamento, prazo_medio_entrega, integrado_api, api_endpoint, observacoes, limite_credito, saldo_comprometido, created_at, updated_at, created_by')
        .order('razao_social', { ascending: true })
        .eq('organization_id', organizationId);

      // Apply filters
      if (filters?.tipo && filters.tipo !== 'todos') {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`razao_social.ilike.%${filters.search}%,nome_fantasia.ilike.%${filters.search}%,cnpj.ilike.%${filters.search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setFornecedores((data as Fornecedor[]) || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error fetching fornecedores:', err);
      setError(errorMessage);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  }, [user, filters?.tipo, filters?.status, filters?.search]);

  // CNPJ validation helper
  const validateCNPJ = useCallback((cnpj: string): boolean => {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return false;
    if (/^(\d)\1+$/.test(clean)) return false;
    const calc = (str: string, weights: number[]) =>
      str.split('').reduce((sum, d, i) => sum + parseInt(d) * weights[i], 0);
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const d1 = calc(clean.slice(0, 12), w1) % 11;
    const check1 = d1 < 2 ? 0 : 11 - d1;
    if (parseInt(clean[12]) !== check1) return false;
    const d2 = calc(clean.slice(0, 13), w2) % 11;
    const check2 = d2 < 2 ? 0 : 11 - d2;
    return parseInt(clean[13]) === check2;
  }, []);

  // Create new fornecedor
  const createFornecedor = useCallback(async (input: CreateFornecedorInput) => {
    if (!user || !organizationId) {
      toast.error('Você precisa estar logado');
      return null;
    }

    // Validate CNPJ if provided
    if (input.cnpj && input.cnpj.trim().length > 0) {
      if (!validateCNPJ(input.cnpj)) {
        toast.error('CNPJ inválido. Verifique os dígitos verificadores.');
        return null;
      }
    }

    // Validate email if provided
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      toast.error('Email inválido.');
      return null;
    }

    try {
      // Generate codigo
      const { data: codeData } = await supabase.rpc('generate_sequential_number', {
        prefix: 'FOR',
        table_name: 'fornecedores'
      });

      const codigo = codeData || `FOR-${Date.now()}`;

      const { data, error } = await supabase
        .from('fornecedores')
        .insert({
          codigo,
          razao_social: input.razao_social,
          nome_fantasia: input.nome_fantasia,
          cnpj: input.cnpj,
          email: input.email,
          telefone: input.telefone,
          endereco: input.endereco,
          cidade: input.cidade,
          estado: input.estado,
          cep: input.cep,
          website: input.website,
          tipo: input.tipo || 'nacional',
          segmento: input.segmento,
          condicoes_pagamento: input.condicoes_pagamento,
          observacoes: input.observacoes,
          created_by: user.id,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw error;

      // Audit Log
      await auditHelpers.logCreate(
        'fornecedor', 
        data.id, 
        `Fornecedor ${data.razao_social} cadastrado por ${user.email}`,
        data
      );

      toast.success('Fornecedor cadastrado com sucesso!');
      fetchFornecedores();
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error creating fornecedor:', err);
      toast.error('Erro ao cadastrar fornecedor: ' + errorMessage);
      return null;
    }
  }, [user, fetchFornecedores]);

  // Update fornecedor
  const updateFornecedor = useCallback(async (id: string, updates: Partial<Fornecedor>) => {
    try {
      const { error } = await supabase
        .from('fornecedores')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Fornecedor atualizado!');
      fetchFornecedores();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error updating fornecedor:', err);
      toast.error('Erro ao atualizar: ' + errorMessage);
      return false;
    }
  }, [fetchFornecedores]);

  // Delete fornecedor
  const deleteFornecedor = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Fornecedor excluído!');
      fetchFornecedores();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error deleting fornecedor:', err);
      toast.error('Erro ao excluir: ' + errorMessage);
      return false;
    }
  }, [fetchFornecedores]);

  // Initial fetch
  useEffect(() => {
    fetchFornecedores();
  }, [fetchFornecedores]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('fornecedores-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fornecedores'
        },
        () => {
          fetchFornecedores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchFornecedores]);

  return {
    fornecedores,
    loading,
    error,
    refetch: fetchFornecedores,
    createFornecedor,
    updateFornecedor,
    deleteFornecedor,
  };
}

// Hook for KPIs
export function useFornecedoresKPIs() {
  const { user, organizationId } = useAuth();
  const [kpis, setKpis] = useState({
    total: 0,
    ativos: 0,
    integradosApi: 0,
    mediaAvaliacao: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !organizationId) return;

    const fetchKPIs = async () => {
      try {
        const { data, error } = await supabase
          .from('fornecedores')
          .select('status, integrado_api, avaliacao')
          .eq('organization_id', organizationId);

        if (error) throw error;

        const stats = {
          total: data?.length || 0,
          ativos: data?.filter(f => f.status === 'ativo').length || 0,
          integradosApi: data?.filter(f => f.integrado_api).length || 0,
          mediaAvaliacao: data?.length 
            ? data.reduce((sum, f) => sum + (f.avaliacao || 0), 0) / data.length 
            : 0,
        };

        setKpis(stats);
      } catch (err) {
        console.error('Error fetching KPIs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, [user]);

  return { kpis, loading };
}
