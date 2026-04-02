import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Smart contextual mapping: each route knows its logical parent.
 * This prevents "back" from going to unexpected places.
 */
const parentRoutes: Record<string, string> = {
  '/cotacao': '/',
  '/solicitacoes': '/',
  '/pedidos': '/',
  '/pagamentos': '/',
  '/fornecedores': '/',
  '/acompanhamento': '/pedidos',
  '/gerar-ordem': '/pedidos',
  '/relatorios': '/',
  '/relatorios/negociacoes': '/relatorios',
  '/aprovacoes': '/',
  '/supplier-performance': '/fornecedores',
  '/dashboard-executivo': '/',
  '/buyer-performance': '/',
  '/historico-compras': '/pedidos',
  '/contratos': '/',
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
  '/catalogo-produtos': '/',
  '/admin/telemetria': '/',
};

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/cotacao': 'Cotações',
  '/solicitacoes': 'Solicitações',
  '/pedidos': 'Pedidos',
  '/pagamentos': 'Pagamentos',
  '/fornecedores': 'Fornecedores',
  '/relatorios': 'Relatórios',
  '/acompanhamento': 'Acompanhamento',
  '/contratos': 'Contratos',
  '/compliance': 'Compliance',
  '/dashboard-executivo': 'Executivo',
  '/kanban': 'Kanban',
};

interface SmartBackButtonProps {
  className?: string;
  /** Compact mode for mobile - shows only icon */
  compact?: boolean;
}

export function SmartBackButton({ className, compact = false }: SmartBackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const backTarget = useMemo(() => {
    const path = location.pathname;
    if (path === '/' || path === '/compras') return null;

    const parent = parentRoutes[path] 
      ?? parentRoutes[path.split('/').slice(0, -1).join('/')]
      ?? '/';

    return {
      path: parent,
      label: routeLabels[parent] || 'Voltar',
    };
  }, [location.pathname]);

  if (!backTarget) return null;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(backTarget.path)}
          className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", className)}
          aria-label={`Voltar para ${backTarget.label}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(backTarget.path)}
            className={cn(
              "gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-lg",
              "hover:bg-muted/60 active:scale-[0.97] transition-all",
              className
            )}
            aria-label={`Voltar para ${backTarget.label}`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs font-medium">{backTarget.label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Voltar para {backTarget.label}
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

export default SmartBackButton;
