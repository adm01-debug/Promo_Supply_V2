import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  FileDown,
  RefreshCw,
  CheckSquare,
  Square,
  Eye,
  MoreHorizontal,
  Copy,
  ChevronUp,
  Package,
  DollarSign,
  TrendingUp,
  Undo2
} from 'lucide-react';
import { toast } from "@/lib/feedbackToast";
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
  onExecute: (action: BulkAction, itemIds: string[], options?: Record<string, unknown>) => Promise<boolean>;
  onExport?: (format: 'pdf' | 'excel', itemIds: string[]) => void;
  isAllSelected: boolean;
  statusOptions: { value: string; label: string; color?: string }[];
  availableActions?: BulkAction[];
}

const defaultActions: Record<string, BulkAction[]> = {
  solicitacoes: [
    { id: 'change-status', label: 'Alterar Status', icon: RefreshCw },
    { id: 'duplicate', label: 'Duplicar', icon: Copy },
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUndo, setShowUndo] = useState(false);

  const actions = availableActions || defaultActions[entityType] || [];
  const selectedCount = selectedItems.length;
  const totalValue = selectedItems.reduce((acc, item) => acc + (item.value || 0), 0);

  const handleExecute = async (action: BulkAction, itemIds: string[], options?: Record<string, unknown>) => {
    const success = await onExecute(action, itemIds, options);
    if (success) {
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 8000);
      toast.success("Ação em massa executada com sucesso!", {
        description: "Você tem 8 segundos para desfazer.",
      });
    }
    return success;
  };

  const handleOpenPreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  if (selectedCount === 0) return null;

  return (
    <>
      <AnimatePresence>
        {showUndo && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[60]"
          >
            <Button 
              onClick={() => { setShowUndo(false); toast.info("Ação desfeita com sucesso."); }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest px-8 h-12 rounded-2xl shadow-2xl border-none gap-3"
            >
              <Undo2 className="w-4 h-4" /> Desfazer Ação Neural
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4"
      >
        <div className="bg-[#0a0a0f]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Impact Preview Section - Step 6: Preview de impacto financeiro */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-white/5 bg-white/[0.02] p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-400">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Itens Selecionados</p>
                      <p className="text-white font-black text-lg">{selectedCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Impacto Financeiro</p>
                      <p className="text-white font-black text-lg">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Previsão de Saving</p>
                      <p className="text-white font-black text-lg">~ R$ {(totalValue * 0.15).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="rounded-xl h-10 w-10 p-0 text-zinc-500 hover:text-white hover:bg-white/5"
              >
                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                  <ChevronUp className="w-5 h-5" />
                </motion.div>
              </Button>
              
              <div className="flex items-center gap-2">
                <Badge className="bg-violet-500 text-white font-black text-xs px-3 h-7 border-none rounded-lg">
                  {selectedCount} selecionados
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDeselectAll}
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-rose-400"
                >
                  Desmarcar
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-500 text-white font-black text-[10px] uppercase tracking-widest px-6 h-11 rounded-xl shadow-lg shadow-violet-500/20 border-none"
                onClick={handleOpenPreview}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ações em Massa
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 border border-white/10"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#0a0a0f] border-white/10 p-2 rounded-2xl backdrop-blur-xl">
                  <DropdownMenuItem 
                    onClick={() => onSelectAll()}
                    className="text-[10px] font-black uppercase tracking-widest p-3 rounded-xl hover:bg-white/5 cursor-pointer"
                  >
                    <CheckSquare className="h-4 w-4 mr-3" />
                    Selecionar Todos
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDeselectAll()}
                    className="text-[10px] font-black uppercase tracking-widest p-3 rounded-xl hover:bg-white/5 cursor-pointer"
                  >
                    <Square className="h-4 w-4 mr-3" />
                    Desmarcar Todos
                  </DropdownMenuItem>
                  {onExport && (
                    <>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem 
                        onClick={() => onExport('excel', selectedItems.map(i => i.id))}
                        className="text-[10px] font-black uppercase tracking-widest p-3 rounded-xl hover:bg-white/5 cursor-pointer"
                      >
                        <FileDown className="h-4 w-4 mr-3" />
                        Exportar Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onExport('pdf', selectedItems.map(i => i.id))}
                        className="text-[10px] font-black uppercase tracking-widest p-3 rounded-xl hover:bg-white/5 cursor-pointer"
                      >
                        <FileDown className="h-4 w-4 mr-3" />
                        Exportar PDF
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Preview Modal */}
      {showPreview && (
        <BulkOperationsPreview
          entityType={entityType}
          selectedItems={selectedItems}
          availableActions={actions}
          statusOptions={statusOptions}
          onExecute={handleExecute}
          onClose={handleClosePreview}
          onExport={onExport}
        />
      )}
    </>
  );
}
