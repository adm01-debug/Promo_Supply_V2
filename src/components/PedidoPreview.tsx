import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Printer, 
  Download, 
  Send, 
  Building2, 
  MapPin, 
  Phone, 
  Mail,
  Calendar,
  CreditCard,
  Truck,
  FileText,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PedidoPreviewData {
  // Dados do pedido
  numero: string;
  data_emissao: string;
  data_prevista_entrega: string | null;
  condicao_pagamento: string | null;
  forma_envio: string | null;
  observacoes: string | null;
  
  // Fornecedor
  fornecedor: {
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    telefone: string | null;
    email: string | null;
  };
  
  // Empresa (dados fixos ou do contexto)
  empresa?: {
    razao_social: string;
    cnpj: string;
    endereco: string;
    cidade: string;
    estado: string;
    telefone: string;
  };
  
  // Itens
  itens: Array<{
    descricao: string;
    quantidade: number;
    unidade: string;
    valor_unitario: number;
    valor_total: number;
    observacao?: string;
  }>;
  
  // Totais
  subtotal: number;
  desconto: number;
  valor_frete: number;
  valor_total: number;
}

interface PedidoPreviewDialogProps {
  pedido: PedidoPreviewData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
  onPrint?: () => void;
  isConfirming?: boolean;
  mode?: 'preview' | 'view'; // preview = antes de enviar, view = visualização apenas
}

export function PedidoPreviewDialog({
  pedido,
  open,
  onOpenChange,
  onConfirm,
  onPrint,
  isConfirming = false,
  mode = 'preview',
}: PedidoPreviewDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!pedido) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    
    // Fallback: imprimir via window.print()
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido ${pedido.numero}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .text-right { text-align: right; }
            .totals { margin-top: 20px; }
            .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .total-final { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {mode === 'preview' ? 'Preview do Pedido' : 'Visualização do Pedido'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'preview' 
              ? 'Revise os dados antes de enviar ao fornecedor'
              : `Pedido ${pedido.numero}`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Conteúdo do pedido */}
        <div ref={printRef} className="space-y-6 p-4 bg-white rounded-lg border">
          {/* Cabeçalho */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">PEDIDO DE COMPRA</h1>
              <p className="text-lg font-medium text-muted-foreground">Nº {pedido.numero}</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-lg px-3 py-1">
                {mode === 'preview' ? 'RASCUNHO' : 'EMITIDO'}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Data: {formatDate(pedido.data_emissao)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Dados do Fornecedor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  FORNECEDOR
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{pedido.fornecedor.razao_social}</p>
                {pedido.fornecedor.nome_fantasia && (
                  <p className="text-muted-foreground">{pedido.fornecedor.nome_fantasia}</p>
                )}
                <p>CNPJ: {pedido.fornecedor.cnpj}</p>
                {pedido.fornecedor.endereco && (
                  <div className="flex items-start gap-1 mt-2">
                    <MapPin className="h-3 w-3 mt-1 text-muted-foreground" />
                    <span>
                      {pedido.fornecedor.endereco}
                      {pedido.fornecedor.cidade && `, ${pedido.fornecedor.cidade}`}
                      {pedido.fornecedor.estado && ` - ${pedido.fornecedor.estado}`}
                      {pedido.fornecedor.cep && ` • CEP: ${pedido.fornecedor.cep}`}
                    </span>
                  </div>
                )}
                {pedido.fornecedor.telefone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{pedido.fornecedor.telefone}</span>
                  </div>
                )}
                {pedido.fornecedor.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span>{pedido.fornecedor.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Condições */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  CONDIÇÕES
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {pedido.data_prevista_entrega && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Entrega prevista: <strong>{formatDate(pedido.data_prevista_entrega)}</strong></span>
                  </div>
                )}
                {pedido.condicao_pagamento && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>Pagamento: <strong>{pedido.condicao_pagamento}</strong></span>
                  </div>
                )}
                {pedido.forma_envio && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span>Frete: <strong>{pedido.forma_envio}</strong></span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Itens */}
          <div>
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              ITENS DO PEDIDO
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Descrição</th>
                    <th className="text-center p-3 font-medium">Qtd</th>
                    <th className="text-center p-3 font-medium">Un</th>
                    <th className="text-right p-3 font-medium">Valor Unit.</th>
                    <th className="text-right p-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.itens.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3 text-muted-foreground">{index + 1}</td>
                      <td className="p-3">
                        <p className="font-medium">{item.descricao}</p>
                        {item.observacao && (
                          <p className="text-xs text-muted-foreground">{item.observacao}</p>
                        )}
                      </td>
                      <td className="p-3 text-center">{item.quantidade}</td>
                      <td className="p-3 text-center">{item.unidade}</td>
                      <td className="p-3 text-right">{formatCurrency(item.valor_unitario)}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(item.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totais */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(pedido.subtotal)}</span>
              </div>
              {pedido.desconto > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto:</span>
                  <span>- {formatCurrency(pedido.desconto)}</span>
                </div>
              )}
              {pedido.valor_frete > 0 && (
                <div className="flex justify-between">
                  <span>Frete:</span>
                  <span>{formatCurrency(pedido.valor_frete)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL:</span>
                <span>{formatCurrency(pedido.valor_total)}</span>
              </div>
            </div>
          </div>

          {/* Observações */}
          {pedido.observacoes && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-1">Observações:</p>
              <p className="text-sm text-muted-foreground">{pedido.observacoes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {mode === 'preview' ? 'Voltar e Editar' : 'Fechar'}
          </Button>
          
          {mode === 'preview' && onConfirm && (
            <Button onClick={onConfirm} disabled={isConfirming}>
              {isConfirming ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⏳</span>
                  Enviando...
                </span>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirmar e Enviar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente de preview compacto (card)
export function PedidoPreviewCard({
  pedido,
  className,
  onClick,
}: {
  pedido: PedidoPreviewData;
  className?: string;
  onClick?: () => void;
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-bold">{pedido.numero}</p>
            <p className="text-sm text-muted-foreground">{pedido.fornecedor.razao_social}</p>
          </div>
          <p className="font-bold text-lg">{formatCurrency(pedido.valor_total)}</p>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{pedido.itens.length} ite{pedido.itens.length > 1 ? 'ns' : 'm'}</span>
          <span>Clique para preview</span>
        </div>
      </CardContent>
    </Card>
  );
}
