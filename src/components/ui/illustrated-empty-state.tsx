import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Search, FileX, FolderOpen, Inbox, ShoppingCart, Users, FileText,
  ClipboardList, CreditCard, Truck, Package, BarChart3, Bell, Calendar,
  PlusCircle, type LucideIcon
} from "lucide-react";
import { SvgIllustrations } from "./empty-state-illustrations";

interface IllustratedEmptyStateProps {
  type?: "search" | "list" | "folder" | "inbox" | "cart" | "users" | "documents" | "requests" | "payments" | "orders" | "packages" | "analytics" | "notifications" | "custom";
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "default" | "lg";
  animated?: boolean;
}

const typeIcons: Record<string, LucideIcon> = {
  search: Search, list: FileX, folder: FolderOpen, inbox: Inbox, cart: ShoppingCart,
  users: Users, documents: FileText, requests: ClipboardList, payments: CreditCard,
  orders: Truck, packages: Package, analytics: BarChart3, notifications: Bell, custom: FileX,
};

const sizes = {
  sm: { container: "py-8 px-4", illustration: "w-32 h-24", title: "text-base", description: "text-xs" },
  default: { container: "py-12 px-6", illustration: "w-48 h-36", title: "text-lg", description: "text-sm" },
  lg: { container: "py-16 px-8", illustration: "w-64 h-48", title: "text-xl", description: "text-base" },
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
  animated = true,
}: IllustratedEmptyStateProps) => {
  const s = sizes[size];
  const IllustrationComponent = SvgIllustrations[type as keyof typeof SvgIllustrations] || SvgIllustrations.default;
  const Icon = CustomIcon || typeIcons[type];

  return (
    <motion.div 
      initial={animated ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card/50",
        s.container,
        className
      )}
    >
      {/* SVG Illustration */}
      <motion.div 
        className={cn("mb-6", s.illustration)}
        initial={animated ? { scale: 0.8, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <IllustrationComponent />
      </motion.div>

      {/* Title */}
      <motion.h3 
        className={cn("font-semibold text-foreground mb-2", s.title)}
        initial={animated ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>
      
      {/* Description */}
      {description && (
        <motion.p 
          className={cn("text-muted-foreground max-w-sm mb-6", s.description)}
          initial={animated ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {description}
        </motion.p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div 
          className="flex flex-wrap items-center justify-center gap-3"
          initial={animated ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {action && (
            <Button onClick={action.onClick} variant={action.variant || "default"} className="gap-2">
              {action.icon || <PlusCircle className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="ghost" size="sm">
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

// Preset Empty States with enhanced illustrations
export const EmptySearchResults = ({ onClear, searchTerm }: { onClear?: () => void; searchTerm?: string }) => (
  <IllustratedEmptyState
    type="search"
    title="Nenhum resultado encontrado"
    description={searchTerm 
      ? `Não encontramos resultados para "${searchTerm}". Tente ajustar os termos.`
      : "Tente ajustar os termos da busca ou remover alguns filtros."
    }
    action={onClear ? { label: "Limpar busca", onClick: onClear, variant: "outline" } : undefined}
    size="sm"
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

export const EmptyContratos = ({ onCreate }: { onCreate?: () => void }) => (
  <IllustratedEmptyState
    type="documents"
    title="Nenhum contrato cadastrado"
    description="Gerencie contratos com fornecedores para controle de prazos e condições."
    action={onCreate ? { label: "Novo Contrato", onClick: onCreate } : undefined}
  />
);

export const EmptyNotificacoes = () => (
  <IllustratedEmptyState
    type="notifications"
    title="Nenhuma notificação"
    description="Você está em dia! Novas notificações aparecerão aqui."
    size="sm"
  />
);

export const EmptyAnalytics = () => (
  <IllustratedEmptyState
    type="analytics"
    title="Dados insuficientes"
    description="Ainda não há dados suficientes para gerar análises. Continue usando o sistema."
  />
);

export const EmptyCotacoes = ({ onCreate }: { onCreate?: () => void }) => (
  <IllustratedEmptyState
    type="cart"
    title="Nenhuma cotação encontrada"
    description="Solicite cotações aos fornecedores para comparar preços e condições."
    action={onCreate ? { label: "Solicitar Cotação", onClick: onCreate } : undefined}
  />
);

export const EmptyAuditoria = () => (
  <IllustratedEmptyState
    type="documents"
    title="Nenhum registro de auditoria"
    description="Os registros de atividades aparecerão aqui conforme as ações são realizadas."
    size="sm"
  />
);

export const EmptyRelatorios = ({ onCreate }: { onCreate?: () => void }) => (
  <IllustratedEmptyState
    type="analytics"
    title="Nenhum relatório gerado"
    description="Gere relatórios personalizados para analisar o desempenho das compras."
    action={onCreate ? { label: "Gerar Relatório", onClick: onCreate } : undefined}
  />
);

export const EmptyAprovacoes = () => (
  <IllustratedEmptyState
    type="inbox"
    title="Nenhuma aprovação pendente"
    description="Excelente! Todas as solicitações foram processadas."
  />
);

// Contextualized empty state with suggestions
interface ContextualEmptyStateProps {
  context: "first-time" | "filtered" | "error" | "success";
  type: IllustratedEmptyStateProps["type"];
  title: string;
  description?: string;
  suggestions?: string[];
  action?: IllustratedEmptyStateProps["action"];
  secondaryAction?: IllustratedEmptyStateProps["secondaryAction"];
  className?: string;
}

export const ContextualEmptyState = ({
  context,
  type,
  title,
  description,
  suggestions,
  action,
  secondaryAction,
  className,
}: ContextualEmptyStateProps) => {
  const contextStyles = {
    "first-time": "border-primary/20 bg-primary/5",
    "filtered": "border-warning/20 bg-warning/5",
    "error": "border-destructive/20 bg-destructive/5",
    "success": "border-success/20 bg-success/5",
  };

  const contextIcons = {
    "first-time": "🚀",
    "filtered": "🔍",
    "error": "⚠️",
    "success": "✅",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border p-6",
        contextStyles[context],
        className
      )}
    >
      <IllustratedEmptyState
        type={type}
        title={title}
        description={description}
        action={action}
        secondaryAction={secondaryAction}
        className="border-0 bg-transparent"
      />
      
      {suggestions && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 pt-4 border-t border-border/50"
        >
          <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <span>{contextIcons[context]}</span>
            {context === "first-time" && "Comece por aqui:"}
            {context === "filtered" && "Sugestões:"}
            {context === "error" && "Tente:"}
            {context === "success" && "Próximos passos:"}
          </p>
          <ul className="space-y-2">
            {suggestions.map((suggestion, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <span className="text-primary mt-0.5">•</span>
                {suggestion}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
};

// Quick action empty state for inline use
export const InlineEmptyState = ({
  message,
  action,
  className,
}: {
  message: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className={cn(
      "flex items-center justify-center gap-3 py-8 text-muted-foreground text-sm",
      className
    )}
  >
    <span>{message}</span>
    {action && (
      <Button size="sm" variant="link" onClick={action.onClick} className="h-auto p-0">
        {action.label}
      </Button>
    )}
  </motion.div>
);
