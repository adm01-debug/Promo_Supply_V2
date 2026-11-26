import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText } from 'lucide-react';
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { ptBR } from "date-fns/locale/pt-BR";
import { type PurchaseRecord } from '@/hooks/usePurchaseHistory';
import { DeliveryBadge, StatusBadge, QualityStars } from './HistoricoHelpers';

interface Props {
  filteredRecords: PurchaseRecord[];
  totalRecords: number;
  hasActiveFilters: boolean;
}

export const HistoricoRegistrosTab = ({ filteredRecords, totalRecords, hasActiveFilters }: Props) => (
  <Card className="p-0">
    <div className="p-4 border-b border-border">
      <h3 className="font-semibold text-foreground">Todos os Registros de Compra</h3>
      <p className="text-xs text-muted-foreground">
        {filteredRecords.length} registros {hasActiveFilters && `(filtrado de ${totalRecords})`}
      </p>
    </div>
    <div className="overflow-x-auto">
      <Table aria-label="Tabela de dados">
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-xs">Pedido</TableHead>
            <TableHead className="text-xs">Produto</TableHead>
            <TableHead className="text-xs">Fornecedor</TableHead>
            <TableHead className="text-xs text-right">Qtd</TableHead>
            <TableHead className="text-xs text-right">Preço Unit.</TableHead>
            <TableHead className="text-xs text-right">Total</TableHead>
            <TableHead className="text-xs text-right">Desconto</TableHead>
            <TableHead className="text-xs">Data</TableHead>
            <TableHead className="text-xs">Entrega</TableHead>
            <TableHead className="text-xs">Qualidade</TableHead>
            <TableHead className="text-xs">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground text-sm">Nenhum registro encontrado</TableCell>
            </TableRow>
          ) : filteredRecords.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="text-xs font-medium">#{record.orderNumber}</TableCell>
              <TableCell className="text-xs max-w-[150px] truncate">{record.productName}</TableCell>
              <TableCell className="text-xs">{record.supplierName}</TableCell>
              <TableCell className="text-xs text-right">{record.quantity}</TableCell>
              <TableCell className="text-xs text-right">R$ {record.unitPrice.toFixed(2)}</TableCell>
              <TableCell className="text-xs text-right font-medium">R$ {record.totalPrice.toLocaleString("pt-BR")}</TableCell>
              <TableCell className="text-xs text-right text-success">{record.discount}%</TableCell>
              <TableCell className="text-xs">{format(parseISO(record.purchaseDate), "dd/MM/yy", { locale: ptBR })}</TableCell>
              <TableCell className="text-xs">{record.status === "delivered" && <DeliveryBadge onTime={record.deliveredOnTime || false} />}</TableCell>
              <TableCell className="text-xs">{(record.qualityRating || 0) > 0 && <QualityStars rating={record.qualityRating!} />}</TableCell>
              <TableCell className="text-xs"><StatusBadge status={record.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </Card>
);
