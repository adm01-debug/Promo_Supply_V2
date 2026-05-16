import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  FileText, 
  Users, 
  CreditCard,
  MoreHorizontal,
  ShoppingCart,
  TrendingUp,
  Settings,
  FileSignature
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badgeKey?: 'solicitacoes' | 'pedidos' | 'pagamentos' | 'aprovacoes';
}

// Hook para buscar contagens de badges
function useNavBadges() {
  return useQuery({
    queryKey: ['nav-badges'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { solicitacoes: 0, pedidos: 0, pagamentos: 0, aprovacoes: 0 };

      // Buscar contagens em paralelo
      const [solicitacoesRes, pedidosRes, pagamentosRes] = await Promise.all([
        supabase.from('solicitacoes').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('pedidos').select('id', { count: 'exact', head: true }).in('status', ['pendente', 'em_transito']),
        supabase.from('pagamentos').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
      ]);

      return {
        solicitacoes: solicitacoesRes.count || 0,
        pedidos: pedidosRes.count || 0,
        pagamentos: pagamentosRes.count || 0,
        aprovacoes: (solicitacoesRes.count || 0) + (pagamentosRes.count || 0),
      };
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    staleTime: 10000,
  });
}

const mainNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Início', icon: <LayoutDashboard className="w-5 h-5" />, path: '/' },
  { id: 'solicitacoes', label: 'Solicitações', icon: <ClipboardList className="w-5 h-5" />, path: '/solicitacoes', badgeKey: 'solicitacoes' },
  { id: 'pedidos', label: 'Pedidos', icon: <ShoppingCart className="w-5 h-5" />, path: '/pedidos', badgeKey: 'pedidos' },
  { id: 'fornecedores', label: 'Fornec.', icon: <Users className="w-5 h-5" />, path: '/fornecedores' },
];

const moreNavItems: NavItem[] = [
  { id: 'cotacao', label: 'Cotações', icon: <FileText className="w-5 h-5" />, path: '/cotacao' },
  { id: 'pagamentos', label: 'Pagamentos', icon: <CreditCard className="w-5 h-5" />, path: '/pagamentos', badgeKey: 'pagamentos' },
  { id: 'contratos', label: 'Contratos', icon: <FileSignature className="w-5 h-5" />, path: '/contratos' },
  { id: 'relatorios', label: 'Relatórios', icon: <TrendingUp className="w-5 h-5" />, path: '/relatorios' },
  { id: 'acompanhamento', label: 'Acompanhamento', icon: <Settings className="w-5 h-5" />, path: '/acompanhamento' },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreSheetOpen, setMoreSheetOpen] = React.useState(false);
  const { data: badges = { solicitacoes: 0, pedidos: 0, pagamentos: 0, aprovacoes: 0 } } = useNavBadges();

  const isHome = location.pathname === '/' || location.pathname === '/compras';

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/compras';
    }
    return location.pathname.startsWith(path);
  };

  const isMoreActive = moreNavItems.some(item => isActive(item.path));
  
  const moreBadgeCount = moreNavItems.reduce((acc, item) => {
    if (item.badgeKey && badges[item.badgeKey]) {
      return acc + badges[item.badgeKey];
    }
    return acc;
  }, 0);

  const handleNavClick = (path: string) => {
    navigate(path);
    setMoreSheetOpen(false);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <motion.nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-inset"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="pb-safe">
          <div className="flex items-center justify-around h-14 sm:h-16 px-1 sm:px-2">
            {/* Conditional Back Button for Mobile */}
            {!isHome && (
              <NavButton
                item={{ id: 'back', label: 'Voltar', icon: <motion.div animate={{ x: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 2 }}><ChevronLeft className="w-5 h-5" /></motion.div>, path: 'back' }}
                isActive={false}
                onClick={handleBack}
              />
            )}

            {mainNavItems.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                isActive={isActive(item.path)}
                onClick={() => handleNavClick(item.path)}
                badgeCount={item.badgeKey ? badges[item.badgeKey] : 0}
              />
            ))}
            
            <NavButton
              item={{ id: 'more', label: 'Mais', icon: <MoreHorizontal className="w-5 h-5" />, path: '' }}
              isActive={isMoreActive || moreSheetOpen}
              onClick={() => setMoreSheetOpen(true)}
              badgeCount={moreBadgeCount}
            />
          </div>
        </div>
      </motion.nav>

      {/* More Options Bottom Sheet */}
      <Drawer open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Mais opções</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-3 gap-4 p-4 pb-8">
            {moreNavItems.map((item) => (
              <motion.button
                key={item.id}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl transition-colors relative",
                  isActive(item.path)
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
                onClick={() => handleNavClick(item.path)}
                whileTap={{ scale: 0.95 }}
              >
                <div className="relative">
                  {item.icon}
                  {item.badgeKey && badges[item.badgeKey] > 0 && (
                    <NavBadge count={badges[item.badgeKey]} />
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="h-14 sm:h-16 md:hidden" />
    </>
  );
}

// Badge Component com animação - usando forwardRef para suportar refs de elementos pai
const NavBadge = React.forwardRef<HTMLSpanElement, { count: number }>(
  ({ count }, ref) => {
    if (count <= 0) return null;
    
    const displayCount = count > 99 ? '99+' : count.toString();
    
    return (
      <motion.span
        ref={ref}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className={cn(
          "absolute -top-1.5 -right-1.5 flex items-center justify-center",
          "min-w-[16px] h-4 px-1 rounded-full",
          "bg-destructive text-destructive-foreground",
          "text-[9px] font-bold shadow-sm",
          "ring-2 ring-background"
        )}
      >
        {displayCount}
      </motion.span>
    );
  }
);
NavBadge.displayName = 'NavBadge';

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  badgeCount?: number;
}

function NavButton({ item, isActive, onClick, badgeCount = 0 }: NavButtonProps) {
  return (
    <motion.button
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl min-w-[52px] sm:min-w-[60px] transition-colors relative touch-target-sm",
        isActive 
          ? "text-primary" 
          : "text-muted-foreground"
      )}
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-6 sm:w-8 h-0.5 sm:h-1 bg-primary rounded-full"
          layoutId="bottomNavIndicator"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      
      <motion.div
        className="relative"
        animate={{ scale: isActive ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {item.icon}
        {badgeCount > 0 && <NavBadge count={badgeCount} />}
      </motion.div>
      
      <span className={cn(
        "text-[9px] sm:text-[10px] font-medium transition-colors",
        isActive ? "text-primary" : "text-muted-foreground"
      )}>
        {item.label}
      </span>
    </motion.button>
  );
}

export default BottomNavigation;
