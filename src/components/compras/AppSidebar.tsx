import { 
  LayoutDashboard, 
  ClipboardList, 
  Search, 
  FileText, 
  CreditCard, 
  Factory,
  ChevronLeft,
  ChevronDown,
  Menu,
  Package,
  Truck,
  BarChart3,
  History,
  PiggyBank,
  ClipboardCheck,
  Users,
  TrendingUp,
  Award,
  ShoppingCart,
  FileSignature,
  Shield,
  HelpCircle,
  Sparkles
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PrefetchLink } from "@/components/PrefetchLink";

// Grouped menu structure for better UX
const menuGroups = [
  {
    id: "overview",
    title: "Visão Geral",
    icon: LayoutDashboard,
    items: [
      { 
        title: "Dashboard", 
        icon: LayoutDashboard, 
        href: "/",
        description: "Visão geral",
        badge: null
      },
      { 
        title: "Executivo", 
        icon: TrendingUp, 
        href: "/dashboard-executivo",
        description: "Visão consolidada",
        badge: null
      },
    ]
  },
  {
    id: "operations",
    title: "Operações",
    icon: ClipboardList,
    items: [
      { 
        title: "Solicitações", 
        icon: ClipboardList, 
        href: "/solicitacoes",
        description: "Lista de pedidos",
        badge: { count: 5, variant: "default" as const }
      },
      { 
        title: "Cotações", 
        icon: Search, 
        href: "/cotacao",
        description: "Cotar fornecedores",
        badge: { count: 3, variant: "warning" as const }
      },
      { 
        title: "Pedidos", 
        icon: FileText, 
        href: "/pedidos",
        description: "Ordens de compra",
        badge: null
      },
      { 
        title: "Acompanhamento", 
        icon: Truck, 
        href: "/acompanhamento",
        description: "Timeline de pedidos",
        badge: null
      },
    ]
  },
  {
    id: "finance",
    title: "Financeiro",
    icon: CreditCard,
    items: [
      { 
        title: "Pagamentos", 
        icon: CreditCard, 
        href: "/pagamentos",
        description: "Financeiro",
        badge: { count: 2, variant: "destructive" as const }
      },
      { 
        title: "Contratos", 
        icon: FileSignature, 
        href: "/contratos",
        description: "Gestão contratos",
        badge: null
      },
    ]
  },
  {
    id: "suppliers",
    title: "Fornecedores",
    icon: Factory,
    items: [
      { 
        title: "Cadastros", 
        icon: Factory, 
        href: "/fornecedores",
        description: "Cadastros",
        badge: null
      },
      { 
        title: "Performance", 
        icon: Users, 
        href: "/supplier-performance",
        description: "Scorecard e riscos",
        badge: null
      },
      { 
        title: "Histórico", 
        icon: ShoppingCart, 
        href: "/historico-compras",
        description: "Produto/Fornecedor",
        badge: null
      },
    ]
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
    items: [
      { 
        title: "Relatórios", 
        icon: BarChart3, 
        href: "/relatorios",
        description: "Analytics",
        badge: null
      },
      { 
        title: "Negociações", 
        icon: PiggyBank, 
        href: "/relatorios/negociacoes",
        description: "Performance comprador",
        badge: null
      },
      { 
        title: "Compradores", 
        icon: Award, 
        href: "/buyer-performance",
        description: "Dashboard individual",
        badge: null
      },
    ]
  },
  {
    id: "admin",
    title: "Administração",
    icon: Shield,
    items: [
      { 
        title: "Aprovações", 
        icon: ClipboardCheck, 
        href: "/aprovacoes",
        description: "Workflow aprovação",
        badge: { count: 4, variant: "warning" as const }
      },
      { 
        title: "Auditoria", 
        icon: History, 
        href: "/auditoria",
        description: "Trilha de ações",
        badge: null
      },
      { 
        title: "Segurança", 
        icon: Shield, 
        href: "/seguranca",
        description: "MFA e controles",
        badge: null
      },
    ]
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// Animated Badge Component
const AnimatedBadge = ({ 
  count, 
  variant,
  size = "default"
}: { 
  count: number; 
  variant: "default" | "warning" | "destructive";
  size?: "default" | "small";
}) => {
  const variants = {
    default: "bg-primary text-primary-foreground",
    warning: "bg-kpi-warning text-kpi-warning-foreground",
    destructive: "bg-kpi-danger text-kpi-danger-foreground",
  };

  const sizeClasses = size === "small" 
    ? "h-4 min-w-4 text-[9px] px-1"
    : "h-5 min-w-5 text-[10px] px-1.5";

  return (
    <motion.span 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "flex items-center justify-center rounded-full font-medium",
        sizeClasses,
        variants[variant]
      )}
    >
      <motion.span
        key={count}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 10, opacity: 0 }}
      >
        {count}
      </motion.span>
    </motion.span>
  );
};

// Active Section Indicator
const ActiveIndicator = ({ isActive }: { isActive: boolean }) => (
  <AnimatePresence>
    {isActive && (
      <motion.div
        layoutId="activeSection"
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -4 }}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
      />
    )}
  </AnimatePresence>
);

// Nav Item with enhanced UX
const NavItem = ({ 
  item, 
  isActive, 
  collapsed 
}: { 
  item: typeof menuGroups[0]['items'][0]; 
  isActive: boolean;
  collapsed: boolean;
}) => {
  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <PrefetchLink
            to={item.href}
            className={cn(
              "flex items-center justify-center w-full h-10 rounded-lg transition-all duration-200 relative group",
              isActive 
                ? "bg-primary text-primary-foreground shadow-glow-sm" 
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-transform",
              !isActive && "group-hover:scale-110"
            )} />
            {item.badge && (
              <span className="absolute -top-1 -right-1">
                <AnimatedBadge count={item.badge.count} variant={item.badge.variant} size="small" />
              </span>
            )}
          </PrefetchLink>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          <span className="font-medium">{item.title}</span>
          {item.description && (
            <span className="text-muted-foreground text-xs">• {item.description}</span>
          )}
          {item.badge && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
              {item.badge.count} pendente{item.badge.count > 1 ? 's' : ''}
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <PrefetchLink
      to={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ml-2 relative",
        isActive 
          ? "bg-primary text-primary-foreground shadow-glow-sm" 
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <ActiveIndicator isActive={isActive} />
      <item.icon className={cn(
        "w-4 h-4 shrink-0 transition-transform",
        !isActive && "group-hover:scale-110",
        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
      )} />
      <div className="flex-1 min-w-0 flex items-center justify-between">
        <span className="text-sm font-medium truncate">{item.title}</span>
        {item.badge && (
          <AnimatedBadge count={item.badge.count} variant={item.badge.variant} />
        )}
      </div>
    </PrefetchLink>
  );
};

export const AppSidebar = ({ collapsed, onToggle }: AppSidebarProps) => {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    menuGroups.map(g => g.id)
  );
  
  // Auto-expand group containing active item
  useEffect(() => {
    const activeGroup = menuGroups.find(group => 
      group.items.some(item => 
        location.pathname === item.href || 
        (item.href !== "/" && location.pathname.startsWith(item.href))
      )
    );
    if (activeGroup && !expandedGroups.includes(activeGroup.id)) {
      setExpandedGroups(prev => [...prev, activeGroup.id]);
    }
  }, [location.pathname]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const isGroupActive = (items: typeof menuGroups[0]['items']) => {
    return items.some(item => 
      location.pathname === item.href || 
      (item.href !== "/" && location.pathname.startsWith(item.href))
    );
  };

  const getGroupBadgeCount = (items: typeof menuGroups[0]['items']) => {
    return items.reduce((acc, item) => acc + (item.badge?.count || 0), 0);
  };

  return (
    <aside 
      data-tour="sidebar"
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div 
              key="expanded"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow-sm">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground tracking-tight">Sistema de Compras</h1>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Promo Brindes
                </p>
              </div>
            </motion.div>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <motion.div 
                  key="collapsed"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mx-auto shadow-glow-sm cursor-pointer"
                >
                  <Package className="w-5 h-5 text-primary-foreground" />
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">Sistema de Compras</p>
                <p className="text-xs text-muted-foreground">Promo Brindes</p>
              </TooltipContent>
            </Tooltip>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-border bg-card shadow-md hover:bg-accent hover:shadow-lg transition-all z-50"
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        <ChevronLeft className={cn(
          "w-3 h-3 transition-transform duration-300",
          collapsed && "rotate-180"
        )} />
      </Button>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin" role="navigation" aria-label="Menu principal">
        {menuGroups.map((group) => {
          const isActive = isGroupActive(group.items);
          const isExpanded = expandedGroups.includes(group.id);
          const groupBadgeCount = getGroupBadgeCount(group.items);

          if (collapsed) {
            return (
              <div key={group.id} className="space-y-1 relative">
                {/* Group indicator for collapsed state */}
                {isActive && (
                  <motion.div 
                    layoutId="activeGroup"
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r-full"
                  />
                )}
                {group.items.map((item) => {
                  const isItemActive = location.pathname === item.href || 
                    (item.href !== "/" && location.pathname.startsWith(item.href));
                  return <NavItem key={item.href} item={item} isActive={isItemActive} collapsed />;
                })}
                <div className="h-px bg-border/50 my-2" />
              </div>
            );
          }

          return (
            <Collapsible
              key={group.id}
              open={isExpanded}
              onOpenChange={() => toggleGroup(group.id)}
            >
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all relative group",
                    isActive 
                      ? "text-primary bg-primary/5" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {/* Active group indicator */}
                  {isActive && (
                    <motion.div 
                      layoutId="activeGroupExpanded"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-r-full"
                    />
                  )}
                  <motion.div
                    animate={{ rotate: isExpanded ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </motion.div>
                  <group.icon className="w-3.5 h-3.5" />
                  <span className="flex-1 text-left">{group.title}</span>
                  {groupBadgeCount > 0 && !isExpanded && (
                    <AnimatedBadge 
                      count={groupBadgeCount} 
                      variant={group.items.some(i => i.badge?.variant === 'destructive') ? 'destructive' : 'warning'} 
                      size="small" 
                    />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-1">
                <AnimatePresence>
                  {isExpanded && group.items.map((item, index) => {
                    const isItemActive = location.pathname === item.href || 
                      (item.href !== "/" && location.pathname.startsWith(item.href));
                    
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <NavItem item={item} isActive={isItemActive} collapsed={false} />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

      {/* Footer */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-3 border-t border-border shrink-0 space-y-2"
          >
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
              <HelpCircle className="w-4 h-4" />
              Ajuda & Suporte
            </Button>
            <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground">Sistema de Compras v2.0</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-kpi-success animate-pulse" />
                Online • Atualizado
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};

// Mobile trigger with notification indicator
export const MobileSidebarTrigger = ({ 
  onClick,
  hasNotifications = false
}: { 
  onClick: () => void;
  hasNotifications?: boolean;
}) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onClick}
    className="md:hidden relative"
    aria-label="Abrir menu de navegação"
  >
    <Menu className="w-5 h-5" />
    {hasNotifications && (
      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-kpi-danger" />
    )}
  </Button>
);
