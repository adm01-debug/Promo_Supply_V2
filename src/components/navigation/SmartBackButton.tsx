import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const parentRoutes: Record<string, string> = {
  '/cotacao': '/',
  '/solicitacoes': '/',
  '/pedidos': '/',
  '/pagamentos': '/',
  '/fornecedores': '/',
  '/acompanhamento': '/',
  '/gerar-ordem': '/pedidos',
  '/relatorios': '/',
  '/relatorios/negociacoes': '/relatorios',
  '/aprovacoes': '/',
  '/supplier-performance': '/fornecedores',
  '/dashboard-executivo': '/',
  '/buyer-performance': '/',
  '/historico-compras': '/pedidos',
  '/contratos': '/fornecedores',
  '/compliance': '/',
  '/auditoria': '/',
  '/seguranca': '/',
  '/catalogo-spot': '/fornecedores',
  '/qualificacao-fornecedores': '/fornecedores',
  '/orcamentos': '/',
  '/negociacao-ia': '/cotacao',
  '/kanban': '/solicitacoes',
  '/documentos-fiscais': '/pagamentos',
  '/recompra-inteligente': '/pedidos',
  '/devolucoes': '/pedidos',
};

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/cotacao': 'Cotações',
  '/solicitacoes': 'Solicitações',
  '/pedidos': 'Pedidos',
  '/pagamentos': 'Pagamentos',
  '/fornecedores': 'Fornecedores',
  '/relatorios': 'Relatórios',
};

interface SmartBackButtonProps {
  className?: string;
}

export function SmartBackButton({ className }: SmartBackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const backTarget = useMemo(() => {
    const path = location.pathname;
    // Don't show on home
    if (path === '/' || path === '/compras') return null;

    // Check for exact match first, then prefix match for dynamic routes
    const parent = parentRoutes[path] 
      ?? parentRoutes[path.split('/').slice(0, -1).join('/')]
      ?? '/';

    return {
      path: parent,
      label: routeLabels[parent] || 'Voltar',
    };
  }, [location.pathname]);

  if (!backTarget) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(backTarget.path)}
          className={cn(
            "gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2",
            className
          )}
          aria-label={`Voltar para ${backTarget.label}`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">{backTarget.label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Voltar para {backTarget.label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default SmartBackButton;
