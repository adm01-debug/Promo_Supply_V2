import React from 'react';
import { motion } from 'framer-motion';
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
import { BottomSheet } from './MobileComponents';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const mainNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Início', icon: <LayoutDashboard className="w-5 h-5" />, path: '/' },
  { id: 'solicitacoes', label: 'Solicitações', icon: <ClipboardList className="w-5 h-5" />, path: '/solicitacoes' },
  { id: 'pedidos', label: 'Pedidos', icon: <ShoppingCart className="w-5 h-5" />, path: '/pedidos' },
  { id: 'fornecedores', label: 'Fornec.', icon: <Users className="w-5 h-5" />, path: '/fornecedores' },
];

const moreNavItems: NavItem[] = [
  { id: 'cotacao', label: 'Cotações', icon: <FileText className="w-5 h-5" />, path: '/cotacao' },
  { id: 'pagamentos', label: 'Pagamentos', icon: <CreditCard className="w-5 h-5" />, path: '/pagamentos' },
  { id: 'contratos', label: 'Contratos', icon: <FileSignature className="w-5 h-5" />, path: '/contratos' },
  { id: 'relatorios', label: 'Relatórios', icon: <TrendingUp className="w-5 h-5" />, path: '/relatorios' },
  { id: 'acompanhamento', label: 'Acompanhamento', icon: <Settings className="w-5 h-5" />, path: '/acompanhamento' },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreSheetOpen, setMoreSheetOpen] = React.useState(false);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/compras';
    }
    return location.pathname.startsWith(path);
  };

  const isMoreActive = moreNavItems.some(item => isActive(item.path));

  const handleNavClick = (path: string) => {
    navigate(path);
    setMoreSheetOpen(false);
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
        {/* Safe area padding for iOS */}
        <div className="pb-safe">
          <div className="flex items-center justify-around h-14 sm:h-16 px-1 sm:px-2">
            {mainNavItems.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                isActive={isActive(item.path)}
                onClick={() => handleNavClick(item.path)}
              />
            ))}
            
            {/* More button */}
            <NavButton
              item={{ id: 'more', label: 'Mais', icon: <MoreHorizontal className="w-5 h-5" />, path: '' }}
              isActive={isMoreActive || moreSheetOpen}
              onClick={() => setMoreSheetOpen(true)}
            />
          </div>
        </div>
      </motion.nav>

      {/* More Options Bottom Sheet */}
      <BottomSheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="Mais opções"
        snapPoints={[0.5]}
      >
        <div className="grid grid-cols-3 gap-4">
          {moreNavItems.map((item) => (
            <motion.button
              key={item.id}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl transition-colors",
                isActive(item.path)
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
              onClick={() => handleNavClick(item.path)}
              whileTap={{ scale: 0.95 }}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </BottomSheet>

      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="h-14 sm:h-16 md:hidden" />
    </>
  );
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}

function NavButton({ item, isActive, onClick }: NavButtonProps) {
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
        animate={{ scale: isActive ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {item.icon}
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
