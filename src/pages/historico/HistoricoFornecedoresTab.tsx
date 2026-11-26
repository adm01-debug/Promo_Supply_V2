import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Package, ShoppingCart, XCircle, BarChart3, FileText } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { type SupplierHistory, type PurchaseRecord } from '@/hooks/usePurchaseHistory';
import { QualityStars, DeliveryBadge, StatusBadge } from './HistoricoHelpers';
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

interface Props {
  filteredSuppliers: SupplierHistory[];
  selectedSupplierId: string | null;
  onSelectSupplier: (id: string) => void;
  selectedSupplier: SupplierHistory | undefined;
  supplierPurchases: PurchaseRecord[];
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" && (String(entry.name).includes("R$") || String(entry.name).includes("Preço") || String(entry.name).includes("Valor"))
            ? `R$ ${entry.value.toLocaleString("pt-BR")}`
            : entry.value}
        </p>
      ))}
    </div>
  );
};

export const HistoricoFornecedoresTab = ({ filteredSuppliers, selectedSupplierId, onSelectSupplier, selectedSupplier, supplierPurchases }: Props) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <Card className="lg:col-span-1 p-0">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Lista de Fornecedores</h3>
        <p className="text-xs text-muted-foreground">{filteredSuppliers.length} fornecedores</p>
      </div>
      <ScrollArea className="h-[500px]">
        <div className="divide-y divide-border">
          {filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhum fornecedor encontrado</div>
          ) : filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${selectedSupplierId === supplier.id ? "bg-accent" : ""}`} onClick={() => onSelectSupplier(supplier.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{supplier.name}</p>
                  <p className="text-xs text-muted-foreground">{supplier.cnpj}</p>
                </div>
                <Badge variant={supplier.onTimeRate >= 80 ? "default" : "secondary"} className={`shrink-0 text-xs ${supplier.onTimeRate >= 80 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  {supplier.onTimeRate}% SLA
                </Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Pedidos:</span> <span className="ml-1 font-medium">{supplier.totalOrders}</span></div>
                <div><span className="text-muted-foreground">Total:</span> <span className="ml-1 font-medium">R$ {supplier.totalSpent.toLocaleString("pt-BR")}</span></div>
                <div><span className="text-muted-foreground">Desconto médio:</span> <span className="ml-1 font-medium text-success">{supplier.averageDiscount.toFixed(1)}%</span></div>
                <div><QualityStars rating={supplier.qualityScore} /></div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>

    <Card className="lg:col-span-2 p-6">
      {selectedSupplier ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{selectedSupplier.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedSupplier.cnpj} {selectedSupplier.category && `• ${selectedSupplier.category}`}</p>
            </div>
            <QualityStars rating={selectedSupplier.qualityScore} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Total Gasto</p><p className="text-lg font-bold text-foreground">R$ {selectedSupplier.totalSpent.toLocaleString("pt-BR")}</p></div>
            <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Valor Médio</p><p className="text-lg font-bold text-foreground">R$ {selectedSupplier.averageOrderValue.toLocaleString("pt-BR")}</p></div>
            <div className={`p-3 rounded-lg ${selectedSupplier.onTimeRate >= 80 ? "bg-success/10" : "bg-warning/10"}`}>
              <p className={`text-xs ${selectedSupplier.onTimeRate >= 80 ? "text-success" : "text-warning"}`}>Taxa SLA</p>
              <p className={`text-lg font-bold ${selectedSupplier.onTimeRate >= 80 ? "text-success" : "text-warning"}`}>{selectedSupplier.onTimeRate}%</p>
            </div>
            <div className="p-3 rounded-lg bg-success/10"><p className="text-xs text-success">Melhor Desconto</p><p className="text-lg font-bold text-success">{selectedSupplier.bestDiscount}%</p></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border"><div className="flex items-center gap-2 text-purple-600 mb-2"><Package className="w-4 h-4" /><span className="text-xs font-medium">Produtos</span></div><p className="text-xl font-bold text-foreground">{selectedSupplier.productCount}</p></div>
            <div className="p-4 rounded-lg border border-border"><div className="flex items-center gap-2 text-destructive mb-2"><XCircle className="w-4 h-4" /><span className="text-xs font-medium">Taxa Devolução</span></div><p className="text-xl font-bold text-foreground">{selectedSupplier.returnRate}%</p></div>
            <div className="p-4 rounded-lg border border-border"><div className="flex items-center gap-2 text-info mb-2"><ShoppingCart className="w-4 h-4" /><span className="text-xs font-medium">Total Pedidos</span></div><p className="text-xl font-bold text-foreground">{selectedSupplier.totalOrders}</p></div>
          </div>
          {selectedSupplier.monthlyVolume.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Volume Mensal</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={selectedSupplier.monthlyVolume}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Valor (R$)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />Histórico de Pedidos ({supplierPurchases.length})</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table aria-label="Tabela de dados">
                <TableHeader><TableRow className="bg-muted/30"><TableHead className="text-xs">Pedido</TableHead><TableHead className="text-xs">Produto</TableHead><TableHead className="text-xs text-right">Qtd</TableHead><TableHead className="text-xs text-right">Total</TableHead><TableHead className="text-xs text-right">Desconto</TableHead><TableHead className="text-xs">Entrega</TableHead><TableHead className="text-xs">Qualidade</TableHead></TableRow></TableHeader>
                <TableBody>
                  {supplierPurchases.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-xs font-medium">#{record.orderNumber}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{record.productName}</TableCell>
                      <TableCell className="text-xs text-right">{record.quantity}</TableCell>
                      <TableCell className="text-xs text-right">R$ {record.totalPrice.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-xs text-right text-success">{record.discount}%</TableCell>
                      <TableCell className="text-xs">{record.status === "delivered" && <DeliveryBadge onTime={record.deliveredOnTime || false} />}</TableCell>
                      <TableCell className="text-xs">{(record.qualityRating || 0) > 0 && <QualityStars rating={record.qualityRating!} />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
          <Building2 className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">Selecione um fornecedor para ver detalhes</p>
        </div>
      )}
    </Card>
  </div>
);
