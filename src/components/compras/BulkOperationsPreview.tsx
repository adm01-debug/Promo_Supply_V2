import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  FileDown,
  RefreshCw,
  CheckSquare,
  Square,
  ArrowRight,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  CreditCard,
  FileText,
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Undo2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types for different entity types
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

interface BulkOperationsPreviewProps {
  entityType: 'solicitacoes' | 'pedidos' | 'pagamentos' | 'fornecedores';
  selectedItems: BulkItem[];
  availableActions: BulkAction[];
  statusOptions: { value: string; label: string; color?: string }[];
  onExecute: (action: BulkAction, itemIds: string[], options?: any) => Promise<boolean>;
  onClose: () => void;
  onExport?: (format: 'pdf' | 'excel', itemIds: string[]) => void;
}

const entityConfig = {
  solicitacoes: {
    label: 'Solicitações',
    icon: Package,
    color: 'text-blue-500',
  },
  pedidos: {
    label: 'Pedidos',
    icon: FileText,
    color: 'text-purple-500',
  },
  pagamentos: {
    label: 'Pagamentos',
    icon: CreditCard,
    color: 'text-green-500',
  },
  fornecedores: {
    label: 'Fornecedores',
    icon: Building2,
    color: 'text-orange-500',
  },
};

export function BulkOperationsPreview({
  entityType,
  selectedItems,
  availableActions,
  statusOptions,
  onExecute,
  onClose,
  onExport,
}: BulkOperationsPreviewProps) {
  const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [excludedItems, setExcludedItems] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['affected']));

  const config = entityConfig[entityType];
  const EntityIcon = config.icon;

  // Items that will be affected (not excluded)
  const affectedItems = useMemo(() => 
    selectedItems.filter(item => !excludedItems.has(item.id)),
    [selectedItems, excludedItems]
  );

  // Group items by current status for preview
  const groupedByStatus = useMemo(() => {
    const groups: Record<string, BulkItem[]> = {};
    affectedItems.forEach(item => {
      if (!groups[item.status]) groups[item.status] = [];
      groups[item.status].push(item);
    });
    return groups;
  }, [affectedItems]);

  // Calculate preview changes
  const previewChanges = useMemo((): BulkPreviewChange[] => {
    if (!selectedAction) return [];

    if (selectedAction.id === 'change-status' && targetStatus) {
      return affectedItems
        .filter(item => item.status !== targetStatus)
        .map(item => ({
          itemId: item.id,
          field: 'status',
          oldValue: item.status,
          newValue: targetStatus,
        }));
    }

    if (selectedAction.id === 'delete') {
      return affectedItems.map(item => ({
        itemId: item.id,
        field: 'deleted',
        oldValue: 'active',
        newValue: 'deleted',
      }));
    }

    return [];
  }, [selectedAction, targetStatus, affectedItems]);

  const toggleItemExclusion = (itemId: string) => {
    setExcludedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleSelectAction = (action: BulkAction) => {
    setSelectedAction(action);
    setShowPreview(true);
    if (action.targetStatus) {
      setTargetStatus(action.targetStatus);
    }
  };

  const handleExecute = async () => {
    if (!selectedAction || affectedItems.length === 0) return;

    setIsExecuting(true);
    setExecutionProgress(0);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setExecutionProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const success = await onExecute(
        selectedAction,
        affectedItems.map(i => i.id),
        { targetStatus }
      );

      clearInterval(progressInterval);
      setExecutionProgress(100);

      if (success) {
        toast.success(
          `${affectedItems.length} ${config.label.toLowerCase()} atualizado(s) com sucesso!`,
          {
            description: `Ação: ${selectedAction.label}`,
            action: {
              label: 'Desfazer',
              onClick: () => toast.info('Funcionalidade de desfazer em desenvolvimento'),
            },
          }
        );
        onClose();
      }
    } catch (error) {
      toast.error('Erro ao executar ação em massa', {
        description: 'Tente novamente ou contate o suporte',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    return statusOptions.find(s => s.value === status)?.label || status;
  };

  const getStatusColor = (status: string) => {
    return statusOptions.find(s => s.value === status)?.color || 'bg-muted';
  };

  return (
    <Dialog open={true} onOpenChange={() => !isExecuting && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EntityIcon className={cn("w-5 h-5", config.color)} />
            Operações em Massa - {config.label}
          </DialogTitle>
          <DialogDescription>
            {selectedItems.length} item(ns) selecionado(s) • {affectedItems.length} serão afetado(s)
          </DialogDescription>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Action Selection */}
          {!showPreview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-sm font-medium">Selecione uma ação:</h3>
              <div className="grid grid-cols-2 gap-3">
                {availableActions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      className={cn(
                        "h-auto p-4 flex flex-col items-start gap-2 justify-start",
                        action.variant === 'destructive' && "border-destructive/50 hover:bg-destructive/10",
                        action.variant === 'warning' && "border-orange-500/50 hover:bg-orange-500/10"
                      )}
                      onClick={() => handleSelectAction(action)}
                    >
                      <div className="flex items-center gap-2">
                        <ActionIcon className={cn(
                          "w-5 h-5",
                          action.variant === 'destructive' && "text-destructive",
                          action.variant === 'warning' && "text-orange-500"
                        )} />
                        <span className="font-medium">{action.label}</span>
                      </div>
                      {action.requiresConfirmation && (
                        <Badge variant="outline" className="text-xs">
                          Requer confirmação
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>

              {/* Quick Export */}
              {onExport && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Exportar selecionados:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onExport('excel', selectedItems.map(i => i.id))}
                    >
                      <FileDown className="w-4 h-4 mr-1" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onExport('pdf', selectedItems.map(i => i.id))}
                    >
                      <FileDown className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Preview Panel */}
          <AnimatePresence>
            {showPreview && selectedAction && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 overflow-hidden flex flex-col gap-4"
              >
                {/* Back Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPreview(false);
                    setSelectedAction(null);
                    setTargetStatus('');
                  }}
                  className="w-fit"
                >
                  ← Voltar para ações
                </Button>

                {/* Action Config */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <selectedAction.icon className={cn(
                      "w-5 h-5",
                      selectedAction.variant === 'destructive' && "text-destructive"
                    )} />
                    <span className="font-medium">{selectedAction.label}</span>
                  </div>

                  {selectedAction.id === 'change-status' && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm">Novo status:</span>
                      <Select value={targetStatus} onValueChange={setTargetStatus}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", option.color || 'bg-muted')} />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Preview Changes */}
                <div className="flex-1 overflow-hidden">
                  <Collapsible
                    open={expandedGroups.has('affected')}
                    onOpenChange={() => toggleGroup('affected')}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-2">
                        <span className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Preview das alterações ({previewChanges.length} mudanças)
                        </span>
                        {expandedGroups.has('affected') ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ScrollArea className="h-[250px] rounded-md border p-3">
                        {Object.entries(groupedByStatus).map(([status, items]) => (
                          <div key={status} className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className={getStatusColor(status)}>
                                {getStatusLabel(status)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {items.length} item(ns)
                              </span>
                              {targetStatus && targetStatus !== status && (
                                <>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                  <Badge className={getStatusColor(targetStatus)}>
                                    {getStatusLabel(targetStatus)}
                                  </Badge>
                                </>
                              )}
                            </div>
                            <div className="space-y-1 ml-2">
                              {items.map(item => (
                                <div
                                  key={item.id}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded text-sm",
                                    excludedItems.has(item.id) 
                                      ? "bg-muted/30 opacity-50" 
                                      : "bg-muted/50"
                                  )}
                                >
                                  <Checkbox
                                    checked={!excludedItems.has(item.id)}
                                    onCheckedChange={() => toggleItemExclusion(item.id)}
                                  />
                                  <div className="flex-1 truncate">
                                    <span className="font-medium">{item.title}</span>
                                    {item.subtitle && (
                                      <span className="text-muted-foreground ml-2">
                                        • {item.subtitle}
                                      </span>
                                    )}
                                  </div>
                                  {item.value !== undefined && (
                                    <span className="text-muted-foreground">
                                      R$ {item.value.toLocaleString('pt-BR')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* Warnings */}
                {selectedAction.variant === 'destructive' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive">Atenção!</p>
                      <p className="text-muted-foreground">
                        Esta ação não pode ser desfeita. {affectedItems.length} item(ns) serão 
                        permanentemente afetados.
                      </p>
                    </div>
                  </div>
                )}

                {/* Execution Progress */}
                {isExecuting && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Executando ação em massa...</span>
                    </div>
                    <Progress value={executionProgress} className="h-2" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isExecuting}>
            Cancelar
          </Button>
          {showPreview && selectedAction && (
            <Button
              onClick={handleExecute}
              disabled={
                isExecuting || 
                affectedItems.length === 0 ||
                (selectedAction.id === 'change-status' && !targetStatus)
              }
              variant={selectedAction.variant === 'destructive' ? 'destructive' : 'default'}
              className="gap-2"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar ({affectedItems.length})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
