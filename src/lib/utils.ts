import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatDate = (date: string | Date): string =>
  format(typeof date === 'string' ? new Date(date) : date, "dd/MM/yyyy", { locale: ptBR });

export const formatDateTime = (date: string | Date): string =>
  format(typeof date === 'string' ? new Date(date) : date, "dd/MM/yyyy HH:mm", { locale: ptBR });
