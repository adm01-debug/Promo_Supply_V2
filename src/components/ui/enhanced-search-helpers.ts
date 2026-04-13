import { FileText, Users, Package, TrendingUp, type LucideIcon } from "lucide-react";

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "solicitacao" | "pedido" | "fornecedor" | "cotacao" | "pagamento";
  href: string;
  badge?: string;
  normalizedTitle?: string;
  normalizedSubtitle?: string;
  matchIndices?: { key: string; indices: [number, number][] }[];
}

export interface SearchSuggestion {
  text: string;
  icon?: LucideIcon;
  category?: string;
}

export interface EnhancedSearchProps {
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
  enableFuzzy?: boolean;
}

export const typeIcons: Record<SearchResult["type"], LucideIcon> = {
  solicitacao: FileText,
  pedido: Package,
  fornecedor: Users,
  cotacao: TrendingUp,
  pagamento: FileText,
};

export const typeLabels: Record<SearchResult["type"], string> = {
  solicitacao: "Solicitação",
  pedido: "Pedido",
  fornecedor: "Fornecedor",
  cotacao: "Cotação",
  pagamento: "Pagamento",
};

export const typeColors: Record<SearchResult["type"], string> = {
  solicitacao: "bg-info/10 text-info dark:text-info",
  pedido: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  fornecedor: "bg-success/10 text-success dark:text-success",
  cotacao: "bg-warning/10 text-warning dark:text-warning",
  pagamento: "bg-success/10 text-success dark:text-success",
};

export const fuseOptions = {
  isCaseSensitive: false,
  includeScore: true,
  includeMatches: true,
  shouldSort: true,
  threshold: 0.4,
  location: 0,
  distance: 100,
  minMatchCharLength: 2,
  keys: [
    { name: 'title', weight: 2.0 },
    { name: 'subtitle', weight: 1.5 },
    { name: 'normalizedTitle', weight: 1.8 },
    { name: 'normalizedSubtitle', weight: 1.3 },
  ],
};
