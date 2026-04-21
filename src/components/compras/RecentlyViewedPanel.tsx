import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  FileText, 
  ShoppingCart, 
  Building2, 
  CreditCard, 
  Calculator, 
  FileSignature, 
  Layout,
  X,
  Trash2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { ptBR } from "date-fns/locale/pt-BR";
import { 
  useRecentlyViewed, 
  RecentItem, 
  recentItemTypeLabels, 
  recentItemTypeColors 
} from '@/hooks/useRecentlyViewed';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const typeIconMap: Record<RecentItem['type'], React.ElementType> = {
  solicitacao: FileText,
  pedido: ShoppingCart,
  fornecedor: Building2,
  pagamento: CreditCard,
  cotacao: Calculator,
  contrato: FileSignature,
  page: Layout,
};

interface RecentItemCardProps {
  item: RecentItem;
  onRemove: (id: string) => void;
}

const RecentItemCard: React.FC<RecentItemCardProps> = ({ item, onRemove }) => {
  const Icon = typeIconMap[item.type];
  const timeAgo = formatDistanceToNow(new Date(item.viewedAt), { 
    addSuffix: true, 
    locale: ptBR 
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      className="group relative"
    >
      <Link
        to={item.url}
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg",
          "bg-muted/30 hover:bg-muted/60 dark:bg-muted/20 dark:hover:bg-muted/40",
          "border border-transparent hover:border-border/50",
          "transition-all duration-200"
        )}
      >
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
          recentItemTypeColors[item.type]
        )}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {item.subtitle}
                </p>
              )}
            </div>
            <Badge variant="outline" className="flex-shrink-0 text-[10px] h-5">
              {recentItemTypeLabels[item.type]}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 mt-1.5">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
        </div>

        {/* Arrow indicator */}
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-3" />
      </Link>

      {/* Remove button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-1 right-1 w-6 h-6",
              "opacity-0 group-hover:opacity-100",
              "transition-opacity duration-200"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(item.id);
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Remover do histórico</p>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
};

interface RecentlyViewedPanelProps {
  maxItems?: number;
  showInSheet?: boolean;
}

export const RecentlyViewedPanel: React.FC<RecentlyViewedPanelProps> = ({ 
  maxItems = 10,
  showInSheet = false 
}) => {
  const { 
    recentItems, 
    removeRecentItem, 
    clearRecentItems,
    getMostRecent 
  } = useRecentlyViewed();

  const displayItems = getMostRecent(maxItems);

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Visualizados Recentemente</h3>
          {recentItems.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {recentItems.length}
            </Badge>
          )}
        </div>
        {recentItems.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearRecentItems}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Limpar todo o histórico</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <Separator className="mb-4" />

      {/* Items list */}
      {displayItems.length > 0 ? (
        <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {displayItems.map((item) => (
                <RecentItemCard 
                  key={item.id} 
                  item={item} 
                  onRemove={removeRecentItem} 
                />
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-center p-6"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h4 className="font-medium text-foreground mb-1">
            Nenhum item recente
          </h4>
          <p className="text-sm text-muted-foreground max-w-[200px]">
            Os itens que você visualizar aparecerão aqui para acesso rápido
          </p>
        </motion.div>
      )}
    </div>
  );

  if (showInSheet) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Clock className="w-5 h-5" />
            {recentItems.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                {recentItems.length > 9 ? '9+' : recentItems.length}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:max-w-[400px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Visualizados Recentemente</SheetTitle>
            <SheetDescription>Lista de itens visualizados recentemente</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 dark-card-glow">
      {content}
    </div>
  );
};

/**
 * Compact version for sidebar or smaller spaces
 */
export const RecentlyViewedCompact: React.FC<{ maxItems?: number }> = ({ maxItems = 5 }) => {
  const { getMostRecent } = useRecentlyViewed();
  const items = getMostRecent(maxItems);

  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground px-2 mb-2 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Recentes
      </p>
      {items.map((item) => {
        const Icon = typeIconMap[item.type];
        return (
          <Link
            key={item.id}
            to={item.url}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md",
              "text-sm text-muted-foreground hover:text-foreground",
              "hover:bg-muted/50 transition-colors"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default RecentlyViewedPanel;
