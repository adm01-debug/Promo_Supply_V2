import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex items-center gap-1 text-sm text-muted-foreground animate-fade-in',
        className
      )}
    >
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          )}
          {item.href ? (
            <Link
              to={item.href}
              className="hover:text-foreground transition-colors duration-200 flex items-center gap-1"
            >
              {index === 0 && showHome && <Home className="h-3.5 w-3.5" />}
              <span>{item.label}</span>
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

export default Breadcrumbs;
