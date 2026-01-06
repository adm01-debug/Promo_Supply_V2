import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  FileX, 
  FolderOpen, 
  Inbox, 
  ShoppingCart,
  Users,
  FileText,
  ClipboardList,
  CreditCard,
  Truck,
  Package,
  BarChart3,
  type LucideIcon
} from "lucide-react";

interface IllustratedEmptyStateProps {
  type?: "search" | "list" | "folder" | "inbox" | "cart" | "users" | "documents" | "requests" | "payments" | "orders" | "packages" | "analytics" | "custom";
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "default" | "lg";
}

const typeIcons: Record<string, LucideIcon> = {
  search: Search,
  list: FileX,
  folder: FolderOpen,
  inbox: Inbox,
  cart: ShoppingCart,
  users: Users,
  documents: FileText,
  requests: ClipboardList,
  payments: CreditCard,
  orders: Truck,
  packages: Package,
  analytics: BarChart3,
  custom: FileX,
};

const typeColors: Record<string, string> = {
  search: "from-info/20 to-info/5 text-info",
  list: "from-muted/50 to-muted/20 text-muted-foreground",
  folder: "from-warning/20 to-warning/5 text-warning",
  inbox: "from-primary/20 to-primary/5 text-primary",
  cart: "from-success/20 to-success/5 text-success",
  users: "from-info/20 to-info/5 text-info",
  documents: "from-primary/20 to-primary/5 text-primary",
  requests: "from-warning/20 to-warning/5 text-warning",
  payments: "from-success/20 to-success/5 text-success",
  orders: "from-info/20 to-info/5 text-info",
  packages: "from-primary/20 to-primary/5 text-primary",
  analytics: "from-chart-1/20 to-chart-1/5 text-chart-1",
  custom: "from-muted/50 to-muted/20 text-muted-foreground",
};

export const IllustratedEmptyState = ({
  type = "list",
  icon: CustomIcon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "default",
}: IllustratedEmptyStateProps) => {
  const Icon = CustomIcon || typeIcons[type];
  const colorClass = typeColors[type];

  const sizes = {
    sm: {
      container: "py-8 px-4",
      iconWrapper: "w-16 h-16",
      icon: "w-8 h-8",
      title: "text-base",
      description: "text-xs",
    },
    default: {
      container: "py-12 px-6",
      iconWrapper: "w-24 h-24",
      icon: "w-12 h-12",
      title: "text-lg",
      description: "text-sm",
    },
    lg: {
      container: "py-16 px-8",
      iconWrapper: "w-32 h-32",
      icon: "w-16 h-16",
      title: "text-xl",
      description: "text-base",
    },
  };

  const s = sizes[size];

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card/50",
        s.container,
        className
      )}
    >
      {/* Animated Icon Container */}
      <div 
        className={cn(
          "relative rounded-full bg-gradient-to-br flex items-center justify-center mb-6 animate-float",
          colorClass,
          s.iconWrapper
        )}
      >
        {/* Decorative rings */}
        <div className="absolute inset-0 rounded-full border border-current opacity-20 animate-ping-slow" />
        <div className="absolute inset-2 rounded-full border border-current opacity-10" />
        
        <Icon className={cn("relative z-10", s.icon)} />
      </div>

      {/* Content */}
      <h3 className={cn("font-semibold text-foreground mb-2", s.title)}>
        {title}
      </h3>
      
      {description && (
        <p className={cn("text-muted-foreground max-w-sm mb-6", s.description)}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button 
              onClick={action.onClick} 
              variant={action.variant || "default"}
              className="animate-pop"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              onClick={secondaryAction.onClick} 
              variant="ghost"
              size="sm"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Preset Empty States
export const EmptySearchResults = ({ onClear }: { onClear?: () => void }) => (
  <IllustratedEmptyState
    type="search"
    title="Nenhum resultado encontrado"
    description="Tente ajustar os termos da busca ou remover alguns filtros para encontrar o que procura."
    action={onClear ? { label: "Limpar busca", onClick: onClear, variant: "outline" } : undefined}
  />
);

export const EmptySolicitacoes = ({ onCreate }: { onCreate?: () => void }) => (
  <IllustratedEmptyState
    type="requests"
    title="Nenhuma solicitação encontrada"
    description="Crie sua primeira solicitação de compra para começar a gerenciar suas demandas."
    action={onCreate ? { label: "Nova Solicitação", onClick: onCreate } : undefined}
  />
);

export const EmptyFornecedores = ({ onCreate }: { onCreate?: () => void }) => (
  <IllustratedEmptyState
    type="users"
    title="Nenhum fornecedor cadastrado"
    description="Adicione fornecedores para começar a solicitar cotações e gerenciar suas compras."
    action={onCreate ? { label: "Adicionar Fornecedor", onClick: onCreate } : undefined}
  />
);

export const EmptyPedidos = ({ onCreate }: { onCreate?: () => void }) => (
  <IllustratedEmptyState
    type="orders"
    title="Nenhum pedido em andamento"
    description="Seus pedidos aparecerão aqui após a aprovação das cotações."
    action={onCreate ? { label: "Ver Cotações", onClick: onCreate } : undefined}
  />
);

export const EmptyPagamentos = () => (
  <IllustratedEmptyState
    type="payments"
    title="Nenhum pagamento pendente"
    description="Excelente! Todos os pagamentos estão em dia."
  />
);

export const EmptyAnalytics = () => (
  <IllustratedEmptyState
    type="analytics"
    title="Dados insuficientes"
    description="Ainda não há dados suficientes para gerar análises. Continue usando o sistema para acumular informações."
  />
);
