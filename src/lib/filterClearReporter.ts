/**
 * Formats a snapshot of cleared filters into a human-readable description
 * for toast notifications. Lists what was cleared (filters) and what was
 * removed from local storage.
 */

export interface FilterFieldDescriptor {
  /** Internal key of the filter */
  key: string;
  /** Human-readable label (e.g. "Busca", "Categoria") */
  label: string;
  /** The previous (pre-clear) value */
  value: unknown;
  /** Optional formatter to render the value as text */
  format?: (value: unknown) => string;
}

export interface ClearReport {
  /** Lines describing each filter that was active and got cleared */
  filterLines: string[];
  /** localStorage keys that were removed during cleanup */
  removedStorageKeys: string[];
  /** Whether anything was actually cleared */
  hadActiveFilters: boolean;
}

const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '' || value === 'all' || value === 'todas' || value === 'todos';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
};

const defaultFormat = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  if (value instanceof Date) return value.toLocaleDateString('pt-BR');
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export function buildClearReport(
  fields: FilterFieldDescriptor[],
  removedStorageKeys: string[] = [],
): ClearReport {
  const filterLines: string[] = [];
  for (const field of fields) {
    if (isEmpty(field.value)) continue;
    const formatter = field.format ?? defaultFormat;
    filterLines.push(`${field.label}: ${formatter(field.value)}`);
  }
  return {
    filterLines,
    removedStorageKeys,
    hadActiveFilters: filterLines.length > 0,
  };
}

/**
 * Formats the report into a multi-line string suitable for a toast description.
 */
export function formatClearReportDescription(report: ClearReport): string {
  const parts: string[] = [];
  if (report.filterLines.length > 0) {
    parts.push('Filtros removidos:');
    parts.push(...report.filterLines.map((l) => `  • ${l}`));
  }
  if (report.removedStorageKeys.length > 0) {
    parts.push('');
    parts.push('Armazenamento local limpo:');
    parts.push(...report.removedStorageKeys.map((k) => `  • ${k}`));
  }
  return parts.join('\n');
}
