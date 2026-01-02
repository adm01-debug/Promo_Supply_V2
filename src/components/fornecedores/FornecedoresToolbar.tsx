import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload, RefreshCw } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { SavedFiltersDropdown } from '@/components/SavedFiltersDropdown';
import { DataImporter } from '@/components/DataImporter';
import { BulkActionsBar, defaultBulkActions } from '@/components/BulkActionsBar';
import { fornecedorSchema, comprasImportTemplates } from '@/lib/comprasSchemas';
import { exportToExcel } from '@/lib/excelImporter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FornecedoresToolbarProps {
  onSearch: (term: string) => void;
  onRefresh: () => void;
  onNewClick: () => void;
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkInativar: () => void;
  currentFilters: Record<string, unknown>;
  data?: unknown[];
}

export const FornecedoresToolbar = memo(function FornecedoresToolbar({ onSearch, onRefresh, onNewClick, selectedCount, onClearSelection, onBulkDelete, onBulkInativar, currentFilters, data = [] }: FornecedoresToolbarProps) {
  const handleImport = async (fornecedores: unknown[]) => {
    const { error } = await supabase.from('fornecedores').insert(fornecedores);
    if (error) throw error;
    toast.success(`${fornecedores.length} fornecedores importados!`);
    onRefresh();
  };

  const handleExport = () => {
    if (data.length === 0) { toast.warning('Nenhum dado'); return; }
    exportToExcel(data as Record<string, unknown>[], [
      { key: 'razao_social' as const, label: 'Razão Social' },
      { key: 'nome_fantasia' as const, label: 'Nome Fantasia' },
      { key: 'cnpj' as const, label: 'CNPJ' },
      { key: 'email' as const, label: 'E-mail' },
      { key: 'telefone' as const, label: 'Telefone' },
      { key: 'cidade' as const, label: 'Cidade' },
    ], 'fornecedores', 'Fornecedores');
    toast.success('Exportado!');
  };

  const bulkActions = [
    { key: 'inativar', label: 'Inativar', onClick: onBulkInativar },
    defaultBulkActions.delete(onBulkDelete),
  ];

  return (
    <div className="space-y-3">
      {selectedCount > 0 && <BulkActionsBar selectedCount={selectedCount} onClearSelection={onClearSelection} actions={bulkActions} />}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <SearchInput onSearch={onSearch} placeholder="Buscar fornecedor..." className="w-64" />
          <SavedFiltersDropdown entityType="fornecedores" currentFilters={currentFilters} onApplyFilter={() => {}} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="h-4 w-4" /></Button>
          <DataImporter schema={fornecedorSchema} columns={comprasImportTemplates.fornecedores} onImport={handleImport} templateName="fornecedores" title="Importar Fornecedores" trigger={<Button variant="outline" size="sm"><Upload className="h-4 w-4" /></Button>} onSuccess={onRefresh} />
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4" /></Button>
          <Button size="sm" onClick={onNewClick}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
});
export default FornecedoresToolbar;
