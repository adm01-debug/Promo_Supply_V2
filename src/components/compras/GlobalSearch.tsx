import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
  ClipboardCheck,
  Users,
  TrendingUp,
  FileSignature,
  ShoppingCart,
  PiggyBank,
  Award,
} from "lucide-react";
import { solicitacoesMock, fornecedoresMock } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: "page" | "solicitacao" | "fornecedor" | "pedido" | "contrato";
  icon: any;
  href: string;
}

// Navigation pages
const navigationPages: SearchResult[] = [
  { id: "dashboard", title: "Dashboard", subtitle: "Visão geral do sistema", type: "page", icon: LayoutDashboard, href: "/" },
  { id: "solicitacoes", title: "Solicitações", subtitle: "Lista de solicitações de compra", type: "page", icon: ClipboardList, href: "/solicitacoes" },
  { id: "cotacoes", title: "Cotações", subtitle: "Gerenciar cotações", type: "page", icon: Search, href: "/cotacao" },
  { id: "pedidos", title: "Pedidos", subtitle: "Ordens de compra", type: "page", icon: FileText, href: "/pedidos" },
  { id: "acompanhamento", title: "Acompanhamento", subtitle: "Timeline de pedidos", type: "page", icon: Truck, href: "/acompanhamento" },
  { id: "pagamentos", title: "Pagamentos", subtitle: "Gestão financeira", type: "page", icon: CreditCard, href: "/pagamentos" },
  { id: "fornecedores", title: "Fornecedores", subtitle: "Cadastro de fornecedores", type: "page", icon: Factory, href: "/fornecedores" },
  { id: "contratos", title: "Contratos", subtitle: "Gestão de contratos", type: "page", icon: FileSignature, href: "/contratos" },
  { id: "historico", title: "Histórico de Compras", subtitle: "Histórico por produto/fornecedor", type: "page", icon: ShoppingCart, href: "/historico-compras" },
  { id: "performance", title: "Performance Fornecedores", subtitle: "Scorecard e análises", type: "page", icon: Users, href: "/supplier-performance" },
  { id: "executivo", title: "Dashboard Executivo", subtitle: "Visão consolidada", type: "page", icon: TrendingUp, href: "/dashboard-executivo" },
  { id: "relatorios", title: "Relatórios", subtitle: "Analytics e métricas", type: "page", icon: BarChart3, href: "/relatorios" },
  { id: "negociacoes", title: "Negociações", subtitle: "Performance do comprador", type: "page", icon: PiggyBank, href: "/relatorios/negociacoes" },
  { id: "compradores", title: "Dashboard Compradores", subtitle: "Performance individual", type: "page", icon: Award, href: "/buyer-performance" },
  { id: "aprovacoes", title: "Aprovações", subtitle: "Workflow de aprovação", type: "page", icon: ClipboardCheck, href: "/aprovacoes" },
  { id: "auditoria", title: "Auditoria", subtitle: "Trilha de ações", type: "page", icon: History, href: "/auditoria" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contracts, setContracts] = useState<any[]>([]);
  const navigate = useNavigate();

  // Fetch contracts for search
  useEffect(() => {
    const fetchContracts = async () => {
      const { data } = await supabase.from('contracts').select('id, contract_number, title, supplier_name');
      if (data) setContracts(data);
    };
    fetchContracts();
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Filter results based on search
  const filteredPages = useMemo(() => {
    if (!search) return navigationPages;
    const searchLower = search.toLowerCase();
    return navigationPages.filter(
      page => 
        page.title.toLowerCase().includes(searchLower) ||
        page.subtitle.toLowerCase().includes(searchLower)
    );
  }, [search]);

  const filteredSolicitacoes = useMemo(() => {
    if (!search || search.length < 2) return [];
    const searchLower = search.toLowerCase();
    return solicitacoesMock
      .filter(s => 
        s.id.toLowerCase().includes(searchLower) ||
        s.empresa.toLowerCase().includes(searchLower) ||
        s.produto.toLowerCase().includes(searchLower)
      )
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        title: s.produto,
        subtitle: `${s.id} • ${s.empresa}`,
        type: "solicitacao" as const,
        icon: ClipboardList,
        href: `/solicitacoes?search=${s.id}`,
      }));
  }, [search]);

  const filteredFornecedores = useMemo(() => {
    if (!search || search.length < 2) return [];
    const searchLower = search.toLowerCase();
    return fornecedoresMock
      .filter(f => 
        f.nomeFantasia.toLowerCase().includes(searchLower) ||
        f.razaoSocial.toLowerCase().includes(searchLower) ||
        f.cnpj.includes(search)
      )
      .slice(0, 5)
      .map(f => ({
        id: f.id,
        title: f.nomeFantasia,
        subtitle: `CNPJ: ${f.cnpj}`,
        type: "fornecedor" as const,
        icon: Factory,
        href: `/fornecedores?search=${f.nomeFantasia}`,
      }));
  }, [search]);

  const filteredContracts = useMemo(() => {
    if (!search || search.length < 2) return [];
    const searchLower = search.toLowerCase();
    return contracts
      .filter(c => 
        c.title.toLowerCase().includes(searchLower) ||
        c.contract_number.toLowerCase().includes(searchLower) ||
        c.supplier_name.toLowerCase().includes(searchLower)
      )
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        title: c.title,
        subtitle: `${c.contract_number} • ${c.supplier_name}`,
        type: "contrato" as const,
        icon: FileSignature,
        href: `/contratos?search=${c.contract_number}`,
      }));
  }, [search, contracts]);

  const handleSelect = useCallback((result: SearchResult) => {
    setOpen(false);
    setSearch("");
    navigate(result.href);
  }, [navigate]);

  const hasResults = filteredPages.length > 0 || 
    filteredSolicitacoes.length > 0 || 
    filteredFornecedores.length > 0 ||
    filteredContracts.length > 0;

  return (
    <>
      {/* Search trigger button - responsive */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2.5 md:px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg border border-border transition-colors w-full md:w-auto"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="text-xs md:text-sm truncate">Buscar...</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Buscar páginas, solicitações, fornecedores, contratos..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            <div className="py-6 text-center text-sm">
              <Search className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum resultado encontrado.</p>
              <p className="text-xs text-muted-foreground mt-1">Tente outro termo de busca</p>
            </div>
          </CommandEmpty>

          {filteredPages.length > 0 && (
            <CommandGroup heading="Páginas">
              {filteredPages.map((page) => (
                <CommandItem
                  key={page.id}
                  value={`page-${page.id}`}
                  onSelect={() => handleSelect(page)}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <page.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{page.title}</p>
                    <p className="text-xs text-muted-foreground">{page.subtitle}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {filteredSolicitacoes.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Solicitações">
                {filteredSolicitacoes.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`sol-${item.id}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {filteredFornecedores.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Fornecedores">
                {filteredFornecedores.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`forn-${item.id}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {filteredContracts.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Contratos">
                {filteredContracts.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`ctr-${item.id}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
