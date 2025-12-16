import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ClipboardList, 
  Search, 
  CheckCircle2, 
  FileText, 
  CreditCard, 
  Banknote,
  Truck, 
  Package,
  GripVertical,
  Calendar,
  Building2
} from "lucide-react";
import { Solicitacao, getTipoLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  pedidos: Solicitacao[];
  onStatusChange: (pedidoId: string, newStatus: string) => void;
}

const kanbanColumns = [
  { key: 'AGUARDANDO_COTACAO', label: 'Aguardando Cotação', icon: ClipboardList, color: 'bg-amber-500' },
  { key: 'EM_COTACAO', label: 'Em Cotação', icon: Search, color: 'bg-yellow-500' },
  { key: 'FORNECEDOR_SELECIONADO', label: 'Fornecedor Selecionado', icon: CheckCircle2, color: 'bg-blue-500' },
  { key: 'AGUARDANDO_PAGAMENTO', label: 'Aguardando Pagamento', icon: CreditCard, color: 'bg-orange-500' },
  { key: 'PAGO', label: 'Pago', icon: Banknote, color: 'bg-cyan-500' },
  { key: 'EM_TRANSITO', label: 'Em Trânsito', icon: Truck, color: 'bg-purple-500' },
  { key: 'ENTREGUE', label: 'Entregue', icon: Package, color: 'bg-green-500' },
];

export const KanbanBoard = ({ pedidos, onStatusChange }: KanbanBoardProps) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, pedidoId: string) => {
    setDraggedItem(pedidoId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    if (draggedItem) {
      onStatusChange(draggedItem, columnKey);
    }
    setDraggedItem(null);
    setDragOverColumn(null);
  };

  const getPedidosByStatus = (status: string) => {
    return pedidos.filter(p => p.status === status);
  };

  const isOverdue = (prazoEntrega: string, status: string) => {
    if (status === 'ENTREGUE') return false;
    return new Date(prazoEntrega) < new Date();
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {kanbanColumns.map((column) => {
          const columnPedidos = getPedidosByStatus(column.key);
          const ColumnIcon = column.icon;
          
          return (
            <div
              key={column.key}
              className={cn(
                "w-72 flex flex-col bg-muted/30 rounded-xl border border-border transition-colors",
                dragOverColumn === column.key && "border-primary bg-primary/5"
              )}
              onDragOver={(e) => handleDragOver(e, column.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.key)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    column.color
                  )}>
                    <ColumnIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {column.label}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {columnPedidos.length}
                  </Badge>
                </div>
              </div>

              {/* Column Content */}
              <ScrollArea className="flex-1 max-h-[calc(100vh-380px)]">
                <div className="p-2 space-y-2">
                  {columnPedidos.map((pedido) => (
                    <Card
                      key={pedido.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, pedido.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "cursor-grab active:cursor-grabbing bg-card border-border hover:border-primary/50 transition-all",
                        draggedItem === pedido.id && "opacity-50 scale-95",
                        isOverdue(pedido.prazoEntrega, pedido.status) && "border-destructive/50"
                      )}
                    >
                      <CardContent className="p-3">
                        {/* Drag Handle */}
                        <div className="flex items-start gap-2 mb-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {pedido.itemNumber}
                              </Badge>
                              {isOverdue(pedido.prazoEntrega, pedido.status) && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Atrasado
                                </Badge>
                              )}
                            </div>
                            <h4 className="text-sm font-medium text-foreground truncate">
                              {pedido.produto}
                            </h4>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3 h-3" />
                            <span className="truncate">{pedido.empresa}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                          <Badge variant="secondary" className="text-[10px]">
                            {getTipoLabel(pedido.tipo)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {pedido.quantidade} un
                          </span>
                        </div>

                        {/* Supplier & Value */}
                        {pedido.fornecedorSelecionado && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground truncate">
                              {pedido.fornecedorSelecionado}
                            </p>
                            {pedido.valorTotal && (
                              <p className="text-sm font-semibold text-success">
                                {pedido.valorTotal.toLocaleString('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                })}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {columnPedidos.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      Nenhum item
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
};
