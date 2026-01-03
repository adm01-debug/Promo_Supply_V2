/**
 * Componente de Filtros Avançados
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Filter, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'date' | 'dateRange';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface FilterValue {
  key: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
  value: unknown;
}

interface AdvancedFiltersProps {
  filters: FilterConfig[];
  values: FilterValue[];
  onChange: (values: FilterValue[]) => void;
  className?: string;
}

export function AdvancedFilters({
  filters,
  values,
  onChange,
  className,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});

  const handleApply = () => {
    const newFilters: FilterValue[] = [];
    Object.entries(localValues).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        newFilters.push({ key, operator: 'eq', value });
      }
    });
    onChange(newFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalValues({});
    onChange([]);
    setIsOpen(false);
  };

  const removeFilter = (key: string) => {
    const newValues = values.filter((v) => v.key !== key);
    onChange(newValues);
    setLocalValues((prev) => {
      const newLocal = { ...prev };
      delete newLocal[key];
      return newLocal;
    });
  };

  const renderFilterInput = (filter: FilterConfig) => {
    switch (filter.type) {
      case 'select':
        return (
          <Select
            value={String(localValues[filter.key] || '')}
            onValueChange={(value) =>
              setLocalValues((prev) => ({ ...prev, [filter.key]: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={filter.placeholder || 'Selecione...'} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !localValues[filter.key] && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localValues[filter.key]
                  ? format(new Date(localValues[filter.key] as string), 'PPP', {
                      locale: ptBR,
                    })
                  : 'Selecione uma data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  localValues[filter.key]
                    ? new Date(localValues[filter.key] as string)
                    : undefined
                }
                onSelect={(date) =>
                  setLocalValues((prev) => ({
                    ...prev,
                    [filter.key]: date?.toISOString(),
                  }))
                }
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={String(localValues[filter.key] || '')}
            onChange={(e) =>
              setLocalValues((prev) => ({
                ...prev,
                [filter.key]: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            placeholder={filter.placeholder || 'Digite um número...'}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={String(localValues[filter.key] || '')}
            onChange={(e) =>
              setLocalValues((prev) => ({ ...prev, [filter.key]: e.target.value }))
            }
            placeholder={filter.placeholder || 'Digite...'}
          />
        );
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {values.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {values.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="font-medium">Filtros Avançados</div>
            <div className="space-y-3">
              {filters.map((filter) => (
                <div key={filter.key} className="space-y-1">
                  <Label>{filter.label}</Label>
                  {renderFilterInput(filter)}
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Limpar
              </Button>
              <Button size="sm" onClick={handleApply}>
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filters */}
      {values.map((filter) => {
        const config = filters.find((f) => f.key === filter.key);
        return (
          <Badge key={filter.key} variant="secondary" className="gap-1">
            {config?.label}: {String(filter.value)}
            <button
              onClick={() => removeFilter(filter.key)}
              className="ml-1 rounded-full hover:bg-muted-foreground/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  );
}

export default AdvancedFilters;
