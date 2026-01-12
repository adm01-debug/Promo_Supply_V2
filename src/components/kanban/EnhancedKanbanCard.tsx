import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  AlertTriangle, 
  Package, 
  Building2,
  Calendar,
  Eye,
  MoreHorizontal,
  Timer,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Paperclip,
  CheckCircle2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ============================================
// CARD AGING SYSTEM
// ============================================

type AgingLevel = 'fresh' | 'normal' | 'aging' | 'critical';

interface AgingConfig {
  level: AgingLevel;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon?: typeof Clock;
}

const getAgingLevel = (createdAt: Date, statusChangedAt?: Date): AgingConfig => {
  const referenceDate = statusChangedAt || createdAt;
  const now = new Date();
  const hoursInStatus = (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60);

  if (hoursInStatus < 24) {
    return {
      level: 'fresh',
      label: 'Novo',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-l-emerald-500'
    };
  } else if (hoursInStatus < 72) {
    return {
      level: 'normal',
      label: 'Em andamento',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-l-blue-500'
    };
  } else if (hoursInStatus < 168) {
    return {
      level: 'aging',
      label: 'Atenção',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-l-amber-500',
      icon: Clock
    };
  } else {
    return {
      level: 'critical',
      label: 'Crítico',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-l-red-500',
      icon: AlertTriangle
    };
  }
};

// ============================================
// TIME IN STATUS COMPONENT
// ============================================

interface TimeInStatusProps {
  statusChangedAt: Date;
  compact?: boolean;
}

const TimeInStatus = ({ statusChangedAt, compact = false }: TimeInStatusProps) => {
  const [timeElapsed, setTimeElapsed] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const diff = now.getTime() - statusChangedAt.getTime();
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        setTimeElapsed(`${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeElapsed(`${hours}h ${minutes % 60}m`);
      } else {
        setTimeElapsed(`${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [statusChangedAt]);

  if (compact) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Timer className="w-3 h-3" />
        {timeElapsed}
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Timer className="w-3 h-3" />
            <span>{timeElapsed}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tempo neste status desde {statusChangedAt.toLocaleString('pt-BR')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ============================================
// PRIORITY INDICATOR
// ============================================

interface PriorityIndicatorProps {
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
}

const PriorityIndicator = ({ priority }: PriorityIndicatorProps) => {
  const configs = {
    baixa: { color: 'bg-slate-400', bars: 1 },
    media: { color: 'bg-blue-500', bars: 2 },
    alta: { color: 'bg-amber-500', bars: 3 },
    urgente: { color: 'bg-red-500', bars: 4 }
  };

  const config = configs[priority];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-end gap-0.5 h-4">
            {[1, 2, 3, 4].map((bar) => (
              <motion.div
                key={bar}
                className={cn(
                  "w-1 rounded-sm transition-colors",
                  bar <= config.bars ? config.color : 'bg-muted'
                )}
                style={{ height: `${bar * 25}%` }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: bar * 0.05 }}
              />
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Prioridade: {priority.charAt(0).toUpperCase() + priority.slice(1)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ============================================
// ENHANCED KANBAN CARD
// ============================================

export interface EnhancedKanbanCardData {
  id: string;
  titulo: string;
  descricao?: string;
  empresa: string;
  produto?: string;
  quantidade?: number;
  unidade?: string;
  status: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  valorTotal?: number;
  prazoEntrega?: Date;
  createdAt: Date;
  statusChangedAt?: Date;
  assignee?: {
    name: string;
    avatar?: string;
  };
  comentarios?: number;
  anexos?: number;
  tags?: string[];
  progresso?: number;
}

interface EnhancedKanbanCardProps {
  data: EnhancedKanbanCardData;
  onViewDetails?: (data: EnhancedKanbanCardData) => void;
  onEdit?: (data: EnhancedKanbanCardData) => void;
  onArchive?: (data: EnhancedKanbanCardData) => void;
  isDragging?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  compact?: boolean;
  showAging?: boolean;
  showTimeInStatus?: boolean;
}

export const EnhancedKanbanCard = ({
  data,
  onViewDetails,
  onEdit,
  onArchive,
  isDragging = false,
  isSelected = false,
  onSelect,
  compact = false,
  showAging = true,
  showTimeInStatus = true
}: EnhancedKanbanCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const aging = useMemo(() => 
    getAgingLevel(data.createdAt, data.statusChangedAt),
    [data.createdAt, data.statusChangedAt]
  );

  const isOverdue = data.prazoEntrega && new Date() > data.prazoEntrega;
  const AgingIcon = aging.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: isDragging ? 0.6 : 1, 
        y: 0,
        scale: isDragging ? 1.02 : 1
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all cursor-pointer border-l-4",
        aging.borderColor,
        isSelected && "ring-2 ring-primary ring-offset-2",
        isDragging && "shadow-xl",
        "hover:shadow-md"
      )}>
        {/* Aging indicator strip */}
        {showAging && aging.level !== 'fresh' && (
          <div className={cn(
            "absolute top-0 left-0 right-0 h-1",
            aging.level === 'aging' && "bg-gradient-to-r from-amber-500/50 to-amber-500",
            aging.level === 'critical' && "bg-gradient-to-r from-red-500/50 to-red-500 animate-pulse"
          )} />
        )}

        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-mono text-muted-foreground">
                #{data.id.slice(-6)}
              </span>
              {AgingIcon && (
                <AgingIcon className={cn("w-3.5 h-3.5", aging.color)} />
              )}
              {isOverdue && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  Atrasado
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1.5">
              <PriorityIndicator priority={data.prioridade} />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails?.(data)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(data)}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onArchive?.(data)}
                    className="text-destructive"
                  >
                    Arquivar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h4 className="font-medium text-sm text-foreground line-clamp-2">
              {data.titulo || data.produto}
            </h4>
            {!compact && data.descricao && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {data.descricao}
              </p>
            )}
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{data.empresa}</span>
            </div>
            
            {data.quantidade && (
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                <span>{data.quantidade} {data.unidade || 'un'}</span>
              </div>
            )}

            {showTimeInStatus && data.statusChangedAt && (
              <TimeInStatus statusChangedAt={data.statusChangedAt} compact />
            )}
          </div>

          {/* Progress bar */}
          {data.progresso !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{data.progresso}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${data.progresso}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </div>
            </div>
          )}

          {/* Tags */}
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.tags.slice(0, 3).map((tag, i) => (
                <Badge 
                  key={i} 
                  variant="secondary" 
                  className="text-[10px] px-1.5 py-0"
                >
                  {tag}
                </Badge>
              ))}
              {data.tags.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{data.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              {data.comentarios !== undefined && data.comentarios > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="w-3 h-3" />
                        <span>{data.comentarios}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{data.comentarios} comentário(s)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {data.anexos !== undefined && data.anexos > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Paperclip className="w-3 h-3" />
                        <span>{data.anexos}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{data.anexos} anexo(s)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {data.prazoEntrega && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "flex items-center gap-1 text-xs",
                        isOverdue ? "text-destructive" : "text-muted-foreground"
                      )}>
                        <Calendar className="w-3 h-3" />
                        <span>
                          {data.prazoEntrega.toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Prazo: {data.prazoEntrega.toLocaleDateString('pt-BR')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {data.valorTotal && (
              <div className="font-semibold text-sm text-primary">
                R$ {data.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Assignee */}
          {data.assignee && (
            <div className="flex items-center gap-2 pt-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                {data.assignee.name.charAt(0)}
              </div>
              <span className="text-xs text-muted-foreground">{data.assignee.name}</span>
            </div>
          )}
        </div>

        {/* Selection checkbox overlay */}
        {onSelect && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(data.id);
            }}
            className={cn(
              "absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
              isSelected 
                ? "bg-primary border-primary text-primary-foreground" 
                : "border-muted-foreground/30 hover:border-primary"
            )}
            whileTap={{ scale: 0.9 }}
          >
            {isSelected && <CheckCircle2 className="w-3 h-3" />}
          </motion.button>
        )}
      </Card>
    </motion.div>
  );
};

export { TimeInStatus, PriorityIndicator, getAgingLevel };
export type { AgingLevel, AgingConfig };
