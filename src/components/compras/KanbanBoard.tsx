import { useState } from "react";
import { 
  Package, 
  Building2, 
  Calendar, 
  GripVertical,
  Eye
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Solicitacao, getStatusLabel, getTipoLabel } from "@/data/mockData";

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  statuses: string[];
}

interface KanbanBoardProps {
  pedidos: Solicitacao[];
  onViewDetails: (pedido: Solicitacao) => void;
  onStatusChange?: (pedidoId: string, novoStatus: string) => void;
}

const colunas: KanbanColumn[] = [
  { 
    id: 'processamento', 
    title: 'Processamento', 
    color: 'bg-blue-500',
    statuses: ['FORNECEDOR_SELECIONADO', 'PEDIDO_GERADO']
  },
  { 
    id: 'pagamento', 
    title: 'Aguard. Pagamento', 
    color: 'bg-orange-500',
    statuses: ['AGUARDANDO_PAGAMENTO']
  },
  { 
    id: 'transito', 
    title: 'Em Trânsito', 
    color: 'bg-purple-500',
    statuses: ['PAGO', 'EM_TRANSITO']
  },
  { 
    id: 'entregue', 
    title: 'Entregue', 
    color: 'bg-green-500',
    statuses: ['ENTREGUE']
  },
];

export const KanbanBoard = ({ pedidos, onViewDetails, onStatusChange }: KanbanBoardProps) => {
  const [draggedPedido, setDraggedPedido] = useState<Solicitacao | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const getPedidosByColumn = (coluna: KanbanColumn) => {
    return pedidos.filter(p => coluna.statuses.includes(p.status));
  };

  const handleDragStart = (e: React.DragEvent, pedido: Solicitacao) => {
    setDraggedPedido(pedido);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedPedido(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, colunaId: string) => {
    e.preventDefault();
    setDragOverColumn(colunaId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, coluna: KanbanColumn) => {
    e.preventDefault();
    if (draggedPedido && onStatusChange) {
      const novoStatus = coluna.statuses[0];
      if (!coluna.statuses.includes(draggedPedido.status)) {
        onStatusChange(draggedPedido.id, novoStatus);
      }
    }
    setDraggedPedido(null);
    setDragOverColumn(null);
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      FORNECEDOR_SELECIONADO: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      PEDIDO_GERADO: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      AGUARDANDO_PAGAMENTO: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      PAGO: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      EM_TRANSITO: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      ENTREGUE: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {colunas.map((coluna) => {
        const pedidosColuna = getPedidosByColumn(coluna);
        const isDragOver = dragOverColumn === coluna.id;
        
        return (
          <div
            key={coluna.id}
            className={`flex flex-col rounded-lg border transition-all ${
              isDragOver 
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                : 'border-border bg-muted/30'
            }`}
            onDragOver={(e) => handleDragOver(e, coluna.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, coluna)}
          >
            {/* Header da Coluna */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${coluna.color}`} />
                <span className="font-medium text-foreground text-sm">{coluna.title}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {pedidosColuna.length}
                </Badge>
              </div>
            </div>

            {/* Cards */}
            <ScrollArea className="flex-1 max-h-[500px]">
              <div className="p-2 space-y-2">
                {pedidosColuna.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Nenhum pedido
                  </div>
                ) : (
                  pedidosColuna.map((pedido) => (
                    <Card
                      key={pedido.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, pedido)}
                      onDragEnd={handleDragEnd}
                      className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                        draggedPedido?.id === pedido.id ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-sm font-bold text-foreground">#{pedido.id}</span>
                              <Badge className={`ml-2 text-[10px] ${getStatusBadgeColor(pedido.status)}`}>
                                {getStatusLabel(pedido.status)}
                              </Badge>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => onViewDetails(pedido)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <p className="text-sm font-medium text-foreground truncate">{pedido.produto}</p>
                          
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span className="truncate">{pedido.empresa}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              <span>{pedido.quantidade} un</span>
                              <Badge variant="outline" className="text-[10px] ml-1">{getTipoLabel(pedido.tipo)}</Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>

                          {pedido.valorTotal && (
                            <div className="pt-2 border-t border-border">
                              <p className="text-sm font-bold text-primary">
                                R$ {pedido.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
};
