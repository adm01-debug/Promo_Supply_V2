import { 
  LayoutDashboard, 
  ClipboardList, 
  Search, 
  FileText, 
  CreditCard, 
  Factory,
  ChevronLeft,
  ChevronRight,
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
  Sparkles,
  ShieldCheck,
  Wallet,
  Brain,
  Columns3,
  FileCheck,
  RefreshCw,
  RotateCcw,
  Gavel,
  LogOut,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { PrefetchLink } from "@/components/PrefetchLink";

interface NavItemDef {
  title: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItemDef[];
}

const sections: NavSection[] = [
  {
    id: "overview",
    label: "Visão Geral",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, href: "/" },
      { title: "Executivo", icon: TrendingUp, href: "/dashboard-executivo" },
    ],
  },
  {
    id: "operations",
    label: "Operações",
    items: [
      { title: "Solicitações", icon: ClipboardList, href: "/solicitacoes", badge: 5 },
      { title: "Kanban", icon: Columns3, href: "/kanban" },
      { title: "Cotações", icon: Search, href: "/cotacao", badge: 3 },
      { title: "Negociação IA", icon: Brain, href: "/negociacao-ia" },
      { title: "Pedidos", icon: FileText, href: "/pedidos" },
      { title: "Recompra", icon: RefreshCw, href: "/recompra-inteligente" },
      { title: "Acompanhamento", icon: Truck, href: "/acompanhamento" },
      { title: "Recebimento", icon: ClipboardCheck, href: "/recebimento" },
      { title: "Devoluções", icon: RotateCcw, href: "/devolucoes" },
      { title: "Catálogo", icon: Package, href: "/catalogo-produtos" },
    ],
  },
  {
    id: "finance",
    label: "Financeiro",
    items: [
      { title: "Pagamentos", icon: CreditCard, href: "/pagamentos", badge: 2 },
      { title: "Contratos", icon: FileSignature, href: "/contratos" },
      { title: "Sourcing (RFx)", icon: Gavel, href: "/sourcing" },
      { title: "Licitações", icon: Gavel, href: "/licitacoes" },
      { title: "Compliance", icon: ShieldCheck, href: "/compliance" },
      { title: "Orçamentos", icon: Wallet, href: "/orcamentos" },
      { title: "Docs Fiscais", icon: FileCheck, href: "/documentos-fiscais" },
    ],
  },
  {
    id: "suppliers",
    label: "Fornecedores",
    items: [
      { title: "Cadastros", icon: Factory, href: "/fornecedores" },
      { title: "SPOT / Stricker", icon: Sparkles, href: "/catalogo-spot" },
      { title: "Performance", icon: Users, href: "/supplier-performance" },
      { title: "Qualificação", icon: ShieldCheck, href: "/qualificacao-fornecedores" },
      { title: "Histórico", icon: ShoppingCart, href: "/historico-compras" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    items: [
      { title: "Relatórios", icon: BarChart3, href: "/relatorios" },
      { title: "Negociações", icon: PiggyBank, href: "/relatorios/negociacoes" },
      { title: "Compradores", icon: Award, href: "/buyer-performance" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    items: [
      { title: "Aprovações", icon: ClipboardCheck, href: "/aprovacoes", badge: 4 },
      { title: "Auditoria", icon: History, href: "/auditoria" },
      { title: "Segurança", icon: Shield, href: "/seguranca" },
    ],
  },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/* ─── Badge ─── */
const CountBadge = ({ count }: { count: number }) => (
  <motion.span 
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold shadow-sm"
  >
    {count}
  </motion.span>
);

/* ─── Single Nav Item ─── */
const SidebarItem = ({
  item,
  active,
  collapsed,
}: {
  item: NavItemDef;
  active: boolean;
  collapsed: boolean;
}) => {
  const Icon = item.icon;

  const content = (
    <PrefetchLink
      to={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200",
        collapsed && "justify-center px-0",
        active
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:translate-x-1"
      )}
    >
      {/* Indicator Bar */}
      {active && (
        <motion.span 
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[4px] rounded-r-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" 
        />
      )}

      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      />

      {!collapsed && (
        <>
          <span className="truncate">{item.title}</span>
          {item.badge != null && item.badge > 0 && <CountBadge count={item.badge} />}
        </>
      )}

      {/* Collapsed badge dot */}
      {collapsed && item.badge != null && item.badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-sidebar-background" />
      )}
    </PrefetchLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">
          {item.title}
          {item.badge != null && item.badge > 0 && (
            <span className="ml-1.5 text-primary">({item.badge})</span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

/* ─── Section ─── */
const SidebarSection = ({
  section,
  pathname,
  collapsed,
}: {
  section: NavSection;
  pathname: string;
  collapsed: boolean;
}) => (
  <div className="space-y-0.5">
    {/* Section label — hidden when collapsed */}
    {!collapsed && (
      <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
        {section.label}
      </p>
    )}
    {collapsed && <div className="my-1.5 mx-2 h-px bg-border/40" />}

    {section.items.map((item) => (
      <SidebarItem
        key={item.href}
        item={item}
        active={isItemActive(pathname, item.href)}
        collapsed={collapsed}
      />
    ))}
  </div>
);

/* ─── Main Sidebar ─── */
interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const AppSidebar = ({ collapsed, onToggle }: AppSidebarProps) => {
  const { pathname } = useLocation();

  return (
    <aside
      data-tour="sidebar"
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/40 bg-card/80 backdrop-blur-xl transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* ── Header ── */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border/40 px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
          <Package className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight text-foreground">
            Promo Supply
          </span>
        )}
      </div>

      {/* ── Toggle ── */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-[52px] z-50 h-6 w-6 rounded-full border border-border/60 bg-sidebar-background shadow-sm hover:bg-accent"
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {/* ── Navigation ── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 scrollbar-thin"
        role="navigation"
        aria-label="Menu principal"
      >
        {sections.map((section) => (
          <SidebarSection
            key={section.id}
            section={section}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* ── Footer ── */}
      {!collapsed && (
        <div className="shrink-0 border-t border-border/40 p-2">
          <PrefetchLink
            to="#"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
            Ajuda & Suporte
          </PrefetchLink>
        </div>
      )}

      {collapsed && (
        <div className="shrink-0 border-t border-border/40 p-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <PrefetchLink
                to="#"
                className="flex items-center justify-center rounded-lg py-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <HelpCircle className="h-[18px] w-[18px]" />
              </PrefetchLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs font-medium">
              Ajuda & Suporte
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </aside>
  );
};

/* ─── Mobile Trigger ─── */
export const MobileSidebarTrigger = ({
  onClick,
  hasNotifications = false,
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
    <Menu className="h-5 w-5" />
    {hasNotifications && (
      <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
    )}
  </Button>
);
