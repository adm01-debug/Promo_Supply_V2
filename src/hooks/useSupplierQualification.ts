import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/feedbackToast';

export const useSupplierQualification = () => {
  const queryClient = useQueryClient();

  const { data: requirements = [], isLoading: loadingRequirements } = useQuery({
    queryKey: ['qualification-requirements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qualification_requirements')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: scores = [], isLoading: loadingScores } = useQuery({
    queryKey: ['qualification-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_qualification_scores')
        .select('*')
        .order('overall_score', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: documents = [], isLoading: loadingDocuments } = useQuery({
    queryKey: ['supplier-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['fornecedores-qualification'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, razao_social, nome_fantasia, codigo, tipo, status')
        .eq('status', 'ativo')
        .order('razao_social');
      if (error) throw error;
      return data;
    },
  });

  const updateDocumentStatus = useMutation({
    mutationFn: async ({ docId, status, notes }: { docId: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from('supplier_documents')
        .update({ status, rejection_reason: notes, reviewed_at: new Date().toISOString() })
        .eq('id', docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-documents'] });
      queryClient.invalidateQueries({ queryKey: ['qualification-scores'] });
      toast.success('Status do documento atualizado');
    },
    onError: () => toast.error('Erro ao atualizar documento'),
  });

  return {
    requirements,
    scores,
    documents,
    suppliers,
    loading: loadingRequirements || loadingScores || loadingDocuments,
    updateDocumentStatus,
  };
};
