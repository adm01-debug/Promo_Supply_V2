import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FileText, Printer, Building2, Calendar, DollarSign, Package } from 'lucide-react';
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
import type { Pedido } from '@/features/pedidos';

interface OrderPreviewModalProps {
  pedido: Pedido | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSend?: () => void;
}

export const OrderPreviewModal = ({ pedido, open, onOpenChange, onConfirmSend }: OrderPreviewModalProps) => {
  if (!pedido) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="dialog-desc" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Preview do Pedido
          </DialogTitle>
        </DialogHeader>

        {/* Document Preview */}
        <div className="border rounded-lg p-6 bg-background space-y-6 print:border-none" id="order-preview">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-foreground">PEDIDO DE COMPRA</h2>
              <p className="text-lg font-semibold text-primary">{pedido.numero}</p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Data de Emissão:</p>
              <p className="font-medium text-foreground">
                {format(new Date(pedido.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
              <Badge className="mt-1" variant="outline">{pedido.status.toUpperCase()}</Badge>
            </div>
          </div>

          <Separator />

          {/* Supplier Info */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2 text-foreground">
              <Building2 className="w-4 h-4" />
              Fornecedor
            </h3>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="font-medium text-foreground">
                {pedido.fornecedor?.razao_social || 'N/A'}
              </p>
              {pedido.fornecedor?.nome_fantasia && (
                <p className="text-sm text-muted-foreground">{pedido.fornecedor.nome_fantasia}</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Previsão de Entrega
              </p>
              <p className="font-medium text-foreground">
                {pedido.data_previsao
                  ? format(new Date(pedido.data_previsao), 'dd/MM/yyyy', { locale: ptBR })
                  : 'Não definida'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Condição de Pagamento</p>
              <p className="font-medium text-foreground">{pedido.condicao_pagamento || 'N/A'}</p>
            </div>
          </div>

          {/* Delivery */}
          {pedido.endereco_entrega && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Package className="w-3 h-3" />
                Endereço de Entrega
              </p>
              <p className="text-sm text-foreground">{pedido.endereco_entrega}</p>
            </div>
          )}

          <Separator />

          {/* Financials */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2 text-foreground">
              <DollarSign className="w-4 h-4" />
              Valores
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="text-foreground">{formatCurrency(pedido.valor_total - (pedido.valor_frete || 0) + (pedido.desconto || 0))}</span>
              </div>
              {(pedido.valor_frete || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete:</span>
                  <span className="text-foreground">{formatCurrency(pedido.valor_frete || 0)}</span>
                </div>
              )}
              {(pedido.desconto || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Desconto:</span>
                  <span className="text-success">-{formatCurrency(pedido.desconto || 0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span className="text-foreground">Total:</span>
                <span className="text-primary">{formatCurrency(pedido.valor_total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {pedido.observacoes && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Observações:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pedido.observacoes}</p>
              </div>
            </>
          )}

          {/* Linked solicitation */}
          {pedido.solicitacao && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              Ref. Solicitação: {pedido.solicitacao.numero} — {pedido.solicitacao.titulo}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          {onConfirmSend && pedido.status === 'aprovado' && (
            <Button onClick={onConfirmSend}>
              Confirmar e Enviar ao Fornecedor
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
