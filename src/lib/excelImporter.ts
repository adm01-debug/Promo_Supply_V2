/**
 * Utilitários para importação e exportação de Excel
 */

import * as XLSX from 'xlsx';

export interface ExcelColumn {
  key: string;
  label: string;
}

/**
 * Exporta dados para arquivo Excel
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExcelColumn[],
  filename: string,
  sheetName: string = 'Dados'
): void {
  // Mapear dados para o formato do Excel
  const exportData = data.map((row) => {
    const exportRow: Record<string, unknown> = {};
    columns.forEach((col) => {
      exportRow[col.label] = row[col.key] ?? '';
    });
    return exportRow;
  });

  // Criar workbook e worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Ajustar largura das colunas
  const colWidths = columns.map((col) => ({ wch: Math.max(col.label.length + 2, 15) }));
  worksheet['!cols'] = colWidths;

  // Fazer download
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Importa dados de arquivo Excel
 */
export async function importExcel(file: File): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          defval: '',
          raw: false,
        });

        // Normalizar headers
        const normalized = jsonData.map((row: Record<string, unknown>) => {
          const newRow: Record<string, unknown> = {};
          Object.keys(row).forEach((key) => {
            const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
            newRow[normalizedKey] = row[key];
          });
          return newRow;
        });

        resolve(normalized);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

export default { exportToExcel, importExcel };
