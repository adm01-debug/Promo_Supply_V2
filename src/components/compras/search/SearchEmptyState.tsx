import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, ArrowRight, Zap, Star, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { quickActions } from "./searchConfig";
import { type RecentItem } from "@/hooks/useRecentlyViewed";

interface Props {
  searchHistory: string[];
  selectedIndex: number;
  onClearHistory: () => void;
  onSetQuery: (term: string) => void;
  recentItems: RecentItem[];
  onClose: () => void;
}

export const SearchEmptyState = ({
  searchHistory, selectedIndex, onClearHistory, onSetQuery, recentItems, onClose
}: Props) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {searchHistory.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Buscas recentes
            </span>
            <Button variant="ghost" size="sm" onClick={onClearHistory} className="h-6 text-xs text-muted-foreground hover:text-foreground">
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
                onClick={() => onSetQuery(term)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left",
                  "hover:bg-muted transition-colors",
                  selectedIndex === idx && "bg-muted"
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

      <div>
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 px-2 mb-2">
          <Zap className="w-3.5 h-3.5" />
          Ações rápidas
        </span>
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => { onClose(); navigate(action.action); }}
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

      {recentItems.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 px-2 mb-2">
            <Star className="w-3.5 h-3.5" />
            Visualizados recentemente
          </span>
          <div className="space-y-1">
            {recentItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { onClose(); navigate(item.url); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
