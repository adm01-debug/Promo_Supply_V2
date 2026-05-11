import { AlertCircle, Clock, AlertTriangle, ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UrgentItem {
  id: string;
  produto: string;
  fornecedor: string;
  vencimento: string;
  urgencia: 'critico' | 'alto' | 'medio';
  status?: string;
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
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const config = urgenciaConfig[item.urgencia];
        const Icon = config.icon;
        
        return (
          <div
            key={item.id}
            className={cn(
              "flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border transition-all duration-300 hover:shadow-lg group relative overflow-hidden bg-card/50 backdrop-blur-sm",
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
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Vence: <span className="font-medium text-foreground">{item.vencimento}</span>
                </span>
                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border/50">
                  {item.fornecedor}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button 
                asChild
                variant="ghost" 
                size="sm" 
                className="h-8 gap-1 text-xs opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0"
              >
                <Link to={`/cotacao?id=${item.id}`}>
                  Detalhes
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>

              <Button 
                asChild
                variant={item.urgencia === 'critico' ? 'destructive' : 'default'} 
                size="sm" 
                className="h-8 gap-1 text-xs font-bold shadow-sm"
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
  );
};
