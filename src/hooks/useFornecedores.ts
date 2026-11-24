import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { logger } from '@/lib/logger';
import { auditHelpers } from '@/services/auditService';
import { toast } from '@/lib/feedbackToast';
import { format } from 'date-fns';
import { escapeIlike } from '@/lib/supabaseQuery';
import {
  mensagemCnpjJaCadastrado,
  mensagemDuplicidadeFornecedor,
  somenteDigitos,
} from '@/lib/unicidadeCadastro';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import type { Database } from '@/integrations/supabase/types';

export type Fornecedor = Database['public']['Tables']['fornecedores']['Row'];

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
  const { user, tenantId, organizationId } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['fornecedores', user?.id, tenantId, organizationId, filters?.tipo, filters?.status, filters?.search];

  const { data: fornecedores = [], isLoading: loading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
          if (!organizationId) return [];

      let query = supabase
        .from('fornecedores')
        .select('id, codigo, razao_social, nome_fantasia, cnpj, email, telefone, endereco, cidade, estado, cep, website, tipo, segmento, status, avaliacao, condicoes_pagamento, prazo_medio_entrega, integrado_api, api_endpoint, observacoes, limite_credito, saldo_comprometido, created_at, updated_at, created_by')
        .order('razao_social', { ascending: true })
        .eq('organization_id', organizationId);

      if (filters?.tipo && filters.tipo !== 'todos') query = query.eq('tipo', filters.tipo);
      if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status);
      if (filters?.search) {
        const s = escapeIlike(filters.search);
        query = query.or(`razao_social.ilike.%${s}%,nome_fantasia.ilike.%${s}%,cnpj.ilike.%${s}%`);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      return data as Fornecedor[];
    },
          enabled: !!user && !!organizationId,
    staleTime: 60_000,
  });

  // CNPJ validation helper
  const validateCNPJ = useCallback((cnpj: string): boolean => {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return false;
    if (/^(\d)\1+$/.test(clean)) return false;
    const calc = (str: string, weights: number[]) =>
      str.split('').reduce((sum, d, i) => sum + parseInt(d, 10) * weights[i], 0);
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const d1 = calc(clean.slice(0, 12), w1) % 11;
    const check1 = d1 < 2 ? 0 : 11 - d1;
    if (parseInt(clean[12], 10) !== check1) return false;
    const d2 = calc(clean.slice(0, 13), w2) % 11;
    const check2 = d2 < 2 ? 0 : 11 - d2;
    return parseInt(clean[13], 10) === check2;
  }, []);

  // Create new fornecedor
  const createFornecedor = useCallback(async (input: CreateFornecedorInput) => {
    if (!user || !organizationId || !tenantId) {
          toast.error('Você precisa estar logado em uma organização');
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

        // CNPJ e UNIQUE global no banco (fornecedores_cnpj_key nao inclui a empresa):
        // o duplicado desta empresa da para pegar antes do insert; o de outra empresa
        // a RLS esconde, e esse caso cai no 23505 traduzido no catch.
        const cnpjDigitos = somenteDigitos(input.cnpj);
        if (cnpjDigitos) {
          const { data: cnpjExistente, error: erroChecagem } = await supabase
            .from('fornecedores')
            .select('id, razao_social')
            .eq('cnpj', cnpjDigitos)
            .maybeSingle();
          if (erroChecagem) {
            logger.warn('Nao foi possivel checar CNPJ duplicado antes do insert', { error: erroChecagem });
          } else if (cnpjExistente) {
            toast.error(mensagemCnpjJaCadastrado(cnpjExistente.razao_social));
            return null;
          }
        }

    try {
      logger.info('Criando novo fornecedor', { razaoSocial: input.razao_social, cnpj: input.cnpj });
      // Generate codigo
      const { data: codeData } = await supabase.rpc('generate_sequential_number', {
        prefix: 'FOR',
        table_name: 'fornecedores'
      });

      const codigo = codeData || `FOR-${format(new Date(), 'yyyyMMddHHmmss')}`;

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
                    tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao inserir fornecedor no banco', { error, input });
        throw error;
      }

      // Audit Log
      await auditHelpers.logCreate(
        'fornecedor', 
        data.id, 
        `Fornecedor ${data.razao_social} cadastrado por ${user.email}`,
        data
      );

      logger.info('Fornecedor cadastrado com sucesso', { id: data.id, razaoSocial: data.razao_social });
      toast.success('Fornecedor cadastrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro fatal ao cadastrar fornecedor', { error: errorMessage, input });
          toast.error(mensagemDuplicidadeFornecedor(err) ?? 'Erro ao cadastrar fornecedor: ' + errorMessage);
      return null;
    }
  }, [user, tenantId, organizationId, queryClient, validateCNPJ]);

  // Update fornecedor
  const updateFornecedor = useCallback(async (id: string, updates: Partial<Fornecedor>) => {
    try {
      logger.info('Atualizando fornecedor', { id, updates });
      const { error } = await supabase
        .from('fornecedores')
        .update(updates)
        .eq('id', id);

      if (error) {
        logger.error('Erro ao atualizar fornecedor no banco', { error, id, updates });
        throw error;
      }

      toast.success('Fornecedor atualizado!');
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro fatal ao atualizar fornecedor', { error: errorMessage, id });
      toast.error('Erro ao atualizar: ' + errorMessage);
      return false;
    }
  }, [queryClient]);

  // Delete fornecedor
  const deleteFornecedor = useCallback(async (id: string) => {
    try {
      logger.info('Excluindo fornecedor', { id });

      // Credito, pagamento e pedido sao historico e dinheiro: a FK de
      // creditos_fornecedor esta em CASCADE e apagaria o saldo junto com o
      // fornecedor, entao a exclusao e recusada enquanto houver dependente.
      const [creditos, pagamentos, pedidos] = await Promise.all([
        supabase.from('creditos_fornecedor').select('id', { count: 'exact', head: true }).eq('fornecedor_id', id),
        supabase.from('pagamentos').select('id', { count: 'exact', head: true }).eq('fornecedor_id', id),
        supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('fornecedor_id', id),
      ]);

      const erroContagem = creditos.error ?? pagamentos.error ?? pedidos.error;
      if (erroContagem) {
        logger.error('Nao foi possivel conferir dependencias do fornecedor', { error: erroContagem, id });
        toast.error('Nao foi possivel conferir o historico do fornecedor. Exclusao cancelada.');
        return false;
      }

      const dependentes = [
        { rotulo: 'credito(s) de fornecedor', total: creditos.count ?? 0 },
        { rotulo: 'pagamento(s)', total: pagamentos.count ?? 0 },
        { rotulo: 'pedido(s)', total: pedidos.count ?? 0 },
      ].filter((item) => item.total > 0);

      if (dependentes.length > 0) {
        logger.warn('Exclusao de fornecedor bloqueada por dependencias', { id, dependentes });
        toast.error(
          `Fornecedor com historico nao pode ser excluido: ${dependentes
            .map((item) => `${item.total} ${item.rotulo}`)
            .join(', ')}.`
        );
        return false;
      }

      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Erro ao excluir fornecedor no banco', { error, id });
        throw error;
      }
      logger.info('Fornecedor excluído com sucesso', { id });

      toast.success('Fornecedor excluído!');
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro fatal ao excluir fornecedor', { error: errorMessage, id });
      toast.error('Erro ao excluir: ' + errorMessage);
      return false;
    }
  }, [queryClient]);

  useRealtimeSubscription({
    tables: ['fornecedores'],
    queryKeysToInvalidate: [['fornecedores']],
    enabled: !!user,
  });

  return {
    fornecedores,
    loading,
    error,
    refetch,
    createFornecedor,
    updateFornecedor,
    deleteFornecedor,
  };
}

// Hook for KPIs optimized with RPC and React Query
export function useFornecedoresKPIs() {
  const { user, organizationId } = useAuth();

  const { data: kpis = { total: 0, ativos: 0, integradosApi: 0, mediaAvaliacao: 0 }, isLoading } = useQuery({
    queryKey: ['fornecedores-kpis', user?.id, organizationId],
    queryFn: async () => {
      if (!organizationId) return { total: 0, ativos: 0, integradosApi: 0, mediaAvaliacao: 0 };
      
      const { data, error } = await supabase.rpc('get_fornecedores_kpis', { 
        p_organization_id: organizationId 
      });

      if (error) {
        logger.error('Error fetching Fornecedores KPIs via RPC', { error });
        throw error;
      }

      return data as { 
        total: number; 
        ativos: number; 
        integradosApi: number; 
        mediaAvaliacao: number; 
      };
    },
    enabled: !!user && !!organizationId,
    staleTime: 60_000,
  });

  return { kpis, loading: isLoading };
}
