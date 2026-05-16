import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigation } from '@/hooks/useNavigation';


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
  '/licitacoes': '/',
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
  '/recebimento': '/pedidos',
  '/portal-fornecedor': '/',
  '/configuracoes': '/',
  '/buyer': '/',
  '/admin': '/',
};

const routeLabels: Record<string, string> = {
  '/': 'Início',
  '/cotacao': 'Cotações',
  '/solicitacoes': 'Solicitações',
  '/pedidos': 'Pedidos',
  '/pagamentos': 'Pagamentos',
  '/fornecedores': 'Fornecedores',
  '/relatorios': 'Relatórios',
  '/acompanhamento': 'Acompanhamento',
  '/contratos': 'Contratos',
  '/licitacoes': 'Licitações',
  '/compliance': 'Compliance',
  '/dashboard-executivo': 'Executivo',
  '/kanban': 'Kanban',
  '/catalogo-produtos': 'Catálogo',
  '/portal-fornecedor': 'Portal',
  '/configuracoes': 'Configurações',
  '/buyer': 'Comprador',
  '/admin': 'Admin',
  '/relatorios/negociacoes': 'Negociações',
  '/supplier-performance': 'Performance',
  '/historico-compras': 'Histórico',
  '/negociacao-ia': 'Negociação IA',
};

interface SmartBackButtonProps {
  className?: string;
  /** Compact mode for mobile - shows only icon */
  compact?: boolean;
}

export function SmartBackButton({ className, compact = false }: SmartBackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { canGoBack } = useNavigation();

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

  const handleBack = () => {
    if (window.navigator.vibrate) window.navigator.vibrate(10);
    
    // Elite logic: if we have history, go back. 
    // If not (e.g. user opened a link directly), go to logical parent.
    if (canGoBack) {
      navigate(-1);
    } else {
      navigate(backTarget.path);
    }
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className={cn(
            "h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full",
            "active:scale-90 transition-all",
            className
          )}
          aria-label={`Voltar para ${backTarget.label}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className={cn(
              "gap-2 text-muted-foreground hover:text-foreground h-9 px-3 rounded-full",
              "hover:bg-muted/80 active:scale-[0.96] transition-all group",
              className
            )}
            aria-label={`Voltar para ${backTarget.label}`}
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-semibold tracking-tight uppercase">{backTarget.label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="text-[10px] font-bold uppercase tracking-widest bg-foreground text-background">
          Voltar para {backTarget.label}
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

export default SmartBackButton;
