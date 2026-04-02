import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import {
  Search,
  X,
  Clock,
  TrendingUp,
  Filter,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Command,
  Hash,
  Calendar,
  DollarSign,
  Building2,
  FileText,
  ShoppingCart,
  CreditCard,
  FileSignature,
  LayoutDashboard,
  Users,
  Settings,
  Loader2,
  Star,
  Zap,
  AlertCircle,
} from "lucide-react";
import { 
  Dialog, 
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VisuallyHidden } from "@/components/accessibility/VisuallyHidden";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useRecentlyViewed, type RecentItem } from "@/hooks/useRecentlyViewed";
import { usePersistentFilters } from "@/hooks/usePersistentFilters";
import { normalizeText } from "@/hooks/useFuseSearch";

// Types
interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: SearchCategory;
  icon: React.ElementType;
  href: string;
  metadata?: {
    status?: string;
    value?: number;
    date?: string;
    priority?: string;
  };
  score?: number;
  matchedText?: { key: string; indices: [number, number][] }[];
}

type SearchCategory = 'all' | 'pages' | 'solicitacoes' | 'pedidos' | 'fornecedores' | 'pagamentos' | 'contratos';

interface SearchFilter {
  status?: string[];
  dateRange?: { start: string; end: string };
  valueRange?: { min: number; max: number };
  priority?: string[];
}

// Fuse.js configuration for fuzzy search
const fuseOptions = {
  isCaseSensitive: false,
  includeScore: true,
  includeMatches: true,
  shouldSort: true,
  threshold: 0.4,
  location: 0,
  distance: 100,
  minMatchCharLength: 2,
  useExtendedSearch: true,
  keys: [
    { name: 'title', weight: 2.0 },
    { name: 'subtitle', weight: 1.5 },
    { name: 'normalizedTitle', weight: 1.8 },
    { name: 'normalizedSubtitle', weight: 1.3 },
  ],
};

// Category configuration
const categoryConfig: Record<SearchCategory, { label: string; icon: React.ElementType; color: string }> = {
  all: { label: 'Todos', icon: Search, color: 'text-foreground' },
  pages: { label: 'Páginas', icon: LayoutDashboard, color: 'text-primary' },
  solicitacoes: { label: 'Solicitações', icon: FileText, color: 'text-amber-500' },
  pedidos: { label: 'Pedidos', icon: ShoppingCart, color: 'text-green-500' },
  fornecedores: { label: 'Fornecedores', icon: Building2, color: 'text-blue-500' },
  pagamentos: { label: 'Pagamentos', icon: CreditCard, color: 'text-orange-500' },
  contratos: { label: 'Contratos', icon: FileSignature, color: 'text-purple-500' },
};

// Navigation pages with normalized text for fuzzy search
const navigationPages: (SearchResult & { normalizedTitle: string; normalizedSubtitle: string })[] = [
  { id: "dashboard", title: "Dashboard", subtitle: "Visão geral do sistema", type: "pages", icon: LayoutDashboard, href: "/compras", normalizedTitle: normalizeText("Dashboard"), normalizedSubtitle: normalizeText("Visão geral do sistema") },
  { id: "solicitacoes", title: "Solicitações", subtitle: "Lista de solicitações de compra", type: "pages", icon: FileText, href: "/solicitacoes", normalizedTitle: normalizeText("Solicitações"), normalizedSubtitle: normalizeText("Lista de solicitações de compra") },
  { id: "cotacoes", title: "Cotações", subtitle: "Gerenciar cotações", type: "pages", icon: Search, href: "/cotacao", normalizedTitle: normalizeText("Cotações"), normalizedSubtitle: normalizeText("Gerenciar cotações") },
  { id: "pedidos", title: "Pedidos", subtitle: "Ordens de compra", type: "pages", icon: ShoppingCart, href: "/pedidos", normalizedTitle: normalizeText("Pedidos"), normalizedSubtitle: normalizeText("Ordens de compra") },
  { id: "pagamentos", title: "Pagamentos", subtitle: "Gestão financeira", type: "pages", icon: CreditCard, href: "/pagamentos", normalizedTitle: normalizeText("Pagamentos"), normalizedSubtitle: normalizeText("Gestão financeira") },
  { id: "fornecedores", title: "Fornecedores", subtitle: "Cadastro de fornecedores", type: "pages", icon: Building2, href: "/fornecedores", normalizedTitle: normalizeText("Fornecedores"), normalizedSubtitle: normalizeText("Cadastro de fornecedores") },
  { id: "contratos", title: "Contratos", subtitle: "Gestão de contratos", type: "pages", icon: FileSignature, href: "/contratos", normalizedTitle: normalizeText("Contratos"), normalizedSubtitle: normalizeText("Gestão de contratos") },
  { id: "relatorios", title: "Relatórios", subtitle: "Analytics e métricas", type: "pages", icon: TrendingUp, href: "/relatorios", normalizedTitle: normalizeText("Relatórios"), normalizedSubtitle: normalizeText("Analytics e métricas") },
  { id: "seguranca", title: "Segurança", subtitle: "Configurações de segurança", type: "pages", icon: Settings, href: "/seguranca", normalizedTitle: normalizeText("Segurança"), normalizedSubtitle: normalizeText("Configurações de segurança") },
];

// Highlight matched text component
const HighlightedText = React.memo(({ 
  text, 
  matches, 
  targetKey 
}: { 
  text: string; 
  matches?: { key: string; indices: [number, number][] }[];
  targetKey: string;
}) => {
  if (!matches || !text) {
    return <>{text}</>;
  }

  // Find match for this key (including normalized versions)
  const relevantMatch = matches.find(m => 
    m.key === targetKey || 
    m.key === `normalized${targetKey.charAt(0).toUpperCase() + targetKey.slice(1)}`
  );

  if (!relevantMatch || !relevantMatch.indices.length) {
    return <>{text}</>;
  }

  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  // Sort indices by start position
  const sortedIndices = [...relevantMatch.indices].sort((a, b) => a[0] - b[0]);

  sortedIndices.forEach(([start, end], i) => {
    // Ensure indices are within text bounds
    const safeStart = Math.min(start, text.length);
    const safeEnd = Math.min(end + 1, text.length);
    
    // Add non-matched text before this match
    if (safeStart > lastIndex) {
      result.push(<span key={`text-${i}`}>{text.slice(lastIndex, safeStart)}</span>);
    }
    // Add matched text with highlight
    if (safeStart < safeEnd) {
      result.push(
        <mark 
          key={`match-${i}`} 
          className="bg-primary/25 text-primary font-semibold rounded-sm px-0.5 mx-px"
        >
          {text.slice(safeStart, safeEnd)}
        </mark>
      );
    }
    lastIndex = safeEnd;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(<span key="remaining">{text.slice(lastIndex)}</span>);
  }

  return <>{result}</>;
});

// Natural language intent parser
interface NLIntent {
  category: SearchCategory;
  statusFilter?: string;
  description: string;
  redirectPath?: string;
}

function parseNaturalLanguageIntent(query: string): NLIntent | null {
  const q = query.toLowerCase().trim();

  const patterns: { test: RegExp; result: NLIntent }[] = [
    { test: /pedidos?\s+(atrasad|pendente|em.atraso)/i, result: { category: 'pedidos', statusFilter: 'pendente', description: 'Pedidos atrasados/pendentes', redirectPath: '/pedidos?status=pendente' } },
    { test: /pedidos?\s+entreg/i, result: { category: 'pedidos', statusFilter: 'entregue', description: 'Pedidos entregues', redirectPath: '/pedidos?status=entregue' } },
    { test: /pagamentos?\s+(pendente|atrasad|vencid)/i, result: { category: 'pagamentos', statusFilter: 'pendente', description: 'Pagamentos pendentes', redirectPath: '/pagamentos?status=pendente' } },
    { test: /pagamentos?\s+pag[oa]/i, result: { category: 'pagamentos', statusFilter: 'pago', description: 'Pagamentos realizados', redirectPath: '/pagamentos?status=pago' } },
    { test: /fornecedor.*(melhor|top|rank)/i, result: { category: 'fornecedores', description: 'Ranking de fornecedores', redirectPath: '/supplier-performance' } },
    { test: /solicit.*(urgent|alta.priorid)/i, result: { category: 'solicitacoes', statusFilter: 'urgente', description: 'Solicitações urgentes', redirectPath: '/solicitacoes?prioridade=urgente' } },
    { test: /cotac.*(pendente|aberta)/i, result: { category: 'all', description: 'Cotações pendentes', redirectPath: '/cotacao?status=pendente' } },
    { test: /contrat.*(venc|expir)/i, result: { category: 'contratos', description: 'Contratos vencendo', redirectPath: '/contratos?status=expiring' } },
    { test: /relat[oó]rio|dashboard|resumo/i, result: { category: 'pages', description: 'Relatórios e dashboards', redirectPath: '/relatorios' } },
    { test: /aprovaç|aprovac|aprovar/i, result: { category: 'pages', description: 'Aprovações pendentes', redirectPath: '/aprovacoes' } },
    { test: /cat[aá]logo|produto/i, result: { category: 'pages', description: 'Catálogo de produtos', redirectPath: '/catalogo-produtos' } },
  ];

  for (const { test, result } of patterns) {
    if (test.test(q)) return result;
  }
  return null;
}

// Quick actions
const quickActions = [
  { id: 'nova-solicitacao', label: 'Nova Solicitação', icon: FileText, action: '/solicitacoes?action=new' },
  { id: 'novo-fornecedor', label: 'Novo Fornecedor', icon: Building2, action: '/fornecedores?action=new' },
  { id: 'novo-contrato', label: 'Novo Contrato', icon: FileSignature, action: '/contratos?action=new' },
];

// Search history storage key
const SEARCH_HISTORY_KEY = 'advanced_search_history';
const MAX_HISTORY_ITEMS = 10;

// Custom debounce hook if not available
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function AdvancedSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { addRecentItem, getMostRecent } = useRecentlyViewed();
  
  const debouncedQuery = useDebounceValue(query, 200);

  // Load search history
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        setSearchHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load search history');
    }
  }, []);

  // Save to search history
  const saveToHistory = useCallback((term: string) => {
    if (!term.trim()) return;
    
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Clear search history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  }, []);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setActiveCategory('all');
      setSelectedIndex(0);
    }
  }, [open]);

  // Search function with Fuse.js fuzzy search
  const performSearch = useCallback(async (searchQuery: string, category: SearchCategory) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const normalizedQuery = normalizeText(searchQuery);
    const allResults: SearchResult[] = [];

    try {
      // Search pages with Fuse.js
      if (category === 'all' || category === 'pages') {
        const pageFuse = new Fuse(navigationPages, fuseOptions);
        const pageResults = pageFuse.search(searchQuery);
        
        // Also search with normalized query for accent-insensitive search
        const normalizedPageResults = pageFuse.search(normalizedQuery);
        
        // Merge results, removing duplicates
        const seenIds = new Set<string>();
        const mergedPageResults = [...pageResults, ...normalizedPageResults]
          .filter(r => {
            if (seenIds.has(r.item.id)) return false;
            seenIds.add(r.item.id);
            return true;
          })
          .map(r => ({
            ...r.item,
            score: (1 - (r.score || 0)) * 100,
            matchedText: r.matches?.map(m => ({
              key: m.key || '',
              indices: m.indices as [number, number][],
            })),
          }));
        
        allResults.push(...mergedPageResults);
      }

      // Search solicitações from database
      if (category === 'all' || category === 'solicitacoes') {
        const { data: solicitacoes } = await supabase
          .from('solicitacoes')
          .select('id, numero, titulo, status, prioridade, valor_estimado, created_at, descricao')
          .or(`titulo.ilike.%${searchQuery}%,numero.ilike.%${searchQuery}%,descricao.ilike.%${searchQuery}%`)
          .limit(20);

        if (solicitacoes && solicitacoes.length > 0) {
          // Apply Fuse.js for fuzzy matching on results
          const solicitacoesItems = solicitacoes.map(s => ({
            id: s.id,
            title: s.titulo,
            subtitle: `${s.numero} • ${s.status}`,
            normalizedTitle: normalizeText(s.titulo),
            normalizedSubtitle: normalizeText(`${s.numero} ${s.status}`),
            type: 'solicitacoes' as SearchCategory,
            icon: FileText,
            href: `/solicitacoes?id=${s.id}`,
            metadata: {
              status: s.status,
              value: s.valor_estimado,
              priority: s.prioridade,
            },
          }));

          const solFuse = new Fuse(solicitacoesItems, fuseOptions);
          const fuzzyResults = solFuse.search(searchQuery);
          const normalizedFuzzyResults = solFuse.search(normalizedQuery);
          
          const seenIds = new Set<string>();
          [...fuzzyResults, ...normalizedFuzzyResults].forEach(r => {
            if (!seenIds.has(r.item.id)) {
              seenIds.add(r.item.id);
              allResults.push({
                ...r.item,
                score: (1 - (r.score || 0)) * 90,
                matchedText: r.matches?.map(m => ({
                  key: m.key || '',
                  indices: m.indices as [number, number][],
                })),
              });
            }
          });

          // Add items not matched by Fuse (from DB search) with lower score
          solicitacoesItems.forEach(item => {
            if (!seenIds.has(item.id)) {
              allResults.push({ ...item, score: 30 });
            }
          });
        }
      }

      // Search pedidos from database
      if (category === 'all' || category === 'pedidos') {
        const { data: pedidos } = await supabase
          .from('pedidos')
          .select('id, numero, status, valor_total, created_at, fornecedor:fornecedores(razao_social)')
          .or(`numero.ilike.%${searchQuery}%`)
          .limit(20);

        if (pedidos && pedidos.length > 0) {
          const pedidosItems = pedidos.map(p => {
            const fornecedorData = p.fornecedor as { razao_social: string } | null;
            return {
            id: p.id,
            title: `Pedido ${p.numero}`,
            subtitle: `${fornecedorData?.razao_social || 'Fornecedor'} • ${p.status}`,
            normalizedTitle: normalizeText(`Pedido ${p.numero}`),
            normalizedSubtitle: normalizeText(`${fornecedorData?.razao_social || ''} ${p.status}`),
            type: 'pedidos' as SearchCategory,
            icon: ShoppingCart,
            href: `/pedidos?id=${p.id}`,
            metadata: {
              status: p.status,
              value: p.valor_total,
            },
            };
          });


          const pedFuse = new Fuse(pedidosItems, fuseOptions);
          const fuzzyResults = pedFuse.search(searchQuery);
          const normalizedFuzzyResults = pedFuse.search(normalizedQuery);
          
          const seenIds = new Set<string>();
          [...fuzzyResults, ...normalizedFuzzyResults].forEach(r => {
            if (!seenIds.has(r.item.id)) {
              seenIds.add(r.item.id);
              allResults.push({
                ...r.item,
                score: (1 - (r.score || 0)) * 85,
                matchedText: r.matches?.map(m => ({
                  key: m.key || '',
                  indices: m.indices as [number, number][],
                })),
              });
            }
          });

          pedidosItems.forEach(item => {
            if (!seenIds.has(item.id)) {
              allResults.push({ ...item, score: 25 });
            }
          });
        }
      }

      // Search fornecedores from database
      if (category === 'all' || category === 'fornecedores') {
        const { data: fornecedores } = await supabase
          .from('fornecedores')
          .select('id, razao_social, nome_fantasia, cnpj, status, segmento')
          .or(`razao_social.ilike.%${searchQuery}%,nome_fantasia.ilike.%${searchQuery}%,cnpj.ilike.%${searchQuery}%`)
          .limit(20);

        if (fornecedores && fornecedores.length > 0) {
          const fornecedoresItems = fornecedores.map(f => ({
            id: f.id,
            title: f.nome_fantasia || f.razao_social,
            subtitle: `CNPJ: ${f.cnpj || 'N/A'} • ${f.segmento || 'Geral'}`,
            normalizedTitle: normalizeText(f.nome_fantasia || f.razao_social),
            normalizedSubtitle: normalizeText(`${f.cnpj || ''} ${f.segmento || ''}`),
            type: 'fornecedores' as SearchCategory,
            icon: Building2,
            href: `/fornecedores?id=${f.id}`,
            metadata: {
              status: f.status,
            },
          }));

          const fornFuse = new Fuse(fornecedoresItems, fuseOptions);
          const fuzzyResults = fornFuse.search(searchQuery);
          const normalizedFuzzyResults = fornFuse.search(normalizedQuery);
          
          const seenIds = new Set<string>();
          [...fuzzyResults, ...normalizedFuzzyResults].forEach(r => {
            if (!seenIds.has(r.item.id)) {
              seenIds.add(r.item.id);
              allResults.push({
                ...r.item,
                score: (1 - (r.score || 0)) * 88,
                matchedText: r.matches?.map(m => ({
                  key: m.key || '',
                  indices: m.indices as [number, number][],
                })),
              });
            }
          });

          fornecedoresItems.forEach(item => {
            if (!seenIds.has(item.id)) {
              allResults.push({ ...item, score: 28 });
            }
          });
        }
      }

      // Search pagamentos from database
      if (category === 'all' || category === 'pagamentos') {
        const { data: pagamentos } = await supabase
          .from('pagamentos')
          .select('id, numero, status, valor, data_vencimento, fornecedor:fornecedores(razao_social)')
          .or(`numero.ilike.%${searchQuery}%`)
          .limit(20);

        if (pagamentos && pagamentos.length > 0) {
          const pagamentosItems = pagamentos.map(p => {
            const fornecedorData = p.fornecedor as { razao_social: string } | null;
            return {
            id: p.id,
            title: `Pagamento ${p.numero}`,
            subtitle: `${fornecedorData?.razao_social || 'Fornecedor'} • R$ ${p.valor?.toLocaleString('pt-BR')}`,
            normalizedTitle: normalizeText(`Pagamento ${p.numero}`),
            normalizedSubtitle: normalizeText(`${fornecedorData?.razao_social || ''}`),
            type: 'pagamentos' as SearchCategory,
            icon: CreditCard,
            href: `/pagamentos?id=${p.id}`,
            metadata: {
              status: p.status,
              value: p.valor,
              date: p.data_vencimento,
            },
            };
          });

          const pagFuse = new Fuse(pagamentosItems, fuseOptions);
          const fuzzyResults = pagFuse.search(searchQuery);
          const normalizedFuzzyResults = pagFuse.search(normalizedQuery);
          
          const seenIds = new Set<string>();
          [...fuzzyResults, ...normalizedFuzzyResults].forEach(r => {
            if (!seenIds.has(r.item.id)) {
              seenIds.add(r.item.id);
              allResults.push({
                ...r.item,
                score: (1 - (r.score || 0)) * 82,
                matchedText: r.matches?.map(m => ({
                  key: m.key || '',
                  indices: m.indices as [number, number][],
                })),
              });
            }
          });

          pagamentosItems.forEach(item => {
            if (!seenIds.has(item.id)) {
              allResults.push({ ...item, score: 22 });
            }
          });
        }
      }

      // Search contratos from database
      if (category === 'all' || category === 'contratos') {
        const { data: contratos } = await supabase
          .from('contracts')
          .select('id, contract_number, title, supplier_name, status, total_value')
          .or(`title.ilike.%${searchQuery}%,contract_number.ilike.%${searchQuery}%,supplier_name.ilike.%${searchQuery}%`)
          .limit(20);

        if (contratos && contratos.length > 0) {
          const contratosItems = contratos.map(c => ({
            id: c.id,
            title: c.title,
            subtitle: `${c.contract_number} • ${c.supplier_name}`,
            normalizedTitle: normalizeText(c.title),
            normalizedSubtitle: normalizeText(`${c.contract_number} ${c.supplier_name}`),
            type: 'contratos' as SearchCategory,
            icon: FileSignature,
            href: `/contratos?id=${c.id}`,
            metadata: {
              status: c.status,
              value: c.total_value,
            },
          }));

          const contFuse = new Fuse(contratosItems, fuseOptions);
          const fuzzyResults = contFuse.search(searchQuery);
          const normalizedFuzzyResults = contFuse.search(normalizedQuery);
          
          const seenIds = new Set<string>();
          [...fuzzyResults, ...normalizedFuzzyResults].forEach(r => {
            if (!seenIds.has(r.item.id)) {
              seenIds.add(r.item.id);
              allResults.push({
                ...r.item,
                score: (1 - (r.score || 0)) * 86,
                matchedText: r.matches?.map(m => ({
                  key: m.key || '',
                  indices: m.indices as [number, number][],
                })),
              });
            }
          });

          contratosItems.forEach(item => {
            if (!seenIds.has(item.id)) {
              allResults.push({ ...item, score: 26 });
            }
          });
        }
      }

      // Sort by score (highest first)
      allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger search on debounced query change
  useEffect(() => {
    performSearch(debouncedQuery, activeCategory);
  }, [debouncedQuery, activeCategory, performSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = results.length + (query ? 0 : searchHistory.length);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, totalItems));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalItems) % Math.max(1, totalItems));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        } else if (!query && searchHistory[selectedIndex]) {
          setQuery(searchHistory[selectedIndex]);
        }
        break;
      case 'Tab':
        e.preventDefault();
        const categories: SearchCategory[] = ['all', 'pages', 'solicitacoes', 'pedidos', 'fornecedores', 'pagamentos', 'contratos'];
        const currentIdx = categories.indexOf(activeCategory);
        const nextIdx = e.shiftKey 
          ? (currentIdx - 1 + categories.length) % categories.length
          : (currentIdx + 1) % categories.length;
        setActiveCategory(categories[nextIdx]);
        break;
    }
  }, [results, selectedIndex, query, searchHistory, activeCategory]);

  // Handle result selection
  const handleSelect = useCallback((result: SearchResult) => {
    saveToHistory(query);
    const typeMap: Record<string, RecentItem['type']> = {
      pages: 'page', solicitacoes: 'solicitacao', pedidos: 'pedido',
      fornecedores: 'fornecedor', pagamentos: 'pagamento', contratos: 'contrato',
    };
    addRecentItem({
      id: result.id,
      type: typeMap[result.type] || 'page',
      title: result.title,
      subtitle: result.subtitle,
      url: result.href,
    });
    setOpen(false);
    navigate(result.href);
  }, [query, saveToHistory, addRecentItem, navigate]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach(result => {
      if (!groups[result.type]) {
        groups[result.type] = [];
      }
      groups[result.type].push(result);
    });
    return groups;
  }, [results]);

  // Status badge color
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'aprovado':
      case 'ativo':
      case 'pago':
      case 'entregue':
        return 'bg-success/10 text-success';
      case 'pendente':
      case 'aguardando':
        return 'bg-warning/10 text-warning';
      case 'rejeitado':
      case 'cancelado':
      case 'atrasado':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "group flex items-center gap-2 px-3 py-2 text-sm",
          "bg-muted/50 hover:bg-muted dark:bg-muted/30 dark:hover:bg-muted/50",
          "rounded-xl border border-border/50 hover:border-border",
          "transition-all duration-200",
          "w-full md:w-64 lg:w-80"
        )}
      >
        <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="text-muted-foreground group-hover:text-foreground transition-colors flex-1 text-left truncate">
          Busca avançada...
        </span>
        <kbd className={cn(
          "hidden md:inline-flex items-center gap-1 px-2 py-0.5",
          "text-[10px] font-mono font-medium",
          "bg-background rounded border border-border",
          "text-muted-foreground"
        )}>
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Busca Avançada</DialogTitle>
            <DialogDescription>Pesquise em toda a aplicação</DialogDescription>
          </VisuallyHidden>
          
          {/* Search Header */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pesquisar solicitações, pedidos, fornecedores..."
                className={cn(
                  "pl-10 pr-10 h-12 text-base",
                  "bg-muted/30 border-transparent focus:border-primary",
                  "rounded-xl"
                )}
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setQuery("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              {isLoading && (
                <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              )}
            </div>

            {/* Category Tabs */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              {(Object.keys(categoryConfig) as SearchCategory[]).map((cat) => {
                const config = categoryConfig[cat];
                const Icon = config.icon;
                const isActive = activeCategory === cat;
                const count = cat === 'all' 
                  ? results.length 
                  : groupedResults[cat]?.length || 0;

                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium",
                      "transition-all duration-200 whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {config.label}
                    {query && count > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.5 text-[10px] rounded-full",
                        isActive ? "bg-primary-foreground/20" : "bg-background"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results */}
          <ScrollArea className="max-h-[60vh]">
            <div className="p-2">
              {/* Empty state - show history and quick actions */}
              {!query && (
                <div className="space-y-4">
                  {/* Recent searches */}
                  {searchHistory.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between px-2 mb-2">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Buscas recentes
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearHistory}
                          className="h-6 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Limpar
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {searchHistory.slice(0, 5).map((term, idx) => (
                          <motion.button
                            key={term}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => setQuery(term)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left",
                              "hover:bg-muted transition-colors",
                              selectedIndex === idx && !query && "bg-muted"
                            )}
                          >
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="flex-1 text-sm">{term}</span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick actions */}
                  <div>
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 px-2 mb-2">
                      <Zap className="w-3.5 h-3.5" />
                      Ações rápidas
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {quickActions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => {
                            setOpen(false);
                            navigate(action.action);
                          }}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-xl",
                            "bg-muted/50 hover:bg-muted border border-transparent hover:border-border",
                            "transition-all duration-200"
                          )}
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <action.icon className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-xs font-medium text-center">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recently viewed */}
                  {getMostRecent(3).length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 px-2 mb-2">
                        <Star className="w-3.5 h-3.5" />
                        Visualizados recentemente
                      </span>
                      <div className="space-y-1">
                        {getMostRecent(3).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setOpen(false);
                              navigate(item.url);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.title}</p>
                              {item.subtitle && (
                                <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Search results */}
              {query && (
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-12"
                    >
                      <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                      <p className="text-sm text-muted-foreground">Buscando...</p>
                    </motion.div>
                  ) : results.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center justify-center py-12"
                    >
                      {(() => {
                        const nlIntent = parseNaturalLanguageIntent(query);
                        if (nlIntent?.redirectPath) {
                          return (
                            <button
                              onClick={() => { setOpen(false); navigate(nlIntent.redirectPath!); }}
                              className="w-full max-w-xs flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left mb-4"
                            >
                              <Sparkles className="w-5 h-5 text-primary shrink-0" />
                              <div>
                                <p className="text-sm font-medium">{nlIntent.description}</p>
                                <p className="text-xs text-muted-foreground">Clique para navegar</p>
                              </div>
                            </button>
                          );
                        }
                        return null;
                      })()}
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium mb-1">Nenhum resultado encontrado</p>
                      <p className="text-xs text-muted-foreground text-center max-w-[240px]">
                        Tente buscar por outro termo ou use linguagem natural como &quot;pedidos atrasados&quot;
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {/* Natural language intent suggestion */}
                      {(() => {
                        const nlIntent = parseNaturalLanguageIntent(query);
                        if (!nlIntent?.redirectPath) return null;
                        return (
                          <motion.button
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => {
                              setOpen(false);
                              navigate(nlIntent.redirectPath!);
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
                          >
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{nlIntent.description}</p>
                              <p className="text-xs text-muted-foreground">Ir diretamente para a página filtrada</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </motion.button>
                        );
                      })()}
                      {Object.entries(groupedResults).map(([type, items]) => {
                        const config = categoryConfig[type as SearchCategory];
                        if (!config || items.length === 0) return null;

                        return (
                          <div key={type}>
                            <div className="flex items-center gap-2 px-2 mb-2">
                              <config.icon className={cn("w-4 h-4", config.color)} />
                              <span className="text-xs font-medium text-muted-foreground">
                                {config.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({items.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {items.map((result, idx) => {
                                const globalIdx = results.indexOf(result);
                                const Icon = result.icon;

                                return (
                                  <motion.button
                                    key={result.id}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    onClick={() => handleSelect(result)}
                                    className={cn(
                                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left",
                                      "transition-all duration-150",
                                      selectedIndex === globalIdx
                                        ? "bg-primary/10 border border-primary/30"
                                        : "hover:bg-muted border border-transparent"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                      type === 'pages' && "bg-primary/10",
                                      type === 'solicitacoes' && "bg-amber-500/10",
                                      type === 'pedidos' && "bg-green-500/10",
                                      type === 'fornecedores' && "bg-blue-500/10",
                                      type === 'pagamentos' && "bg-orange-500/10",
                                      type === 'contratos' && "bg-purple-500/10",
                                    )}>
                                      <Icon className={cn("w-5 h-5", config.color)} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        <HighlightedText 
                                          text={result.title} 
                                          matches={result.matchedText} 
                                          targetKey="title" 
                                        />
                                      </p>
                                      {result.subtitle && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          <HighlightedText 
                                            text={result.subtitle} 
                                            matches={result.matchedText} 
                                            targetKey="subtitle" 
                                          />
                                        </p>
                                      )}
                                    </div>
                                    {result.metadata?.status && (
                                      <Badge 
                                        variant="secondary"
                                        className={cn("text-[10px] h-5", getStatusColor(result.metadata.status))}
                                      >
                                        {result.metadata.status}
                                      </Badge>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">↑↓</kbd>
                  navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">↵</kbd>
                  selecionar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">Tab</kbd>
                  categoria
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">Esc</kbd>
                fechar
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AdvancedSearch;
