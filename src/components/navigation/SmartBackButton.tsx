import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigation } from '@/hooks/useNavigation';
import { haptics } from '@/lib/haptics';

/**
 * Intelligent route mapping for hierarchical navigation.
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

  const backTarget = useMemo(() => {
    const path = location.pathname;
    if (path === '/' || path === '/compras') return null;

    // Check for open modals via DOM (standard pattern in the app)
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
    
    // Logic for closing modals first if they are open
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
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={compact ? "icon" : "sm"}
            onClick={handleBack}
            className={cn(
              "group relative overflow-hidden transition-all duration-300",
              compact ? "h-11 w-11 rounded-2xl bg-muted/20 hover:bg-primary/10 text-muted-foreground hover:text-primary" 
                      : "gap-2 px-4 h-11 rounded-2xl bg-muted/20 hover:bg-primary/10 text-muted-foreground hover:text-primary",
              "active:scale-90 ring-primary/20 focus-visible:ring-2",
              className
            )}
            aria-label={`Voltar para ${backTarget.label}`}
          >
            {compact ? (
              <ChevronLeft className="h-6 w-6 transition-transform group-hover:-translate-x-1" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative h-4 w-4 overflow-hidden">
                   <ArrowLeft className="h-4 w-4 transition-transform duration-500 group-hover:-translate-x-6" />
                   <ArrowLeft className="h-4 w-4 absolute top-0 left-6 transition-transform duration-500 group-hover:-translate-x-6 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{backTarget.label}</span>
              </div>
            )}
            
            {/* Gloss effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="start" 
          className="text-[10px] font-black uppercase tracking-[0.2em] bg-foreground text-background border-none px-3 py-1.5 z-[100]"
        >
          {backTarget.path === 'close-modal' ? 'Fechar janela' : `Retornar para ${backTarget.label}`}
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

export default SmartBackButton;
