import { memo, useState, useMemo } from "react";
import { motion } from "framer-motion";
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
  ArrowRight,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { differenceInDays } from "date-fns/differenceInDays";
import { isPast } from "date-fns/isPast";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatCurrency } from "@/lib/utils";
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
  AGUARDANDO_COTACAO: { label: 'Pending Quote', color: 'bg-emerald-500', bgColor: 'bg-emerald-500/10' },
  EM_COTACAO: { label: 'In Quotation', color: 'bg-amber-500', bgColor: 'bg-amber-500/10' },
  FORNECEDOR_SELECIONADO: { label: 'Approved', color: 'bg-violet-500', bgColor: 'bg-violet-500/10' },
  PEDIDO_GERADO: { label: 'PO Created', color: 'bg-fuchsia-500', bgColor: 'bg-fuchsia-500/10' },
  AGUARDANDO_PAGAMENTO: { label: 'Payment Pending', color: 'bg-amber-500', bgColor: 'bg-amber-500/10' },
  PAGO: { label: 'Paid', color: 'bg-cyan-500', bgColor: 'bg-cyan-500/10' },
  EM_TRANSITO: { label: 'In Transit', color: 'bg-indigo-500', bgColor: 'bg-indigo-500/10' },
  ENTREGUE: { label: 'Delivered', color: 'bg-emerald-500', bgColor: 'bg-emerald-500/10' },
  REJEITADA: { label: 'Rejected', color: 'bg-rose-500', bgColor: 'bg-rose-500/10' },
  CANCELADA: { label: 'Cancelled', color: 'bg-zinc-600', bgColor: 'bg-zinc-600/10' },
};

const SortableItem = memo(function SortableItem({ solicitacao, isDragging, selectable, selected, onSelectChange }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } = useSortable({ id: solicitacao.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={cn("group", (isDragging || isSorting) && "opacity-50")}>
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

function SolicitacaoKanbanCard({ solicitacao, dragHandleProps, isOverlay, selectable, selected, onSelectChange }: any) {
  const deadline = new Date(solicitacao.prazoEntrega);
  const daysRemaining = differenceInDays(deadline, new Date());
  const isOverdue = isPast(deadline) && solicitacao.status !== 'ENTREGUE';
  
  const getUrgencyInfo = () => {
    if (isOverdue) return { color: "text-rose-400", bg: "bg-rose-500/10", label: "Overdue" };
    if (daysRemaining <= 2) return { color: "text-rose-400", bg: "bg-rose-500/10", label: "Urgent" };
    if (daysRemaining <= 5) return { color: "text-amber-400", bg: "bg-amber-500/10", label: "Priority" };
    return { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "No prazo" };
  };

  const urgency = getUrgencyInfo();
  const config = statusConfig[solicitacao.status as Solicitacao['status']];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "p-4 cursor-grab active:cursor-grabbing hover:shadow-[0_20px_50px_rgba(139,92,246,0.15)] transition-all duration-300 border-white/5 bg-white/[0.04] backdrop-blur-xl rounded-[1.5rem] relative overflow-hidden group",
        isOverlay && "shadow-2xl rotate-2 scale-105 border-violet-500/30",
        selected && "ring-2 ring-violet-500/50 bg-violet-500/5"
      )}
    >
      <div className="absolute top-0 left-0 w-0.5 h-full opacity-50 bg-violet-500" style={{ backgroundColor: config?.color.includes('bg-') ? undefined : 'var(--violet-500)' }} />
      
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          {selectable && !isOverlay && (
            <div onClick={(e) => e.stopPropagation()} className="shrink-0 mt-0.5">
              <Checkbox checked={selected} onCheckedChange={(checked) => onSelectChange?.(checked === true)} className="h-4 w-4 border-white/20" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-black font-mono text-[9px] text-violet-400 uppercase tracking-widest">#{solicitacao.itemNumber || solicitacao.id.slice(0, 4)}</span>
              <Badge className={cn("text-[8px] font-black uppercase tracking-tighter py-0.5 px-1.5 border-none rounded-full", urgency.bg, urgency.color)}>
                {urgency.label}
              </Badge>
            </div>
            <h4 className="font-bold text-zinc-100 text-sm truncate leading-tight group-hover:text-violet-400 transition-colors">{solicitacao.produto}</h4>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-1.5 text-[10px] font-bold uppercase tracking-tight text-zinc-500">
          <div className="flex items-center gap-2">
            <Building2 className="w-3 h-3 text-zinc-600" />
            <span className="truncate">{solicitacao.empresa}</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-3 h-3 text-zinc-600" />
            <span>{solicitacao.quantidade} UNITS</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-zinc-600" />
            <span>DUE: {new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {solicitacao.valorTotal && (
          <div className="text-xs font-black text-white pt-2 border-t border-white/5 mt-1 flex justify-between items-center">
            <span className="text-zinc-500 text-[9px] uppercase tracking-widest">VALUE</span>
            {formatCurrency(solicitacao.valorTotal)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DroppableColumn({ status, solicitacoes, isOver, selectable, selectedIds, onSelectChange }: any) {
  const config = statusConfig[status as Solicitacao['status']];
  
  return (
    <div className={cn(
      "flex-shrink-0 w-80 flex flex-col rounded-[2rem] border transition-all duration-500 h-[calc(100vh-280px)] group/column",
      isOver ? "border-violet-500/50 bg-violet-500/10 scale-[1.02] shadow-[0_0_40px_rgba(139,92,246,0.1)]" : "border-white/5 bg-white/[0.01] backdrop-blur-2xl"
    )}>
      <div className="p-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]", config?.color.replace('bg-', 'bg-'))} />
          <h3 className="font-black text-xs text-white uppercase tracking-widest">{config?.label}</h3>
        </div>
        <Badge className="text-[10px] font-black bg-white/5 text-zinc-400 border-none rounded-lg px-2 h-5">
          {solicitacoes.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1 p-4 scrollbar-thin">
        <SortableContext items={solicitacoes.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 min-h-[150px]">
            {solicitacoes.length === 0 ? (
              <div className={cn(
                "h-32 rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 transition-colors",
                isOver && "border-violet-500/30 text-violet-400 bg-violet-500/5"
              )}>
                <Package className="w-6 h-6 mb-2 opacity-20" />
                {isOver ? "Drop Here" : "Empty Stage"}
              </div>
            ) : (
              solicitacoes.map((solicitacao: any) => (
                <SortableItem 
                  key={solicitacao.id} 
                  solicitacao={solicitacao}
                  selectable={selectable}
                  selected={selectedIds?.has(solicitacao.id)}
                  onSelectChange={(selected: boolean) => onSelectChange?.(solicitacao.id, selected)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

export function SolicitacaoKanban({ solicitacoes, onStatusChange, selectable, selectedIds, onSelectChange }: SolicitacaoKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const groupedByStatus = useMemo(() => {
    const groups: Record<Solicitacao['status'], Solicitacao[]> = {
      AGUARDANDO_COTACAO: [], EM_COTACAO: [], FORNECEDOR_SELECIONADO: [],
      PEDIDO_GERADO: [], AGUARDANDO_PAGAMENTO: [], PAGO: [],
      EM_TRANSITO: [], ENTREGUE: [], REJEITADA: [], CANCELADA: [],
    };
    solicitacoes.forEach(sol => { if (groups[sol.status]) groups[sol.status].push(sol); });
    return groups;
  }, [solicitacoes]);

  const activeSolicitacao = activeId ? solicitacoes.find(s => s.id === activeId) : null;

  const findColumn = (id: string): Solicitacao['status'] | null => {
    if (id in statusConfig) return id as Solicitacao['status'];
    for (const [status, items] of Object.entries(groupedByStatus)) {
      if (items.some(item => item.id === id)) return status as Solicitacao['status'];
    }
    return null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null); setOverId(null);
    if (!over) return;

    const activeColumn = findColumn(active.id as string);
    const overColumn = findColumn(over.id as string);

    if (activeColumn && overColumn && activeColumn !== overColumn) {
      const solicitacao = solicitacoes.find(s => s.id === active.id);
      if (solicitacao) {
        onStatusChange(active.id as string, overColumn);
        toast.success(`Pipeline Updated`, {
          description: `${solicitacao.produto} moved to ${statusConfig[overColumn].label}`,
        });
      }
    }
  };

  const visibleStatuses: Solicitacao['status'][] = [
    'AGUARDANDO_COTACAO', 'EM_COTACAO', 'FORNECEDOR_SELECIONADO',
    'PEDIDO_GERADO', 'AGUARDANDO_PAGAMENTO', 'PAGO',
    'EM_TRANSITO', 'ENTREGUE',
  ];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragOver={(e) => setOverId(e.over?.id as string | null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
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

      <DragOverlay dropAnimation={null}>
        {activeSolicitacao && (
          <div className="w-72">
            <SolicitacaoKanbanCard solicitacao={activeSolicitacao} isOverlay />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
