import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload, RefreshCw, CheckCircle } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { SavedFiltersDropdown } from '@/components/SavedFiltersDropdown';
import { AdvancedFilters, type FilterValue, type FilterConfig } from '@/components/AdvancedFilters';
import { DataImporter } from '@/components/DataImporter';
import { pedidoCompraSchema, comprasFilterConfigs } from '@/lib/comprasSchemas';
import { exportToExcel } from '@/lib/excelImporter';
import { toast } from 'sonner';

interface PedidosToolbarProps {
  onSearch: (term: string) => void;
  onFiltersChange: (filters: FilterValue[]) => void;
  onRefresh: () => void;
  onNewClick: () => void;
  selectedCount: number;
  onClearSelection: () => void;
  onBulkAprovar: () => void;
  onBulkCancelar: () => void;
  currentFilters: Record<string, unknown>;
  data?: unknown[];
}

export const PedidosToolbar = memo(function PedidosToolbar({
  onSearch,
  onFiltersChange,
  onRefresh,
  onNewClick,
  selectedCount,
  onClearSelection,
  onBulkAprovar,
  onBulkCancelar,
  currentFilters,
  data = [],
}: PedidosToolbarProps) {
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);
  const [searchValue, setSearchValue] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onSearch(value);
  };

  const handleImport = async (pedidos: unknown[]) => {
    // Note: pedidos table requires proper handling
    toast.info(`Importação de ${(pedidos as unknown[]).length} pedidos não implementada ainda`);
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
        { key: 'numero', label: 'Número' },
        { key: 'fornecedor_nome', label: 'Fornecedor' },
        { key: 'data_pedido', label: 'Data' },
        { key: 'valor_total', label: 'Valor' },
        { key: 'status', label: 'Status' },
      ],
      'pedidos_compra',
      'Pedidos de Compra'
    );
    toast.success('Exportado com sucesso!');
  };

  const handleFiltersChange = (values: FilterValue[]) => {
    setFilterValues(values);
    onFiltersChange(values);
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
          <Button variant="outline" size="sm" onClick={onBulkAprovar} className="gap-1">
            <CheckCircle className="h-4 w-4" />
            Aprovar
          </Button>
          <Button variant="destructive" size="sm" onClick={onBulkCancelar}>
            Cancelar
          </Button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <SearchInput
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Buscar pedido..."
            className="w-64"
          />
          <AdvancedFilters
            filters={comprasFilterConfigs.pedidos as FilterConfig[]}
            values={filterValues}
            onChange={handleFiltersChange}
          />
          <SavedFiltersDropdown
            entityType="pedidos"
            currentFilters={currentFilters}
            onApplyFilter={(f) => {
              const values = Object.entries(f).map(([k, v]) => ({
                key: k,
                operator: 'eq' as const,
                value: v,
              }));
              setFilterValues(values);
              onFiltersChange(values);
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <DataImporter
            schema={pedidoCompraSchema}
            onImport={handleImport}
            entityName="Pedidos"
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

export default PedidosToolbar;
