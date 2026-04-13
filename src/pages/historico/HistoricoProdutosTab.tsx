import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, TrendingUp, FileText } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { type ProductHistory, type PurchaseRecord } from '@/hooks/usePurchaseHistory';
import { QualityStars, DeliveryBadge, StatusBadge } from './HistoricoHelpers';
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

interface Props {
  filteredProducts: ProductHistory[];
  selectedProductId: string | null;
  onSelectProduct: (id: string) => void;
  selectedProduct: ProductHistory | undefined;
  productPurchases: PurchaseRecord[];
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

export const HistoricoProdutosTab = ({ filteredProducts, selectedProductId, onSelectProduct, selectedProduct, productPurchases }: Props) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <Card className="lg:col-span-1 p-0">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Lista de Produtos</h3>
        <p className="text-xs text-muted-foreground">{filteredProducts.length} produtos encontrados</p>
      </div>
      <ScrollArea className="h-[500px]">
        <div className="divide-y divide-border">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado</div>
          ) : filteredProducts.map((product) => (
            <div key={product.id} className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${selectedProductId === product.id ? "bg-accent" : ""}`} onClick={() => onSelectProduct(product.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.sku} • {product.category}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">R$ {product.avgPrice.toFixed(2)}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Compras:</span> <span className="font-medium">{product.totalPurchases}</span></div>
                <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">R$ {product.totalSpent.toLocaleString("pt-BR")}</span></div>
                <div><span className="text-muted-foreground">Min:</span> <span className="font-medium text-success">R$ {product.minPrice.toFixed(2)}</span></div>
                <div><span className="text-muted-foreground">Max:</span> <span className="font-medium text-destructive">R$ {product.maxPrice.toFixed(2)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>

    <Card className="lg:col-span-2 p-6">
      {selectedProduct ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{selectedProduct.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedProduct.sku} • {selectedProduct.category}</p>
            </div>
            <QualityStars rating={selectedProduct.qualityAvg} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Preço Médio</p><p className="text-lg font-bold text-foreground">R$ {selectedProduct.avgPrice.toFixed(2)}</p></div>
            <div className="p-3 rounded-lg bg-success/10"><p className="text-xs text-success">Menor Preço</p><p className="text-lg font-bold text-success">R$ {selectedProduct.minPrice.toFixed(2)}</p></div>
            <div className="p-3 rounded-lg bg-destructive/10"><p className="text-xs text-destructive">Maior Preço</p><p className="text-lg font-bold text-destructive">R$ {selectedProduct.maxPrice.toFixed(2)}</p></div>
            <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Qtd. Total</p><p className="text-lg font-bold text-foreground">{selectedProduct.totalQuantity.toLocaleString("pt-BR")}</p></div>
          </div>
          {selectedProduct.priceHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Evolução de Preço</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={selectedProduct.priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$ ${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="price" name="Preço" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />Histórico de Compras ({productPurchases.length})</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table aria-label="Tabela de dados">
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Pedido</TableHead>
                    <TableHead className="text-xs">Fornecedor</TableHead>
                    <TableHead className="text-xs text-right">Qtd</TableHead>
                    <TableHead className="text-xs text-right">Preço Unit.</TableHead>
                    <TableHead className="text-xs text-right">Desconto</TableHead>
                    <TableHead className="text-xs">Entrega</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productPurchases.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-xs font-medium">#{record.orderNumber}</TableCell>
                      <TableCell className="text-xs">{record.supplierName}</TableCell>
                      <TableCell className="text-xs text-right">{record.quantity}</TableCell>
                      <TableCell className="text-xs text-right">R$ {record.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right text-success">{record.discount}%</TableCell>
                      <TableCell className="text-xs">{record.status === "delivered" && <DeliveryBadge onTime={record.deliveredOnTime || false} />}</TableCell>
                      <TableCell className="text-xs"><StatusBadge status={record.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
          <Package className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">Selecione um produto para ver detalhes</p>
        </div>
      )}
    </Card>
  </div>
);
