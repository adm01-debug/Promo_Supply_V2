/**
 * Utilitários para importação de CSV
 */

import Papa from 'papaparse';

export interface CSVImportOptions {
  skipFirstRow?: boolean;
  delimiter?: string;
}

/**
 * Importa dados de arquivo CSV
 */
export async function importCSV(
  file: File,
  options: CSVImportOptions = {}
): Promise<unknown[]> {
  const { skipFirstRow = false, delimiter = ',' } = options;

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        let data = results.data as unknown[];
        if (skipFirstRow && data.length > 0) {
          data = data.slice(1);
        }
        resolve(data);
      },
      error: (error) => reject(error),
    });
  });
}

/**
 * Gera template CSV para download
 */
export function generateCSVTemplate(
  columns: { key: string; label: string; example?: string }[],
  filename: string
): void {
  const headers = columns.map((col) => col.label).join(',');
  const exampleRow = columns.map((col) => col.example || '').join(',');
  const content = `${headers}\n${exampleRow}`;

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_template.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default { importCSV, generateCSVTemplate };
