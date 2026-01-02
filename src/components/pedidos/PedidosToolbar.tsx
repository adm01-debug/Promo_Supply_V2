import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload, RefreshCw, FileText, CheckCircle } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { SavedFiltersDropdown } from '@/components/SavedFiltersDropdown';
import { AdvancedFilters, FilterValue, FilterConfig } from '@/components/AdvancedFilters';
import { DataImporter } from '@/components/DataImporter';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { pedidoCompraSchema, comprasImportTemplates, comprasFilterConfigs } from '@/lib/comprasSchemas';
import { exportToExcel } from '@/lib/excelImporter';
import { supabase } from '@/integrations/supabase/client';
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
  onSearch, onFiltersChange, onRefresh, onNewClick, selectedCount, onClearSelection, onBulkAprovar, onBulkCancelar, currentFilters, data = [],
}: PedidosToolbarProps) {
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);

  const handleImport = async (pedidos: unknown[]) => {
    const { error } = await supabase.from('pedidos_compra').insert(pedidos);
    if (error) throw error;
    toast.success(`${pedidos.length} pedidos importados!`);
    onRefresh();
  };

  const handleExport = () => {
    if (data.length === 0) { toast.warning('Nenhum dado'); return; }
    exportToExcel(data as Record<string, unknown>[], [
      { key: 'numero' as const, label: 'Número' },
      { key: 'fornecedor_nome' as const, label: 'Fornecedor' },
      { key: 'data_pedido' as const, label: 'Data' },
      { key: 'valor_total' as const, label: 'Valor' },
      { key: 'status' as const, label: 'Status' },
    ], 'pedidos_compra', 'Pedidos de Compra');
    toast.success('Exportado!');
  };

  const bulkActions = [
    { key: 'aprovar', label: 'Aprovar', icon: <CheckCircle className="h-4 w-4" />, onClick: onBulkAprovar },
    { key: 'cancelar', label: 'Cancelar', variant: 'destructive' as const, onClick: onBulkCancelar },
  ];

  return (
    <div className="space-y-3">
      {selectedCount > 0 && <BulkActionsBar selectedCount={selectedCount} onClearSelection={onClearSelection} actions={bulkActions} />}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <SearchInput onSearch={onSearch} placeholder="Buscar pedido..." className="w-64" />
          <AdvancedFilters filters={comprasFilterConfigs.pedidos as FilterConfig[]} values={filterValues} onChange={(v) => { setFilterValues(v); onFiltersChange(v); }} />
          <SavedFiltersDropdown entityType="pedidos_compra" currentFilters={currentFilters} onApplyFilter={(f) => { const values = Object.entries(f).map(([k,v]) => ({ key: k, operator: 'eq' as const, value: v })); setFilterValues(values); onFiltersChange(values); }} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="h-4 w-4" /></Button>
          <DataImporter schema={pedidoCompraSchema} columns={comprasImportTemplates.pedidos} onImport={handleImport} templateName="pedidos" title="Importar Pedidos" trigger={<Button variant="outline" size="sm"><Upload className="h-4 w-4" /></Button>} onSuccess={onRefresh} />
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4" /></Button>
          <Button size="sm" onClick={onNewClick}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
});
export default PedidosToolbar;
