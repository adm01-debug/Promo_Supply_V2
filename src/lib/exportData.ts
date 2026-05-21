/**
 * Utilitário de exportação de dados para CSV e Excel (XLSX via CSV com BOM).
 * Suporta formatação BRL, datas pt-BR e nomes de colunas traduzidos.
 */

import { parseLocalDate } from './dateUtils';

interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: unknown) => string;
}

const formatCurrency = (value: unknown): string => {
  const num = Number(value);
  if (isNaN(num)) return '';
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
};

const formatDate = (value: unknown): string => {
  if (!value) return '';
  const d = parseLocalDate(value as string);
  return d ? d.toLocaleDateString('pt-BR') : String(value);
};

const formatDateTime = (value: unknown): string => {
  if (!value) return '';
  const d = parseLocalDate(value as string);
  return d ? d.toLocaleString('pt-BR') : String(value);
};

// Escape CSV value (delimiter is ';') and neutralize formula injection.
const escapeCSV = (val: string): string => {
  // Prevent CSV/formula injection in spreadsheet apps: prefix risky leading chars.
  let safe = /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;
  if (/[;",\n\r]/.test(safe)) {
    safe = `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
};

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const header = columns.map(c => escapeCSV(c.label)).join(';');
  const rows = data.map(row =>
    columns.map(col => {
      const raw = row[col.key];
      const formatted = col.formatter ? col.formatter(raw) : (raw == null ? '' : String(raw));
      return escapeCSV(formatted);
    }).join(';')
  );

  const csvContent = BOM + [header, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---- Predefined column sets per module ----

export const pedidoColumns: ExportColumn[] = [
  { key: 'numero', label: 'Número' },
  { key: 'status', label: 'Status' },
  { key: 'fornecedor', label: 'Fornecedor' },
  { key: 'valor_total', label: 'Valor Total', formatter: formatCurrency },
  { key: 'data_emissao', label: 'Data Emissão', formatter: formatDate },
  { key: 'data_previsao', label: 'Previsão Entrega', formatter: formatDate },
  { key: 'data_entrega', label: 'Data Entrega', formatter: formatDate },
  { key: 'condicao_pagamento', label: 'Condição Pagamento' },
  { key: 'observacoes', label: 'Observações' },
];

export const solicitacaoColumns: ExportColumn[] = [
  { key: 'numero', label: 'Número' },
  { key: 'titulo', label: 'Título' },
  { key: 'status', label: 'Status' },
  { key: 'prioridade', label: 'Prioridade' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'valor_estimado', label: 'Valor Estimado', formatter: formatCurrency },
  { key: 'quantidade', label: 'Quantidade' },
  { key: 'departamento', label: 'Departamento' },
  { key: 'data_necessidade', label: 'Data Necessidade', formatter: formatDate },
  { key: 'created_at', label: 'Criado em', formatter: formatDateTime },
];

export const fornecedorColumns: ExportColumn[] = [
  { key: 'codigo', label: 'Código' },
  { key: 'razao_social', label: 'Razão Social' },
  { key: 'nome_fantasia', label: 'Nome Fantasia' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'email', label: 'Email' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'Estado' },
  { key: 'status', label: 'Status' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'avaliacao', label: 'Avaliação' },
  { key: 'segmento', label: 'Segmento' },
];

export const cotacaoColumns: ExportColumn[] = [
  { key: 'numero', label: 'Número' },
  { key: 'status', label: 'Status' },
  { key: 'valor_unitario', label: 'Valor Unitário', formatter: formatCurrency },
  { key: 'quantidade', label: 'Quantidade' },
  { key: 'valor_total', label: 'Valor Total', formatter: formatCurrency },
  { key: 'prazo_entrega', label: 'Prazo Entrega (dias)' },
  { key: 'validade_proposta', label: 'Validade', formatter: formatDate },
  { key: 'condicao_pagamento', label: 'Condição Pagamento' },
  { key: 'score_total', label: 'Score Total' },
  { key: 'created_at', label: 'Criado em', formatter: formatDateTime },
];

export const pagamentoColumns: ExportColumn[] = [
  { key: 'numero', label: 'Número' },
  { key: 'status', label: 'Status' },
  { key: 'valor', label: 'Valor', formatter: formatCurrency },
  { key: 'valor_pago', label: 'Valor Pago', formatter: formatCurrency },
  { key: 'data_vencimento', label: 'Vencimento', formatter: formatDate },
  { key: 'data_pagamento', label: 'Data Pagamento', formatter: formatDate },
  { key: 'forma_pagamento', label: 'Forma Pagamento' },
  { key: 'numero_nf', label: 'Nota Fiscal' },
];

export { formatCurrency, formatDate, formatDateTime };
