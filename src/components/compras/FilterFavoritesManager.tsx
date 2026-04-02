import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Star, Save, Trash2, Check, ChevronDown, Bookmark } from 'lucide-react';
import { DashboardFilter, FilterValues } from '@/hooks/useDashboardFilters';

interface FilterFavoritesManagerProps {
  favorites: DashboardFilter[];
  currentFilters: FilterValues;
  onSave: (name: string, filters: FilterValues) => Promise<DashboardFilter | null>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onApply: (filter: DashboardFilter) => void;
  loading?: boolean;
}

export const FilterFavoritesManager = ({
  favorites,
  currentFilters,
  onSave,
  onDelete,
  onSetDefault,
  onApply,
  loading
}: FilterFavoritesManagerProps) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!filterName.trim()) return;
    
    setSaving(true);
    const result = await onSave(filterName, currentFilters);
    setSaving(false);
    
    if (result) {
      setFilterName('');
      setSaveDialogOpen(false);
    }
  };

  const hasActiveFilters = currentFilters.category !== 'all' || 
                           currentFilters.supplier !== 'all' ||
                           currentFilters.period !== '6m' ||
                           !currentFilters.showComparison;

  const formatFilterDescription = (filter: DashboardFilter) => {
    const parts = [];
    if (filter.category_filter !== 'all') parts.push(filter.category_filter);
    if (filter.supplier_filter !== 'all') parts.push(filter.supplier_filter);
    if (filter.period_filter !== '6m') parts.push(filter.period_filter);
    return parts.length > 0 ? parts.join(', ') : 'Filtros padrão';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Save Current Filter */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!hasActiveFilters}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar Filtro
          </Button>
        </DialogTrigger>
        <DialogContent aria-describedby="dialog-desc" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Salvar Filtro Favorito
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name">Nome do Filtro</Label>
              <Input
                id="filter-name"
                placeholder="Ex: Mochilas XBZ - Semestre"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
            </div>
            <div className="p-3 rounded-lg bg-muted space-y-1">
              <p className="text-sm font-medium">Configuração atual:</p>
              <p className="text-xs text-muted-foreground">
                Categoria: <span className="font-medium">{currentFilters.category === 'all' ? 'Todas' : currentFilters.category}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Fornecedor: <span className="font-medium">{currentFilters.supplier === 'all' ? 'Todos' : currentFilters.supplier}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Período: <span className="font-medium">{currentFilters.period}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Comparação: <span className="font-medium">{currentFilters.showComparison ? 'Ativa' : 'Desativada'}</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!filterName.trim() || saving}>
              {saving ? 'Salvando...' : 'Salvar Filtro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Favorite Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Star className="h-4 w-4" />
            Favoritos
            {favorites.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {favorites.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 bg-background border shadow-lg z-50">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : favorites.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum filtro salvo</p>
              <p className="text-xs">Salve seus filtros favoritos para acesso rápido</p>
            </div>
          ) : (
            favorites.map((filter, index) => (
              <div key={filter.id}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  className="flex items-start gap-3 p-3 cursor-pointer"
                  onClick={() => onApply(filter)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{filter.name}</span>
                      {filter.is_default && (
                        <Badge variant="default" className="h-5 text-xs">Padrão</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatFilterDescription(filter)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetDefault(filter.id);
                      }}
                      title={filter.is_default ? 'Filtro padrão' : 'Definir como padrão'}
                    >
                      {filter.is_default ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(filter.id);
                      }}
                      title="Remover filtro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              </div>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
