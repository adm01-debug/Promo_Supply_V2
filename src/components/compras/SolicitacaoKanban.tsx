import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  GripVertical, 
  Package, 
  Building2,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { differenceInDays } from "date-fns/differenceInDays";
import { isPast } from "date-fns/isPast";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Solicitacao, getTipoLabel } from "@/types/legacyTypes";
import { toast } from "@/lib/feedbackToast";

interface SolicitacaoKanbanProps {
  solicitacoes: Solicitacao[];
  onStatusChange: (id: string, newStatus: Solicitacao['status']) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectChange?: (id: string, selected: boolean) => void;
}

const statusConfig: Record<Solicitacao['status'], { label: string; color: string; bgColor: string }> = {
  AGUARDANDO_COTACAO: { label: 'Aguardando Cotação', color: 'bg-emerald-500', bgColor: 'bg-emerald-500/10' },
  EM_COTACAO: { label: 'Em Cotação', color: 'bg-warning', bgColor: 'bg-warning/10' },
  FORNECEDOR_SELECIONADO: { label: 'Fornecedor Selecionado', color: 'bg-info', bgColor: 'bg-info/10' },
  PEDIDO_GERADO: { label: 'Pedido Gerado', color: 'bg-indigo-500', bgColor: 'bg-indigo-500/10' },
  AGUARDANDO_PAGAMENTO: { label: 'Aguardando Pagamento', color: 'bg-warning', bgColor: 'bg-warning/10' },
  PAGO: { label: 'Pago', color: 'bg-cyan-500', bgColor: 'bg-cyan-500/10' },
  EM_TRANSITO: { label: 'Em Trânsito', color: 'bg-purple-500', bgColor: 'bg-purple-500/10' },
  ENTREGUE: { label: 'Finalizada', color: 'bg-success', bgColor: 'bg-success/10' },
  REJEITADA: { label: 'Rejeitada', color: 'bg-destructive', bgColor: 'bg-destructive/10' },
  CANCELADA: { label: 'Cancelada', color: 'bg-gray-500', bgColor: 'bg-gray-500/10' },
};

// Sortable Item Component
interface SortableItemProps {
  solicitacao: Solicitacao;
  isDragging?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
}

function SortableItem({ solicitacao, isDragging, selectable, selected, onSelectChange }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id: solicitacao.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group",
        (isDragging || isSorting) && "opacity-50"
      )}
    >
      <SolicitacaoKanbanCard 
        solicitacao={solicitacao} 
        dragHandleProps={{ ...attributes, ...listeners }}
        selectable={selectable}
        selected={selected}
        onSelectChange={onSelectChange}
      />
    </div>
  );
}

// Kanban Card Component
interface SolicitacaoKanbanCardProps {
  solicitacao: Solicitacao;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isOverlay?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
}

function SolicitacaoKanbanCard({ 
  solicitacao, 
  dragHandleProps, 
  isOverlay,
  selectable,
  selected,
  onSelectChange
}: SolicitacaoKanbanCardProps) {
  // Urgency logic
  const deadline = new Date(solicitacao.prazoEntrega);
  const daysRemaining = differenceInDays(deadline, new Date());
  const isOverdue = isPast(deadline) && solicitacao.status !== 'ENTREGUE';
  
  const getUrgencyInfo = () => {
    if (isOverdue) return { color: "text-destructive", bg: "bg-destructive/10", label: "Atrasado", icon: AlertTriangle };
    if (daysRemaining <= 2) return { color: "text-red-600", bg: "bg-red-50", label: "Urgente", icon: Clock };
    if (daysRemaining <= 5) return { color: "text-amber-600", bg: "bg-amber-50", label: "Prioritário", icon: Clock };
    return { color: "text-emerald-600", bg: "bg-emerald-50", label: "No prazo", icon: Clock };
  };

  const urgency = getUrgencyInfo();


  return (
    <Card className={cn(
      "p-3 cursor-pointer hover:shadow-md transition-all border-l-4",
      statusConfig[solicitacao.status]?.color.replace('bg-', 'border-'),
      isOverlay && "shadow-xl rotate-2 scale-105",
      selected && "ring-2 ring-primary bg-primary/5"
    )}>
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          {/* Checkbox for selection */}
          {selectable && !isOverlay && (
            <div onClick={(e) => e.stopPropagation()} className="shrink-0 mt-1">
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectChange?.(checked === true)}
                className="h-4 w-4"
              />
            </div>
          )}

          {/* Drag Handle */}
          <div 
            {...dragHandleProps}
            className="mt-1 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <Badge variant="outline" className="font-mono text-[10px] py-0 shrink-0">
                #{solicitacao.itemNumber || solicitacao.id.slice(0, 4)}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px] py-0 px-1 border-transparent", urgency.bg, urgency.color)}>
                {urgency.label}
              </Badge>
            </div>
            <h4 className="font-medium text-sm truncate leading-tight">{solicitacao.produto}</h4>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{solicitacao.empresa}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Package className="w-3 h-3" />
            <span>{solicitacao.quantidade} un</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate">{solicitacao.vendedor}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}</span>
          </div>
          {solicitacao.costCenterCode && (
            <div className="col-span-2 flex items-center gap-1 text-[10px] text-primary font-medium mt-1">
              <span className="bg-primary/10 px-1.5 py-0.5 rounded truncate">
                CC: {solicitacao.costCenterCode}
              </span>
            </div>
          )}
        </div>

        {/* Value if available */}
        {solicitacao.valorTotal && (
          <div className="text-sm font-semibold text-primary pt-1 border-t border-muted">
            R$ {solicitacao.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        )}
      </div>
    </Card>
  );
}


// Droppable Column Component
interface DroppableColumnProps {
  status: Solicitacao['status'];
  solicitacoes: Solicitacao[];
  isOver?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectChange?: (id: string, selected: boolean) => void;
}

function DroppableColumn({ 
  status, 
  solicitacoes, 
  isOver,
  selectable,
  selectedIds,
  onSelectChange
}: DroppableColumnProps) {
  const config = statusConfig[status];
  
  return (
    <div className={cn(
      "flex-shrink-0 w-72 flex flex-col rounded-lg border transition-colors",
      isOver ? "border-primary bg-primary/5" : "border-border bg-card"
    )}>
      {/* Column Header */}
      <div className={cn("p-3 rounded-t-lg", config.bgColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("w-3 h-3 rounded-full", config.color)} />
            <h3 className="font-semibold text-sm">{config.label}</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {solicitacoes.length}
          </Badge>
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext 
          items={solicitacoes.map(s => s.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[100px]">
            {solicitacoes.length === 0 ? (
              <div className={cn(
                "h-24 rounded-lg border-2 border-dashed flex items-center justify-center text-sm text-muted-foreground",
                isOver && "border-primary bg-primary/10"
              )}>
                {isOver ? "Soltar aqui" : "Sem itens"}
              </div>
            ) : (
              solicitacoes.map(solicitacao => (
                <SortableItem 
                  key={solicitacao.id} 
                  solicitacao={solicitacao}
                  selectable={selectable}
                  selected={selectedIds?.has(solicitacao.id)}
                  onSelectChange={(selected) => onSelectChange?.(solicitacao.id, selected)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

export function SolicitacaoKanban({ 
  solicitacoes, 
  onStatusChange,
  selectable,
  selectedIds,
  onSelectChange
}: SolicitacaoKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group solicitacoes by status
  const groupedByStatus = useMemo(() => {
    const groups: Record<Solicitacao['status'], Solicitacao[]> = {
      AGUARDANDO_COTACAO: [],
      EM_COTACAO: [],
      FORNECEDOR_SELECIONADO: [],
      PEDIDO_GERADO: [],
      AGUARDANDO_PAGAMENTO: [],
      PAGO: [],
      EM_TRANSITO: [],
      ENTREGUE: [],
      REJEITADA: [],
      CANCELADA: [],
    };

    solicitacoes.forEach(sol => {
      if (groups[sol.status]) {
        groups[sol.status].push(sol);
      }
    });

    return groups;
  }, [solicitacoes]);

  const activeSolicitacao = activeId 
    ? solicitacoes.find(s => s.id === activeId) 
    : null;

  // Find which column a solicitacao belongs to
  const findColumn = (id: string): Solicitacao['status'] | null => {
    // Check if it's a column id
    if (id in statusConfig) {
      return id as Solicitacao['status'];
    }
    
    // Find in grouped items
    for (const [status, items] of Object.entries(groupedByStatus)) {
      if (items.some(item => item.id === id)) {
        return status as Solicitacao['status'];
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string | null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const activeColumn = findColumn(active.id as string);
    let overColumn = findColumn(over.id as string);

    // If dropped on an item, get its column
    if (!overColumn && over.id) {
      overColumn = findColumn(over.id as string);
    }

    // If dropped on a column directly
    if (over.id in statusConfig) {
      overColumn = over.id as Solicitacao['status'];
    }

    if (activeColumn && overColumn && activeColumn !== overColumn) {
      const solicitacao = solicitacoes.find(s => s.id === active.id);
      if (solicitacao) {
        onStatusChange(active.id as string, overColumn);
        toast.success(`Status atualizado`, {
          description: `${solicitacao.produto} movido para ${statusConfig[overColumn].label}`,
        });
      }
    }
  };

  // Mostrar todos os status relevantes para o fluxo completo
  const visibleStatuses: Solicitacao['status'][] = [
    'AGUARDANDO_COTACAO',
    'EM_COTACAO',
    'FORNECEDOR_SELECIONADO',
    'PEDIDO_GERADO',
    'AGUARDANDO_PAGAMENTO',
    'PAGO',
    'EM_TRANSITO',
    'ENTREGUE',
  ];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {visibleStatuses.map(status => (
          <DroppableColumn
            key={status}
            status={status}
            solicitacoes={groupedByStatus[status]}
            isOver={overId === status || (overId !== null && findColumn(overId) === status)}
            selectable={selectable}
            selectedIds={selectedIds}
            onSelectChange={onSelectChange}
          />
        ))}
      </div>

      <DragOverlay>
        {activeSolicitacao && (
          <div className="w-72">
            <SolicitacaoKanbanCard 
              solicitacao={activeSolicitacao} 
              isOverlay 
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
