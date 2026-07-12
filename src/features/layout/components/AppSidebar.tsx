import { 
  LayoutDashboard, 
  ClipboardList, 
  Search, 
  FileText, 
  BookOpen, 
  CreditCard, 
  Factory,
  Building2,
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
  Settings,
  Settings2,
  Boxes,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { PrefetchLink } from "@/components/PrefetchLink";
import { useAuth } from "@/features/auth";

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
      { title: "Estoque", icon: Boxes, href: "/estoque" },
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
      { title: "Centros de Custo", icon: Building2, href: "/configuracoes-centro-custo" },
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
      { title: "Workflows", icon: Settings2, href: "/admin/workflows" },
      { title: "Segurança", icon: Shield, href: "/seguranca" },
      { title: "PunchOut", icon: ShoppingCart, href: "/admin/punchout" },
      { title: "ERP Sync", icon: RefreshCw, href: "/admin/erp" },
      { title: "Sourcing Pipeline", icon: TrendingUp, href: "/admin/sourcing-pipeline" },
      { title: "Fiscal", icon: FileCheck, href: "/admin/fiscal" },
      { title: "Documentação", icon: BookOpen, href: "/admin/docs" },
      { title: "Documentação", icon: BookOpen, href: "/admin/docs" },
      { title: "Saúde do Sistema", icon: Activity, href: "/admin/health" },
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
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-300",
        collapsed && "justify-center px-0",
        active
          ? "bg-violet-500/10 text-violet-300 shadow-sm"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:translate-x-1 hover:shadow-sm"
      )}
    >
      {/* Indicator Bar */}
      {active && (
        <motion.span 
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[4px] rounded-r-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" 
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
      <p className="px-4 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 select-none">
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
  const { signOut } = useAuth();

  return (
    <aside
      data-tour="sidebar"
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card/10 backdrop-blur-3xl transition-[width] duration-300 ease-&lsqb;cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* ── Header ── */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/20 transition-transform hover:scale-105 active:scale-95">
          <Package className="h-5 w-5 text-primary-foreground" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col leading-none"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              <span className="text-[15px] font-black uppercase tracking-tighter text-foreground">
                PROMO <span className="text-primary">SUPPLY</span>
              </span>
              <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground font-semibold mt-1">
                Gestão de Compras
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Toggle ── */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-[68px] z-50 h-7 w-7 rounded-full border border-border/20 bg-card shadow-md transition-transform hover:scale-110 active:scale-90"
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-primary" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-primary" />
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

      <div className="mt-auto space-y-1 p-2 border-t border-border/10 bg-muted/20">
        {!collapsed && (
          <>
            <PrefetchLink
              to="/seguranca"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary"
            >
              <Settings className="h-[18px] w-[18px]" />
              Segurança
            </PrefetchLink>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground transition-all hover:bg-destructive/5 hover:text-destructive"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sair da conta
            </button>
          </>
        )}

        {collapsed && (
          <div className="flex flex-col items-center gap-2">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <PrefetchLink
                  to="/seguranca"
                  className="flex items-center justify-center rounded-xl p-2 text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary"
                >
                  <Settings className="h-[18px] w-[18px]" />
                </PrefetchLink>
              </TooltipTrigger>
              <TooltipContent side="right">Segurança</TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut()}
                  className="flex items-center justify-center rounded-xl p-2 text-muted-foreground transition-all hover:bg-destructive/5 hover:text-destructive"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
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
