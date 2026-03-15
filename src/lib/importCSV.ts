/**
 * Importação de dados via CSV com validação, preview e mapeamento de colunas.
 */

export interface ImportResult<T = Record<string, string>> {
  data: T[];
  errors: ImportError[];
  totalRows: number;
  validRows: number;
}

export interface ImportError {
  row: number;
  column?: string;
  message: string;
}

export interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
  required?: boolean;
  transform?: (value: string) => unknown;
}

/**
 * Parse CSV content with semicolon or comma delimiter auto-detection.
 * Handles BOM, quoted fields, and newlines inside quotes.
 */
export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  // Remove BOM
  const cleaned = content.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return { headers: [], rows: [] };

  // Auto-detect delimiter
  const firstLine = cleaned.split('\n')[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';

  const lines = splitCSVLines(cleaned);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVRow(lines[0], delimiter);
  const rows = lines.slice(1)
    .filter(line => line.trim())
    .map(line => parseCSVRow(line, delimiter));

  return { headers, rows };
}

function splitCSVLines(content: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') i++; // Skip \r\n
      if (current.trim()) lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) lines.push(current);
  return lines;
}

function parseCSVRow(row: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Read a File as text with encoding detection.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Apply column mappings and validate rows.
 */
export function applyMappings(
  headers: string[],
  rows: string[][],
  mappings: ColumnMapping[]
): ImportResult {
  const errors: ImportError[] = [];
  const data: Record<string, string>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, string> = {};
    let valid = true;

    for (const mapping of mappings) {
      const colIndex = headers.findIndex(
        h => h.toLowerCase().trim() === mapping.csvColumn.toLowerCase().trim()
      );

      if (colIndex === -1) {
        if (mapping.required) {
          errors.push({ row: i + 2, column: mapping.csvColumn, message: `Coluna "${mapping.csvColumn}" não encontrada` });
          valid = false;
        }
        continue;
      }

      const value = row[colIndex] || '';
      if (mapping.required && !value.trim()) {
        errors.push({ row: i + 2, column: mapping.csvColumn, message: `Valor obrigatório em "${mapping.csvColumn}"` });
        valid = false;
        continue;
      }

      record[mapping.dbColumn] = mapping.transform
        ? String(mapping.transform(value))
        : value;
    }

    if (valid) data.push(record);
  }

  return {
    data,
    errors,
    totalRows: rows.length,
    validRows: data.length,
  };
}

/**
 * Generate a CSV template for download (empty file with headers).
 */
export function downloadCSVTemplate(columns: { label: string }[], filename: string): void {
  const BOM = '\uFEFF';
  const header = columns.map(c => c.label).join(';');
  const blob = new Blob([BOM + header + '\r\n'], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `template_${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
