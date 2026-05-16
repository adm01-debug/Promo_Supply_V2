import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '@/hooks/useNavigation';
import { haptics } from '@/lib/haptics';
import { ModernBreadcrumbs } from './ModernBreadcrumbs';

/**
 * Intelligent route mapping for hierarchical navigation.
 */
const parentRoutes: Record<string, string> = {
  '/compras': '/',
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
  '/recebimento': '/pedidos',
  '/portal-fornecedor': '/',
  '/configuracoes-centro-custo': '/',
  '/sourcing': '/',
  '/sourcing/novo': '/sourcing',
  '/sourcing/:id': '/sourcing',
  '/admin/telemetria': '/',
  '/admin/workflows': '/',
  '/admin/erp': '/',
  '/admin/punchout': '/',
  '/admin/sourcing-pipeline': '/',
  '/admin/fiscal': '/',
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
};

interface SmartBackButtonProps {
  className?: string;
  compact?: boolean;
}

/**
 * SmartBackButton 10/10: Elite contextual navigation.
 * Uses haptics, spring animations, and intelligent route mapping.
 */
export function SmartBackButton({ className, compact = false }: SmartBackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { canGoBack } = useNavigation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const backTarget = useMemo(() => {
    const path = location.pathname;
    if (path === '/' || path === '/compras') return null;

    const hasOpenDialog = !!document.querySelector('[role="dialog"][data-state="open"], [cmdk-root], [data-radix-popper-content-wrapper]');
    if (hasOpenDialog) return { path: 'close-modal', label: 'Fechar' };

    const parent = parentRoutes[path] 
      ?? parentRoutes[path.split('/').slice(0, -1).join('/')]
      ?? '/';

    return {
      path: parent,
      label: routeLabels[parent] || 'Início',
    };
  }, [location.pathname]);

  const handleBack = useCallback(() => {
    haptics.light();
    
    const closeButton = document.querySelector('[role="dialog"][data-state="open"] button[aria-label="Close"], [cmdk-root] button[aria-label="Close"]') as HTMLButtonElement;
    if (closeButton) {
      closeButton.click();
      return;
    }

    if (canGoBack) {
      navigate(-1);
    } else if (backTarget && backTarget.path !== 'close-modal') {
      navigate(backTarget.path);
    }
  }, [canGoBack, navigate, backTarget]);

  if (!backTarget) return null;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={compact ? "icon" : "sm"}
              onClick={handleBack}
              className={cn(
                "group relative overflow-hidden transition-all duration-300",
                compact ? "h-10 w-10 rounded-xl bg-white/5 hover:bg-violet-500/20 text-muted-foreground hover:text-violet-300" 
                        : "gap-2 px-3 h-10 rounded-xl bg-white/5 hover:bg-violet-500/20 text-muted-foreground hover:text-violet-300",
                "active:scale-95 border border-white/5 shadow-lg",
                scrolled && "bg-violet-500/10 border-violet-500/20"
              )}
              aria-label={`Voltar para ${backTarget.label}`}
            >
              <div className="flex items-center gap-2">
                <ChevronLeft className={cn("h-5 w-5 transition-transform group-hover:-translate-x-1", !compact && "h-4 w-4")} />
                {!compact && (
                  <span className="text-[11px] font-bold uppercase tracking-wider">{backTarget.label}</span>
                )}
              </div>
              
              {/* Glass shimmer */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            align="start" 
            className="text-[10px] font-bold uppercase tracking-widest bg-zinc-900 text-white border-white/10 px-3 py-1.5"
          >
            {backTarget.path === 'close-modal' ? 'Fechar janela' : `Retornar para ${backTarget.label}`}
          </TooltipContent>
        </Tooltip>
      </motion.div>

      {!compact && (
        <div className="hidden lg:flex items-center gap-4">
          <div className="w-px h-6 bg-white/10" />
          <ModernBreadcrumbs />
        </div>
      )}
    </div>
  );
}


export default SmartBackButton;
