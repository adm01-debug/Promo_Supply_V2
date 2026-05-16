import { useState } from "react";
import { 
  Filter, 
  Calendar,
  DollarSign,
  Building2,
  User,
  Tag,
  RotateCcw,
  Sparkles
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface AdvancedFilters {
  dateRange: { from: string; to: string };
  valorMin: number;
  valorMax: number;
  empresas: string[];
  vendedores: string[];
  fornecedores: string[];
  tipos: string[];
  prioridades: string[];
  status: string[];
}

const initialFilters: AdvancedFilters = {
  dateRange: { from: '', to: '' },
  valorMin: 0,
  valorMax: 100000,
  empresas: [],
  vendedores: [],
  fornecedores: [],
  tipos: [],
  prioridades: [],
  status: [],
};

const empresasOptions = ['Promo Supply', 'Gift Solutions', 'Marketing Promo', 'Brindes Express', 'Corporate Gifts'];
const vendedoresOptions = ['João Silva', 'Maria Santos', 'Carlos Oliveira', 'Ana Costa', 'Pedro Lima'];
const fornecedoresOptions = ['ABC Ltda', 'Distribuidora XYZ', 'Importadora 123', 'Fábrica Premium', 'Atacado Brasil'];
const tiposOptions = [
  { value: 'PE_LISO', label: 'P.E. Liso' },
  { value: 'FAB_LISO', label: 'Fab. Liso' },
  { value: 'FAB_PERSONALIZADO', label: 'Fab. Personalizado' },
];

const prioridadesOptions = [
  { value: 'baixa', label: 'Baixa', color: 'bg-zinc-600' },
  { value: 'normal', label: 'Normal', color: 'bg-indigo-500' },
  { value: 'alta', label: 'Alta', color: 'bg-amber-500' },
  { value: 'urgente', label: 'Urgente', color: 'bg-rose-500' },
];

const statusOptions = [
  { value: 'AGUARDANDO_COTACAO', label: 'Pendente' },
  { value: 'EM_COTACAO', label: 'Em Cotação' },
  { value: 'FORNECEDOR_SELECIONADO', label: 'Aprovada' },
  { value: 'AGUARDANDO_PAGAMENTO', label: 'Em Andamento' },
  { value: 'ENTREGUE', label: 'Finalizada' },
  { value: 'REJEITADA', label: 'Rejeitada' },
];

interface FiltrosAvancadosProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  onApply: () => void;
}

export function FiltrosAvancados({ filters, onFiltersChange, onApply }: FiltrosAvancadosProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

  const updateFilter = <K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayValue = (key: keyof AdvancedFilters, value: string) => {
    const current = localFilters[key] as string[];
    const newValue = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    updateFilter(key, newValue as AdvancedFilters[typeof key]);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApply();
    setOpen(false);
  };

  const handleReset = () => {
    setLocalFilters(initialFilters);
  };

  const activeFiltersCount = [
    localFilters.dateRange.from || localFilters.dateRange.to ? 1 : 0,
    localFilters.valorMin > 0 || localFilters.valorMax < 100000 ? 1 : 0,
    localFilters.empresas.length,
    localFilters.vendedores.length,
    localFilters.fornecedores.length,
    localFilters.tipos.length,
    localFilters.prioridades.length,
  ].reduce((a, b) => a + b, 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-12 w-12 rounded-xl bg-white/[0.03] border-white/5 hover:border-violet-500/40 relative shadow-lg"
        >
          <Filter className="w-5 h-5 text-violet-400" />
          {activeFiltersCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 text-[10px] flex items-center justify-center bg-violet-500 border-none rounded-full"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px] bg-[#0a0a0f]/95 border-white/10 backdrop-blur-3xl">
        <SheetHeader className="pb-6 border-b border-white/5">
          <SheetTitle className="flex items-center gap-3 text-white font-black uppercase tracking-tight">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
              <Sparkles className="w-5 h-5" />
            </div>
            Advanced Filtering
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          <Accordion type="multiple" defaultValue={['periodo', 'valor']} className="w-full space-y-4">
            <AccordionItem value="periodo" className="border-white/5">
              <AccordionTrigger className="hover:no-underline py-4 hover:bg-white/[0.02] px-4 rounded-xl">
                <div className="flex items-center gap-3 text-white font-black uppercase tracking-widest text-xs">
                  <Calendar className="w-4 h-4 text-violet-400" />
                  Timeframe
                  {(localFilters.dateRange.from || localFilters.dateRange.to) && (
                    <Badge className="bg-violet-500/10 text-violet-400 border-none rounded-full px-2 text-[9px] uppercase tracking-widest">Active</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-zinc-600">Start Date</Label>
                    <Input
                      type="date"
                      value={localFilters.dateRange.from}
                      onChange={(e) => updateFilter('dateRange', { ...localFilters.dateRange, from: e.target.value })}
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-zinc-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-zinc-600">End Date</Label>
                    <Input
                      type="date"
                      value={localFilters.dateRange.to}
                      onChange={(e) => updateFilter('dateRange', { ...localFilters.dateRange, to: e.target.value })}
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-zinc-300"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="valor" className="border-white/5">
              <AccordionTrigger className="hover:no-underline py-4 hover:bg-white/[0.02] px-4 rounded-xl">
                <div className="flex items-center gap-3 text-white font-black uppercase tracking-widest text-xs">
                  <DollarSign className="w-4 h-4 text-violet-400" />
                  Value Range
                  {(localFilters.valorMin > 0 || localFilters.valorMax < 100000) && (
                    <Badge className="bg-violet-500/10 text-violet-400 border-none rounded-full px-2 text-[9px] uppercase tracking-widest">Active</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <div className="pt-2 space-y-6">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <span>R$ {localFilters.valorMin.toLocaleString('pt-BR')}</span>
                    <span>R$ {localFilters.valorMax.toLocaleString('pt-BR')}</span>
                  </div>
                  <Slider
                    min={0}
                    max={100000}
                    step={1000}
                    value={[localFilters.valorMin, localFilters.valorMax]}
                    onValueChange={([min, max]) => {
                      updateFilter('valorMin', min);
                      updateFilter('valorMax', max);
                    }}
                    className="py-4"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="empresas" className="border-white/5">
              <AccordionTrigger className="hover:no-underline py-4 hover:bg-white/[0.02] px-4 rounded-xl">
                <div className="flex items-center gap-3 text-white font-black uppercase tracking-widest text-xs">
                  <Building2 className="w-4 h-4 text-violet-400" />
                  Entities
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <div className="pt-2 space-y-2">
                  {empresasOptions.map(empresa => (
                    <div key={empresa} className="flex items-center gap-3">
                      <Checkbox
                        id={`empresa-${empresa}`}
                        checked={localFilters.empresas.includes(empresa)}
                        onCheckedChange={() => toggleArrayValue('empresas', empresa)}
                      />
                      <Label htmlFor={`empresa-${empresa}`} className="text-xs font-medium text-zinc-300 cursor-pointer">{empresa}</Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prioridades" className="border-white/5">
              <AccordionTrigger className="hover:no-underline py-4 hover:bg-white/[0.02] px-4 rounded-xl">
                <div className="flex items-center gap-3 text-white font-black uppercase tracking-widest text-xs">
                  <Tag className="w-4 h-4 text-violet-400" />
                  Priorities
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <div className="pt-2 space-y-2">
                  {prioridadesOptions.map(prioridade => (
                    <div key={prioridade.value} className="flex items-center gap-3">
                      <Checkbox
                        id={`prioridade-${prioridade.value}`}
                        checked={localFilters.prioridades.includes(prioridade.value)}
                        onCheckedChange={() => toggleArrayValue('prioridades', prioridade.value)}
                      />
                      <Label htmlFor={`prioridade-${prioridade.value}`} className="text-xs font-medium text-zinc-300 cursor-pointer flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", prioridade.color)} />
                        {prioridade.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <SheetFooter className="border-t border-white/5 pt-6 gap-3">
          <Button variant="ghost" onClick={handleReset} className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] text-zinc-500 hover:text-white hover:bg-white/5">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleApply} className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-none shadow-lg shadow-violet-500/20 px-8">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export { initialFilters };
