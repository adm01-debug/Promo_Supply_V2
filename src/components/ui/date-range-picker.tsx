import * as React from 'react';
import { format, isAfter, isBefore, isValid, parse, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  presets?: boolean;
}

const defaultPresets = [
  { label: 'Hoje', getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Últimos 7 dias', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Últimos 30 dias', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'Este mês', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Mês passado', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Este ano', getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Selecione o período',
  disabled,
  minDate,
  maxDate,
  className,
  presets = true,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(value);

  React.useEffect(() => {
    setTempRange(value);
  }, [value]);

  const handleSelect = (range: DateRange | undefined) => {
    setTempRange(range);
  };

  const handleApply = () => {
    onChange(tempRange);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setTempRange(undefined);
    setOpen(false);
  };

  const handlePreset = (preset: typeof defaultPresets[0]) => {
    const range = preset.getValue();
    setTempRange(range);
    onChange(range);
    setOpen(false);
  };

  const formatRange = () => {
    if (!value?.from) return placeholder;
    if (!value.to) return format(value.from, 'dd/MM/yyyy', { locale: ptBR });
    return `${format(value.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(value.to, 'dd/MM/yyyy', { locale: ptBR })}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatRange()}
          {value?.from && (
            <X
              className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {presets && (
            <div className="border-r p-2 space-y-1">
              {defaultPresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handlePreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={tempRange}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={ptBR}
              disabled={(date) => {
                if (minDate && isBefore(date, minDate)) return true;
                if (maxDate && isAfter(date, maxDate)) return true;
                return false;
              }}
            />
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Limpar
              </Button>
              <Button size="sm" onClick={handleApply}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Single date picker with manual input
interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecione a data',
  disabled,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(
    value ? format(value, 'dd/MM/yyyy') : ''
  );

  React.useEffect(() => {
    setInputValue(value ? format(value, 'dd/MM/yyyy') : '');
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Try to parse the date
    if (val.length === 10) {
      const parsed = parse(val, 'dd/MM/yyyy', new Date());
      if (isValid(parsed)) {
        if (minDate && isBefore(parsed, minDate)) return;
        if (maxDate && isAfter(parsed, maxDate)) return;
        onChange(parsed);
      }
    }
  };

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
    setOpen(false);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        placeholder="DD/MM/AAAA"
        disabled={disabled}
        className="w-32"
        maxLength={10}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" disabled={disabled}>
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
            locale={ptBR}
            disabled={(date) => {
              if (minDate && isBefore(date, minDate)) return true;
              if (maxDate && isAfter(date, maxDate)) return true;
              return false;
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
