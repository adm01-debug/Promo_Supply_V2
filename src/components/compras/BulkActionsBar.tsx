import { useState } from "react";
import { 
  X, 
  Trash2, 
  FileDown, 
  RefreshCw,
  CheckSquare,
  Square,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Solicitacao } from "@/data/mockData";
import { toast } from "@/lib/feedbackToast";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onChangeStatus: (status: Solicitacao['status']) => void;
  onExport: (format: 'pdf' | 'excel') => void;
  isAllSelected: boolean;
}

const statusOptions: { value: Solicitacao['status']; label: string }[] = [
  { value: 'AGUARDANDO_COTACAO', label: 'Aguardando Cotação' },
  { value: 'EM_COTACAO', label: 'Em Cotação' },
  { value: 'FORNECEDOR_SELECIONADO', label: 'Fornecedor Selecionado' },
  { value: 'PEDIDO_GERADO', label: 'Pedido Gerado' },
  { value: 'AGUARDANDO_PAGAMENTO', label: 'Aguardando Pagamento' },
  { value: 'PAGO', label: 'Pago' },
  { value: 'EM_TRANSITO', label: 'Em Trânsito' },
  { value: 'ENTREGUE', label: 'Entregue' },
];

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onChangeStatus,
  onExport,
  isAllSelected,
}: BulkActionsBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [statusToChange, setStatusToChange] = useState<Solicitacao['status'] | ''>('');

  const handleStatusChange = (value: string) => {
    if (value) {
      setStatusToChange(value as Solicitacao['status']);
      onChangeStatus(value as Solicitacao['status']);
      setStatusToChange('');
      toast.success(`Status alterado para ${selectedCount} solicitação(ões)`);
    }
  };

  const handleDelete = () => {
    onDelete();
    setShowDeleteDialog(false);
    toast.success(`${selectedCount} solicitação(ões) excluída(s)`);
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "bg-primary text-primary-foreground shadow-2xl rounded-lg",
        "flex items-center gap-3 px-4 py-3",
        "animate-in slide-in-from-bottom-4 fade-in-50 duration-300"
      )}>
        {/* Selection Info */}
        <div className="flex items-center gap-2 pr-3 border-r border-primary-foreground/20">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onDeselectAll}
          >
            <X className="h-4 w-4" />
          </Button>
          <span className="font-medium whitespace-nowrap">
            {selectedCount} de {totalCount} selecionado(s)
          </span>
        </div>

        {/* Select All / Deselect All */}
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary-foreground/10"
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

        {/* Change Status */}
        <Select value={statusToChange} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px] bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <SelectValue placeholder="Alterar Status" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-[60]">
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Export */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => onExport('excel')}
          >
            <FileDown className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => onExport('pdf')}
          >
            <FileDown className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          className="text-red-300 hover:bg-red-500/20 hover:text-red-200"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Excluir
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedCount} solicitação(ões)? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
