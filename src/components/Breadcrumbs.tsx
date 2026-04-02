import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home, LucideIcon, FileText, ShoppingCart, CreditCard, Users, Package, BarChart3, Shield, ClipboardList, FileCheck, Truck, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { forwardRef } from 'react';
import { useMemo } from 'react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BreadcrumbItemData {
  label: string;
  href?: string;
  icon?: LucideIcon;
  description?: string;
}

// Mapeamento de rotas para labels, ícones e descrições
const routeConfig: Record<string, { label: string; icon?: LucideIcon; description?: string }> = {
  '': { label: 'Dashboard', icon: Home, description: 'Visão geral do sistema' },
  'compras': { label: 'Dashboard', icon: Home, description: 'Painel principal de compras' },
  'cotacao': { label: 'Cotações', icon: FileText, description: 'Gerenciar cotações de fornecedores' },
  'solicitacoes': { label: 'Solicitações', icon: ClipboardList, description: 'Solicitações de compra' },
  'pedidos': { label: 'Pedidos', icon: Package, description: 'Pedidos em andamento' },
  'pagamentos': { label: 'Pagamentos', icon: CreditCard, description: 'Controle financeiro' },
  'fornecedores': { label: 'Fornecedores', icon: Users, description: 'Base de fornecedores' },
  'acompanhamento': { label: 'Acompanhamento', icon: Truck, description: 'Rastreamento de entregas' },
  'gerar-ordem': { label: 'Gerar Ordem', icon: FileCheck, description: 'Criar nova ordem de compra' },
  'relatorios': { label: 'Relatórios', icon: BarChart3, description: 'Análises e relatórios' },
  'negociacoes': { label: 'Negociações', icon: ShoppingCart, description: 'Relatório de negociações' },
  'aprovacoes': { label: 'Aprovações', icon: FileCheck, description: 'Aprovações pendentes' },
  'supplier-performance': { label: 'Desempenho Fornecedores', icon: BarChart3, description: 'Análise de fornecedores' },
  'dashboard-executivo': { label: 'Dashboard Executivo', icon: BarChart3, description: 'Visão gerencial' },
  'buyer-performance': { label: 'Desempenho Compradores', icon: Users, description: 'Métricas de compradores' },
  'historico-compras': { label: 'Histórico', icon: History, description: 'Histórico de compras' },
  'contratos': { label: 'Contratos', icon: FileText, description: 'Gestão de contratos' },
  'compliance': { label: 'Compliance', icon: Shield, description: 'Conformidade e governança' },
  'auditoria': { label: 'Auditoria', icon: Shield, description: 'Logs de auditoria' },
  'seguranca': { label: 'Segurança', icon: Shield, description: 'Configurações de segurança' },
  'auth': { label: 'Autenticação', icon: Shield, description: 'Login do sistema' },
  'catalogo-spot': { label: 'Catálogo SPOT', icon: ShoppingCart, description: 'Catálogo de fornecedores SPOT' },
  'qualificacao-fornecedores': { label: 'Qualificação', icon: Users, description: 'Qualificação de fornecedores' },
  'orcamentos': { label: 'Orçamentos', icon: CreditCard, description: 'Gestão de orçamentos' },
  'negociacao-ia': { label: 'Negociação IA', icon: ShoppingCart, description: 'Negociação assistida por IA' },
  'kanban': { label: 'Kanban', icon: ClipboardList, description: 'Workflow visual de solicitações' },
  'documentos-fiscais': { label: 'Docs Fiscais', icon: FileText, description: 'Documentos fiscais e NFs' },
  'recompra-inteligente': { label: 'Recompra', icon: ShoppingCart, description: 'Recompra inteligente automática' },
  'devolucoes': { label: 'Devoluções', icon: Package, description: 'Gestão de devoluções (RMA)' },
  'catalogo-produtos': { label: 'Catálogo de Produtos', icon: Package, description: 'Produtos com preços de referência' },
  'admin': { label: 'Admin', icon: Settings, description: 'Administração do sistema' },
  'telemetria': { label: 'Telemetria', icon: BarChart3, description: 'Métricas de telemetria' },
};

interface BreadcrumbsProps {
  className?: string;
  showHome?: boolean;
  showIcons?: boolean;
  maxItems?: number;
  variant?: 'default' | 'compact' | 'pills';
}

export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(({ 
  className, 
  showHome = true,
  showIcons = true,
  maxItems = 4,
  variant = 'default'
}, ref) => {
  const location = useLocation();
  
  const breadcrumbs = useMemo(() => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    const items: BreadcrumbItemData[] = [];

    if (showHome) {
      items.push({ 
        label: 'Início', 
        href: '/',
        icon: Home,
        description: 'Página inicial'
      });
    }

    pathnames.forEach((segment, index) => {
      const href = `/${pathnames.slice(0, index + 1).join('/')}`;
      const config = routeConfig[segment];
      
      if (config) {
        items.push({
          label: config.label,
          href: index < pathnames.length - 1 ? href : undefined,
          icon: config.icon,
          description: config.description,
        });
      }
    });

    return items;
  }, [location.pathname, showHome]);

  // Truncar breadcrumbs se necessário
  const displayedBreadcrumbs = useMemo(() => {
    if (breadcrumbs.length <= maxItems) return breadcrumbs;
    
    const first = breadcrumbs[0];
    const last = breadcrumbs.slice(-2);
    return [first, { label: '...', href: undefined }, ...last];
  }, [breadcrumbs, maxItems]);

  // Não mostrar breadcrumbs na home
  if (location.pathname === '/' || location.pathname === '/compras') {
    return null;
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <motion.nav
        aria-label="Breadcrumb"
        className={cn('flex items-center gap-1 text-xs', className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {displayedBreadcrumbs.map((item, index) => (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && <span className="text-muted-foreground/40">/</span>}
            {item.href ? (
              <Link
                to={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
          </span>
        ))}
      </motion.nav>
    );
  }

  // Pills variant
  if (variant === 'pills') {
    return (
      <motion.nav
        aria-label="Breadcrumb"
        className={cn('flex items-center gap-2', className)}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AnimatePresence mode="popLayout">
          {displayedBreadcrumbs.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === displayedBreadcrumbs.length - 1;
            
            return (
              <motion.div
                key={item.label + index}
                className="flex items-center gap-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    {item.href ? (
                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs",
                          "bg-muted/50 text-muted-foreground",
                          "hover:bg-muted hover:text-foreground transition-all duration-200",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        )}
                      >
                        {showIcons && Icon && <Icon className="h-3 w-3" />}
                        <span>{item.label}</span>
                      </Link>
                    ) : (
                      <span className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        "bg-primary/10 text-primary"
                      )}>
                        {showIcons && Icon && <Icon className="h-3 w-3" />}
                        <span>{item.label}</span>
                      </span>
                    )}
                  </TooltipTrigger>
                  {item.description && (
                    <TooltipContent side="bottom" className="text-xs">
                      {item.description}
                    </TooltipContent>
                  )}
                </Tooltip>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.nav>
    );
  }

  // Default variant using shadcn Breadcrumb
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        <AnimatePresence mode="popLayout">
          {displayedBreadcrumbs.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === displayedBreadcrumbs.length - 1;
            
            return (
              <motion.div
                key={item.label + index}
                className="flex items-center"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {item.href ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <BreadcrumbLink asChild>
                          <Link
                            to={item.href}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-md",
                              "hover:bg-muted/50 transition-colors duration-200"
                            )}
                          >
                            {showIcons && Icon && <Icon className="h-3.5 w-3.5" />}
                            <span className="text-sm">{item.label}</span>
                          </Link>
                        </BreadcrumbLink>
                      </TooltipTrigger>
                      {item.description && (
                        <TooltipContent side="bottom" className="text-xs">
                          {item.description}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ) : (
                    <BreadcrumbPage className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30">
                      {showIcons && Icon && <Icon className="h-3.5 w-3.5" />}
                      <span className="text-sm font-medium">{item.label}</span>
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </BreadcrumbList>
    </Breadcrumb>
  );
});
Breadcrumbs.displayName = 'Breadcrumbs';

// Auto breadcrumb hook for programmatic use
export function useAutoBreadcrumbs() {
  const location = useLocation();
  
  return useMemo(() => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    return pathnames.map((segment, index) => {
      const href = `/${pathnames.slice(0, index + 1).join('/')}`;
      const config = routeConfig[segment] || { 
        label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ') 
      };
      return {
        segment,
        href,
        label: config.label,
        icon: config.icon,
        description: config.description,
        isLast: index === pathnames.length - 1
      };
    });
  }, [location.pathname]);
}

export default Breadcrumbs;
