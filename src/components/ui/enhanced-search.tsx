import * as React from "react";
import Fuse from "fuse.js";
import { cn } from "@/lib/utils";
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp, 
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { normalizeText } from "@/hooks/useFuseSearch";
import {
  type SearchResult,
  type EnhancedSearchProps,
  typeIcons,
  typeLabels,
  typeColors,
  fuseOptions,
} from "./enhanced-search-helpers";

export type { SearchResult };

// Highlight component for matched text
const HighlightedText = React.memo(({ 
  text, 
  matches, 
  targetKey 
}: { 
  text: string; 
  matches?: { key: string; indices: [number, number][] }[];
  targetKey: string;
}) => {
  if (!matches || !text) return <>{text}</>;

  const relevantMatch = matches.find(m => 
    m.key === targetKey || 
    m.key === `normalized${targetKey.charAt(0).toUpperCase() + targetKey.slice(1)}`
  );

  if (!relevantMatch?.indices.length) return <>{text}</>;

  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  [...relevantMatch.indices].sort((a, b) => a[0] - b[0]).forEach(([start, end], i) => {
    const safeStart = Math.min(start, text.length);
    const safeEnd = Math.min(end + 1, text.length);
    
    if (safeStart > lastIndex) {
      result.push(<span key={`text-${i}`}>{text.slice(lastIndex, safeStart)}</span>);
    }
    if (safeStart < safeEnd) {
      result.push(
        <mark key={`match-${i}`} className="bg-primary/25 text-primary font-semibold rounded-sm px-0.5">
          {text.slice(safeStart, safeEnd)}
        </mark>
      );
    }
    lastIndex = safeEnd;
  });

  if (lastIndex < text.length) {
    result.push(<span key="remaining">{text.slice(lastIndex)}</span>);
  }

  return <>{result}</>;
});

export const EnhancedSearch = ({
  placeholder = "Buscar solicitações, pedidos, fornecedores...",
  onSearch,
  onSelect,
  results = [],
  recentSearches = [],
  trendingSearches = [],
  suggestions = [],
  loading = false,
  className,
  showShortcut = true,
  enableFuzzy = true,
}: EnhancedSearchProps) => {
  const [query, setQuery] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const [fuzzyResults, setFuzzyResults] = React.useState<SearchResult[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Prepare results with normalized text for fuzzy search
  const preparedResults = React.useMemo(() => {
    return results.map(r => ({
      ...r,
      normalizedTitle: normalizeText(r.title),
      normalizedSubtitle: r.subtitle ? normalizeText(r.subtitle) : '',
    }));
  }, [results]);

  // Create Fuse instance
  const fuse = React.useMemo(() => {
    return new Fuse(preparedResults, fuseOptions);
  }, [preparedResults]);

  // Perform fuzzy search
  React.useEffect(() => {
    if (!enableFuzzy || !query.trim()) {
      setFuzzyResults([]);
      return;
    }

    const normalizedQuery = normalizeText(query);
    const searchResults = fuse.search(query);
    const normalizedSearchResults = fuse.search(normalizedQuery);

    // Merge and deduplicate
    const seenIds = new Set<string>();
    const merged: SearchResult[] = [];

    [...searchResults, ...normalizedSearchResults].forEach(r => {
      if (!seenIds.has(r.item.id)) {
        seenIds.add(r.item.id);
        merged.push({
          ...r.item,
          matchIndices: r.matches?.map(m => ({
            key: m.key || '',
            indices: m.indices as [number, number][],
          })),
        });
      }
    });

    setFuzzyResults(merged);
  }, [query, fuse, enableFuzzy]);

  const displayResults = enableFuzzy && query.trim() ? fuzzyResults : results;
  const showDropdown = isFocused && (query.length > 0 || recentSearches.length > 0 || trendingSearches.length > 0 || suggestions.length > 0);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, displayResults.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && displayResults[selectedIndex]) {
          onSelect?.(displayResults[selectedIndex]);
          setIsFocused(false);
        }
        break;
      case "Escape":
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    onSearch?.(value);
  };

  // Handle clear
  const handleClear = () => {
    setQuery("");
    setSelectedIndex(-1);
    onSearch?.("");
    inputRef.current?.focus();
  };

  // Handle click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut to focus search
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Search Input */}
      <motion.div 
        className="relative"
        animate={isFocused ? { scale: 1.01 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Search className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200",
          isFocused ? "text-primary" : "text-muted-foreground"
        )} />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "pl-10 pr-24 h-11 rounded-xl transition-all duration-200",
            "bg-muted/50 border-transparent",
            "focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20"
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </motion.div>
            )}
            {query && !loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-muted"
                  onClick={handleClear}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          {showShortcut && (
            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded-md border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          )}
        </div>
      </motion.div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div 
            className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl border shadow-2xl z-50 overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {/* Results */}
            {query.length > 0 && displayResults.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  Resultados {enableFuzzy && <Badge variant="outline" className="text-[9px] px-1">Fuzzy</Badge>}
                </div>
                {displayResults.map((result, index) => {
                  const Icon = typeIcons[result.type];
                  return (
                    <motion.button
                      key={result.id}
                      onClick={() => {
                        onSelect?.(result);
                        setIsFocused(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                        selectedIndex === index
                          ? "bg-primary/10 text-foreground"
                          : "hover:bg-muted/70"
                      )}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      whileHover={{ x: 4 }}
                    >
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        typeColors[result.type]
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          <HighlightedText text={result.title} matches={result.matchIndices} targetKey="title" />
                        </div>
                        {result.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">
                            <HighlightedText text={result.subtitle} matches={result.matchIndices} targetKey="subtitle" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {typeLabels[result.type]}
                        </Badge>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* No Results */}
            {query.length > 0 && displayResults.length === 0 && !loading && (
              <motion.div 
                className="p-8 text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Nenhum resultado encontrado
                </p>
                <p className="text-xs text-muted-foreground">
                  Tente buscar com outros termos
                </p>
              </motion.div>
            )}

            {/* Suggestions */}
            {query.length === 0 && suggestions.length > 0 && (
              <div className="p-2 border-b">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  Sugestões
                </div>
                {suggestions.slice(0, 4).map((suggestion, index) => {
                  const SugIcon = suggestion.icon || Search;
                  return (
                    <motion.button
                      key={index}
                      onClick={() => {
                        setQuery(suggestion.text);
                        onSearch?.(suggestion.text);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm hover:bg-muted/70 transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <SugIcon className="w-4 h-4 text-muted-foreground" />
                      <span>{suggestion.text}</span>
                      {suggestion.category && (
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          {suggestion.category}
                        </Badge>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Recent Searches */}
            {query.length === 0 && recentSearches.length > 0 && (
              <div className="p-2 border-b">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Buscas Recentes
                </div>
                {recentSearches.slice(0, 5).map((search, index) => (
                  <motion.button
                    key={index}
                    onClick={() => {
                      setQuery(search);
                      onSearch?.(search);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm hover:bg-muted/70 transition-colors group"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="flex-1">{search}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Trending Searches */}
            {query.length === 0 && trendingSearches.length > 0 && (
              <div className="p-3">
                <div className="px-1 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" />
                  Populares
                </div>
                <div className="flex flex-wrap gap-2 py-1">
                  {trendingSearches.map((search, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors px-3 py-1"
                        onClick={() => {
                          setQuery(search);
                          onSearch?.(search);
                        }}
                      >
                        {search}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer hint */}
            <div className="px-4 py-2.5 bg-muted/30 border-t flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Use ↑↓ para navegar, Enter para selecionar</span>
              <span>Esc para fechar</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
