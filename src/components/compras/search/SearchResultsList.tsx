import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ChevronRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HighlightedText } from "./HighlightedText";
import {
  type SearchResult, type SearchCategory,
  categoryConfig, parseNaturalLanguageIntent, getStatusColor,
} from "./searchConfig";

interface Props {
  query: string;
  results: SearchResult[];
  groupedResults: Record<string, SearchResult[]>;
  isLoading: boolean;
  selectedIndex: number;
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
}

export const SearchResultsList = ({
  query, results, groupedResults, isLoading, selectedIndex, onSelect, onClose
}: Props) => {
  const navigate = useNavigate();

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Buscando...</p>
        </motion.div>
      ) : results.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center justify-center py-12">
          {(() => {
            const nlIntent = parseNaturalLanguageIntent(query);
            if (nlIntent?.redirectPath) {
              return (
                <button
                  onClick={() => { onClose(); navigate(nlIntent.redirectPath!); }}
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          {/* NL intent suggestion */}
          {(() => {
            const nlIntent = parseNaturalLanguageIntent(query);
            if (!nlIntent?.redirectPath) return null;
            return (
              <motion.button
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { onClose(); navigate(nlIntent.redirectPath!); }}
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
                  <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
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
                        onClick={() => onSelect(result)}
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
                          type === 'solicitacoes' && "bg-warning/10",
                          type === 'pedidos' && "bg-success/10",
                          type === 'fornecedores' && "bg-info/10",
                          type === 'pagamentos' && "bg-warning/10",
                          type === 'contratos' && "bg-purple-500/10",
                        )}>
                          <Icon className={cn("w-5 h-5", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            <HighlightedText text={result.title} matches={result.matchedText} targetKey="title" />
                          </p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              <HighlightedText text={result.subtitle} matches={result.matchedText} targetKey="subtitle" />
                            </p>
                          )}
                        </div>
                        {result.metadata?.status && (
                          <Badge variant="secondary" className={cn("text-[10px] h-5", getStatusColor(result.metadata.status))}>
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
  );
};
