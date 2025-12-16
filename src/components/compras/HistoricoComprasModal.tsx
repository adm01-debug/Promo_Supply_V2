import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Fornecedor, solicitacoesMock, getStatusLabel, getStatusColor } from "@/data/mockData";
import { Package, Calendar, DollarSign, TrendingUp } from "lucide-react";

interface HistoricoComprasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedor: Fornecedor | null;
}

export const HistoricoComprasModal = ({ open, onOpenChange, fornecedor }: HistoricoComprasModalProps) => {
  if (!fornecedor) return null;

  // Filter purchases by this supplier
  const comprasDoFornecedor = solicitacoesMock.filter(
    s => s.fornecedorSelecionado === fornecedor.nomeFantasia
  );

  const totalCompras = comprasDoFornecedor.reduce((acc, c) => acc + (c.valorTotal || 0), 0);
  const mediaValor = comprasDoFornecedor.length > 0 ? totalCompras / comprasDoFornecedor.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Compras - {fornecedor.nomeFantasia}</DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="w-4 h-4" />
              <span className="text-xs">Total Pedidos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{comprasDoFornecedor.length}</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Volume Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {totalCompras.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {mediaValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Última Compra</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {new Date(fornecedor.ultimaCompra).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Purchase History Table */}
        {comprasDoFornecedor.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Item</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Valor Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comprasDoFornecedor.map((compra) => (
                  <TableRow key={compra.id}>
                    <TableCell className="font-medium">{compra.itemNumber}</TableCell>
                    <TableCell>{compra.produto}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{compra.empresa}</TableCell>
                    <TableCell className="text-right">{compra.quantidadeReal}</TableCell>
                    <TableCell className="text-right">
                      {compra.valorUnitario?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {compra.valorTotal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(compra.status)} text-white text-xs`}>
                        {getStatusLabel(compra.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(compra.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma compra registrada com este fornecedor</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
