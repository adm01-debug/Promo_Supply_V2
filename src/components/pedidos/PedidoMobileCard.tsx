import { format } from "date-fns/format";
import { differenceInDays } from "date-fns/differenceInDays";
import { motion } from "framer-motion";
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
  Edit,
  TrendingUp,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwipeableListItem } from "@/components/mobile/SwipeableListItem";
import { cn } from "@/lib/utils";
import type { Pedido } from "@/hooks/usePedidos";

interface PedidoMobileCardProps {
  pedido: Pedido;
  onView: (pedido: Pedido) => void;
  onEdit?: (pedido: Pedido) => void;
  onUpdateStatus?: (pedidoId: string, status: Pedido['status']) => void;
}

const statusConfig: Record<string, { 
  label: string; 
  color: string; 
  icon: typeof CheckCircle2;
  bgGradient: string;
  glowColor: string;
}> = {
  pendente: { 
    label: 'Pendente', 
    color: 'bg-warning/10 text-warning dark:text-warning border-amber-500/20', 
    icon: Clock,
    bgGradient: 'from-amber-500/5 to-transparent',
    glowColor: 'shadow-amber-500/10'
  },
  aprovado: { 
    label: 'Aprovado', 
    color: 'bg-info/10 text-info dark:text-info border-blue-500/20', 
    icon: CheckCircle2,
    bgGradient: 'from-blue-500/5 to-transparent',
    glowColor: 'shadow-blue-500/10'
  },
  enviado: { 
    label: 'Enviado', 
    color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', 
    icon: FileText,
    bgGradient: 'from-indigo-500/5 to-transparent',
    glowColor: 'shadow-indigo-500/10'
  },
  em_transito: { 
    label: 'Em Trânsito', 
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', 
    icon: Truck,
    bgGradient: 'from-purple-500/5 to-transparent',
    glowColor: 'shadow-purple-500/10'
  },
  entregue: { 
    label: 'Entregue', 
    color: 'bg-success/10 text-success dark:text-success border-emerald-500/20', 
    icon: CheckCircle2,
    bgGradient: 'from-emerald-500/5 to-transparent',
    glowColor: 'shadow-emerald-500/10'
  },
  cancelado: { 
    label: 'Cancelado', 
    color: 'bg-destructive/10 text-destructive dark:text-destructive border-red-500/20', 
    icon: X,
    bgGradient: 'from-red-500/5 to-transparent',
    glowColor: 'shadow-red-500/10'
  },
};

const getPrazoStatus = (prazo: string | null, status: string) => {
  if (!prazo) return { label: 'Sem prazo', color: 'text-muted-foreground', urgent: false, icon: Calendar };
  if (status === 'entregue' || status === 'cancelado') return { label: '', color: '', urgent: false, icon: Calendar };
  
  const dias = differenceInDays(new Date(prazo), new Date());
  if (dias < 0) return { label: 'Atrasado', color: 'text-destructive', urgent: true, icon: AlertCircle };
  if (dias === 0) return { label: 'Vence hoje', color: 'text-destructive', urgent: true, icon: AlertCircle };
  if (dias <= 2) return { label: `${dias}d restante${dias > 1 ? 's' : ''}`, color: 'text-warning', urgent: true, icon: Clock };
  return { label: `${dias}d restantes`, color: 'text-muted-foreground', urgent: false, icon: Calendar };
};

export const PedidoMobileCard = ({ 
  pedido, 
  onView, 
  onEdit,
  onUpdateStatus 
}: PedidoMobileCardProps) => {
  const config = statusConfig[pedido.status] || statusConfig["pendente"];
  const StatusIcon = config.icon;
  const prazoStatus = getPrazoStatus(pedido.data_previsao, pedido.status);
  const PrazoIcon = prazoStatus.icon;

  const cardContent = (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card 
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          "hover:shadow-lg active:shadow-md",
          "border-l-4",
          pedido.status === 'pendente' && "border-l-amber-500",
          pedido.status === 'aprovado' && "border-l-blue-500",
          pedido.status === 'enviado' && "border-l-indigo-500",
          pedido.status === 'em_transito' && "border-l-purple-500",
          pedido.status === 'entregue' && "border-l-emerald-500",
          pedido.status === 'cancelado' && "border-l-red-500",
          config.glowColor
        )}
        onClick={() => onView(pedido)}
      >
        {/* Gradient Background */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r opacity-50 pointer-events-none",
          config.bgGradient
        )} />
        
        <div className="relative p-4 space-y-3">
          {/* Header com número e status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-base text-primary">{pedido.numero}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Emitido em {format(new Date(pedido.data_emissao), 'dd/MM/yyyy')}
              </p>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "shrink-0 gap-1 font-medium transition-all",
                config.color
              )}
            >
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </Badge>
          </div>

          {/* Fornecedor */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium truncate flex-1">
              {pedido.fornecedor?.razao_social || 'Fornecedor não encontrado'}
            </span>
          </div>

          {/* Prazo e Valor */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                prazoStatus.urgent ? "bg-destructive/10" : "bg-muted"
              )}>
                <PrazoIcon className={cn("w-4 h-4", prazoStatus.color)} />
              </div>
              <div className="text-sm">
                {pedido.data_previsao ? (
                  <div className="flex flex-col">
                    <span className="font-medium">{format(new Date(pedido.data_previsao), 'dd/MM/yy')}</span>
                    {prazoStatus.label && (
                      <span className={cn("text-xs font-medium", prazoStatus.color)}>
                        {prazoStatus.label}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Sem prazo</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="font-bold text-success dark:text-success">
                {pedido.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-10 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onView(pedido);
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              Detalhes
            </Button>
            {pedido.status === 'pendente' && onUpdateStatus && (
              <motion.div 
                className="flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  variant="default" 
                  size="sm"
                  className="w-full h-10 font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(pedido.id, 'aprovado');
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
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
