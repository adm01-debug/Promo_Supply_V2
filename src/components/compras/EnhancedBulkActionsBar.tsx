import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  FileDown,
  RefreshCw,
  CheckSquare,
  Square,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { 
  BulkOperationsPreview, 
  BulkItem, 
  BulkAction 
} from './BulkOperationsPreview';

interface EnhancedBulkActionsBarProps {
  entityType: 'solicitacoes' | 'pedidos' | 'pagamentos' | 'fornecedores';
  selectedItems: BulkItem[];
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExecute: (action: BulkAction, itemIds: string[], options?: any) => Promise<boolean>;
  onExport?: (format: 'pdf' | 'excel', itemIds: string[]) => void;
  isAllSelected: boolean;
  statusOptions: { value: string; label: string; color?: string }[];
  availableActions?: BulkAction[];
}

const defaultActions: Record<string, BulkAction[]> = {
  solicitacoes: [
    { id: 'change-status', label: 'Alterar Status', icon: RefreshCw },
    { id: 'delete', label: 'Excluir', icon: Trash2, variant: 'destructive', requiresConfirmation: true },
  ],
  pedidos: [
    { id: 'change-status', label: 'Alterar Status', icon: RefreshCw },
    { id: 'mark-shipped', label: 'Marcar como Enviado', icon: RefreshCw, targetStatus: 'enviado' },
    { id: 'delete', label: 'Excluir', icon: Trash2, variant: 'destructive', requiresConfirmation: true },
  ],
  pagamentos: [
    { id: 'change-status', label: 'Alterar Status', icon: RefreshCw },
    { id: 'mark-paid', label: 'Marcar como Pago', icon: RefreshCw, targetStatus: 'pago' },
    { id: 'approve', label: 'Aprovar', icon: RefreshCw, targetStatus: 'aprovado' },
  ],
  fornecedores: [
    { id: 'change-status', label: 'Alterar Status', icon: RefreshCw },
    { id: 'deactivate', label: 'Desativar', icon: RefreshCw, targetStatus: 'inativo', variant: 'warning' },
  ],
};

export function EnhancedBulkActionsBar({
  entityType,
  selectedItems,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onExecute,
  onExport,
  isAllSelected,
  statusOptions,
  availableActions,
}: EnhancedBulkActionsBarProps) {
  const [showPreview, setShowPreview] = useState(false);

  const actions = availableActions || defaultActions[entityType] || [];

  const handleOpenPreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  if (selectedItems.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={cn(
            "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
            "bg-primary text-primary-foreground shadow-2xl rounded-lg",
            "flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3",
          )}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onDeselectAll}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Selection Info */}
          <div className="flex items-center gap-2 pr-2 md:pr-3 border-r border-primary-foreground/20">
            <Badge 
              variant="secondary" 
              className="bg-primary-foreground/20 text-primary-foreground border-0"
            >
              {selectedItems.length}
            </Badge>
            <span className="text-sm hidden sm:inline whitespace-nowrap">
              de {totalCount} selecionado(s)
            </span>
          </div>

          {/* Select All Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/10 hidden md:flex"
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
          >
            {isAllSelected ? (
              <>
                <Square className="h-4 w-4 mr-1" />
                Desmarcar
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-1" />
                Selec. Todos
              </>
            )}
          </Button>

          {/* Preview Button - Main Action */}
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={handleOpenPreview}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Ações em Massa</span>
            <span className="sm:hidden">Ações</span>
          </Button>

          {/* Quick Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onSelectAll()}>
                <CheckSquare className="h-4 w-4 mr-2" />
                Selecionar Todos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeselectAll()}>
                <Square className="h-4 w-4 mr-2" />
                Desmarcar Todos
              </DropdownMenuItem>
              {onExport && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onExport('excel', selectedItems.map(i => i.id))}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport('pdf', selectedItems.map(i => i.id))}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      </AnimatePresence>

      {/* Preview Modal */}
      {showPreview && (
        <BulkOperationsPreview
          entityType={entityType}
          selectedItems={selectedItems}
          availableActions={actions}
          statusOptions={statusOptions}
          onExecute={onExecute}
          onClose={handleClosePreview}
          onExport={onExport}
        />
      )}
    </>
  );
}
