import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileSearch, 
  PackageOpen, 
  FolderOpen, 
  Users, 
  FileText, 
  ShoppingCart,
  CreditCard,
  Search,
  Plus,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Inbox,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// SVG Illustrations for each entity type
const illustrations = {
  solicitacoes: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect x="40" y="30" width="120" height="100" rx="8" fill="url(#grad1)" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" />
      <rect x="55" y="50" width="90" height="8" rx="4" fill="hsl(var(--muted))" />
      <rect x="55" y="65" width="70" height="8" rx="4" fill="hsl(var(--muted))" />
      <rect x="55" y="80" width="80" height="8" rx="4" fill="hsl(var(--muted))" />
      <circle cx="160" cy="110" r="20" fill="hsl(var(--primary))" fillOpacity="0.2" />
      <path d="M152 110 L160 118 L168 102" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  pedidos: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <defs>
        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect x="30" y="40" width="80" height="90" rx="6" fill="url(#grad2)" stroke="hsl(var(--info))" strokeWidth="2" />
      <rect x="90" y="50" width="80" height="90" rx="6" fill="url(#grad2)" stroke="hsl(var(--info))" strokeWidth="2" />
      <rect x="40" y="55" width="50" height="6" rx="3" fill="hsl(var(--muted))" />
      <rect x="40" y="68" width="35" height="6" rx="3" fill="hsl(var(--muted))" />
      <rect x="100" y="65" width="50" height="6" rx="3" fill="hsl(var(--muted))" />
      <rect x="100" y="78" width="35" height="6" rx="3" fill="hsl(var(--muted))" />
      <circle cx="140" cy="110" r="15" fill="hsl(var(--info))" fillOpacity="0.3" />
      <path d="M135 110 L140 115 L147 105" stroke="hsl(var(--info))" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  fornecedores: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <defs>
        <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <circle cx="70" cy="70" r="30" fill="url(#grad3)" stroke="hsl(var(--success))" strokeWidth="2" />
      <circle cx="130" cy="70" r="30" fill="url(#grad3)" stroke="hsl(var(--success))" strokeWidth="2" />
      <circle cx="100" cy="110" r="30" fill="url(#grad3)" stroke="hsl(var(--success))" strokeWidth="2" />
      <circle cx="70" cy="70" r="10" fill="hsl(var(--success))" fillOpacity="0.5" />
      <circle cx="130" cy="70" r="10" fill="hsl(var(--success))" fillOpacity="0.5" />
      <circle cx="100" cy="110" r="10" fill="hsl(var(--success))" fillOpacity="0.5" />
    </svg>
  ),
  pagamentos: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <defs>
        <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect x="40" y="50" width="120" height="70" rx="8" fill="url(#grad4)" stroke="hsl(var(--warning))" strokeWidth="2" />
      <rect x="40" y="70" width="120" height="15" fill="hsl(var(--warning))" fillOpacity="0.3" />
      <rect x="50" y="95" width="40" height="10" rx="5" fill="hsl(var(--muted))" />
      <circle cx="140" cy="100" r="12" fill="hsl(var(--warning))" fillOpacity="0.5" />
    </svg>
  ),
  cotacoes: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <defs>
        <linearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d="M60 120 L60 60 L100 40 L140 60 L140 120 L60 120 Z" fill="url(#grad5)" stroke="hsl(var(--primary))" strokeWidth="2" />
      <line x1="100" y1="40" x2="100" y2="120" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx="80" cy="80" r="10" fill="hsl(var(--success))" fillOpacity="0.5" />
      <circle cx="120" cy="80" r="10" fill="hsl(var(--destructive))" fillOpacity="0.5" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <defs>
        <linearGradient id="grad6" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <circle cx="90" cy="70" r="40" fill="url(#grad6)" stroke="hsl(var(--muted-foreground))" strokeWidth="3" />
      <line x1="118" y1="98" x2="145" y2="125" stroke="hsl(var(--muted-foreground))" strokeWidth="6" strokeLinecap="round" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <defs>
        <linearGradient id="grad7" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <rect x="50" y="40" width="100" height="80" rx="10" fill="url(#grad7)" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="6 4" />
      <circle cx="100" cy="80" r="20" fill="hsl(var(--muted))" />
      <path d="M95 80 L105 80 M100 75 L100 85" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  variant?: 'default' | 'compact' | 'card' | 'fullpage' | 'centered';
  illustration?: keyof typeof illustrations;
  showSparkles?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = 'default',
  illustration,
  showSparkles = false,
}: EmptyStateProps) {
  const IllustrationSVG = illustration ? illustrations[illustration] : null;
  
  const containerClasses = cn(
    "flex flex-col items-center justify-center text-center",
    variant === 'compact' && "py-6 px-4",
    variant === 'default' && "py-12 px-6",
    variant === 'card' && "py-10 px-8 bg-card rounded-xl border border-dashed border-border",
    variant === 'fullpage' && "min-h-[60vh] py-16 px-8",
    variant === 'centered' && 'min-h-[400px] py-12 px-4',
    className
  );

  return (
    <motion.div 
      className={containerClasses}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Illustration or Icon */}
      <motion.div 
        className={cn(
          "relative mb-6",
          variant === 'compact' ? "w-24 h-20" : "w-40 h-32"
        )}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        {IllustrationSVG ? (
          IllustrationSVG
        ) : icon ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="p-4 rounded-full bg-muted/50 text-muted-foreground">
              {icon}
            </div>
          </div>
        ) : (
          illustrations.default
        )}
        
        {showSparkles && (
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-6 h-6 text-warning" />
          </motion.div>
        )}
      </motion.div>

      {/* Title */}
      <motion.h3 
        className={cn(
          "font-display font-semibold text-foreground mb-2",
          variant === 'compact' ? "text-base" : "text-lg"
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p 
          className={cn(
            "text-muted-foreground max-w-sm",
            variant === 'compact' ? "text-xs" : "text-sm",
            (action || secondaryAction) ? "mb-6" : ""
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          {description}
        </motion.p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div 
          className="flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {action && (
            <Button 
              onClick={action.onClick} 
              variant={action.variant || 'default'}
              className="gap-2"
            >
              {action.icon || <Plus className="w-4 h-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              onClick={secondaryAction.onClick} 
              variant={secondaryAction.variant || 'outline'}
              className="gap-2"
            >
              {secondaryAction.icon}
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Pre-configured empty states for common scenarios
export function EmptySearch({ 
  onClear,
  searchTerm 
}: { 
  onClear?: () => void;
  searchTerm?: string;
}) {
  return (
    <EmptyState
      illustration="search"
      title="Nenhum resultado encontrado"
      description={searchTerm 
        ? `Não encontramos resultados para "${searchTerm}". Tente usar termos diferentes.`
        : "Tente ajustar os filtros ou usar termos de busca diferentes."
      }
      secondaryAction={onClear ? {
        label: "Limpar busca",
        onClick: onClear,
        variant: "outline",
        icon: <RefreshCw className="w-4 h-4" />
      } : undefined}
      variant="compact"
    />
  );
}

export function EmptyList({ 
  entity = 'itens',
  onAdd,
  illustration
}: { 
  entity?: string;
  onAdd?: () => void;
  illustration?: keyof typeof illustrations;
}) {
  return (
    <EmptyState
      illustration={illustration || 'default'}
      title={`Nenhum ${entity.toLowerCase()} encontrado`}
      description={`Comece adicionando seu primeiro ${entity.toLowerCase()} ao sistema.`}
      action={onAdd ? {
        label: `Adicionar ${entity}`,
        onClick: onAdd,
        icon: <Plus className="w-4 h-4" />
      } : undefined}
      showSparkles
    />
  );
}

export function EmptyFolder({ folderName = 'Pasta' }: { folderName?: string }) {
  return (
    <EmptyState
      icon={<FolderOpen className="w-8 h-8" />}
      title={`${folderName} vazia`}
      description="Esta pasta não contém nenhum item."
      variant="compact"
    />
  );
}

export function EmptySolicitacoes({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      illustration="solicitacoes"
      title="Nenhuma solicitação ainda"
      description="Crie sua primeira solicitação de compra para iniciar o processo."
      action={onAdd ? {
        label: "Nova Solicitação",
        onClick: onAdd,
        icon: <Plus className="w-4 h-4" />
      } : undefined}
      showSparkles
    />
  );
}

export function EmptyPedidos({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      illustration="pedidos"
      title="Nenhum pedido registrado"
      description="Os pedidos aparecerão aqui após a aprovação das cotações."
      action={onAdd ? {
        label: "Gerar Pedido",
        onClick: onAdd,
        icon: <ShoppingCart className="w-4 h-4" />
      } : undefined}
    />
  );
}

export function EmptyFornecedores({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      illustration="fornecedores"
      title="Nenhum fornecedor cadastrado"
      description="Adicione fornecedores para solicitar cotações e realizar compras."
      action={onAdd ? {
        label: "Cadastrar Fornecedor",
        onClick: onAdd,
        icon: <Users className="w-4 h-4" />
      } : undefined}
      showSparkles
    />
  );
}

export function EmptyPagamentos({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      illustration="pagamentos"
      title="Nenhum pagamento pendente"
      description="Todos os pagamentos estão em dia."
      action={onAdd ? {
        label: "Registrar Pagamento",
        onClick: onAdd,
        icon: <CreditCard className="w-4 h-4" />
      } : undefined}
    />
  );
}

export function EmptyCotacoes({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      illustration="cotacoes"
      title="Nenhuma cotação disponível"
      description="Solicite cotações aos fornecedores para comparar preços."
      action={onAdd ? {
        label: "Solicitar Cotação",
        onClick: onAdd,
        icon: <Search className="w-4 h-4" />
      } : undefined}
    />
  );
}

// Icon exports for backwards compatibility
export const emptyStateIcons = {
  solicitacoes: <FileText className="w-8 h-8" />,
  pedidos: <ShoppingCart className="w-8 h-8" />,
  fornecedores: <Users className="w-8 h-8" />,
  produtos: <Package className="w-8 h-8" />,
  default: <Inbox className="w-8 h-8" />,
};

export default EmptyState;
