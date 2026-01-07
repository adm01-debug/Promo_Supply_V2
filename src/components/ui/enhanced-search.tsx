import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp, 
  FileText, 
  Users, 
  Package,
  Loader2,
  Sparkles,
  ArrowRight,
  type LucideIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "solicitacao" | "pedido" | "fornecedor" | "cotacao" | "pagamento";
  href: string;
  badge?: string;
}

interface SearchSuggestion {
  text: string;
  icon?: LucideIcon;
  category?: string;
}

interface EnhancedSearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onSelect?: (result: SearchResult) => void;
  results?: SearchResult[];
  recentSearches?: string[];
  trendingSearches?: string[];
  suggestions?: SearchSuggestion[];
  loading?: boolean;
  className?: string;
  showShortcut?: boolean;
}

const typeIcons: Record<SearchResult["type"], LucideIcon> = {
  solicitacao: FileText,
  pedido: Package,
  fornecedor: Users,
  cotacao: TrendingUp,
  pagamento: FileText,
};

const typeLabels: Record<SearchResult["type"], string> = {
  solicitacao: "Solicitação",
  pedido: "Pedido",
  fornecedor: "Fornecedor",
  cotacao: "Cotação",
  pagamento: "Pagamento",
};

const typeColors: Record<SearchResult["type"], string> = {
  solicitacao: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  pedido: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  fornecedor: "bg-green-500/10 text-green-600 dark:text-green-400",
  cotacao: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  pagamento: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

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
}: EnhancedSearchProps) => {
  const [query, setQuery] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const showDropdown = isFocused && (query.length > 0 || recentSearches.length > 0 || trendingSearches.length > 0 || suggestions.length > 0);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          onSelect?.(results[selectedIndex]);
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
            {query.length > 0 && results.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  Resultados
                </div>
                {results.map((result, index) => {
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
                        <div className="font-medium truncate">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
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
            {query.length > 0 && results.length === 0 && !loading && (
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
                  Tente buscar por "{query}" com outros termos
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
