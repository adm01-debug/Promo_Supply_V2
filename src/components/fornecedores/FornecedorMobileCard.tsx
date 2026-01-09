import React from 'react';
import { motion } from 'framer-motion';
import { 
  Edit, 
  History, 
  Mail, 
  Phone, 
  MessageCircle, 
  Star, 
  Plug, 
  Building2,
  ChevronRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SwipeableListItem, type SwipeAction } from '@/components/mobile/SwipeableListItem';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface FornecedorCardData {
  id: string;
  nomeFantasia: string;
  cnpj: string;
  tipo: 'IMPORTADORA' | 'FABRICANTE' | 'DISTRIBUIDORA';
  ramos: string[];
  email: string;
  telefone: string;
  whatsapp: string;
  apiIntegrada: boolean;
  rating: number;
}

interface FornecedorMobileCardProps {
  fornecedor: FornecedorCardData;
  onEdit?: () => void;
  onHistory?: () => void;
  onDelete?: () => void;
}

const getTipoConfig = (tipo: FornecedorCardData['tipo']) => {
  const configs = { 
    IMPORTADORA: { 
      label: 'Importadora', 
      color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      borderColor: 'border-l-blue-500',
      gradient: 'from-blue-500/5'
    },
    FABRICANTE: { 
      label: 'Fabricante', 
      color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      borderColor: 'border-l-purple-500',
      gradient: 'from-purple-500/5'
    },
    DISTRIBUIDORA: { 
      label: 'Distribuidora', 
      color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      borderColor: 'border-l-cyan-500',
      gradient: 'from-cyan-500/5'
    }
  };
  return configs[tipo];
};

const getRatingColor = (rating: number) => {
  if (rating >= 4.5) return 'text-emerald-500';
  if (rating >= 4) return 'text-amber-500';
  if (rating >= 3) return 'text-orange-500';
  return 'text-red-500';
};

export function FornecedorMobileCard({ 
  fornecedor, 
  onEdit, 
  onHistory,
  onDelete 
}: FornecedorMobileCardProps) {
  const isMobile = useIsMobile();
  const tipoConfig = getTipoConfig(fornecedor.tipo);

  const leftActions: SwipeAction[] = [];
  const rightActions: SwipeAction[] = [];

  if (onHistory) {
    leftActions.push({
      id: 'history',
      icon: <History className="w-5 h-5" />,
      label: 'Histórico',
      color: 'bg-primary',
      onClick: onHistory,
    });
  }

  if (onEdit) {
    leftActions.push({
      id: 'edit',
      icon: <Edit className="w-5 h-5" />,
      label: 'Editar',
      color: 'bg-blue-500',
      onClick: onEdit,
    });
  }

  const cardContent = (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300",
        "hover:shadow-lg active:shadow-md",
        "border-l-4",
        tipoConfig.borderColor
      )}>
        {/* Gradient Background */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r to-transparent opacity-50 pointer-events-none",
          tipoConfig.gradient
        )} />

        <div className="relative p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Header com nome e badges */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">{fornecedor.nomeFantasia}</p>
                    {fornecedor.apiIntegrada && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shrink-0 gap-1">
                        <Plug className="w-3 h-3" />
                        <span className="text-[10px] font-medium">API</span>
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{fornecedor.cnpj || 'Sem CNPJ'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
              </div>
              
              {/* Tipo e Ramos */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="outline" className={cn("font-medium", tipoConfig.color)}>
                  {tipoConfig.label}
                </Badge>
                {fornecedor.ramos.slice(0, 2).map(ramo => (
                  <Badge key={ramo} variant="secondary" className="text-xs bg-muted/80">
                    {ramo}
                  </Badge>
                ))}
                {fornecedor.ramos.length > 2 && (
                  <Badge variant="secondary" className="text-xs bg-muted/80">
                    +{fornecedor.ramos.length - 2}
                  </Badge>
                )}
              </div>
              
              {/* Rating com visual melhorado */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Star 
                        className={cn(
                          "w-4 h-4 transition-all",
                          i < fornecedor.rating 
                            ? 'text-amber-400 fill-amber-400 drop-shadow-sm' 
                            : 'text-muted-foreground/20'
                        )} 
                      />
                    </motion.div>
                  ))}
                </div>
                <span className={cn("text-sm font-bold", getRatingColor(fornecedor.rating))}>
                  {fornecedor.rating.toFixed(1)}
                </span>
                {fornecedor.rating >= 4.5 && (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                )}
              </div>
            </div>

            {/* Contact buttons - visible on desktop */}
            {!isMobile && (
              <div className="flex flex-col gap-1 shrink-0">
                {fornecedor.email && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-lg hover:bg-primary/10"
                    onClick={() => window.open(`mailto:${fornecedor.email}`)}
                  >
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
                {fornecedor.telefone && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-lg hover:bg-primary/10"
                    onClick={() => window.open(`tel:${fornecedor.telefone}`)}
                  >
                    <Phone className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
                {fornecedor.whatsapp && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-lg hover:bg-emerald-500/10"
                    onClick={() => window.open(`https://wa.me/55${fornecedor.whatsapp.replace(/\D/g, '')}`)}
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-500" />
                  </Button>
                )}
                {onHistory && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={onHistory}>
                    <History className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
                {onEdit && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={onEdit}>
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Contact row for mobile - enhanced */}
          {isMobile && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
              {fornecedor.email && (
                <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-10 font-medium gap-2"
                    onClick={() => window.open(`mailto:${fornecedor.email}`)}
                  >
                    <Mail className="w-4 h-4" />
                    Email
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </Button>
                </motion.div>
              )}
              {fornecedor.whatsapp && (
                <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-10 font-medium gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => window.open(`https://wa.me/55${fornecedor.whatsapp.replace(/\D/g, '')}`)}
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </Button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );

  if (isMobile && (leftActions.length > 0 || onDelete)) {
    return (
      <SwipeableListItem 
        leftActions={leftActions.length > 0 ? leftActions : undefined}
        onDelete={onDelete}
      >
        {cardContent}
      </SwipeableListItem>
    );
  }

  return cardContent;
}
