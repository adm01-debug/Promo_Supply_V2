import { format, differenceInDays } from "date-fns";
import { motion } from "framer-motion";
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
  DollarSign,
  ChevronRight,
  TrendingUp,
  Wallet,
  Banknote
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwipeableListItem } from "@/components/mobile/SwipeableListItem";
import { cn } from "@/lib/utils";
import type { Pagamento } from "@/hooks/usePagamentos";

interface PagamentoMobileCardProps {
  pagamento: Pagamento;
  onPagar: (pagamento: Pagamento) => void;
  onAprovar?: (pagamento: Pagamento) => void;
  onView?: (pagamento: Pagamento) => void;
}

const getVencimentoStatus = (vencimento: string, status: string) => {
  if (status === 'pago') {
    return { 
      label: "Pago", 
      variant: "success" as const, 
      icon: CheckCircle2, 
      color: "text-emerald-600 dark:text-emerald-400", 
      bgColor: "bg-emerald-500/10",
      borderColor: "border-l-emerald-500"
    };
  }
  
  const dias = differenceInDays(new Date(vencimento), new Date());
  
  if (dias < 0) return { 
    label: "Vencido", 
    variant: "destructive" as const, 
    icon: AlertTriangle, 
    color: "text-red-600 dark:text-red-400", 
    bgColor: "bg-red-500/10",
    borderColor: "border-l-red-500"
  };
  if (dias === 0) return { 
    label: "Vence Hoje", 
    variant: "destructive" as const, 
    icon: AlertTriangle, 
    color: "text-red-600 dark:text-red-400", 
    bgColor: "bg-red-500/10",
    borderColor: "border-l-red-500"
  };
  if (dias <= 2) return { 
    label: `${dias}d restante${dias > 1 ? 's' : ''}`, 
    variant: "warning" as const, 
    icon: Clock, 
    color: "text-orange-500", 
    bgColor: "bg-orange-500/10",
    borderColor: "border-l-orange-500"
  };
  return { 
    label: `${dias}d restantes`, 
    variant: "secondary" as const, 
    icon: Calendar, 
    color: "text-muted-foreground", 
    bgColor: "bg-muted",
    borderColor: "border-l-blue-500"
  };
};

const statusConfig: Record<string, { 
  label: string; 
  color: string;
  icon: typeof CheckCircle2;
  gradient: string;
}> = {
  pendente: { 
    label: 'Pendente', 
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: Clock,
    gradient: 'from-amber-500/5'
  },
  aprovado: { 
    label: 'Aprovado', 
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    icon: CheckCircle2,
    gradient: 'from-blue-500/5'
  },
  pago: { 
    label: 'Pago', 
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2,
    gradient: 'from-emerald-500/5'
  },
  cancelado: { 
    label: 'Cancelado', 
    color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    icon: AlertTriangle,
    gradient: 'from-red-500/5'
  },
};

const getFormaPagamentoConfig = (forma: string | null) => {
  const configs: Record<string, { icon: typeof QrCode; label: string; color: string }> = {
    pix: { icon: QrCode, label: 'PIX', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
    boleto: { icon: FileText, label: 'Boleto', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
    transferencia: { icon: Banknote, label: 'Transferência', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    cartao: { icon: CreditCard, label: 'Cartão', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  };
  return configs[forma || ''] || { icon: Wallet, label: forma?.toUpperCase() || 'N/D', color: 'bg-muted text-muted-foreground' };
};

export const PagamentoMobileCard = ({ 
  pagamento, 
  onPagar, 
  onAprovar,
  onView 
}: PagamentoMobileCardProps) => {
  const vencStatus = getVencimentoStatus(pagamento.data_vencimento, pagamento.status);
  const VencIcon = vencStatus.icon;
  const statusBadge = statusConfig[pagamento.status] || statusConfig.pendente;
  const StatusIcon = statusBadge.icon;
  const isPago = pagamento.status === 'pago';
  const formaPagamento = getFormaPagamentoConfig(pagamento.forma_pagamento);
  const FormaPagamentoIcon = formaPagamento.icon;

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
          vencStatus.borderColor
        )}
        onClick={() => onView?.(pagamento)}
      >
        {/* Gradient Background */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r to-transparent opacity-50 pointer-events-none",
          statusBadge.gradient
        )} />

        <div className="relative p-4 space-y-3">
          {/* Header com número e status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-base">{pagamento.numero}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              </div>
              {pagamento.numero_nf && (
                <p className="text-xs text-muted-foreground font-mono">
                  NF: {pagamento.numero_nf}
                </p>
              )}
            </div>
            <Badge variant="outline" className={cn("shrink-0 gap-1 font-medium", statusBadge.color)}>
              <StatusIcon className="w-3 h-3" />
              {statusBadge.label}
            </Badge>
          </div>

          {/* Fornecedor */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium truncate flex-1">
              {pagamento.fornecedor?.razao_social || 'Fornecedor não encontrado'}
            </span>
          </div>

          {/* Forma de pagamento */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("gap-1.5 font-medium", formaPagamento.color)}>
              <FormaPagamentoIcon className="h-3.5 w-3.5" />
              {formaPagamento.label}
            </Badge>
          </div>

          {/* Vencimento/Pagamento e Valor */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg transition-colors", vencStatus.bgColor)}>
                <VencIcon className={cn("w-4 h-4", vencStatus.color)} />
              </div>
              <div className="text-sm">
                <p className={cn("font-semibold", vencStatus.color)}>{vencStatus.label}</p>
                <p className="text-xs text-muted-foreground">
                  {isPago && pagamento.data_pagamento
                    ? format(new Date(pagamento.data_pagamento), 'dd/MM/yyyy')
                    : format(new Date(pagamento.data_vencimento), 'dd/MM/yyyy')
                  }
                </p>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg",
              isPago ? "bg-emerald-500/10" : "bg-primary/10"
            )}>
              <TrendingUp className={cn(
                "w-4 h-4",
                isPago ? "text-emerald-500" : "text-primary"
              )} />
              <span className={cn(
                "font-bold text-lg",
                isPago ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
              )}>
                {pagamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>

          {/* Quick Actions - Only for pending/approved */}
          {!isPago && (
            <div className="flex gap-2 pt-2">
              {pagamento.status === 'pendente' && onAprovar && (
                <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-10 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAprovar(pagamento);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Aprovar
                  </Button>
                </motion.div>
              )}
              <motion.div 
                className="flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="default" 
                  size="sm"
                  className="w-full h-10 font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPagar(pagamento);
                  }}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Registrar Pagamento
                </Button>
              </motion.div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
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
