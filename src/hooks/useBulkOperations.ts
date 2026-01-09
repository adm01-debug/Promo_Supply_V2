import { useCallback } from 'react';
import { BulkAction, BulkItem } from '@/components/compras/BulkOperationsPreview';

interface UseBulkOperationsOptions {
  onDelete?: (ids: string[]) => Promise<boolean>;
  onUpdateStatus?: (ids: string[], status: string) => Promise<boolean>;
  onCustomAction?: (actionId: string, ids: string[], options?: any) => Promise<boolean>;
}

export function useBulkOperations(options: UseBulkOperationsOptions) {
  const { onDelete, onUpdateStatus, onCustomAction } = options;

  const executeAction = useCallback(async (
    action: BulkAction,
    itemIds: string[],
    actionOptions?: { targetStatus?: string }
  ): Promise<boolean> => {
    try {
      switch (action.id) {
        case 'delete':
          if (onDelete) {
            return await onDelete(itemIds);
          }
          break;

        case 'change-status':
          if (onUpdateStatus && actionOptions?.targetStatus) {
            return await onUpdateStatus(itemIds, actionOptions.targetStatus);
          }
          break;

        case 'mark-paid':
        case 'mark-shipped':
        case 'mark-delivered':
        case 'approve':
        case 'deactivate':
          if (onUpdateStatus && action.targetStatus) {
            return await onUpdateStatus(itemIds, action.targetStatus);
          }
          break;

        default:
          if (onCustomAction) {
            return await onCustomAction(action.id, itemIds, actionOptions);
          }
      }

      return false;
    } catch (error) {
      console.error('Error executing bulk action:', error);
      return false;
    }
  }, [onDelete, onUpdateStatus, onCustomAction]);

  const convertToBulkItems = useCallback(<T extends { id: string }>(
    items: T[],
    mapFn: (item: T) => Omit<BulkItem, 'id'>
  ): BulkItem[] => {
    return items.map(item => ({
      id: item.id,
      ...mapFn(item),
    }));
  }, []);

  return {
    executeAction,
    convertToBulkItems,
  };
}

// Status configurations for different entities
export const solicitacoesStatusOptions = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-500' },
  { value: 'em_cotacao', label: 'Em Cotação', color: 'bg-blue-500' },
  { value: 'aprovada', label: 'Aprovada', color: 'bg-green-500' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-purple-500' },
  { value: 'concluida', label: 'Concluída', color: 'bg-emerald-500' },
  { value: 'rejeitada', label: 'Rejeitada', color: 'bg-red-500' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-gray-500' },
];

export const pedidosStatusOptions = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-500' },
  { value: 'aprovado', label: 'Aprovado', color: 'bg-blue-500' },
  { value: 'enviado', label: 'Enviado', color: 'bg-indigo-500' },
  { value: 'em_transito', label: 'Em Trânsito', color: 'bg-purple-500' },
  { value: 'entregue', label: 'Entregue', color: 'bg-green-500' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500' },
];

export const pagamentosStatusOptions = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-500' },
  { value: 'aprovado', label: 'Aprovado', color: 'bg-blue-500' },
  { value: 'pago', label: 'Pago', color: 'bg-green-500' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500' },
];
