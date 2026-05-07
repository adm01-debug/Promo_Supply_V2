import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { type FilterValues } from '@/hooks/useDashboardFilters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import { FilterFavoritesManager } from '../FilterFavoritesManager';
import { type DashboardFilter } from '@/hooks/useDashboardFilters';
import { allCategories, allSuppliers } from './executiveDashboardData';

interface Props {
  selectedCategory: string;
  selectedSupplier: string;
  onCategoryChange: (v: string) => void;
  onSupplierChange: (v: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  favorites: DashboardFilter[];
  currentFilters: { category: string; supplier: string; period: string; showComparison: boolean };
  onSave: (name: string, filters: FilterValues) => Promise<DashboardFilter | null>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onApply: (filter: DashboardFilter) => void;
  favoritesLoading: boolean;
}

export const ExecutiveFiltersBar = ({
  selectedCategory, selectedSupplier, onCategoryChange, onSupplierChange,
  hasActiveFilters, onClearFilters, favorites, currentFilters,
  onSave, onDelete, onSetDefault, onApply, favoritesLoading
}: Props) => {
  return (
    <Card className="bg-card/30 backdrop-blur-2xl border-white/[0.03] shadow-lg">
      <CardContent className="p-4 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Categoria:</Label>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-[160px] h-9 bg-background/50 backdrop-blur-sm border-white/[0.05] rounded-lg">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="all">Todas</SelectItem>
                {allCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Fornecedor:</Label>
            <Select value={selectedSupplier} onValueChange={onSupplierChange}>
              <SelectTrigger className="w-[160px] h-9 bg-background/50 backdrop-blur-sm border-white/[0.05] rounded-lg">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="all">Todos</SelectItem>
                {allSuppliers.map(sup => (
                  <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}

          <div className="ml-auto">
            <FilterFavoritesManager
              favorites={favorites}
              currentFilters={currentFilters}
              onSave={onSave}
              onDelete={onDelete}
              onSetDefault={onSetDefault}
              onApply={onApply}
              loading={favoritesLoading}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-xs text-muted-foreground">Ativos:</span>
            {selectedCategory !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {selectedCategory}
                <X className="h-3 w-3 cursor-pointer" onClick={() => onCategoryChange('all')} />
              </Badge>
            )}
            {selectedSupplier !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {selectedSupplier}
                <X className="h-3 w-3 cursor-pointer" onClick={() => onSupplierChange('all')} />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
