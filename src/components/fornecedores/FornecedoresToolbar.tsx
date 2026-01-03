import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload, RefreshCw } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { SavedFiltersDropdown } from '@/components/SavedFiltersDropdown';
import { DataImporter } from '@/components/DataImporter';
import { fornecedorSchema } from '@/lib/comprasSchemas';
import { exportToExcel } from '@/lib/excelImporter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TablesInsert } from '@/integrations/supabase/types';

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

export const FornecedoresToolbar = memo(function FornecedoresToolbar({
  onSearch,
  onRefresh,
  onNewClick,
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkInativar,
  currentFilters,
  data = [],
}: FornecedoresToolbarProps) {
  const [searchValue, setSearchValue] = React.useState('');

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onSearch(value);
  };

  const handleImport = async (fornecedores: unknown[]) => {
    // Gerar códigos únicos para cada fornecedor
    const now = Date.now();
    const fornecedoresWithCodes = (fornecedores as Record<string, unknown>[]).map((f, i) => ({
      ...f,
      codigo: `FORN-${now}-${i}`,
      tipo: 'nacional',
      status: 'ativo',
    })) as TablesInsert<'fornecedores'>[];

    const { error } = await supabase.from('fornecedores').insert(fornecedoresWithCodes);
    if (error) throw error;
    toast.success(`${fornecedores.length} fornecedores importados!`);
    onRefresh();
  };

  const handleExport = () => {
    if (data.length === 0) {
      toast.warning('Nenhum dado para exportar');
      return;
    }
    exportToExcel(
      data as Record<string, unknown>[],
      [
        { key: 'razao_social', label: 'Razão Social' },
        { key: 'nome_fantasia', label: 'Nome Fantasia' },
        { key: 'cnpj', label: 'CNPJ' },
        { key: 'email', label: 'E-mail' },
        { key: 'telefone', label: 'Telefone' },
        { key: 'cidade', label: 'Cidade' },
      ],
      'fornecedores',
      'Fornecedores'
    );
    toast.success('Exportado com sucesso!');
  };

  return (
    <div className="space-y-3">
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
          </span>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Limpar
          </Button>
          <Button variant="outline" size="sm" onClick={onBulkInativar}>
            Inativar
          </Button>
          <Button variant="destructive" size="sm" onClick={onBulkDelete}>
            Excluir
          </Button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <SearchInput
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Buscar fornecedor..."
            className="w-64"
          />
          <SavedFiltersDropdown
            entityType="fornecedores"
            currentFilters={currentFilters}
            onApplyFilter={() => {}}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <DataImporter
            schema={fornecedorSchema}
            onImport={handleImport}
            entityName="Fornecedores"
            trigger={
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4" />
              </Button>
            }
          />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={onNewClick}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

import React from 'react';

export default FornecedoresToolbar;
