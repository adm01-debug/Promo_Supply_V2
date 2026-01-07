import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Mapeamento de rotas para labels
const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  'compras': 'Dashboard',
  'cotacao': 'Cotações',
  'solicitacoes': 'Solicitações',
  'pedidos': 'Pedidos',
  'pagamentos': 'Pagamentos',
  'fornecedores': 'Fornecedores',
  'acompanhamento': 'Acompanhamento',
  'gerar-ordem': 'Gerar Ordem',
  'relatorios': 'Relatórios',
  'negociacoes': 'Negociações',
  'aprovacoes': 'Aprovações',
  'supplier-performance': 'Desempenho Fornecedores',
  'dashboard-executivo': 'Dashboard Executivo',
  'buyer-performance': 'Desempenho Compradores',
  'historico-compras': 'Histórico de Compras',
  'contratos': 'Contratos',
  'auditoria': 'Auditoria',
  'seguranca': 'Segurança',
  'auth': 'Autenticação',
};

interface BreadcrumbsProps {
  className?: string;
  showHome?: boolean;
}

export function Breadcrumbs({ className, showHome = true }: BreadcrumbsProps) {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Construir array de breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [];

  if (showHome) {
    breadcrumbs.push({ label: 'Início', href: '/' });
  }

  pathnames.forEach((segment, index) => {
    const href = `/${pathnames.slice(0, index + 1).join('/')}`;
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    
    // Último item não tem link
    if (index === pathnames.length - 1) {
      breadcrumbs.push({ label });
    } else {
      breadcrumbs.push({ label, href });
    }
  });

  // Não mostrar breadcrumbs na home
  if (pathnames.length === 0) {
    return null;
  }

  return (
    <motion.nav
      aria-label="Breadcrumb"
      className={cn(
        'flex items-center gap-1.5 text-sm',
        className
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {breadcrumbs.map((item, index) => (
        <motion.div 
          key={index} 
          className="flex items-center gap-1.5"
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
        >
          {index > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
          {item.href ? (
            <Link
              to={item.href}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground",
                "hover:text-foreground hover:bg-muted/50 transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              {index === 0 && showHome && (
                <Home className="h-3.5 w-3.5" />
              )}
              <span className="text-sm">{item.label}</span>
            </Link>
          ) : (
            <span className="px-2 py-1 text-sm font-medium text-foreground bg-muted/30 rounded-md">
              {item.label}
            </span>
          )}
        </motion.div>
      ))}
    </motion.nav>
  );
}

export default Breadcrumbs;
