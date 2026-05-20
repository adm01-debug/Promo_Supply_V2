import { Eye, BarChart3, FileText, Check, ArrowRight, Trash2, Edit, CheckCircle, XCircle, Archive, Copy, Clock, AlertTriangle, ChevronRight, GitBranch, MessageSquare, Zap } from "lucide-react";
import { StatusTimeline } from "@/components/compras/StatusTimeline";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Solicitacao } from "@/types/legacyTypes";
import { getTipoLabel, getStatusColor } from "@/types/legacyTypes";
import { SwipeableListItem } from "@/components/mobile/SwipeableListItem";
import { useHapticFeedback } from "@/hooks/useMobileGestures";
import { toast } from "sonner";
import { differenceInDays } from "date-fns/differenceInDays";
import { isPast } from "date-fns/isPast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
    primary: { label: 'Quote Now', icon: BarChart3, href: '/cotacao' },
    secondary: { label: 'View', icon: Eye },
  },
  EM_COTACAO: {
    primary: { label: 'View Quotes', icon: BarChart3, href: '/cotacao' },
    secondary: { label: 'Select', icon: Check },
  },
  FORNECEDOR_SELECIONADO: {
    primary: { label: 'Generate PO', icon: FileText },
    secondary: { label: 'View', icon: Eye },
  },
  AGUARDANDO_PAGAMENTO: {
    primary: { label: 'Pay Now', icon: FileText },
    secondary: { label: 'View', icon: Eye },
  },
  PAGO: {
    primary: { label: 'Track Order', icon: Eye },
    secondary: null,
  },
  EM_TRANSITO: {
    primary: { label: 'Track Delivery', icon: Eye },
    secondary: null,
  },
  PEDIDO_GERADO: {
    primary: { label: 'View Order', icon: Eye },
    secondary: null,
  },
  ENTREGUE: { label: 'View Details', icon: Eye } as any,
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

  const deadline = new Date(solicitacao.prazoEntrega);
  const daysRemaining = differenceInDays(deadline, new Date());
  const isOverdue = isPast(deadline) && solicitacao.status !== 'ENTREGUE';
  
  const getUrgencyInfo = () => {
    if (isOverdue) return { color: "text-rose-400", bg: "bg-rose-500/10", label: "Atrasado", icon: AlertTriangle, pulse: true };
    if (daysRemaining <= 2) return { color: "text-rose-400", bg: "bg-rose-500/10", label: "Urgente", icon: Clock, pulse: true };
    if (daysRemaining <= 5) return { color: "text-amber-400", bg: "bg-amber-500/10", label: "Prioridade", icon: Clock, pulse: false };
    return { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "No Prazo", icon: CheckCircle, pulse: false };
  };

  const urgency = getUrgencyInfo();

  const handleApprove = () => {
    haptic.success();
    if (onApprove) {
      onApprove();
    } else {
      toast.success(`Request #${solicitacao.id} approved`);
    }
  };

  const leftActions = [
    {
      id: 'approve',
      icon: <CheckCircle className="w-5 h-5" />,
      label: 'Aprovar',
      color: 'bg-emerald-500',
      onClick: handleApprove,
    },
  ];

  const rightActions = [
    {
      id: 'archive',
      icon: <Archive className="w-5 h-5" />,
      label: 'Arquivar',
      color: 'bg-zinc-600',
      onClick: () => {
        haptic.mediumTap();
        onArchive ? onArchive() : toast.info(`Request #${solicitacao.id} archived`);
      },
    },
    {
      id: 'reject',
      icon: <XCircle className="w-5 h-5" />,
      label: 'Rejeitar',
      color: 'bg-rose-500',
      onClick: () => {
        haptic.error();
        onReject ? onReject() : toast.error(`Request #${solicitacao.id} rejected`);
      },
    },
  ];

  const cardContent = (
    <Card 
      className={cn(
        "p-5 md:p-6 transition-all duration-300 border-white/5 bg-white/[0.03] backdrop-blur-2xl rounded-[2rem] hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-1 relative group",
        selected && "ring-2 ring-violet-500/50 bg-violet-500/5"
      )}
    >
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-[2rem] opacity-70" style={{ backgroundColor: statusColor.includes('#') ? statusColor : 'var(--violet-500)' }} />
      
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          {selectable && (
            <div className="shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectChange?.(checked === true)}
                className="h-5 w-5 border-white/20 data-[state=checked]:bg-violet-500"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-black text-xs font-mono text-violet-400 uppercase tracking-widest">#{solicitacao.id}</span>
                <span className="font-bold text-white text-base truncate">{solicitacao.empresa}</span>
                {(solicitacao as any).organizationName && (
                  <Badge className="text-[9px] font-black uppercase tracking-widest py-0.5 bg-violet-500/10 text-violet-400 border-none">
                    {(solicitacao as any).organizationName}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-violet-400">
                      <GitBranch className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 bg-[#0a0a0f] border-white/10 rounded-2xl p-4 shadow-2xl">
                    <h5 className="text-[10px] font-black uppercase text-violet-400 tracking-widest mb-4">Fluxo de Aprovação Neural</h5>
                    <div className="space-y-4">
                      {[
                        { label: 'Gerente Depto', status: 'completed', user: 'João Silva' },
                        { label: 'Diretor Financeiro', status: 'current', user: 'Maria Santos' },
                        { label: 'CEO Approval', status: 'pending', user: 'Roberto Costa' }
                      ].map((step, i) => (
                        <div key={i} className="flex gap-3 relative">
                          {i < 2 && <div className="absolute left-2 top-5 bottom-0 w-[1px] bg-white/10" />}
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 z-10",
                            step.status === 'completed' ? "bg-emerald-500 border-emerald-500" : 
                            step.status === 'current' ? "bg-violet-500 border-violet-500 animate-pulse" : "bg-zinc-900 border-zinc-800"
                          )}>
                            {step.status === 'completed' && <Check className="w-2 h-2 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase text-white tracking-widest">{step.label}</p>
                            <p className="text-[9px] text-zinc-500 font-bold">{step.user}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Badge className={cn(
                  "text-[10px] font-black uppercase tracking-widest py-1 px-3 gap-1.5 border-none rounded-full transition-all duration-500", 
                  urgency.bg, 
                  urgency.color,
                  urgency.pulse && "animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                )}>
                  <urgency.icon className="w-3 h-3" />
                  {urgency.label}
                </Badge>
              </div>
            </div>

            <p className="text-sm font-medium text-zinc-100 mb-4 line-clamp-2 leading-relaxed">{solicitacao.produto}</p>
            
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              <span className="text-zinc-300">{solicitacao.quantidade} UNITS</span>
              <Badge variant="outline" className="text-[9px] border-white/10 text-zinc-400">{getTipoLabel(solicitacao.tipo)}</Badge>
              <span className="hidden md:inline">BY: {solicitacao.vendedor}</span>
               <span className="hidden sm:inline">DUE: {new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}</span>
               {solicitacao.costCenterName && (
                 <span className="bg-white/5 text-violet-300 px-2 py-1 rounded-lg border border-white/5 lowercase italic font-medium">
                   {solicitacao.costCenterCode}: {solicitacao.costCenterName}
                 </span>
               )}
            </div>
          </div>
        </div>

        {solicitacao.status === 'EM_COTACAO' && solicitacao.cotacoes && (
          <div className="p-3 bg-violet-500/5 rounded-2xl border border-violet-500/10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">
              {solicitacao.cotacoes.length} Proposals Received
            </span>
            <span className="text-xs font-black text-white">Best: R$ {Math.min(...solicitacao.cotacoes.map(c => c.valorUnitario)).toFixed(2)}/un</span>
          </div>
        )}

        {solicitacao.status === 'FORNECEDOR_SELECIONADO' && solicitacao.fornecedorSelecionado && (
          <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Supplier: {solicitacao.fornecedorSelecionado}
            </span>
            <span className="text-xs font-black text-white">Total: R$ {solicitacao.valorTotal?.toLocaleString('pt-BR')}</span>
          </div>
        )}

        <div className="py-4 border-y border-white/5 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-transparent opacity-50" />
          <StatusTimeline currentStatus={solicitacao.status.toLowerCase()} compact />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-10 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 font-black text-[10px] tracking-widest uppercase">
                <MessageSquare className="w-3.5 h-3.5 mr-2" />
                Contexto
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-[#0a0a0f] border-white/10 rounded-2xl p-4 shadow-2xl">
              <h5 className="text-[10px] font-black uppercase text-violet-400 tracking-widest mb-4">Neural Context Thread</h5>
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] font-black text-white">@João Silva</span>
                    <span className="text-[8px] text-zinc-600">há 2h</span>
                  </div>
                  <p className="text-[10px] text-zinc-400">Verifiquei que o estoque de Dell está baixo. @Maria Santos, aprova a urgência?</p>
                </div>
                <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] font-black text-violet-300">@Maria Santos</span>
                    <span className="text-[8px] text-zinc-600">há 15min</span>
                  </div>
                  <p className="text-[10px] text-zinc-300">Ok, orçamento validado. Seguir com a compra.</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Input placeholder="Adicionar nota neural..." className="h-8 text-[10px] bg-white/5 border-white/5" />
                <Button size="icon" className="h-8 w-8 bg-violet-600"><ArrowRight className="w-3 h-3" /></Button>
              </div>
            </PopoverContent>
          </Popover>

          {onDuplicate && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="h-10 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 font-black text-[10px] tracking-widest uppercase" title="Duplicate">
              <Copy className="w-3.5 h-3.5 mr-2" />
              Duplicate
            </Button>
          )}

          <div className="flex-1" />

          {actions?.secondary && (
            <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 font-black text-[10px] tracking-widest uppercase">
              <actions.secondary.icon className="w-4 h-4 mr-2" />
              {actions.secondary.label}
            </Button>
          )}
          
          {actions?.primary && (
            <Button 
              size="sm" 
              asChild={!!actions.primary.href}
              className={cn(
                "h-10 px-6 rounded-xl font-black text-[10px] tracking-[0.15em] uppercase border-none shadow-lg shadow-violet-500/20",
                solicitacao.status === 'AGUARDANDO_COTACAO' ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20" : "bg-violet-600 hover:bg-violet-500"
              )}
            >
              {actions.primary.href ? (
                <Link to={`${actions.primary.href}?id=${solicitacao.id}`}>
                  <actions.primary.icon className="w-4 h-4 mr-2" />
                  {actions.primary.label}
                </Link>
              ) : (
                <button>
                  <actions.primary.icon className="w-4 h-4 mr-2" />
                  {actions.primary.label}
                </button>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <SwipeableListItem 
      onDelete={onDelete ? () => { haptic.error(); onDelete(); } : undefined} 
      onEdit={onEdit}
      leftActions={leftActions}
      rightActions={rightActions}
    >
      {cardContent}
    </SwipeableListItem>
  );
};
