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
  type LucideIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "solicitacao" | "pedido" | "fornecedor" | "cotacao" | "pagamento";
  href: string;
  badge?: string;
}

interface EnhancedSearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onSelect?: (result: SearchResult) => void;
  results?: SearchResult[];
  recentSearches?: string[];
  trendingSearches?: string[];
  loading?: boolean;
  className?: string;
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

export const EnhancedSearch = ({
  placeholder = "Buscar...",
  onSearch,
  onSelect,
  results = [],
  recentSearches = [],
  trendingSearches = [],
  loading = false,
  className,
}: EnhancedSearchProps) => {
  const [query, setQuery] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const showDropdown = isFocused && (query.length > 0 || recentSearches.length > 0 || trendingSearches.length > 0);

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
      <div className="relative">
        <Search className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
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
            "pl-9 pr-20 h-10 transition-all",
            isFocused && "ring-2 ring-primary/20 border-primary"
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {query && !loading && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleClear}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl border shadow-xl z-50 overflow-hidden animate-scale-in">
          {/* Results */}
          {query.length > 0 && results.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Resultados
              </div>
              {results.map((result, index) => {
                const Icon = typeIcons[result.type];
                return (
                  <button
                    key={result.id}
                    onClick={() => {
                      onSelect?.(result);
                      setIsFocused(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                      selectedIndex === index
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {typeLabels[result.type]}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {query.length > 0 && results.length === 0 && !loading && (
            <div className="p-8 text-center">
              <Search className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum resultado para "{query}"
              </p>
            </div>
          )}

          {/* Recent Searches */}
          {query.length === 0 && recentSearches.length > 0 && (
            <div className="p-2 border-b">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Buscas Recentes
              </div>
              {recentSearches.slice(0, 5).map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(search);
                    onSearch?.(search);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-sm hover:bg-muted transition-colors"
                >
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {search}
                </button>
              ))}
            </div>
          )}

          {/* Trending Searches */}
          {query.length === 0 && trendingSearches.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Populares
              </div>
              <div className="flex flex-wrap gap-1 px-2 py-1">
                {trendingSearches.map((search, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => {
                      setQuery(search);
                      onSearch?.(search);
                    }}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
