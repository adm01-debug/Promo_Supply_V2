import { AlertCircle, Clock, AlertTriangle, ArrowRight, Zap, User, Send, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { UrgencyDetailsSheet } from "./dashboard/UrgencyDetailsSheet";

interface UrgentItem {
  id: string;
  dbId?: string;
  produto: string;
  fornecedor: string;
  vencimento: string;
  urgencia: 'critico' | 'alto' | 'medio';
  status?: string;
  comprador?: string;
}

interface UrgentItemsListProps {
  items: UrgentItem[];
}

const urgenciaConfig = {
  critico: {
    icon: AlertCircle,
    bg: 'bg-destructive/10',
    border: 'border-red-500/30',
    text: 'text-destructive',
    badge: 'bg-destructive',
  },
  alto: {
    icon: AlertTriangle,
    bg: 'bg-warning/10',
    border: 'border-yellow-500/30',
    text: 'text-warning',
    badge: 'bg-warning',
  },
  medio: {
    icon: Clock,
    bg: 'bg-warning/10',
    border: 'border-orange-500/30',
    text: 'text-warning',
    badge: 'bg-warning',
  },
};

export const UrgentItemsList = ({ items }: UrgentItemsListProps) => {
  const [filterBuyer, setFilterBuyer] = useState<string>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const buyers = Array.from(new Set(items.map(i => i.comprador).filter(Boolean))) as string[];

  const filteredItems = filterBuyer === 'all' 
    ? items 
    : items.filter(i => i.comprador === filterBuyer);

  const handleNotify = (e: React.MouseEvent, id: string, comprador: string) => {
    e.stopPropagation();
    toast.success(`Notificação enviada para ${comprador} sobre o item ${id}`);
  };

  const handleItemClick = (item: UrgentItem) => {
    setSelectedItemId(item.dbId || item.id);
    setIsSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Filtro por Comprador */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
        <Button 
          variant={filterBuyer === 'all' ? 'secondary' : 'outline'} 
          size="sm" 
          onClick={() => setFilterBuyer('all')}
          className="rounded-full text-[10px] h-6"
        >
          Todos
        </Button>
        {buyers.map(buyer => (
          <Button 
            key={buyer}
            variant={filterBuyer === buyer ? 'secondary' : 'outline'} 
            size="sm" 
            onClick={() => setFilterBuyer(buyer)}
            className="rounded-full text-[10px] h-6 whitespace-nowrap"
          >
            {buyer}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredItems.map((item) => {
          const config = urgenciaConfig[item.urgencia];
          const Icon = config.icon;
          
          return (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border transition-all duration-300 hover:shadow-lg group relative overflow-hidden bg-card/50 backdrop-blur-sm cursor-pointer",
                config.bg.replace('/10', '/5'),
                config.border
              )}
            >
              {/* Animated urgency indicator */}
              <div className={cn("absolute left-0 top-0 bottom-0 w-1", config.badge)} />

              <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110 duration-300", config.bg)}>
                <Icon className={cn("w-5 h-5", config.text)} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    #{item.id}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {item.produto}
                  </h3>
                  {item.urgencia === 'critico' && (
                    <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 animate-pulse uppercase font-black">SLA EXCEDIDO</Badge>
                  )}
                  {item.urgencia === 'alto' && (
                    <Badge variant="warning" className="text-[9px] px-1 py-0 h-4 uppercase font-black">SLA CRÍTICO</Badge>
                  )}
                </div>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Vence: <span className="font-medium text-foreground">{item.vencimento}</span>
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span className="font-medium text-foreground">{item.comprador}</span>
                  </span>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border/50">
                    {item.fornecedor}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1 text-xs opacity-0 group-hover:opacity-100 transition-all duration-300"
                  onClick={(e) => handleNotify(e, item.id, item.comprador || 'Comprador')}
                >
                  <Send className="w-3.5 h-3.5" />
                  Notificar
                </Button>

                <Button 
                  asChild
                  variant={item.urgencia === 'critico' ? 'destructive' : 'default'} 
                  size="sm" 
                  className="h-8 gap-1 text-xs font-bold shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link to={`/cotacao?id=${item.id}&action=quote`}>
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    Citar Agora
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <UrgencyDetailsSheet 
        itemId={selectedItemId}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </div>
  );
};