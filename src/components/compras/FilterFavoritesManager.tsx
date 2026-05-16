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
import { Star, Save, Trash2, Check, ChevronDown, Bookmark, Loader2 } from 'lucide-react';
import { DashboardFilter, FilterValues } from '@/hooks/useDashboardFilters';
import { cn } from '@/lib/utils';

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
            variant="ghost" 
            size="sm" 
            disabled={!hasActiveFilters}
            className="h-11 px-5 rounded-xl text-zinc-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all font-black text-[10px] tracking-widest gap-2"
          >
            <Save className="h-4 w-4" />
            SAVE PRESET
          </Button>
        </DialogTrigger>
        <DialogContent aria-describedby="dialog-desc" className="bg-[#0a0a0f] border-white/5 backdrop-blur-3xl rounded-[2.5rem] sm:max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white font-black uppercase tracking-tight">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                <Bookmark className="h-5 w-5" />
              </div>
              Save Filter Preset
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="filter-name" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Preset Name</Label>
              <Input
                id="filter-name"
                placeholder="Ex: Electronics - Q2 Strategy"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl h-12 focus:ring-violet-500/20 focus:border-violet-500/40 text-sm font-bold text-white"
              />
            </div>
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Configuration Snapshot:</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-zinc-600 tracking-tighter">Category</p>
                  <p className="text-xs font-bold text-zinc-300 truncate">{currentFilters.category === 'all' ? 'Todas' : currentFilters.category}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-zinc-600 tracking-tighter">Supplier</p>
                  <p className="text-xs font-bold text-zinc-300 truncate">{currentFilters.supplier === 'all' ? 'Todos' : currentFilters.supplier}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-zinc-600 tracking-tighter">Period</p>
                  <p className="text-xs font-bold text-zinc-300">{currentFilters.period}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-zinc-600 tracking-tighter">Comparison</p>
                  <p className="text-xs font-bold text-zinc-300">{currentFilters.showComparison ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setSaveDialogOpen(false)} className="rounded-xl h-12 font-bold text-zinc-400 hover:bg-white/5 uppercase tracking-widest text-[10px]">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!filterName.trim() || saving}
              className="rounded-xl h-12 px-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-black uppercase tracking-widest text-[10px] border-none shadow-lg shadow-violet-500/20"
            >
              {saving ? 'Processing...' : 'Confirm Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Favorite Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-11 px-5 rounded-xl text-zinc-400 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 transition-all font-black text-[10px] tracking-widest gap-2"
          >
            <Star className="h-4 w-4" />
            FAVORITES
            {favorites.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 bg-fuchsia-500/20 text-fuchsia-400 border-none font-black text-[9px]">
                {favorites.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 bg-[#0a0a0f]/95 border-white/5 backdrop-blur-3xl p-2 shadow-2xl z-50 rounded-[1.5rem]">
          {loading ? (
            <div className="p-6 text-center text-xs font-black text-zinc-500 uppercase tracking-widest">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-violet-400" />
              Loading presets...
            </div>
          ) : favorites.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-zinc-600">
                <Star className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">No Presets Found</p>
                <p className="text-[9px] text-zinc-500 font-medium leading-relaxed">Save your frequently used filters for instant executive access.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Saved Presets</div>
              {favorites.map((filter, index) => (
                <div key={filter.id}>
                  <DropdownMenuItem
                    className="flex items-start gap-4 p-3 cursor-pointer rounded-xl focus:bg-white/5 transition-colors group"
                    onClick={() => onApply(filter)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200 group-hover:text-violet-400 transition-colors text-sm">{filter.name}</span>
                        {filter.is_default && (
                          <Badge className="h-4 px-1.5 text-[8px] font-black uppercase bg-violet-500/20 text-violet-400 border-none">Default</Badge>
                        )}
                      </div>
                      <p className="text-[10px] font-medium text-zinc-500 truncate mt-0.5">
                        {formatFilterDescription(filter)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-violet-500/20 hover:text-violet-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetDefault(filter.id);
                        }}
                        title={filter.is_default ? 'Current default' : 'Set as default'}
                      >
                        {filter.is_default ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Star className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-rose-500/20 hover:text-rose-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(filter.id);
                        }}
                        title="Remove preset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </DropdownMenuItem>
                </div>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
