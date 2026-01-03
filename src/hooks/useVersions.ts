import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Version {
  id: string;
  entity_type: string;
  entity_id: string;
  version_number: number;
  data: Record<string, unknown>;
  changed_by: string | null;
  changed_at: string;
  change_summary: string | null;
}

// Note: This hook expects an 'entity_versions' table which may need to be created
// For now, returns empty data if the table doesn't exist
export function useVersions(entityType: string, entityId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['versions', entityType, entityId];

  const { data: versions = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      // Try to query versions - may fail if table doesn't exist
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('contract_history')
          .select('*')
          .eq('contract_id', entityId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Versions table not available:', error.message);
          return [];
        }

        // Map to Version format
        return (data || []).map((item: Record<string, unknown>, index: number) => ({
          id: item.id as string,
          entity_type: entityType,
          entity_id: entityId,
          version_number: (data?.length || 0) - index,
          data: item.new_values as Record<string, unknown> || {},
          changed_by: item.performed_by as string | null,
          changed_at: item.created_at as string,
          change_summary: item.action_description as string | null,
        })) as Version[];
      } catch {
        return [];
      }
    },
    enabled: !!entityId,
  });

  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const version = versions.find((v) => v.id === versionId);
      if (!version) throw new Error('Versão não encontrada');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(entityType)
        .update(version.data)
        .eq('id', entityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Versão restaurada!');
    },
  });

  return {
    versions,
    isLoading,
    restoreVersion: restoreMutation.mutate,
    currentVersion: versions[0],
  };
}
