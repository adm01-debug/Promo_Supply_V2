import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  ClipboardList,
  Search,
  FileText,
  CreditCard,
  Factory,
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
  Plus,
  Moon,
  Sun,
  LogOut,
  User,
  Bell,
  HelpCircle,
  Zap,
  FileUp,
  Download,
  RefreshCw,
  Clock,
  Star,
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRecentlyViewed, type RecentItem } from "@/hooks/useRecentlyViewed";
import { normalizeText } from "@/hooks/useFuseSearch";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItemType {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  href?: string;
  action?: () => void;
  badge?: { text: string; variant: "default" | "secondary" | "destructive" | "outline" };
  keywords?: string[];
  group: string;
  description?: string;
}

// Smart suggestions based on context
const getSmartSuggestions = (recentItems: RecentItem[]): CommandItemType[] => {
  const hour = new Date().getHours();
  const suggestions: CommandItemType[] = [];

  // Time-based suggestions
  if (hour >= 8 && hour < 12) {
    suggestions.push({
      id: "morning-review",
      label: "Revisar Aprovações Pendentes",
      icon: ClipboardCheck,
      href: "/aprovacoes",
      group: "Sugestões Inteligentes",
      description: "Comece o dia revisando itens pendentes",
      keywords: ["manhã", "revisar", "pendentes"],
    });
  }

  if (hour >= 14 && hour < 18) {
    suggestions.push({
      id: "afternoon-reports",
      label: "Verificar Relatórios",
      icon: BarChart3,
      href: "/relatorios",
      group: "Sugestões Inteligentes",
      description: "Acompanhe as métricas do dia",
      keywords: ["tarde", "métricas", "relatórios"],
    });
  }

  // Based on recent activity
  if (recentItems.length > 0) {
    const lastItem = recentItems[0];
    if (lastItem.type === 'solicitacao') {
      suggestions.push({
        id: "continue-solicitacao",
        label: `Continuar: ${lastItem.title}`,
        icon: ArrowRight,
        href: `/solicitacoes?id=${lastItem.id}`,
        group: "Sugestões Inteligentes",
        description: "Retome onde parou",
        keywords: ["continuar", "último"],
      });
    }
  }

  return suggestions;
};

export function EnhancedCommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [mounted, setMounted] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = React.useState("");
  const { recentItems } = useRecentlyViewed();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Navigation items
  const navigationItems: CommandItemType[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/", shortcut: "⌘D", keywords: ["home", "início"], group: "Navegação", description: "Visão geral do sistema" },
    { id: "executivo", label: "Dashboard Executivo", icon: TrendingUp, href: "/dashboard-executivo", keywords: ["kpi", "métricas"], group: "Navegação", description: "KPIs e métricas executivas" },
    { id: "solicitacoes", label: "Solicitações", icon: ClipboardList, href: "/solicitacoes", shortcut: "⌘S", badge: { text: "5", variant: "default" }, keywords: ["pedidos", "requisições"], group: "Navegação", description: "Gerenciar solicitações de compra" },
    { id: "cotacoes", label: "Cotações", icon: Search, href: "/cotacao", shortcut: "⌘Q", badge: { text: "3", variant: "secondary" }, keywords: ["preços", "orçamentos"], group: "Navegação", description: "Buscar e comparar cotações" },
    { id: "pedidos", label: "Pedidos", icon: FileText, href: "/pedidos", shortcut: "⌘P", keywords: ["ordens", "compras"], group: "Navegação", description: "Ordens de compra" },
    { id: "acompanhamento", label: "Acompanhamento", icon: Truck, href: "/acompanhamento", keywords: ["entregas", "rastreio"], group: "Navegação", description: "Timeline e rastreamento" },
    { id: "pagamentos", label: "Pagamentos", icon: CreditCard, href: "/pagamentos", badge: { text: "2", variant: "destructive" }, keywords: ["financeiro", "contas"], group: "Navegação", description: "Gestão financeira" },
    { id: "contratos", label: "Contratos", icon: FileSignature, href: "/contratos", keywords: ["acordos", "termos"], group: "Navegação", description: "Gestão de contratos" },
    { id: "fornecedores", label: "Fornecedores", icon: Factory, href: "/fornecedores", shortcut: "⌘F", keywords: ["suppliers", "parceiros"], group: "Navegação", description: "Cadastro de fornecedores" },
    { id: "supplier-perf", label: "Performance Fornecedores", icon: Users, href: "/supplier-performance", keywords: ["scorecard", "avaliação"], group: "Navegação", description: "Análise de desempenho" },
    { id: "historico", label: "Histórico de Compras", icon: ShoppingCart, href: "/historico-compras", keywords: ["passado", "registros"], group: "Navegação", description: "Histórico completo" },
    { id: "relatorios", label: "Relatórios", icon: BarChart3, href: "/relatorios", shortcut: "⌘R", keywords: ["analytics", "dados"], group: "Navegação", description: "Relatórios e analytics" },
    { id: "negociacoes", label: "Negociações", icon: PiggyBank, href: "/relatorios/negociacoes", keywords: ["economia", "savings"], group: "Navegação", description: "Análise de economias" },
    { id: "compradores", label: "Performance Compradores", icon: Award, href: "/buyer-performance", keywords: ["buyers", "equipe"], group: "Navegação", description: "Desempenho da equipe" },
    { id: "aprovacoes", label: "Aprovações", icon: ClipboardCheck, href: "/aprovacoes", badge: { text: "4", variant: "secondary" }, keywords: ["pendentes", "workflow"], group: "Navegação", description: "Workflow de aprovação" },
    { id: "auditoria", label: "Auditoria", icon: History, href: "/auditoria", keywords: ["logs", "trilha"], group: "Navegação", description: "Trilha de auditoria" },
    { id: "seguranca", label: "Segurança", icon: Shield, href: "/seguranca", keywords: ["mfa", "senhas"], group: "Navegação", description: "Configurações de segurança" },
  ];

  // Quick actions with enhanced descriptions
  const actionItems: CommandItemType[] = [
    { id: "nova-solicitacao", label: "Nova Solicitação", icon: Plus, action: () => navigate("/solicitacoes"), shortcut: "⌘N", keywords: ["criar", "adicionar"], group: "Ações Rápidas", description: "Criar nova solicitação de compra" },
    { id: "novo-fornecedor", label: "Cadastrar Fornecedor", icon: Factory, action: () => navigate("/fornecedores"), keywords: ["novo", "adicionar"], group: "Ações Rápidas", description: "Adicionar novo fornecedor" },
    { id: "exportar", label: "Exportar Dados", icon: Download, action: () => {}, keywords: ["download", "excel"], group: "Ações Rápidas", description: "Baixar dados em Excel/PDF" },
    { id: "importar", label: "Importar Dados", icon: FileUp, action: () => {}, keywords: ["upload", "csv"], group: "Ações Rápidas", description: "Importar planilha de dados" },
    { id: "atualizar", label: "Atualizar Dados", icon: RefreshCw, action: () => window.location.reload(), shortcut: "⌘⇧R", keywords: ["refresh", "recarregar"], group: "Ações Rápidas", description: "Recarregar todos os dados" },
  ];

  // Settings items
  const currentTheme = mounted ? theme : "system";
  const settingsItems: CommandItemType[] = [
    { 
      id: "theme", 
      label: currentTheme === "dark" ? "Modo Claro" : "Modo Escuro", 
      icon: currentTheme === "dark" ? Sun : Moon, 
      action: () => setTheme(currentTheme === "dark" ? "light" : "dark"), 
      shortcut: "⌘T",
      keywords: ["tema", "aparência"],
      group: "Configurações",
      description: "Alternar tema claro/escuro"
    },
    { id: "notificacoes", label: "Notificações", icon: Bell, action: () => {}, keywords: ["alertas", "avisos"], group: "Configurações", description: "Configurar alertas" },
    { id: "perfil", label: "Meu Perfil", icon: User, action: () => {}, keywords: ["conta", "usuário"], group: "Configurações", description: "Editar informações pessoais" },
    { id: "ajuda", label: "Ajuda & Suporte", icon: HelpCircle, action: () => {}, shortcut: "⌘?", keywords: ["help", "faq"], group: "Configurações", description: "Central de ajuda" },
    { id: "sair", label: "Sair", icon: LogOut, action: () => navigate("/auth"), shortcut: "⌘⇧Q", keywords: ["logout", "desconectar"], group: "Configurações", description: "Encerrar sessão" },
  ];

  // Smart suggestions
  const smartSuggestions = React.useMemo(() => 
    getSmartSuggestions(recentItems || []), 
    [recentItems]
  );

  // Recent items converted to command items
  const recentCommandItems: CommandItemType[] = React.useMemo(() => {
    if (!recentItems || recentItems.length === 0) return [];
    
    return recentItems.slice(0, 5).map(item => ({
      id: `recent-${item.id}`,
      label: item.title,
      icon: Clock,
      href: item.url,
      group: "Recentes",
      description: item.subtitle || "Visitado recentemente",
      keywords: [item.title.toLowerCase()],
    }));
  }, [recentItems]);

  const allItems = React.useMemo(() => [
    ...smartSuggestions,
    ...recentCommandItems,
    ...navigationItems, 
    ...actionItems, 
    ...settingsItems
  ].map(item => ({
    ...item,
    normalizedLabel: normalizeText(item.label),
    normalizedDescription: item.description ? normalizeText(item.description) : '',
    normalizedKeywords: item.keywords ? item.keywords.map(normalizeText).join(' ') : '',
  })), [smartSuggestions, recentCommandItems, navigationItems, actionItems, settingsItems]);

  // Fuse.js for fuzzy search
  const fuse = React.useMemo(() => new Fuse(allItems, {
    isCaseSensitive: false,
    includeScore: true,
    includeMatches: true,
    threshold: 0.4,
    keys: [
      { name: 'label', weight: 2.0 },
      { name: 'description', weight: 1.5 },
      { name: 'keywords', weight: 1.8 },
      { name: 'normalizedLabel', weight: 1.8 },
      { name: 'normalizedDescription', weight: 1.3 },
      { name: 'normalizedKeywords', weight: 1.5 },
    ],
  }), [allItems]);

  // Fuzzy search results
  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return allItems;
    
    const normalizedSearch = normalizeText(search);
    const results = fuse.search(search);
    const normalizedResults = fuse.search(normalizedSearch);
    
    // Merge and deduplicate
    const seenIds = new Set<string>();
    const merged: typeof allItems = [];
    
    [...results, ...normalizedResults].forEach(r => {
      if (!seenIds.has(r.item.id)) {
        seenIds.add(r.item.id);
        merged.push(r.item);
      }
    });
    
    return merged.length > 0 ? merged : allItems.filter(item =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.keywords?.some(k => k.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, fuse, allItems]);

  const handleSelect = (item: CommandItemType) => {
    onOpenChange(false);
    setSearch("");
    if (item.href) {
      navigate(item.href);
    } else if (item.action) {
      item.action();
    }
  };

  // Group items
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, CommandItemType[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.group]) {
        groups[item.group] = [];
      }
      groups[item.group].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Group order for display
  const groupOrder = [
    "Sugestões Inteligentes",
    "Recentes",
    "Ações Rápidas",
    "Navegação",
    "Configurações"
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command className="rounded-lg border shadow-2xl" loop>
        {/* Enhanced header */}
        <div className="flex items-center border-b px-3 gap-2">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
          </motion.div>
          <CommandInput 
            placeholder="Buscar páginas, ações, configurações..." 
            value={search}
            onValueChange={setSearch}
            className="border-0 focus:ring-0"
          />
          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5">
            ESC
          </Badge>
        </div>

        <CommandList className="max-h-[450px]">
          <CommandEmpty className="py-6 text-center">
            <motion.div 
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="p-3 rounded-full bg-muted">
                <Search className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhum resultado para "{search}"
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Tente buscar por páginas, ações ou configurações
                </p>
              </div>
            </motion.div>
          </CommandEmpty>

          {groupOrder.map((group, groupIndex) => {
            const items = groupedItems[group];
            if (!items || items.length === 0) return null;

            return (
              <React.Fragment key={group}>
                {groupIndex > 0 && <CommandSeparator />}
                <CommandGroup heading={
                  <span className="flex items-center gap-2">
                    {group === "Sugestões Inteligentes" && (
                      <Sparkles className="h-3 w-3 text-primary" />
                    )}
                    {group === "Recentes" && (
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    )}
                    {group}
                  </span>
                }>
                  {items.map((item, index) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.label} ${item.keywords?.join(" ") || ""} ${item.description || ""}`}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                    >
                      <motion.div 
                        className={`
                          p-1.5 rounded-md 
                          ${item.group === "Sugestões Inteligentes" ? "bg-primary/15 text-primary" :
                            item.group === "Recentes" ? "bg-muted text-muted-foreground" :
                            item.group === "Ações Rápidas" ? "bg-primary/10 text-primary" : 
                            item.group === "Configurações" ? "bg-muted text-muted-foreground" :
                            "bg-accent text-accent-foreground"}
                        `}
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <item.icon className="h-4 w-4" />
                      </motion.div>
                      <div className="flex-1 flex flex-col">
                        <span className="font-medium text-sm">{item.label}</span>
                        {item.description && (
                          <span className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <Badge variant={item.badge.variant} className="text-[10px] px-1.5 py-0">
                            {item.badge.text}
                          </Badge>
                        )}
                        {item.shortcut && (
                          <CommandShortcut className="text-[10px]">
                            {item.shortcut}
                          </CommandShortcut>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            );
          })}
        </CommandList>

        {/* Enhanced footer with keyboard hints */}
        <div className="border-t px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border font-mono">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border font-mono">↵</kbd>
              selecionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border font-mono">⌘</kbd>
              +
              <kbd className="px-1.5 py-0.5 rounded bg-background border font-mono">K</kbd>
              abrir/fechar
            </span>
          </div>
          <span className="text-muted-foreground/60 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Busca inteligente
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}

// Hook for keyboard shortcut
export function useEnhancedCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return { open, setOpen };
}

export default EnhancedCommandPalette;
