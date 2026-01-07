import { format, differenceInDays } from "date-fns";
import { 
  FileText, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Package, 
  DollarSign,
  X,
  Eye,
  Edit
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwipeableListItem } from "@/components/mobile/SwipeableListItem";
import type { Pedido } from "@/hooks/usePedidos";

interface PedidoMobileCardProps {
  pedido: Pedido;
  onView: (pedido: Pedido) => void;
  onEdit?: (pedido: Pedido) => void;
  onUpdateStatus?: (pedidoId: string, status: Pedido['status']) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: CheckCircle2 },
  enviado: { label: 'Enviado', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', icon: FileText },
  em_transito: { label: 'Em Trânsito', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Truck },
  entregue: { label: 'Entregue', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: X },
};

const getPrazoStatus = (prazo: string | null, status: string) => {
  if (!prazo) return { label: 'Sem prazo', color: 'text-muted-foreground', urgent: false };
  if (status === 'entregue' || status === 'cancelado') return { label: '', color: '', urgent: false };
  
  const dias = differenceInDays(new Date(prazo), new Date());
  if (dias < 0) return { label: 'Atrasado', color: 'text-destructive', urgent: true };
  if (dias === 0) return { label: 'Vence hoje', color: 'text-destructive', urgent: true };
  if (dias <= 2) return { label: `${dias}d restante${dias > 1 ? 's' : ''}`, color: 'text-orange-500', urgent: true };
  return { label: `${dias}d restantes`, color: 'text-muted-foreground', urgent: false };
};

export const PedidoMobileCard = ({ 
  pedido, 
  onView, 
  onEdit,
  onUpdateStatus 
}: PedidoMobileCardProps) => {
  const config = statusConfig[pedido.status] || statusConfig.pendente;
  const StatusIcon = config.icon;
  const prazoStatus = getPrazoStatus(pedido.data_previsao, pedido.status);

  const cardContent = (
    <Card 
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onView(pedido)}
    >
      <div className="space-y-3">
        {/* Header com número e status */}
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono font-semibold text-primary">{pedido.numero}</span>
            <p className="text-xs text-muted-foreground">
              Emitido em {format(new Date(pedido.data_emissao), 'dd/MM/yyyy')}
            </p>
          </div>
          <Badge variant="outline" className={config.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>

        {/* Fornecedor */}
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="truncate">
            {pedido.fornecedor?.razao_social || 'Fornecedor não encontrado'}
          </span>
        </div>

        {/* Prazo e Valor */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm">
              {pedido.data_previsao ? (
                <>
                  <span>{format(new Date(pedido.data_previsao), 'dd/MM/yy')}</span>
                  {prazoStatus.urgent && (
                    <span className={`ml-2 text-xs font-medium ${prazoStatus.color}`}>
                      {prazoStatus.label}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">Sem prazo</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-emerald-600">
              {pedido.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onView(pedido);
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            Detalhes
          </Button>
          {pedido.status === 'pendente' && onUpdateStatus && (
            <Button 
              variant="default" 
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(pedido.id, 'aprovado');
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Aprovar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <SwipeableListItem
      onEdit={onEdit ? () => onEdit(pedido) : undefined}
      onView={() => onView(pedido)}
    >
      {cardContent}
    </SwipeableListItem>
  );
};
