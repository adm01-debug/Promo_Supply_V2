import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { type FilterValues } from '@/hooks/useDashboardFilters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X, Search, Sparkles } from 'lucide-react';
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
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-primary/5 text-primary border border-primary/10">
              <Filter className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Painel de Filtros</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Categoria de Compra</Label>
                <Select value={selectedCategory} onValueChange={onCategoryChange}>
                  <SelectTrigger className="w-[180px] h-10 bg-background/50 border-muted-foreground/20 hover:border-primary/50 transition-all rounded-xl focus:ring-primary/20">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-md border shadow-2xl z-50 rounded-xl">
                    <SelectItem value="all" className="rounded-lg">Todas as Categorias</SelectItem>
                    {allCategories.map(cat => (
                      <SelectItem key={cat} value={cat} className="rounded-lg">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Fornecedor Estratégico</Label>
                <Select value={selectedSupplier} onValueChange={onSupplierChange}>
                  <SelectTrigger className="w-[180px] h-10 bg-background/50 border-muted-foreground/20 hover:border-primary/50 transition-all rounded-xl focus:ring-primary/20">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-md border shadow-2xl z-50 rounded-xl">
                    <SelectItem value="all" className="rounded-lg">Todos os Fornecedores</SelectItem>
                    {allSuppliers.map(sup => (
                      <SelectItem key={sup} value={sup} className="rounded-lg">{sup}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <AnimatePresence>
                {hasActiveFilters && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onClearFilters} 
                      className="h-10 px-4 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all group"
                    >
                      <X className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
                      <span className="text-xs font-bold">LIMPAR</span>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-success/5 text-success border border-success/10 animate-pulse-slow">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-tight">IA Sugestões Ativas</span>
              </div>
              
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

          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dashed">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Filtros Ativos:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategory !== 'all' && (
                      <Badge variant="secondary" className="pl-3 pr-1 py-1 rounded-full bg-primary/10 text-primary border-none hover:bg-primary/20 transition-colors">
                        <span className="text-[11px] font-semibold">{selectedCategory}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 ml-1.5 rounded-full hover:bg-primary/20"
                          onClick={() => onCategoryChange('all')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    {selectedSupplier !== 'all' && (
                      <Badge variant="secondary" className="pl-3 pr-1 py-1 rounded-full bg-chart-2/10 text-chart-2 border-none hover:bg-chart-2/20 transition-colors">
                        <span className="text-[11px] font-semibold">{selectedSupplier}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 ml-1.5 rounded-full hover:bg-chart-2/20"
                          onClick={() => onSupplierChange('all')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};
