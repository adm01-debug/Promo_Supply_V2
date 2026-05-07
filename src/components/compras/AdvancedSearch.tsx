import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import { Search, X, Command, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "@/components/accessibility/VisuallyHidden";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useRecentlyViewed, type RecentItem } from "@/hooks/useRecentlyViewed";
import { normalizeText } from "@/hooks/useFuseSearch";
import {
  type SearchResult, type SearchCategory,
  fuseOptions, categoryConfig, navigationPages,
  SEARCH_HISTORY_KEY, MAX_HISTORY_ITEMS,
} from "./search/searchConfig";
import { SearchEmptyState } from "./search/SearchEmptyState";
import { SearchResultsList } from "./search/SearchResultsList";
import { FileText, ShoppingCart, CreditCard, Building2, FileSignature } from "lucide-react";

function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
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

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { addRecentItem, getMostRecent } = useRecentlyViewed();
  const debouncedQuery = useDebounceValue(query, 200);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) setSearchHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const saveToHistory = useCallback((term: string) => {
    if (!term.trim()) return;
    setSearchHistory(prev => {
      const updated = [term, ...prev.filter(h => h.toLowerCase() !== term.toLowerCase())].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(prev => !prev); }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
    else { setQuery(""); setActiveCategory('all'); setSelectedIndex(0); }
  }, [open]);

  const performSearch = useCallback(async (searchQuery: string, category: SearchCategory) => {
    if (!searchQuery.trim() || searchQuery.length < 2) { setResults([]); return; }
    setIsLoading(true);
    const normalizedQuery = normalizeText(searchQuery);
    const allResults: SearchResult[] = [];

    try {
      // Pages search
      if (category === 'all' || category === 'pages') {
        const pageFuse = new Fuse(navigationPages, fuseOptions);
        const seenIds = new Set<string>();
        [...pageFuse.search(searchQuery), ...pageFuse.search(normalizedQuery)]
          .filter(r => !seenIds.has(r.item.id) && seenIds.add(r.item.id))
          .forEach(r => allResults.push({ ...r.item, score: (1 - (r.score || 0)) * 100, matchedText: r.matches?.map(m => ({ key: m.key || '', indices: m.indices as [number, number][] })) }));
      }

      // DB searches
      const searchEntities = async (table: string, cat: SearchCategory, fields: string, orFilter: string, mapFn: (item: any) => SearchResult & { normalizedTitle: string; normalizedSubtitle: string }, weight: number) => {
        if (category !== 'all' && category !== cat) return;
        const { data } = await supabase.from(table as any).select(fields).or(orFilter).limit(20);
        if (!data?.length) return;
        const items = data.map(mapFn);
        const fuse = new Fuse(items, fuseOptions);
        const seenIds = new Set<string>();
        [...fuse.search(searchQuery), ...fuse.search(normalizedQuery)].forEach(r => {
          if (!seenIds.has(r.item.id)) { seenIds.add(r.item.id); allResults.push({ ...r.item, score: (1 - (r.score || 0)) * weight, matchedText: r.matches?.map(m => ({ key: m.key || '', indices: m.indices as [number, number][] })) }); }
        });
        items.forEach(item => { if (!seenIds.has(item.id)) allResults.push({ ...item, score: weight * 0.3 }); });
      };

      await Promise.all([
        searchEntities('solicitacoes', 'solicitacoes', 'id, numero, titulo, status, prioridade, valor_estimado', `titulo.ilike.%${searchQuery}%,numero.ilike.%${searchQuery}%`, (s) => ({ id: s.id, title: s.titulo, subtitle: `${s.numero} • ${s.status}`, normalizedTitle: normalizeText(s.titulo), normalizedSubtitle: normalizeText(`${s.numero} ${s.status}`), type: 'solicitacoes' as SearchCategory, icon: FileText, href: `/solicitacoes?id=${s.id}`, metadata: { status: s.status, value: s.valor_estimado, priority: s.prioridade } }), 90),
        searchEntities('pedidos', 'pedidos', 'id, numero, status, valor_total, fornecedor:fornecedores(razao_social)', `numero.ilike.%${searchQuery}%`, (p) => { const f = p.fornecedor as { razao_social: string } | null; return { id: p.id, title: `Pedido ${p.numero}`, subtitle: `${f?.razao_social || 'Fornecedor'} • ${p.status}`, normalizedTitle: normalizeText(`Pedido ${p.numero}`), normalizedSubtitle: normalizeText(`${f?.razao_social || ''} ${p.status}`), type: 'pedidos' as SearchCategory, icon: ShoppingCart, href: `/pedidos?id=${p.id}`, metadata: { status: p.status, value: p.valor_total } }; }, 85),
        searchEntities('fornecedores', 'fornecedores', 'id, razao_social, nome_fantasia, cnpj, status, segmento', `razao_social.ilike.%${searchQuery}%,nome_fantasia.ilike.%${searchQuery}%,cnpj.ilike.%${searchQuery}%`, (f) => ({ id: f.id, title: f.nome_fantasia || f.razao_social, subtitle: `CNPJ: ${f.cnpj || 'N/A'} • ${f.segmento || 'Geral'}`, normalizedTitle: normalizeText(f.nome_fantasia || f.razao_social), normalizedSubtitle: normalizeText(`${f.cnpj || ''} ${f.segmento || ''}`), type: 'fornecedores' as SearchCategory, icon: Building2, href: `/fornecedores?id=${f.id}`, metadata: { status: f.status } }), 88),
        searchEntities('pagamentos', 'pagamentos', 'id, numero, status, valor, fornecedor:fornecedores(razao_social)', `numero.ilike.%${searchQuery}%`, (p) => { const f = p.fornecedor as { razao_social: string } | null; return { id: p.id, title: `Pagamento ${p.numero}`, subtitle: `${f?.razao_social || 'Fornecedor'} • R$ ${p.valor?.toLocaleString('pt-BR')}`, normalizedTitle: normalizeText(`Pagamento ${p.numero}`), normalizedSubtitle: normalizeText(`${f?.razao_social || ''}`), type: 'pagamentos' as SearchCategory, icon: CreditCard, href: `/pagamentos?id=${p.id}`, metadata: { status: p.status, value: p.valor } }; }, 82),
        searchEntities('contracts', 'contratos', 'id, contract_number, title, supplier_name, status, total_value', `title.ilike.%${searchQuery}%,contract_number.ilike.%${searchQuery}%,supplier_name.ilike.%${searchQuery}%`, (c) => ({ id: c.id, title: c.title, subtitle: `${c.contract_number} • ${c.supplier_name}`, normalizedTitle: normalizeText(c.title), normalizedSubtitle: normalizeText(`${c.contract_number} ${c.supplier_name}`), type: 'contratos' as SearchCategory, icon: FileSignature, href: `/contratos?id=${c.id}`, metadata: { status: c.status, value: c.total_value } }), 86),
      ]);

      allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { performSearch(debouncedQuery, activeCategory); }, [debouncedQuery, activeCategory, performSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = results.length + (query ? 0 : searchHistory.length);
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setSelectedIndex(prev => (prev + 1) % Math.max(1, totalItems)); break;
      case 'ArrowUp': e.preventDefault(); setSelectedIndex(prev => (prev - 1 + totalItems) % Math.max(1, totalItems)); break;
      case 'Enter': e.preventDefault();
        if (results[selectedIndex]) handleSelect(results[selectedIndex]);
        else if (!query && searchHistory[selectedIndex]) setQuery(searchHistory[selectedIndex]);
        break;
      case 'Tab': e.preventDefault();
        const categories: SearchCategory[] = ['all', 'pages', 'solicitacoes', 'pedidos', 'fornecedores', 'pagamentos', 'contratos'];
        const currentIdx = categories.indexOf(activeCategory);
        const nextIdx = e.shiftKey ? (currentIdx - 1 + categories.length) % categories.length : (currentIdx + 1) % categories.length;
        setActiveCategory(categories[nextIdx]);
        break;
    }
  }, [results, selectedIndex, query, searchHistory, activeCategory]);

  const handleSelect = useCallback((result: SearchResult) => {
    saveToHistory(query);
    const typeMap: Record<string, RecentItem['type']> = { pages: 'page', solicitacoes: 'solicitacao', pedidos: 'pedido', fornecedores: 'fornecedor', pagamentos: 'pagamento', contratos: 'contrato' };
    addRecentItem({ id: result.id, type: typeMap[result.type] || 'page', title: result.title, subtitle: result.subtitle, url: result.href });
    setOpen(false);
    navigate(result.href);
  }, [query, saveToHistory, addRecentItem, navigate]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach(r => { if (!groups[r.type]) groups[r.type] = []; groups[r.type].push(r); });
    return groups;
  }, [results]);

  return (
    <>
      <button 
        onClick={() => setOpen(true)} 
        className={cn(
          "group flex items-center gap-2.5 px-4 py-2.5 text-sm", 
          "bg-muted/30 hover:bg-muted/50 dark:bg-muted/10 dark:hover:bg-muted/20", 
          "rounded-2xl border border-border/10 hover:border-primary/20", 
          "transition-all duration-300 shadow-sm hover:shadow-md",
          "w-full md:w-72 lg:w-96"
        )}
      >
        <div className="p-1 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
          <Search className="w-4 h-4" />
        </div>
        <span className="text-muted-foreground group-hover:text-foreground transition-colors flex-1 text-left truncate font-medium">Busca inteligente...</span>
        <div className="hidden md:flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
          <kbd className="px-1.5 py-0.5 text-[10px] font-bold bg-background rounded-md border border-border shadow-sm">⌘</kbd>
          <kbd className="px-1.5 py-0.5 text-[10px] font-bold bg-background rounded-md border border-border shadow-sm">K</kbd>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby="dialog-desc" className="max-w-2xl p-0 gap-0 overflow-hidden">
          <VisuallyHidden><DialogTitle>Busca Avançada</DialogTitle><DialogDescription>Pesquise em toda a aplicação</DialogDescription></VisuallyHidden>

          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Pesquisar solicitações, pedidos, fornecedores..." className={cn("pl-10 pr-10 h-12 text-base", "bg-muted/30 border-transparent focus:border-primary", "rounded-xl")} />
              {query && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setQuery("")}><X className="w-4 h-4" /></Button>}
              {isLoading && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
            </div>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              {(Object.keys(categoryConfig) as SearchCategory[]).map((cat) => {
                const config = categoryConfig[cat];
                const Icon = config.icon;
                const isActive = activeCategory === cat;
                const count = cat === 'all' ? results.length : groupedResults[cat]?.length || 0;
                return (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium", "transition-all duration-200 whitespace-nowrap", isActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    <Icon className="w-3.5 h-3.5" />{config.label}
                    {query && count > 0 && <span className={cn("px-1.5 py-0.5 text-[10px] rounded-full", isActive ? "bg-primary-foreground/20" : "bg-background")}>{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div className="p-2">
              {!query && <SearchEmptyState searchHistory={searchHistory} selectedIndex={selectedIndex} onClearHistory={clearHistory} onSetQuery={setQuery} recentItems={getMostRecent(3)} onClose={() => setOpen(false)} />}
              {query && <SearchResultsList query={query} results={results} groupedResults={groupedResults} isLoading={isLoading} selectedIndex={selectedIndex} onSelect={handleSelect} onClose={() => setOpen(false)} />}
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">↑↓</kbd>navegar</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">↵</kbd>selecionar</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">Tab</kbd>categoria</span>
              </div>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">Esc</kbd>fechar</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AdvancedSearch;
