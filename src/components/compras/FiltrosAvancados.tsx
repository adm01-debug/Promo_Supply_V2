import { useState } from "react";
import { 
  Filter, 
  Calendar,
  DollarSign,
  Building2,
  User,
  Tag,
  RotateCcw
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
};

const empresasOptions = [
  'Promo Supply',
  'Gift Solutions',
  'Marketing Promo',
  'Brindes Express',
  'Corporate Gifts',
];

const vendedoresOptions = [
  'João Silva',
  'Maria Santos',
  'Carlos Oliveira',
  'Ana Costa',
  'Pedro Lima',
];

const fornecedoresOptions = [
  'ABC Ltda',
  'Distribuidora XYZ',
  'Importadora 123',
  'Fábrica Premium',
  'Atacado Brasil',
];

const tiposOptions = [
  { value: 'PE_LISO', label: 'P.E. Liso' },
  { value: 'FAB_LISO', label: 'Fab. Liso' },
  { value: 'FAB_PERSONALIZADO', label: 'Fab. Personalizado' },
];

const prioridadesOptions = [
  { value: 'baixa', label: 'Baixa', color: 'bg-slate-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-500' },
  { value: 'urgente', label: 'Urgente', color: 'bg-red-500' },
];

interface FiltrosAvancadosProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  onApply: () => void;
}

export function FiltrosAvancados({ filters, onFiltersChange, onApply }: FiltrosAvancadosProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

  const updateFilter = <K extends keyof AdvancedFilters>(
    key: K, 
    value: AdvancedFilters[K]
  ) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayValue = (key: keyof AdvancedFilters, value: string) => {
    const current = localFilters[key] as string[];
    const newValue = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
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
        <Button variant="outline" size="icon" className="relative">
          <Filter className="w-4 h-4" />
          {activeFiltersCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            Filtros Avançados
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          <Accordion type="multiple" defaultValue={['periodo', 'valor']} className="w-full">
            {/* Date Range */}
            <AccordionItem value="periodo">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Período</span>
                  {(localFilters.dateRange.from || localFilters.dateRange.to) && (
                    <Badge variant="secondary" className="ml-2 text-xs">Ativo</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Data Inicial</Label>
                    <Input
                      type="date"
                      value={localFilters.dateRange.from}
                      onChange={(e) => updateFilter('dateRange', {
                        ...localFilters.dateRange,
                        from: e.target.value
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Data Final</Label>
                    <Input
                      type="date"
                      value={localFilters.dateRange.to}
                      onChange={(e) => updateFilter('dateRange', {
                        ...localFilters.dateRange,
                        to: e.target.value
                      })}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Value Range */}
            <AccordionItem value="valor">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span>Faixa de Valor</span>
                  {(localFilters.valorMin > 0 || localFilters.valorMax < 100000) && (
                    <Badge variant="secondary" className="ml-2 text-xs">Ativo</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 space-y-4">
                  <div className="flex justify-between text-sm">
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
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Empresas */}
            <AccordionItem value="empresas">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>Empresas</span>
                  {localFilters.empresas.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {localFilters.empresas.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 space-y-2">
                  {empresasOptions.map(empresa => (
                    <div key={empresa} className="flex items-center gap-2">
                      <Checkbox
                        id={`empresa-${empresa}`}
                        checked={localFilters.empresas.includes(empresa)}
                        onCheckedChange={() => toggleArrayValue('empresas', empresa)}
                      />
                      <Label 
                        htmlFor={`empresa-${empresa}`} 
                        className="text-sm cursor-pointer"
                      >
                        {empresa}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Vendedores */}
            <AccordionItem value="vendedores">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span>Vendedores</span>
                  {localFilters.vendedores.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {localFilters.vendedores.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 space-y-2">
                  {vendedoresOptions.map(vendedor => (
                    <div key={vendedor} className="flex items-center gap-2">
                      <Checkbox
                        id={`vendedor-${vendedor}`}
                        checked={localFilters.vendedores.includes(vendedor)}
                        onCheckedChange={() => toggleArrayValue('vendedores', vendedor)}
                      />
                      <Label 
                        htmlFor={`vendedor-${vendedor}`} 
                        className="text-sm cursor-pointer"
                      >
                        {vendedor}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Tipos */}
            <AccordionItem value="tipos">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <span>Tipos</span>
                  {localFilters.tipos.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {localFilters.tipos.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 space-y-2">
                  {tiposOptions.map(tipo => (
                    <div key={tipo.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`tipo-${tipo.value}`}
                        checked={localFilters.tipos.includes(tipo.value)}
                        onCheckedChange={() => toggleArrayValue('tipos', tipo.value)}
                      />
                      <Label 
                        htmlFor={`tipo-${tipo.value}`} 
                        className="text-sm cursor-pointer"
                      >
                        {tipo.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Prioridades */}
            <AccordionItem value="prioridades">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <span>Prioridades</span>
                  {localFilters.prioridades.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {localFilters.prioridades.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 space-y-2">
                  {prioridadesOptions.map(prioridade => (
                    <div key={prioridade.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`prioridade-${prioridade.value}`}
                        checked={localFilters.prioridades.includes(prioridade.value)}
                        onCheckedChange={() => toggleArrayValue('prioridades', prioridade.value)}
                      />
                      <Label 
                        htmlFor={`prioridade-${prioridade.value}`} 
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
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

        <SheetFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Limpar
          </Button>
          <Button onClick={handleApply}>
            Aplicar Filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export { initialFilters };
