import { format, differenceInDays } from "date-fns";
import { 
  CreditCard, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  QrCode,
  FileText,
  Eye,
  DollarSign
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwipeableListItem } from "@/components/mobile/SwipeableListItem";
import type { Pagamento } from "@/hooks/usePagamentos";

interface PagamentoMobileCardProps {
  pagamento: Pagamento;
  onPagar: (pagamento: Pagamento) => void;
  onAprovar?: (pagamento: Pagamento) => void;
  onView?: (pagamento: Pagamento) => void;
}

const getVencimentoStatus = (vencimento: string, status: string) => {
  if (status === 'pago') {
    return { label: "Pago", variant: "success" as const, icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-500/10" };
  }
  
  const dias = differenceInDays(new Date(vencimento), new Date());
  
  if (dias < 0) return { label: "Vencido", variant: "destructive" as const, icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10" };
  if (dias === 0) return { label: "Vence Hoje", variant: "destructive" as const, icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10" };
  if (dias <= 2) return { label: `${dias}d restante${dias > 1 ? 's' : ''}`, variant: "warning" as const, icon: Clock, color: "text-orange-500", bgColor: "bg-orange-500/10" };
  return { label: `${dias}d restantes`, variant: "secondary" as const, icon: Calendar, color: "text-muted-foreground", bgColor: "bg-muted" };
};

const getStatusBadge = (status: string) => {
  const configs: Record<string, { label: string; color: string }> = {
    pendente: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    aprovado: { label: 'Aprovado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    pago: { label: 'Pago', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    cancelado: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  };
  return configs[status] || configs.pendente;
};

export const PagamentoMobileCard = ({ 
  pagamento, 
  onPagar, 
  onAprovar,
  onView 
}: PagamentoMobileCardProps) => {
  const vencStatus = getVencimentoStatus(pagamento.data_vencimento, pagamento.status);
  const VencIcon = vencStatus.icon;
  const statusBadge = getStatusBadge(pagamento.status);
  const isPago = pagamento.status === 'pago';

  const cardContent = (
    <Card 
      className="p-4 hover:shadow-md transition-shadow"
      onClick={() => onView?.(pagamento)}
    >
      <div className="space-y-3">
        {/* Header com número e status */}
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono font-semibold">{pagamento.numero}</span>
            {pagamento.numero_nf && (
              <p className="text-xs text-muted-foreground">
                NF: {pagamento.numero_nf}
              </p>
            )}
          </div>
          <Badge variant="outline" className={statusBadge.color}>
            {statusBadge.label}
          </Badge>
        </div>

        {/* Fornecedor */}
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="truncate">
            {pagamento.fornecedor?.razao_social || 'Fornecedor não encontrado'}
          </span>
        </div>

        {/* Forma de pagamento */}
        <div className="flex items-center gap-2">
          <Badge variant={pagamento.forma_pagamento === "pix" ? "default" : "secondary"} className="gap-1">
            {pagamento.forma_pagamento === "pix" ? (
              <QrCode className="h-3 w-3" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
            {pagamento.forma_pagamento?.toUpperCase() || 'N/D'}
          </Badge>
        </div>

        {/* Vencimento/Pagamento e Valor */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${vencStatus.bgColor}`}>
              <VencIcon className={`w-4 h-4 ${vencStatus.color}`} />
            </div>
            <div className="text-sm">
              <p className={`font-medium ${vencStatus.color}`}>{vencStatus.label}</p>
              <p className="text-xs text-muted-foreground">
                {isPago && pagamento.data_pagamento
                  ? format(new Date(pagamento.data_pagamento), 'dd/MM/yyyy')
                  : format(new Date(pagamento.data_vencimento), 'dd/MM/yyyy')
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">
              {pagamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Quick Actions - Only for pending/approved */}
        {!isPago && (
          <div className="flex gap-2 pt-2">
            {pagamento.status === 'pendente' && onAprovar && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onAprovar(pagamento);
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Aprovar
              </Button>
            )}
            <Button 
              variant="default" 
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onPagar(pagamento);
              }}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Registrar Pagamento
            </Button>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <SwipeableListItem
      onView={onView ? () => onView(pagamento) : undefined}
      onEdit={!isPago ? () => onPagar(pagamento) : undefined}
    >
      {cardContent}
    </SwipeableListItem>
  );
};
