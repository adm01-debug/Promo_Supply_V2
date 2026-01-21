import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Star, 
  StarOff, 
  ChevronDown, 
  Plus, 
  Trash2,
  Filter,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, any>;
  createdAt: string;
  isDefault?: boolean;
}

interface FiltrosFavoritosProps {
  /**
   * Chave única para identificar o contexto (ex: 'solicitacoes', 'pedidos')
   */
  storageKey: string;
  
  /**
   * Filtros atuais aplicados
   */
  currentFilters: Record<string, any>;
  
  /**
   * Callback quando um filtro salvo é aplicado
   */
  onApplyFilter: (filters: Record<string, any>) => void;
  
  /**
   * Labels para exibição dos filtros
   */
  filterLabels?: Record<string, string>;
  
  /**
   * Classes CSS adicionais
   */
  className?: string;
}

const STORAGE_PREFIX = 'filtros_favoritos_';

export function FiltrosFavoritos({
  storageKey,
  currentFilters,
  onApplyFilter,
  filterLabels = {},
  className,
}: FiltrosFavoritosProps) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  // Carregar filtros salvos do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + storageKey);
      if (stored) {
        setSavedFilters(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  }, [storageKey]);

  // Salvar no localStorage
  const persistFilters = useCallback((filters: SavedFilter[]) => {
    try {
      localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(filters));
      setSavedFilters(filters);
    } catch (error) {
      console.error('Error saving filters:', error);
      toast.error('Erro ao salvar filtros');
    }
  }, [storageKey]);

  // Verificar se os filtros atuais são diferentes dos vazios
  const hasActiveFilters = useCallback(() => {
    return Object.values(currentFilters).some(v => 
      v !== undefined && v !== null && v !== '' && 
      !(Array.isArray(v) && v.length === 0)
    );
  }, [currentFilters]);

  // Salvar filtro atual
  const handleSaveFilter = useCallback(() => {
    if (!filterName.trim()) {
      toast.error('Digite um nome para o filtro');
      return;
    }

    if (!hasActiveFilters()) {
      toast.error('Aplique pelo menos um filtro antes de salvar');
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      filters: { ...currentFilters },
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedFilters, newFilter];
    persistFilters(updated);
    
    setFilterName('');
    setShowSaveDialog(false);
    setActiveFilterId(newFilter.id);
    
    toast.success(`Filtro "${newFilter.name}" salvo!`);
  }, [filterName, currentFilters, savedFilters, persistFilters, hasActiveFilters]);

  // Aplicar filtro salvo
  const handleApplyFilter = useCallback((filter: SavedFilter) => {
    onApplyFilter(filter.filters);
    setActiveFilterId(filter.id);
    toast.success(`Filtro "${filter.name}" aplicado`);
  }, [onApplyFilter]);

  // Remover filtro
  const handleDeleteFilter = useCallback((filterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const filter = savedFilters.find(f => f.id === filterId);
    const updated = savedFilters.filter(f => f.id !== filterId);
    persistFilters(updated);
    
    if (activeFilterId === filterId) {
      setActiveFilterId(null);
    }
    
    toast.success(`Filtro "${filter?.name}" removido`);
  }, [savedFilters, persistFilters, activeFilterId]);

  // Definir como padrão
  const handleSetDefault = useCallback((filterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const updated = savedFilters.map(f => ({
      ...f,
      isDefault: f.id === filterId,
    }));
    persistFilters(updated);
    
    const filter = savedFilters.find(f => f.id === filterId);
    toast.success(`"${filter?.name}" definido como padrão`);
  }, [savedFilters, persistFilters]);

  // Limpar filtros
  const handleClearFilters = useCallback(() => {
    onApplyFilter({});
    setActiveFilterId(null);
    toast.info('Filtros limpos');
  }, [onApplyFilter]);

  // Formatar valor do filtro para exibição
  const formatFilterValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Gerar resumo dos filtros
  const getFilterSummary = (filters: Record<string, any>): string => {
    const parts = Object.entries(filters)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => {
        const label = filterLabels[k] || k;
        const value = formatFilterValue(k, v);
        return `${label}: ${value}`;
      });
    
    return parts.slice(0, 3).join(' • ') + (parts.length > 3 ? '...' : '');
  };

  const activeFilter = savedFilters.find(f => f.id === activeFilterId);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Dropdown de filtros salvos */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Star className={cn(
              "h-4 w-4",
              activeFilter ? "fill-yellow-400 text-yellow-400" : ""
            )} />
            {activeFilter ? activeFilter.name : 'Filtros Salvos'}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Meus Filtros</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {savedFilters.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Nenhum filtro salvo ainda
            </div>
          ) : (
            savedFilters.map(filter => (
              <DropdownMenuItem
                key={filter.id}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => handleApplyFilter(filter)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {filter.isDefault && (
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  )}
                  {activeFilterId === filter.id && (
                    <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                  )}
                  <span className="truncate">{filter.name}</span>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => handleSetDefault(filter.id, e)}
                    title="Definir como padrão"
                  >
                    <Star className={cn(
                      "h-3 w-3",
                      filter.isDefault ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    )} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={(e) => handleDeleteFilter(filter.id, e)}
                    title="Excluir filtro"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setShowSaveDialog(true)}
            disabled={!hasActiveFilters()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Salvar filtro atual
          </DropdownMenuItem>
          
          {hasActiveFilters() && (
            <DropdownMenuItem
              className="cursor-pointer text-muted-foreground"
              onClick={handleClearFilters}
            >
              <StarOff className="h-4 w-4 mr-2" />
              Limpar filtros
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Badge indicando filtros ativos */}
      {hasActiveFilters() && !activeFilter && (
        <Badge variant="secondary" className="text-xs">
          <Filter className="h-3 w-3 mr-1" />
          Filtros ativos
        </Badge>
      )}

      {/* Dialog para salvar novo filtro */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Filtro</DialogTitle>
            <DialogDescription>
              Dê um nome para este conjunto de filtros para acessá-lo rapidamente depois.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Ex: Pedidos urgentes, Fornecedores SP..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
                autoFocus
              />
            </div>
            
            {/* Preview dos filtros */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium mb-2">Filtros que serão salvos:</p>
              <p className="text-xs text-muted-foreground">
                {getFilterSummary(currentFilters) || 'Nenhum filtro aplicado'}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFilter}>
              <Star className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Hook para uso programático
export function useFiltrosFavoritos(storageKey: string) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + storageKey);
      if (stored) {
        setSavedFilters(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  }, [storageKey]);

  const getDefaultFilter = useCallback(() => {
    return savedFilters.find(f => f.isDefault);
  }, [savedFilters]);

  const applyDefaultFilter = useCallback((onApply: (filters: Record<string, any>) => void) => {
    const defaultFilter = getDefaultFilter();
    if (defaultFilter) {
      onApply(defaultFilter.filters);
      return true;
    }
    return false;
  }, [getDefaultFilter]);

  return {
    savedFilters,
    getDefaultFilter,
    applyDefaultFilter,
  };
}
