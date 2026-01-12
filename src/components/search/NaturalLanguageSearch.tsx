import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Sparkles, 
  ArrowRight,
  Clock,
  TrendingUp,
  Filter,
  X,
  Mic,
  MicOff,
  Loader2,
  Lightbulb,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// ============================================
// MELHORIA: Natural Language Search
// Busca com linguagem natural e IA
// ============================================

interface SearchSuggestion {
  query: string;
  type: 'recent' | 'popular' | 'ai-suggested';
  category?: string;
}

interface ParsedQuery {
  entities: {
    type: string;
    value: string;
    confidence: number;
  }[];
  intent: string;
  filters: Record<string, string>;
  originalQuery: string;
}

interface NaturalLanguageSearchProps {
  onSearch: (query: string, parsedQuery?: ParsedQuery) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  recentSearches?: string[];
  popularSearches?: string[];
  enableVoice?: boolean;
  enableAI?: boolean;
  examples?: string[];
  className?: string;
}

export const NaturalLanguageSearch: React.FC<NaturalLanguageSearchProps> = ({
  onSearch,
  placeholder = "Pergunte qualquer coisa...",
  suggestions = [],
  recentSearches = [],
  popularSearches = [],
  enableVoice = true,
  enableAI = true,
  examples = [
    "Solicitações pendentes desta semana",
    "Pedidos com valor maior que R$ 10.000",
    "Fornecedores com melhor avaliação",
    "Pagamentos vencidos do mês passado"
  ],
  className
}) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulated NLP parsing
  const parseNaturalLanguage = useCallback((text: string): ParsedQuery => {
    const entities: ParsedQuery['entities'] = [];
    const filters: Record<string, string> = {};
    let intent = 'search';

    // Parse dates
    const datePatterns = [
      { pattern: /esta semana/i, value: 'this_week' },
      { pattern: /este mês/i, value: 'this_month' },
      { pattern: /mês passado/i, value: 'last_month' },
      { pattern: /hoje/i, value: 'today' },
      { pattern: /ontem/i, value: 'yesterday' },
      { pattern: /últimos (\d+) dias/i, value: 'last_n_days' }
    ];

    datePatterns.forEach(({ pattern, value }) => {
      if (pattern.test(text)) {
        entities.push({ type: 'date', value, confidence: 0.9 });
        filters['period'] = value;
      }
    });

    // Parse status
    const statusPatterns = [
      { pattern: /pendente[s]?/i, value: 'pendente' },
      { pattern: /aprovad[ao]s?/i, value: 'aprovado' },
      { pattern: /rejeitad[ao]s?/i, value: 'rejeitado' },
      { pattern: /vencid[ao]s?/i, value: 'vencido' },
      { pattern: /em andamento/i, value: 'em_andamento' }
    ];

    statusPatterns.forEach(({ pattern, value }) => {
      if (pattern.test(text)) {
        entities.push({ type: 'status', value, confidence: 0.95 });
        filters['status'] = value;
      }
    });

    // Parse amounts
    const amountMatch = text.match(/(?:maior|acima|mais)\s*(?:que|de)?\s*R?\$?\s*([\d.,]+)/i);
    if (amountMatch) {
      const amount = amountMatch[1].replace(/\./g, '').replace(',', '.');
      entities.push({ type: 'amount_min', value: amount, confidence: 0.85 });
      filters['amount_min'] = amount;
    }

    const amountMaxMatch = text.match(/(?:menor|abaixo|menos)\s*(?:que|de)?\s*R?\$?\s*([\d.,]+)/i);
    if (amountMaxMatch) {
      const amount = amountMaxMatch[1].replace(/\./g, '').replace(',', '.');
      entities.push({ type: 'amount_max', value: amount, confidence: 0.85 });
      filters['amount_max'] = amount;
    }

    // Parse entity types
    const entityTypes = [
      { pattern: /solicitaç[ãoõ]es?/i, value: 'solicitacao' },
      { pattern: /pedidos?/i, value: 'pedido' },
      { pattern: /pagamentos?/i, value: 'pagamento' },
      { pattern: /fornecedor(?:es)?/i, value: 'fornecedor' },
      { pattern: /cotaç[ãoõ]es?/i, value: 'cotacao' },
      { pattern: /contratos?/i, value: 'contrato' }
    ];

    entityTypes.forEach(({ pattern, value }) => {
      if (pattern.test(text)) {
        entities.push({ type: 'entity_type', value, confidence: 0.95 });
        intent = `search_${value}`;
      }
    });

    // Parse sorting
    if (/melhor(?:es)?|maior(?:es)?|top/i.test(text)) {
      filters['sort'] = 'desc';
    }
    if (/pior(?:es)?|menor(?:es)?/i.test(text)) {
      filters['sort'] = 'asc';
    }

    return {
      entities,
      intent,
      filters,
      originalQuery: text
    };
  }, []);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;

    setIsProcessing(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const parsed = parseNaturalLanguage(query);
      setParsedQuery(parsed);
      onSearch(query, parsed);
      setIsProcessing(false);
      setFocused(false);
    }, enableAI ? 500 : 0);
  }, [query, enableAI, parseNaturalLanguage, onSearch]);

  // Voice recognition (simulated)
  const toggleVoiceRecognition = () => {
    if (isListening) {
      setIsListening(false);
      // Simulate voice result
      setTimeout(() => {
        setQuery("Solicitações pendentes desta semana");
      }, 500);
    } else {
      setIsListening(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Search input */}
      <div className={cn(
        "relative flex items-center gap-2 px-4 py-3 bg-background border rounded-xl transition-all",
        focused && "ring-2 ring-primary border-primary shadow-lg"
      )}>
        {isProcessing ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : enableAI ? (
          <Sparkles className="w-5 h-5 text-primary" />
        ) : (
          <Search className="w-5 h-5 text-muted-foreground" />
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-base"
        />

        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setQuery('')}
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        {enableVoice && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              isListening && "text-red-500 animate-pulse"
            )}
            onClick={toggleVoiceRecognition}
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
        )}

        <Button
          onClick={handleSearch}
          disabled={!query.trim() || isProcessing}
          className="h-8"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Parsed query visualization */}
      <AnimatePresence>
        {parsedQuery && parsedQuery.entities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 flex flex-wrap gap-2"
          >
            {parsedQuery.entities.map((entity, i) => (
              <Badge 
                key={i} 
                variant="secondary"
                className="gap-1"
              >
                <span className="text-xs text-muted-foreground">
                  {entity.type}:
                </span>
                {entity.value}
              </Badge>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown suggestions */}
      <AnimatePresence>
        {focused && !query && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Examples section */}
            {examples.length > 0 && (
              <div className="p-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Experimente perguntar</span>
                </div>
                <div className="space-y-1">
                  {examples.slice(0, 4).map((example, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(example)}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <Sparkles className="w-3 h-3 text-primary" />
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div className="p-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Buscas recentes</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.slice(0, 5).map((search, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(search)}
                      className="px-3 py-1.5 text-sm bg-muted rounded-full hover:bg-muted/80 transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular searches */}
            {popularSearches.length > 0 && (
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Buscas populares</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.slice(0, 5).map((search, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(search)}
                      className="px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Help */}
            <div className="p-2 border-t bg-muted/30">
              <button
                onClick={() => setShowExamples(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                Como usar a busca inteligente?
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice listening indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/95 rounded-xl flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center"
              >
                <Mic className="w-8 h-8 text-red-500" />
              </motion.div>
              <p className="text-sm font-medium">Ouvindo...</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsListening(false)}
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// Smart Filter Builder
// Construtor visual de filtros
// ============================================

interface FilterCondition {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
  value: string | string[];
}

interface SmartFilterBuilderProps {
  fields: { value: string; label: string; type: 'text' | 'number' | 'date' | 'select'; options?: string[] }[];
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
  onApply: () => void;
}

export const SmartFilterBuilder: React.FC<SmartFilterBuilderProps> = ({
  fields,
  conditions,
  onChange,
  onApply
}) => {
  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: Date.now().toString(),
      field: fields[0]?.value || '',
      operator: 'equals',
      value: ''
    };
    onChange([...conditions, newCondition]);
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    onChange(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const removeCondition = (id: string) => {
    onChange(conditions.filter(c => c.id !== id));
  };

  const operatorLabels: Record<string, string> = {
    equals: 'é igual a',
    contains: 'contém',
    gt: 'é maior que',
    lt: 'é menor que',
    between: 'está entre',
    in: 'está em'
  };

  return (
    <div className="p-4 border rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtros avançados
        </h4>
        <Button variant="outline" size="sm" onClick={addCondition}>
          + Adicionar filtro
        </Button>
      </div>

      <div className="space-y-2">
        {conditions.map((condition, index) => {
          const field = fields.find(f => f.value === condition.field);
          
          return (
            <motion.div
              key={condition.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2 p-2 bg-muted rounded-lg"
            >
              {index > 0 && (
                <span className="text-xs text-muted-foreground px-2">E</span>
              )}

              {/* Field selector */}
              <select
                value={condition.field}
                onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                className="px-2 py-1.5 bg-background border rounded text-sm"
              >
                {fields.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              {/* Operator selector */}
              <select
                value={condition.operator}
                onChange={(e) => updateCondition(condition.id, { operator: e.target.value as any })}
                className="px-2 py-1.5 bg-background border rounded text-sm"
              >
                {Object.entries(operatorLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              {/* Value input */}
              {field?.type === 'select' && field.options ? (
                <select
                  value={condition.value as string}
                  onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                  className="flex-1 px-2 py-1.5 bg-background border rounded text-sm"
                >
                  <option value="">Selecione...</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text'}
                  value={condition.value as string}
                  onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                  className="flex-1 h-8"
                  placeholder="Valor..."
                />
              )}

              {/* Remove button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => removeCondition(condition.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          );
        })}
      </div>

      {conditions.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onChange([])}>
            Limpar
          </Button>
          <Button onClick={onApply}>
            Aplicar filtros
          </Button>
        </div>
      )}
    </div>
  );
};

// ============================================
// Semantic Search Results
// Resultados com relevância semântica
// ============================================

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: string;
  relevanceScore: number;
  highlights?: { field: string; snippet: string }[];
  metadata?: Record<string, string>;
}

interface SemanticSearchResultsProps {
  results: SearchResult[];
  query: string;
  isLoading?: boolean;
  onResultClick: (result: SearchResult) => void;
}

export const SemanticSearchResults: React.FC<SemanticSearchResultsProps> = ({
  results,
  query,
  isLoading,
  onResultClick
}) => {
  const highlightQuery = (text: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">{part}</mark>
        : part
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium mb-1">Nenhum resultado encontrado</h3>
        <p className="text-sm text-muted-foreground">
          Tente usar termos diferentes ou mais genéricos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {results.length} resultado{results.length !== 1 && 's'} encontrado{results.length !== 1 && 's'}
      </p>

      {results.map((result, index) => (
        <motion.button
          key={result.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onResultClick(result)}
          className="w-full text-left p-4 border rounded-xl hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <Badge variant="outline" className="mb-1">
                {result.type}
              </Badge>
              <h4 className="font-medium">{highlightQuery(result.title)}</h4>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              {Math.round(result.relevanceScore * 100)}% relevante
            </div>
          </div>

          {result.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {highlightQuery(result.description)}
            </p>
          )}

          {result.highlights && result.highlights.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {result.highlights.map((h, i) => (
                <p key={i} className="truncate">
                  <span className="font-medium">{h.field}:</span> ...{h.snippet}...
                </p>
              ))}
            </div>
          )}

          {result.metadata && (
            <div className="flex gap-3 mt-2">
              {Object.entries(result.metadata).slice(0, 3).map(([key, value]) => (
                <span key={key} className="text-xs text-muted-foreground">
                  {key}: <strong>{value}</strong>
                </span>
              ))}
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
};

export default NaturalLanguageSearch;
