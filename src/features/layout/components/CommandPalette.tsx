import * as React from "react";
import { useNavigate } from "react-router-dom";
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
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { normalizeText } from "@/hooks/useFuseSearch";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItemType {
  id: string;
  label: string;
  normalizedLabel?: string;
  icon: LucideIcon;
  shortcut?: string;
  href?: string;
  action?: () => void;
  badge?: { text: string; variant: "default" | "secondary" | "destructive" | "outline" };
  keywords?: string[];
  normalizedKeywords?: string[];
  group: string;
}

// Fuse.js configuration
const fuseOptions = {
  isCaseSensitive: false,
  includeScore: true,
  threshold: 0.4,
  keys: [
    { name: 'label', weight: 2 },
    { name: 'normalizedLabel', weight: 1.5 },
    { name: 'keywords', weight: 1 },
    { name: 'normalizedKeywords', weight: 0.8 },
    { name: 'group', weight: 0.5 },
  ]
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [mounted, setMounted] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = React.useState("");
  const [recentIds, setRecentIds] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("command-palette-recent");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveToRecent = (id: string) => {
    setRecentIds(prev => {
      const filtered = prev.filter(i => i !== id);
      const updated = [id, ...filtered].slice(0, 5);
      localStorage.setItem("command-palette-recent", JSON.stringify(updated));
      return updated;
    });
  };

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Navigation items with normalized text
  const navigationItems: CommandItemType[] = React.useMemo(() => {
    const items: CommandItemType[] = [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/", shortcut: "⌘D", keywords: ["home", "início"], group: "Navegação" },
      { id: "executivo", label: "Dashboard Executivo", icon: TrendingUp, href: "/dashboard-executivo", keywords: ["kpi", "métricas"], group: "Navegação" },
      { id: "solicitacoes", label: "Solicitações", icon: ClipboardList, href: "/solicitacoes", shortcut: "⌘S", badge: { text: "5", variant: "default" as const }, keywords: ["pedidos", "requisições"], group: "Navegação" },
      { id: "cotacoes", label: "Cotações", icon: Search, href: "/cotacao", shortcut: "⌘Q", badge: { text: "3", variant: "secondary" as const }, keywords: ["preços", "orçamentos"], group: "Navegação" },
      { id: "pedidos", label: "Pedidos", icon: FileText, href: "/pedidos", shortcut: "⌘P", keywords: ["ordens", "compras"], group: "Navegação" },
      { id: "acompanhamento", label: "Acompanhamento", icon: Truck, href: "/acompanhamento", keywords: ["entregas", "rastreio"], group: "Navegação" },
      { id: "pagamentos", label: "Pagamentos", icon: CreditCard, href: "/pagamentos", badge: { text: "2", variant: "destructive" as const }, keywords: ["financeiro", "contas"], group: "Navegação" },
      { id: "contratos", label: "Contratos", icon: FileSignature, href: "/contratos", keywords: ["acordos", "termos"], group: "Navegação" },
      { id: "fornecedores", label: "Fornecedores", icon: Factory, href: "/fornecedores", shortcut: "⌘F", keywords: ["suppliers", "parceiros"], group: "Navegação" },
      { id: "supplier-perf", label: "Performance Fornecedores", icon: Users, href: "/supplier-performance", keywords: ["scorecard", "avaliação"], group: "Navegação" },
      { id: "historico", label: "Histórico de Compras", icon: ShoppingCart, href: "/historico-compras", keywords: ["passado", "registros"], group: "Navegação" },
      { id: "relatorios", label: "Relatórios", icon: BarChart3, href: "/relatorios", shortcut: "⌘R", keywords: ["analytics", "dados"], group: "Navegação" },
      { id: "negociacoes", label: "Negociações", icon: PiggyBank, href: "/relatorios/negociacoes", keywords: ["economia", "savings"], group: "Navegação" },
      { id: "compradores", label: "Performance Compradores", icon: Award, href: "/buyer-performance", keywords: ["buyers", "equipe"], group: "Navegação" },
      { id: "aprovacoes", label: "Aprovações", icon: ClipboardCheck, href: "/aprovacoes", badge: { text: "4", variant: "secondary" as const }, keywords: ["pendentes", "workflow"], group: "Navegação" },
      { id: "auditoria", label: "Auditoria", icon: History, href: "/auditoria", keywords: ["logs", "trilha"], group: "Navegação" },
      { id: "seguranca", label: "Segurança", icon: Shield, href: "/seguranca", keywords: ["mfa", "senhas"], group: "Navegação" },
    ];
    return items.map(item => ({
      ...item,
      normalizedLabel: normalizeText(item.label),
      normalizedKeywords: item.keywords?.map(k => normalizeText(k)),
    }));
  }, []);

  // Quick actions with normalized text
  const actionItems: CommandItemType[] = React.useMemo(() => [
    { id: "nova-solicitacao", label: "Nova Solicitação", icon: Plus, action: () => navigate("/solicitacoes"), shortcut: "⌘N", keywords: ["criar", "adicionar"], group: "Ações Rápidas" },
    { id: "novo-fornecedor", label: "Cadastrar Fornecedor", icon: Factory, action: () => navigate("/fornecedores"), keywords: ["novo", "adicionar"], group: "Ações Rápidas" },
    { id: "exportar", label: "Exportar Dados", icon: Download, action: () => {}, keywords: ["download", "excel"], group: "Ações Rápidas" },
    { id: "importar", label: "Importar Dados", icon: FileUp, action: () => {}, keywords: ["upload", "csv"], group: "Ações Rápidas" },
    { id: "atualizar", label: "Atualizar Dados", icon: RefreshCw, action: () => window.location.reload(), shortcut: "⌘⇧R", keywords: ["refresh", "recarregar"], group: "Ações Rápidas" },
  ].map(item => ({
    ...item,
    normalizedLabel: normalizeText(item.label),
    normalizedKeywords: item.keywords?.map(k => normalizeText(k)),
  })), [navigate]);

  // Settings items with normalized text
  const currentTheme = mounted ? theme : "system";
  const settingsItems: CommandItemType[] = React.useMemo(() => [
    { 
      id: "theme", 
      label: currentTheme === "dark" ? "Modo Claro" : "Modo Escuro", 
      icon: currentTheme === "dark" ? Sun : Moon, 
      action: () => setTheme(currentTheme === "dark" ? "light" : "dark"), 
      shortcut: "⌘T",
      keywords: ["tema", "aparência"],
      group: "Configurações"
    },
    { id: "notificacoes", label: "Notificações", icon: Bell, action: () => {}, keywords: ["alertas", "avisos"], group: "Configurações" },
    { id: "perfil", label: "Meu Perfil", icon: User, action: () => {}, keywords: ["conta", "usuário"], group: "Configurações" },
    { id: "ajuda", label: "Ajuda & Suporte", icon: HelpCircle, action: () => {}, shortcut: "⌘?", keywords: ["help", "faq"], group: "Configurações" },
    { id: "sair", label: "Sair", icon: LogOut, action: () => navigate("/auth"), shortcut: "⌘⇧Q", keywords: ["logout", "desconectar"], group: "Configurações" },
  ].map(item => ({
    ...item,
    normalizedLabel: normalizeText(item.label),
    normalizedKeywords: item.keywords?.map(k => normalizeText(k)),
  })), [currentTheme, mounted, navigate, setTheme]);

  const allItems = React.useMemo(() => 
    [...navigationItems, ...actionItems, ...settingsItems],
    [navigationItems, actionItems, settingsItems]
  );

  // Create Fuse instance
  const fuse = React.useMemo(() => new Fuse(allItems, fuseOptions), [allItems]);

  // Fuzzy filtered items
  const fuzzyFilteredItems = React.useMemo(() => {
    if (!search.trim()) return allItems;
    
    const normalizedSearch = normalizeText(search);
    const results = fuse.search(search);
    const normalizedResults = fuse.search(normalizedSearch);
    
    const seen = new Set<string>();
    const merged: CommandItemType[] = [];
    [...results, ...normalizedResults].forEach(r => {
      if (!seen.has(r.item.id)) {
        seen.add(r.item.id);
        merged.push(r.item);
      }
    });
    
    return merged;
  }, [search, fuse, allItems]);

  const handleSelect = (item: CommandItemType) => {
    onOpenChange(false);
    setSearch("");
    saveToRecent(item.id);
    if (item.href) {
      navigate(item.href);
    } else if (item.action) {
      item.action();
    }
  };

  const recentItems = React.useMemo(() => {
    return recentIds
      .map(id => allItems.find(item => item.id === id))
      .filter((item): item is CommandItemType => !!item);
  }, [recentIds, allItems]);

  // Group filtered items
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, CommandItemType[]> = {};
    fuzzyFilteredItems.forEach(item => {
      if (!groups[item.group]) {
        groups[item.group] = [];
      }
      groups[item.group].push(item);
    });
    return groups;
  }, [fuzzyFilteredItems]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command className="rounded-lg border shadow-2xl" loop>
        <div className="flex items-center border-b px-3 gap-2">
          <Zap className="h-4 w-4 text-primary shrink-0" />
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
        <CommandList className="max-h-[400px]">
          <CommandEmpty className="py-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Search className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Nenhum resultado para "{search}"
              </p>
              <p className="text-xs text-muted-foreground/70">
                Tente buscar por páginas, ações ou configurações
              </p>
            </div>
          </CommandEmpty>
          {search === "" && recentItems.length > 0 && (
            <>
              <CommandGroup heading="Recentemente Usados">
                {recentItems.map((item) => (
                  <CommandItem
                    key={`recent-${item.id}`}
                    value={`${item.label} ${item.keywords?.join(" ") || ""}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors rounded-lg mx-1 my-0.5"
                  >
                    <div className="p-1.5 rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <History className="h-4 w-4" />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-semibold">{item.label}</span>
                      <div className="flex items-center gap-2">
                        {item.shortcut && (
                          <CommandShortcut className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">
                            {item.shortcut}
                          </CommandShortcut>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {Object.entries(groupedItems).map(([group, items], groupIndex) => (
            <React.Fragment key={group}>
              {groupIndex > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.keywords?.join(" ") || ""}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                  >
                    <div className={`
                      p-1.5 rounded-md 
                      ${item.group === "Ações Rápidas" ? "bg-primary/10 text-primary" : 
                        item.group === "Configurações" ? "bg-muted text-muted-foreground" :
                        "bg-accent text-accent-foreground"}
                    `}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium">{item.label}</span>
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
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>

        {/* Footer */}
        <div className="border-t px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↵</kbd>
              selecionar
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">⌘K</kbd>
            abrir
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}

// Hook for keyboard shortcut
export function useCommandPalette() {
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

export default CommandPalette;
