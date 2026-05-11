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
          <Link
            to={`/cotacao?id=${item.id}`}
            key={item.id}
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 hover:shadow-md group",
              config.bg,
              config.border
            )}
          >
            <div className={cn("p-2 rounded-full", config.bg)}>
              <Icon className={cn("w-5 h-5", config.text)} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-foreground">
                  #{item.id}
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-sm text-foreground truncate">{item.produto}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{item.fornecedor}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={cn(
                "px-2 py-1 rounded text-xs font-semibold text-primary-foreground",
                config.badge
              )}>
                Vence: {item.vencimento}
              </span>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        );
      })}
    </div>
  );
};
