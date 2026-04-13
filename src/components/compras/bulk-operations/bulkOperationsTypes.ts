import { Package, FileText, CreditCard, Building2 } from 'lucide-react';

export interface BulkItem {
  id: string;
  title: string;
  subtitle?: string;
  status: string;
  value?: number;
  date?: string;
  extra?: Record<string, any>;
}

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ElementType;
  variant?: 'default' | 'destructive' | 'warning';
  requiresConfirmation?: boolean;
  targetStatus?: string;
}

export interface BulkPreviewChange {
  itemId: string;
  field: string;
  oldValue: string | number;
  newValue: string | number;
}

export interface BulkOperationsPreviewProps {
  entityType: 'solicitacoes' | 'pedidos' | 'pagamentos' | 'fornecedores';
  selectedItems: BulkItem[];
  availableActions: BulkAction[];
  statusOptions: { value: string; label: string; color?: string }[];
  onExecute: (action: BulkAction, itemIds: string[], options?: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
  onExport?: (format: 'pdf' | 'excel', itemIds: string[]) => void;
}

export const entityConfig = {
  solicitacoes: {
    label: 'Solicitações',
    icon: Package,
    color: 'text-info',
  },
  pedidos: {
    label: 'Pedidos',
    icon: FileText,
    color: 'text-purple-500',
  },
  pagamentos: {
    label: 'Pagamentos',
    icon: CreditCard,
    color: 'text-success',
  },
  fornecedores: {
    label: 'Fornecedores',
    icon: Building2,
    color: 'text-warning',
  },
};
