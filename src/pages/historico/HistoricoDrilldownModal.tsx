import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3 } from 'lucide-react';
import { type PurchaseRecord } from '@/hooks/usePurchaseHistory';
import { StatusBadge } from './HistoricoHelpers';

interface DrilldownData {
  name?: string;
  month?: string;
  category?: string;
  supplier?: string;
  [key: string]: unknown;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drilldownType: "month" | "category" | "supplier" | null;
  drilldownData: DrilldownData | null;
  drilldownRecords: PurchaseRecord[];
}

export const HistoricoDrilldownModal = ({ open, onOpenChange, drilldownType, drilldownData, drilldownRecords }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent aria-describedby="dialog-desc" className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Detalhamento: {drilldownType === "month" ? drilldownData?.month : drilldownType === "category" ? drilldownData?.category : drilldownData?.supplier}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Registros</p><p className="text-lg font-bold">{drilldownRecords.length}</p></div>
          <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Volume Total</p><p className="text-lg font-bold">R$ {drilldownRecords.reduce((s, r) => s + r.totalPrice, 0).toLocaleString("pt-BR")}</p></div>
          <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Quantidade</p><p className="text-lg font-bold">{drilldownRecords.reduce((s, r) => s + r.quantity, 0).toLocaleString("pt-BR")}</p></div>
        </div>
        <Table aria-label="Tabela de dados">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Pedido</TableHead>
              <TableHead className="text-xs">Produto</TableHead>
              <TableHead className="text-xs">Fornecedor</TableHead>
              <TableHead className="text-xs text-right">Qtd</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drilldownRecords.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-medium">#{r.orderNumber}</TableCell>
                <TableCell className="text-xs">{r.productName}</TableCell>
                <TableCell className="text-xs">{r.supplierName}</TableCell>
                <TableCell className="text-xs text-right">{r.quantity}</TableCell>
                <TableCell className="text-xs text-right">R$ {r.totalPrice.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-xs"><StatusBadge status={r.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  </Dialog>
);
