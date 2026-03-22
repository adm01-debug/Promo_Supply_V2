import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, X, CalendarIcon, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Pagamento } from "@/hooks/usePagamentos";

export interface PagamentoFiltersState {
  search: string;
  status: string;
  formaPagamento: string;
  fornecedorId: string;
  periodoVencimento: string;
  valorMin: number;
  valorMax: number;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

const INITIAL_FILTERS: PagamentoFiltersState = {
  search: "",
  status: "todos",
  formaPagamento: "todos",
  fornecedorId: "todos",
  periodoVencimento: "todos",
  valorMin: 0,
  valorMax: 1000000,
  dateFrom: undefined,
  dateTo: undefined,
};

interface Props {
  pagamentos: Pagamento[];
  filters: PagamentoFiltersState;
  onFiltersChange: (filters: PagamentoFiltersState) => void;
}

export const PagamentoAdvancedFilters = ({ pagamentos, filters, onFiltersChange }: Props) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fornecedores = useMemo(() => {
    const map = new Map<string, string>();
    pagamentos.forEach(p => {
      if (p.fornecedor?.id && p.fornecedor?.razao_social) {
        map.set(p.fornecedor.id, p.fornecedor.razao_social);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [pagamentos]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "todos") count++;
    if (filters.formaPagamento !== "todos") count++;
    if (filters.fornecedorId !== "todos") count++;
    if (filters.periodoVencimento !== "todos") count++;
    if (filters.valorMin > 0 || filters.valorMax < 1000000) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }, [filters]);

  const updateFilter = <K extends keyof PagamentoFiltersState>(key: K, value: PagamentoFiltersState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => onFiltersChange(INITIAL_FILTERS);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, fornecedor ou NF..."
            className="pl-10"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </div>

        {/* Quick period filters */}
        <Select value={filters.periodoVencimento} onValueChange={(v) => updateFilter("periodoVencimento", v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="vencidos">Vencidos</SelectItem>
            <SelectItem value="hoje">Vence Hoje</SelectItem>
            <SelectItem value="semana">Esta Semana</SelectItem>
            <SelectItem value="mes">Este Mês</SelectItem>
            <SelectItem value="proximo_mes">Próximo Mês</SelectItem>
          </SelectContent>
        </Select>

        {/* Toggle advanced */}
        <Button
          variant={showAdvanced ? "default" : "outline"}
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{activeFilterCount}</Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t">
          {/* Status */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Forma Pagamento */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Forma Pagamento</label>
            <Select value={filters.formaPagamento} onValueChange={(v) => updateFilter("formaPagamento", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fornecedor */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Fornecedor</label>
            <Select value={filters.fornecedorId} onValueChange={(v) => updateFilter("fornecedorId", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {fornecedores.map(([id, nome]) => (
                  <SelectItem key={id} value={id}>{nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Vencimento De</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filters.dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(d) => updateFilter("dateFrom", d)}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </Card>
  );
};

export const applyAdvancedFilters = (pagamentos: Pagamento[], filters: PagamentoFiltersState): Pagamento[] => {
  let result = pagamentos;
  const hoje = new Date();

  if (filters.search) {
    const term = filters.search.toLowerCase();
    result = result.filter(p =>
      p.numero.toLowerCase().includes(term) ||
      p.fornecedor?.razao_social?.toLowerCase().includes(term) ||
      p.numero_nf?.toLowerCase().includes(term)
    );
  }

  if (filters.status !== "todos") {
    result = result.filter(p => p.status === filters.status);
  }

  if (filters.formaPagamento !== "todos") {
    result = result.filter(p => p.forma_pagamento === filters.formaPagamento);
  }

  if (filters.fornecedorId !== "todos") {
    result = result.filter(p => p.fornecedor_id === filters.fornecedorId);
  }

  if (filters.periodoVencimento !== "todos") {
    const hojeStr = hoje.toISOString().split('T')[0];
    switch (filters.periodoVencimento) {
      case "vencidos":
        result = result.filter(p => p.data_vencimento < hojeStr && p.status !== 'pago');
        break;
      case "hoje":
        result = result.filter(p => p.data_vencimento === hojeStr);
        break;
      case "semana": {
        const nextWeek = new Date(hoje);
        nextWeek.setDate(nextWeek.getDate() + 7);
        result = result.filter(p => p.data_vencimento >= hojeStr && p.data_vencimento <= nextWeek.toISOString().split('T')[0]);
        break;
      }
      case "mes": {
        const nextMonth = new Date(hoje);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        result = result.filter(p => p.data_vencimento >= hojeStr && p.data_vencimento <= nextMonth.toISOString().split('T')[0]);
        break;
      }
    }
  }

  if (filters.dateFrom) {
    const fromStr = filters.dateFrom.toISOString().split('T')[0];
    result = result.filter(p => p.data_vencimento >= fromStr);
  }

  if (filters.dateTo) {
    const toStr = filters.dateTo.toISOString().split('T')[0];
    result = result.filter(p => p.data_vencimento <= toStr);
  }

  if (filters.valorMin > 0) {
    result = result.filter(p => p.valor >= filters.valorMin);
  }

  if (filters.valorMax < 1000000) {
    result = result.filter(p => p.valor <= filters.valorMax);
  }

  return result;
};

export { INITIAL_FILTERS };
