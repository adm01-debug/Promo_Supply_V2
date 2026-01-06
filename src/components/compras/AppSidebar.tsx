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
  Settings,
  HelpCircle
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

// Grouped menu structure for better UX
const menuGroups = [
  {
    id: "overview",
    title: "Visão Geral",
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

export const AppSidebar = ({ collapsed, onToggle }: AppSidebarProps) => {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    menuGroups.map(g => g.id) // All expanded by default
  );

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

  const renderBadge = (badge: typeof menuGroups[0]['items'][0]['badge']) => {
    if (!badge) return null;
    
    const variants = {
      default: "bg-primary text-primary-foreground",
      warning: "bg-warning text-warning-foreground",
      destructive: "bg-destructive text-destructive-foreground",
    };

    return (
      <span className={cn(
        "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-medium px-1.5",
        variants[badge.variant]
      )}>
        {badge.count}
      </span>
    );
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
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow-sm">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">Sistema de Compras</h1>
              <p className="text-[10px] text-muted-foreground">Promo Brindes</p>
            </div>
          </div>
        )}
        {collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mx-auto shadow-glow-sm cursor-pointer">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Sistema de Compras</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-border bg-card shadow-md hover:bg-accent hover:shadow-lg transition-all"
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

          if (collapsed) {
            // Collapsed: show only icons with tooltips
            return (
              <div key={group.id} className="space-y-1">
                {group.items.map((item) => {
                  const isItemActive = location.pathname === item.href || 
                    (item.href !== "/" && location.pathname.startsWith(item.href));
                  
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.href}
                          className={cn(
                            "flex items-center justify-center w-full h-10 rounded-lg transition-all duration-200 relative",
                            isItemActive 
                              ? "bg-primary text-primary-foreground shadow-sm" 
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                          aria-current={isItemActive ? "page" : undefined}
                        >
                          <item.icon className="w-5 h-5" />
                          {item.badge && (
                            <span className={cn(
                              "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] font-medium px-1",
                              item.badge.variant === "destructive" ? "bg-destructive text-destructive-foreground" :
                              item.badge.variant === "warning" ? "bg-warning text-warning-foreground" :
                              "bg-primary text-primary-foreground"
                            )}>
                              {item.badge.count}
                            </span>
                          )}
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {item.badge.count}
                          </Badge>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                <div className="h-px bg-border my-2" />
              </div>
            );
          }

          // Expanded: show groups with collapsible sections
          return (
            <Collapsible
              key={group.id}
              open={isExpanded}
              onOpenChange={() => toggleGroup(group.id)}
            >
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ChevronDown className={cn(
                    "w-3 h-3 transition-transform duration-200",
                    !isExpanded && "-rotate-90"
                  )} />
                  {group.title}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-1">
                {group.items.map((item) => {
                  const isItemActive = location.pathname === item.href || 
                    (item.href !== "/" && location.pathname.startsWith(item.href));
                  
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ml-2",
                        isItemActive 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                      aria-current={isItemActive ? "page" : undefined}
                    >
                      <item.icon className={cn(
                        "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                        isItemActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{item.title}</span>
                        {renderBadge(item.badge)}
                      </div>
                    </NavLink>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-border shrink-0 space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
            <HelpCircle className="w-4 h-4" />
            Ajuda & Suporte
          </Button>
          <div className="px-3 py-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Sistema de Compras v1.0</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Última atualização: hoje</p>
          </div>
        </div>
      )}
    </aside>
  );
};

// Mobile trigger
export const MobileSidebarTrigger = ({ onClick }: { onClick: () => void }) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onClick}
    className="md:hidden"
    aria-label="Abrir menu de navegação"
  >
    <Menu className="w-5 h-5" />
  </Button>
);
