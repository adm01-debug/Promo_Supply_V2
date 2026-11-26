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

    // ID extraction from path
    const pathParts = path.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    const isId = lastPart && (lastPart.length > 20 || !isNaN(Number(lastPart)));

    const parent = parentRoutes[path] 
      ?? parentRoutes[path.split('/').slice(0, -1).join('/')]
      ?? '/';

    return {
      path: parent,
      label: isId ? 'Voltar' : (routeLabels[parent] || 'Início'),
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
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={compact ? "icon" : "sm"}
              onClick={handleBack}
              className={cn(
                "group relative overflow-hidden transition-all duration-500",
                compact ? "h-11 w-11 rounded-2xl bg-white/[0.03] hover:bg-violet-500/10 text-muted-foreground hover:text-white" 
                        : "gap-2.5 px-4 h-11 rounded-2xl bg-white/[0.03] hover:bg-violet-500/10 text-muted-foreground hover:text-white",
                "active:scale-95 border border-white/[0.05] hover:border-violet-500/20 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)]",
                scrolled && "bg-violet-500/10 border-violet-500/20 backdrop-blur-md"
              )}
              aria-label={`Voltar para ${backTarget.label}`}
            >
              <div className="flex items-center gap-2.5 relative z-10">
                <ChevronLeft className={cn("h-5 w-5 transition-transform duration-500 group-hover:-translate-x-1.5", !compact && "h-4 w-4")} />
                {!compact && (
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{backTarget.label}</span>
                )}
              </div>
              
              {/* Premium Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/0 via-violet-600/5 to-fuchsia-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Glass Reflection */}
              <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:left-[100%] transition-all duration-1000 ease-in-out" />
            </Button>
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            align="start" 
            className="text-[9px] font-black uppercase tracking-[0.25em] bg-[#0a0a0c] text-white border-white/10 px-4 py-2 rounded-xl backdrop-blur-xl shadow-2xl"
          >
            {backTarget.path === 'close-modal' ? 'Fechar Janela' : `Voltar para ${backTarget.label}`}
          </TooltipContent>
        </Tooltip>
      </motion.div>

      {!compact && (
        <div className="hidden lg:flex items-center gap-6 ml-2">
          <div className="w-[1px] h-4 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          <ModernBreadcrumbs />
        </div>
      )}
    </div>
  );
}


export default SmartBackButton;
