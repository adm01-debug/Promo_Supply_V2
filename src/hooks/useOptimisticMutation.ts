import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useUndoStore } from '@/stores/undoStore';

interface OptimisticContext<TData> {
  previousData: TData | undefined;
}

interface OptimisticMutationOptions<TData, TVariables> {
  queryKey: string[];
  mutationFn: (variables: TVariables) => Promise<TData>;
  getOptimisticData: (old: TData | undefined, variables: TVariables) => TData;
  getUndoData?: (old: TData | undefined, variables: TVariables) => TData;
  successMessage?: string;
  errorMessage?: string;
  undoDescription?: string;
  onSuccess?: (data: TData, variables: TVariables, context: OptimisticContext<TData>) => void;
  onError?: (error: Error, variables: TVariables, context: OptimisticContext<TData>) => void;
}

export function useOptimisticMutation<TData, TVariables>({
  queryKey,
  mutationFn,
  getOptimisticData,
  getUndoData,
  successMessage,
  errorMessage = 'Erro ao realizar operação',
  undoDescription,
  onSuccess,
  onError,
}: OptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const { addAction } = useUndoStore();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<TData>(queryKey);
      queryClient.setQueryData<TData>(queryKey, (old) => getOptimisticData(old, variables));
      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(errorMessage);
      onError?.(error as Error, variables, context as OptimisticContext<TData>);
    },
    onSuccess: (data, variables, context) => {
      if (successMessage) {
        toast.success(successMessage);
      }

      if (undoDescription && getUndoData && context?.previousData) {
        const previousData = context.previousData;
        addAction({
          type: 'optimistic-mutation',
          description: undoDescription,
          undo: async () => {
            queryClient.setQueryData(queryKey, previousData);
          },
          redo: async () => {
            queryClient.setQueryData(queryKey, (old: TData | undefined) => 
              getOptimisticData(old, variables)
            );
          },
          data: { previousData, variables },
        });
      }

      onSuccess?.(data, variables, context as OptimisticContext<TData>);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Hook for optimistic list operations
export function useOptimisticListMutation<TItem extends { id: string }>() {
  const queryClient = useQueryClient();

  const optimisticAdd = useCallback(<T extends TItem>(
    queryKey: string[],
    newItem: T
  ) => {
    queryClient.setQueryData<T[]>(queryKey, (old = []) => [newItem, ...old]);
  }, [queryClient]);

  const optimisticUpdate = useCallback(<T extends TItem>(
    queryKey: string[],
    id: string,
    updates: Partial<T>
  ) => {
    queryClient.setQueryData<T[]>(queryKey, (old = []) => 
      old.map(item => item.id === id ? { ...item, ...updates } : item)
    );
  }, [queryClient]);

  const optimisticRemove = useCallback(<T extends TItem>(
    queryKey: string[],
    id: string
  ) => {
    queryClient.setQueryData<T[]>(queryKey, (old = []) => 
      old.filter(item => item.id !== id)
    );
  }, [queryClient]);

  const optimisticReorder = useCallback(<T extends TItem>(
    queryKey: string[],
    fromIndex: number,
    toIndex: number
  ) => {
    queryClient.setQueryData<T[]>(queryKey, (old = []) => {
      const result = [...old];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, [queryClient]);

  return {
    optimisticAdd,
    optimisticUpdate,
    optimisticRemove,
    optimisticReorder,
  };
}

// Hook for instant status changes
export function useOptimisticStatus<T extends { id: string; status: string }>(
  queryKey: string[],
  mutationFn: (id: string, status: string) => Promise<T>
) {
  const queryClient = useQueryClient();
  const { addAction } = useUndoStore();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => mutationFn(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<T[]>(queryKey);
      const previousItem = previousData?.find(item => item.id === id);
      
      queryClient.setQueryData<T[]>(queryKey, (old = []) =>
        old.map(item => item.id === id ? { ...item, status } : item)
      );

      return { previousData, previousItem };
    },
    onError: (_, __, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error('Erro ao atualizar status');
    },
    onSuccess: (_, { id, status }, context) => {
      const previousStatus = context?.previousItem?.status;
      
      if (previousStatus) {
        addAction({
          type: 'status-change',
          description: `Status alterado para ${status}`,
          undo: async () => {
            queryClient.setQueryData<T[]>(queryKey, (old = []) =>
              old.map(item => item.id === id ? { ...item, status: previousStatus } : item)
            );
          },
          redo: async () => {
            queryClient.setQueryData<T[]>(queryKey, (old = []) =>
              old.map(item => item.id === id ? { ...item, status } : item)
            );
          },
        });
      }

      toast.success('Status atualizado!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
