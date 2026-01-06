import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { 
  Package, 
  FileText, 
  Users, 
  ShoppingCart, 
  Search, 
  Inbox,
  FolderOpen,
  PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'compact' | 'centered';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center animate-fade-in',
        variant === 'default' && 'py-12 px-4',
        variant === 'compact' && 'py-8 px-4',
        variant === 'centered' && 'min-h-[400px] py-12 px-4',
        className
      )}
    >
      {icon && (
        <div className="mb-4 rounded-full bg-muted/50 p-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap gap-3 justify-center">
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Presets para casos comuns
export function EmptySearch({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={<Search className="h-8 w-8" />}
      title="Nenhum resultado encontrado"
      description="Tente ajustar os filtros ou termos de busca para encontrar o que procura."
      secondaryAction={onClear ? { label: 'Limpar busca', onClick: onClear } : undefined}
      variant="compact"
    />
  );
}

export function EmptyList({ 
  entity = 'itens', 
  onAdd 
}: { 
  entity?: string;
  onAdd?: () => void;
}) {
  return (
    <EmptyState
      icon={<Inbox className="h-8 w-8" />}
      title={`Nenhum ${entity} encontrado`}
      description={`Não há ${entity} cadastrados ainda. Comece adicionando o primeiro.`}
      action={onAdd ? { label: `Adicionar ${entity}`, onClick: onAdd } : undefined}
    />
  );
}

export function EmptyFolder({ folderName = 'pasta' }: { folderName?: string }) {
  return (
    <EmptyState
      icon={<FolderOpen className="h-8 w-8" />}
      title={`${folderName} vazia`}
      description="Esta pasta ainda não contém itens."
      variant="compact"
    />
  );
}

// Ícones pré-configurados para entidades do sistema
export const emptyStateIcons = {
  solicitacoes: <FileText className="h-8 w-8" />,
  pedidos: <ShoppingCart className="h-8 w-8" />,
  fornecedores: <Users className="h-8 w-8" />,
  produtos: <Package className="h-8 w-8" />,
  default: <Inbox className="h-8 w-8" />,
};

export default EmptyState;
