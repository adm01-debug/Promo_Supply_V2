import { Eye, BarChart3, FileText, Check, ArrowRight, Trash2, Edit, CheckCircle, XCircle, Archive, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Solicitacao } from "@/data/mockData";
import { getTipoLabel, getStatusColor } from "@/data/mockData";
import { SwipeableListItem } from "@/components/mobile/SwipeableListItem";
import { useHapticFeedback } from "@/hooks/useMobileGestures";
import { toast } from "sonner";

interface SolicitacaoCardProps {
  solicitacao: Solicitacao;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onArchive?: () => void;
  onDuplicate?: () => void;
}

const statusActions: Record<string, { 
  primary: { label: string; icon: React.ElementType; href?: string } | null; 
  secondary: { label: string; icon: React.ElementType } | null;
}> = {
  AGUARDANDO_COTACAO: {
    primary: { label: 'Cotar', icon: BarChart3, href: '/cotacao' },
    secondary: { label: 'Ver', icon: Eye },
  },
  EM_COTACAO: {
    primary: { label: 'Ver Cotações', icon: BarChart3, href: '/cotacao' },
    secondary: { label: 'Selecionar', icon: Check },
  },
  FORNECEDOR_SELECIONADO: {
    primary: { label: 'Gerar Pedido', icon: FileText },
    secondary: { label: 'Ver', icon: Eye },
  },
  AGUARDANDO_PAGAMENTO: {
    primary: { label: 'Pagar', icon: FileText },
    secondary: { label: 'Ver', icon: Eye },
  },
  PAGO: {
    primary: { label: 'Acompanhar', icon: Eye },
    secondary: null,
  },
  EM_TRANSITO: {
    primary: { label: 'Rastrear', icon: Eye },
    secondary: null,
  },
  PEDIDO_GERADO: {
    primary: { label: 'Ver Pedido', icon: Eye },
    secondary: null,
  },
  ENTREGUE: {
    primary: { label: 'Ver Detalhes', icon: Eye },
    secondary: null,
  },
};

export const SolicitacaoCard = ({ 
  solicitacao, 
  selectable = false,
  selected = false,
  onSelectChange,
  onDelete,
  onEdit,
  onApprove,
  onReject,
  onArchive,
  onDuplicate,
}: SolicitacaoCardProps) => {
  const actions = statusActions[solicitacao.status];
  const statusColor = getStatusColor(solicitacao.status);
  const haptic = useHapticFeedback();

  // Enhanced swipe handlers with haptic feedback
  const handleApprove = () => {
    haptic.success();
    if (onApprove) {
      onApprove();
    } else {
      toast.success(`Solicitação #${solicitacao.id} aprovada`);
    }
  };

  const handleReject = () => {
    haptic.error();
    if (onReject) {
      onReject();
    } else {
      toast.error(`Solicitação #${solicitacao.id} rejeitada`);
    }
  };

  const handleArchive = () => {
    haptic.mediumTap();
    if (onArchive) {
      onArchive();
    } else {
      toast.info(`Solicitação #${solicitacao.id} arquivada`);
    }
  };

  const handleDelete = () => {
    haptic.error();
    if (onDelete) {
      onDelete();
    }
  };

  // Swipe actions configuration
  const leftActions = [
    {
      id: 'approve',
      icon: <CheckCircle className="w-5 h-5" />,
      label: 'Aprovar',
      color: 'bg-success',
      onClick: handleApprove,
    },
  ];

  const rightActions = [
    {
      id: 'archive',
      icon: <Archive className="w-5 h-5" />,
      label: 'Arquivar',
      color: 'bg-muted-foreground',
      onClick: handleArchive,
    },
    {
      id: 'reject',
      icon: <XCircle className="w-5 h-5" />,
      label: 'Rejeitar',
      color: 'bg-destructive',
      onClick: handleReject,
    },
  ];

  const cardContent = (
    <Card 
      className={cn(
        "p-3 md:p-4 hover:shadow-md transition-all duration-200 border-l-4",
        statusColor.replace('bg-', 'border-l-'),
        selected && "ring-2 ring-primary bg-primary/5"
      )}
    >
      <div className="flex flex-col gap-3">
        {/* Header row with checkbox and ID */}
        <div className="flex items-start gap-3">
          {/* Checkbox for selection */}
          {selectable && (
            <div className="shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectChange?.(checked === true)}
                className="h-5 w-5"
              />
            </div>
          )}

          {/* Info Principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs sm:text-sm font-bold text-primary">#{solicitacao.id}</span>
              <span className="text-muted-foreground hidden sm:inline">|</span>
              <span className="font-semibold text-foreground text-sm truncate">{solicitacao.empresa}</span>
            </div>
            
            <p className="text-sm text-foreground mb-2 line-clamp-2">{solicitacao.produto}</p>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
              <span>{solicitacao.quantidade} un</span>
              <span className="hidden sm:inline">•</span>
              <Badge variant="outline" className="text-xs">{getTipoLabel(solicitacao.tipo)}</Badge>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Vendedor: {solicitacao.vendedor}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Prazo: {new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>

        {/* Info adicional por status */}
        {solicitacao.status === 'EM_COTACAO' && solicitacao.cotacoes && (
          <div className="mt-2 p-2 bg-yellow-500/10 rounded-md">
            <span className="text-xs text-yellow-600 font-medium">
              {solicitacao.cotacoes.length} cotações recebidas | Melhor: R$ {Math.min(...solicitacao.cotacoes.map(c => c.valorUnitario)).toFixed(2)}/un
            </span>
          </div>
        )}

        {solicitacao.status === 'FORNECEDOR_SELECIONADO' && solicitacao.fornecedorSelecionado && (
          <div className="mt-2 p-2 bg-blue-500/10 rounded-md">
            <span className="text-xs text-blue-600 font-medium">
              Fornecedor: {solicitacao.fornecedorSelecionado} | R$ {solicitacao.valorUnitario?.toFixed(2)}/un | Total: R$ {solicitacao.valorTotal?.toLocaleString('pt-BR')}
            </span>
          </div>
        )}

        {/* Swipe hint for mobile */}
        <div className="md:hidden text-[10px] text-muted-foreground/60 text-center">
          ← Deslize para ações rápidas →
        </div>

        {/* Ações - responsive layout */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {actions?.secondary && (
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9">
              <actions.secondary.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden sm:inline">{actions.secondary.label}</span>
              <span className="sm:hidden">Ver</span>
            </Button>
          )}
          
          {actions?.primary && (
            <Button 
              size="sm" 
              asChild={!!actions.primary.href}
              className={cn(
                "flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9",
                solicitacao.status === 'AGUARDANDO_COTACAO' && "bg-emerald-600 hover:bg-emerald-700",
                solicitacao.status === 'EM_COTACAO' && "bg-yellow-600 hover:bg-yellow-700",
                solicitacao.status === 'FORNECEDOR_SELECIONADO' && "bg-blue-600 hover:bg-blue-700",
                solicitacao.status === 'AGUARDANDO_PAGAMENTO' && "bg-orange-600 hover:bg-orange-700",
              )}
            >
              {actions.primary.href ? (
                <Link to={`${actions.primary.href}?id=${solicitacao.id}`}>
                  <actions.primary.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  {actions.primary.label}
                </Link>
              ) : (
                <>
                  <actions.primary.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  {actions.primary.label}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  // Always wrap with SwipeableListItem for mobile swipe actions
  return (
    <SwipeableListItem 
      onDelete={onDelete ? handleDelete : undefined} 
      onEdit={onEdit}
      leftActions={leftActions}
      rightActions={rightActions}
    >
      {cardContent}
    </SwipeableListItem>
  );
};