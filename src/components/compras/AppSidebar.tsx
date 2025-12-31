import { 
  LayoutDashboard, 
  ClipboardList, 
  Search, 
  FileText, 
  CreditCard, 
  Factory,
  ChevronLeft,
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
  Shield
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const menuItems = [
  { 
    title: "Dashboard", 
    icon: LayoutDashboard, 
    href: "/",
    description: "Visão geral"
  },
  { 
    title: "Solicitações", 
    icon: ClipboardList, 
    href: "/solicitacoes",
    description: "Lista de pedidos"
  },
  { 
    title: "Cotações", 
    icon: Search, 
    href: "/cotacao",
    description: "Cotar fornecedores"
  },
  { 
    title: "Pedidos", 
    icon: FileText, 
    href: "/pedidos",
    description: "Ordens de compra"
  },
  { 
    title: "Acompanhamento", 
    icon: Truck, 
    href: "/acompanhamento",
    description: "Timeline de pedidos"
  },
  { 
    title: "Pagamentos", 
    icon: CreditCard, 
    href: "/pagamentos",
    description: "Financeiro"
  },
  { 
    title: "Fornecedores", 
    icon: Factory, 
    href: "/fornecedores",
    description: "Cadastros"
  },
  { 
    title: "Contratos", 
    icon: FileSignature, 
    href: "/contratos",
    description: "Gestão contratos"
  },
  { 
    title: "Histórico", 
    icon: ShoppingCart, 
    href: "/historico-compras",
    description: "Produto/Fornecedor"
  },
  { 
    title: "Performance", 
    icon: Users, 
    href: "/supplier-performance",
    description: "Scorecard e riscos"
  },
  { 
    title: "Executivo", 
    icon: TrendingUp, 
    href: "/dashboard-executivo",
    description: "Visão consolidada"
  },
  { 
    title: "Relatórios", 
    icon: BarChart3, 
    href: "/relatorios",
    description: "Analytics"
  },
  { 
    title: "Negociações", 
    icon: PiggyBank, 
    href: "/relatorios/negociacoes",
    description: "Performance comprador"
  },
  { 
    title: "Compradores", 
    icon: Award, 
    href: "/buyer-performance",
    description: "Dashboard individual"
  },
  { 
    title: "Aprovações", 
    icon: ClipboardCheck, 
    href: "/aprovacoes",
    description: "Workflow aprovação"
  },
  { 
    title: "Auditoria", 
    icon: History, 
    href: "/auditoria",
    description: "Trilha de ações"
  },
  { 
    title: "Segurança", 
    icon: Shield, 
    href: "/seguranca",
    description: "MFA e controles"
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const AppSidebar = ({ collapsed, onToggle }: AppSidebarProps) => {
  const location = useLocation();

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Package className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Compras</h1>
              <p className="text-[10px] text-muted-foreground">Promo Brindes</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Package className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-border bg-card shadow-sm hover:bg-accent"
      >
        <ChevronLeft className={cn(
          "w-3 h-3 transition-transform",
          collapsed && "rotate-180"
        )} />
      </Button>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== "/" && location.pathname.startsWith(item.href));
          
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 shrink-0",
                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{item.title}</span>
                  {!isActive && (
                    <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Sistema de Compras v1.0</p>
            <p className="text-[10px] text-muted-foreground mt-1">Dados mockados</p>
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
  >
    <Menu className="w-5 h-5" />
  </Button>
);
