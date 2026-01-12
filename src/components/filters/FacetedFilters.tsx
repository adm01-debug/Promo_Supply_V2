import { useState, useCallback, useMemo, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Filter,
  RotateCcw,
  Star,
  StarOff,
  Save,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ============================================
// TYPES
// ============================================

export interface FacetOption {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
  color?: string;
  disabled?: boolean;
}

export interface Facet {
  id: string;
  label: string;
  icon?: ReactNode;
  options: FacetOption[];
  type?: 'checkbox' | 'radio' | 'range';
  searchable?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, string[]>;
  isDefault?: boolean;
  createdAt: Date;
}

export interface FacetedFiltersProps {
  facets: Facet[];
  selectedFilters: Record<string, string[]>;
  onFilterChange: (facetId: string, values: string[]) => void;
  onClearAll?: () => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, filters: Record<string, string[]>) => void;
  onDeleteFilter?: (id: string) => void;
  onLoadFilter?: (filter: SavedFilter) => void;
  onSetDefaultFilter?: (id: string) => void;
  showActiveCount?: boolean;
  variant?: 'sidebar' | 'horizontal' | 'popover';
  className?: string;
}

// ============================================
// FACET GROUP COMPONENT
// ============================================

interface FacetGroupProps {
  facet: Facet;
  selectedValues: string[];
  onValueChange: (values: string[]) => void;
}

const FacetGroup = ({ facet, selectedValues, onValueChange }: FacetGroupProps) => {
  const [isOpen, setIsOpen] = useState(facet.defaultOpen ?? true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return facet.options;
    return facet.options.filter(opt =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [facet.options, searchQuery]);

  const handleOptionToggle = (value: string) => {
    if (facet.type === 'radio') {
      onValueChange([value]);
    } else {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value];
      onValueChange(newValues);
    }
  };

  const content = (
    <div className="space-y-2">
      {facet.searchable && facet.options.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      )}

      <ScrollArea className={filteredOptions.length > 6 ? "h-48" : undefined}>
        <div className="space-y-1">
          {filteredOptions.map((option) => (
            <motion.label
              key={option.value}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                "hover:bg-muted/50",
                selectedValues.includes(option.value) && "bg-primary/10",
                option.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Checkbox
                checked={selectedValues.includes(option.value)}
                onCheckedChange={() => handleOptionToggle(option.value)}
                disabled={option.disabled}
              />
              {option.icon && (
                <span className="flex-shrink-0">{option.icon}</span>
              )}
              {option.color && (
                <span 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: option.color }}
                />
              )}
              <span className="text-sm flex-1 truncate">{option.label}</span>
              {option.count !== undefined && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {option.count}
                </Badge>
              )}
            </motion.label>
          ))}

          {filteredOptions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma opção encontrada
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  if (!facet.collapsible) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {facet.icon}
          <span className="font-medium text-sm">{facet.label}</span>
          {selectedValues.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedValues.length}
            </Badge>
          )}
        </div>
        {content}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded-md px-2 transition-colors">
        <div className="flex items-center gap-2">
          {facet.icon}
          <span className="font-medium text-sm">{facet.label}</span>
          {selectedValues.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedValues.length}
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {content}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ============================================
// ACTIVE FILTERS BAR
// ============================================

interface ActiveFiltersBarProps {
  facets: Facet[];
  selectedFilters: Record<string, string[]>;
  onRemoveFilter: (facetId: string, value: string) => void;
  onClearAll: () => void;
}

const ActiveFiltersBar = ({
  facets,
  selectedFilters,
  onRemoveFilter,
  onClearAll
}: ActiveFiltersBarProps) => {
  const activeCount = Object.values(selectedFilters).flat().length;

  if (activeCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg"
    >
      <span className="text-sm text-muted-foreground">Filtros ativos:</span>
      
      {Object.entries(selectedFilters).map(([facetId, values]) => {
        const facet = facets.find(f => f.id === facetId);
        if (!facet || values.length === 0) return null;

        return values.map(value => {
          const option = facet.options.find(o => o.value === value);
          return (
            <motion.div
              key={`${facetId}-${value}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <Badge variant="secondary" className="gap-1 pr-1">
                <span className="text-xs text-muted-foreground">{facet.label}:</span>
                <span>{option?.label || value}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-destructive/20"
                  onClick={() => onRemoveFilter(facetId, value)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            </motion.div>
          );
        });
      })}

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="text-destructive hover:text-destructive"
      >
        <RotateCcw className="w-3 h-3 mr-1" />
        Limpar todos
      </Button>
    </motion.div>
  );
};

// ============================================
// SAVED FILTERS MANAGER
// ============================================

interface SavedFiltersManagerProps {
  savedFilters: SavedFilter[];
  currentFilters: Record<string, string[]>;
  onSave: (name: string) => void;
  onLoad: (filter: SavedFilter) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

const SavedFiltersManager = ({
  savedFilters,
  currentFilters,
  onSave,
  onLoad,
  onDelete,
  onSetDefault
}: SavedFiltersManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');

  const hasActiveFilters = Object.values(currentFilters).flat().length > 0;

  const handleSave = () => {
    if (filterName.trim()) {
      onSave(filterName.trim());
      setFilterName('');
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Filtros salvos</span>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              disabled={!hasActiveFilters}
            >
              <Save className="w-4 h-4 mr-1" />
              Salvar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar filtro</DialogTitle>
              <DialogDescription>
                Dê um nome para este conjunto de filtros para uso futuro.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Nome do filtro..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!filterName.trim()}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {savedFilters.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhum filtro salvo
        </p>
      ) : (
        <div className="space-y-1">
          {savedFilters.map((filter) => (
            <div
              key={filter.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
            >
              <button
                onClick={() => onLoad(filter)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                {filter.isDefault && (
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                )}
                <span className="text-sm">{filter.name}</span>
              </button>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onSetDefault(filter.id)}
                >
                  {filter.isDefault ? (
                    <StarOff className="w-3 h-3" />
                  ) : (
                    <Star className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-destructive/20"
                  onClick={() => onDelete(filter.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const FacetedFilters = ({
  facets,
  selectedFilters,
  onFilterChange,
  onClearAll,
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter,
  onLoadFilter,
  onSetDefaultFilter,
  showActiveCount = true,
  variant = 'sidebar',
  className
}: FacetedFiltersProps) => {
  const activeCount = Object.values(selectedFilters).flat().length;

  const handleRemoveFilter = useCallback((facetId: string, value: string) => {
    const currentValues = selectedFilters[facetId] || [];
    onFilterChange(facetId, currentValues.filter(v => v !== value));
  }, [selectedFilters, onFilterChange]);

  const handleClearAll = useCallback(() => {
    onClearAll?.();
  }, [onClearAll]);

  const sidebarContent = (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold">Filtros</span>
          {showActiveCount && activeCount > 0 && (
            <Badge>{activeCount}</Badge>
          )}
        </div>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs"
          >
            Limpar
          </Button>
        )}
      </div>

      <Separator />

      {/* Saved filters */}
      {onSaveFilter && (
        <>
          <SavedFiltersManager
            savedFilters={savedFilters}
            currentFilters={selectedFilters}
            onSave={(name) => onSaveFilter(name, selectedFilters)}
            onLoad={(filter) => onLoadFilter?.(filter)}
            onDelete={(id) => onDeleteFilter?.(id)}
            onSetDefault={(id) => onSetDefaultFilter?.(id)}
          />
          <Separator />
        </>
      )}

      {/* Facet groups */}
      <div className="space-y-4">
        {facets.map((facet) => (
          <FacetGroup
            key={facet.id}
            facet={facet}
            selectedValues={selectedFilters[facet.id] || []}
            onValueChange={(values) => onFilterChange(facet.id, values)}
          />
        ))}
      </div>
    </div>
  );

  if (variant === 'popover') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtros
            {activeCount > 0 && (
              <Badge variant="secondary">{activeCount}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          {sidebarContent}
        </PopoverContent>
      </Popover>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          
          {facets.map((facet) => (
            <Popover key={facet.id}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={cn(
                    "gap-2",
                    (selectedFilters[facet.id]?.length || 0) > 0 && "border-primary"
                  )}
                >
                  {facet.icon}
                  {facet.label}
                  {(selectedFilters[facet.id]?.length || 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedFilters[facet.id]?.length}
                    </Badge>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <FacetGroup
                  facet={facet}
                  selectedValues={selectedFilters[facet.id] || []}
                  onValueChange={(values) => onFilterChange(facet.id, values)}
                />
              </PopoverContent>
            </Popover>
          ))}

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-muted-foreground"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        <AnimatePresence>
          <ActiveFiltersBar
            facets={facets}
            selectedFilters={selectedFilters}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearAll}
          />
        </AnimatePresence>
      </div>
    );
  }

  return sidebarContent;
};

export { FacetGroup, ActiveFiltersBar, SavedFiltersManager };
