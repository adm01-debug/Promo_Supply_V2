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
import { cn } from '@/lib/utils';

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
      <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[1.5rem]">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-lg shadow-violet-500/5">
              <Filter className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Filter Engine</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1">Purchasing Category</Label>
                <Select value={selectedCategory} onValueChange={onCategoryChange}>
                  <SelectTrigger className="w-[190px] h-11 bg-white/[0.03] border-white/10 hover:border-violet-500/40 transition-all rounded-xl focus:ring-violet-500/20 text-xs font-bold text-zinc-200">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f] border-white/10 backdrop-blur-3xl z-50 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                    <SelectItem value="all" className="rounded-lg text-xs font-bold focus:bg-violet-500/20 focus:text-violet-200 py-2.5">Todas as Categorias</SelectItem>
                    {allCategories.map(cat => (
                      <SelectItem key={cat} value={cat} className="rounded-lg text-xs font-bold focus:bg-violet-500/20 focus:text-violet-200 py-2.5">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest ml-1">Strategic Supplier</Label>
                <Select value={selectedSupplier} onValueChange={onSupplierChange}>
                  <SelectTrigger className="w-[190px] h-11 bg-white/[0.03] border-white/10 hover:border-violet-500/40 transition-all rounded-xl focus:ring-violet-500/20 text-xs font-bold text-zinc-200">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f] border-white/10 backdrop-blur-3xl z-50 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                    <SelectItem value="all" className="rounded-lg text-xs font-bold focus:bg-violet-500/20 focus:text-violet-200 py-2.5">Todos os Fornecedores</SelectItem>
                    {allSuppliers.map(sup => (
                      <SelectItem key={sup} value={sup} className="rounded-lg text-xs font-bold focus:bg-violet-500/20 focus:text-violet-200 py-2.5">{sup}</SelectItem>
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
                      className="h-11 px-5 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all group font-black text-[10px] tracking-widest"
                    >
                      <X className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
                      LIMPAR
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="ml-auto flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 animate-pulse-slow">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em]">AI Smart Optimization</span>
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
                <div className="flex items-center gap-3 mt-5 pt-5 border-t border-dashed border-white/5">
                  <span className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em]">Active Filters:</span>
                  <div className="flex flex-wrap gap-2.5">
                    {selectedCategory !== 'all' && (
                      <Badge className="pl-4 pr-1.5 py-1.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 transition-all shadow-lg shadow-violet-500/5">
                        <span className="text-[11px] font-bold tracking-tight uppercase">{selectedCategory}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 ml-2 rounded-full hover:bg-white/10 text-violet-300"
                          onClick={() => onCategoryChange('all')}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </Badge>
                    )}
                    {selectedSupplier !== 'all' && (
                      <Badge className="pl-4 pr-1.5 py-1.5 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 hover:bg-fuchsia-500/20 transition-all shadow-lg shadow-fuchsia-500/5">
                        <span className="text-[11px] font-bold tracking-tight uppercase">{selectedSupplier}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 ml-2 rounded-full hover:bg-white/10 text-fuchsia-300"
                          onClick={() => onSupplierChange('all')}
                        >
                          <X className="h-3.5 w-3.5" />
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
