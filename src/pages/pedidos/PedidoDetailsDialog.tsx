import { FileText, Building2, Calendar, DollarSign, Mail, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type Pedido } from "@/hooks/usePedidos";

const statusConfig: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-warning/10 text-warning border-yellow-500/20' },
  aprovado: { label: 'Aprovado', color: 'bg-info/10 text-info border-blue-500/20' },
  enviado: { label: 'Enviado', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  em_transito: { label: 'Em Trânsito', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  entregue: { label: 'Entregue', color: 'bg-success/10 text-success border-green-500/20' },
  cancelado: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive border-red-500/20' },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: Pedido | null;
}

export const PedidoDetailsDialog = ({ open, onOpenChange, pedido }: Props) => {
  if (!pedido) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="dialog-desc" className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Detalhes do Pedido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="text-2xl font-bold text-primary font-mono">{pedido.numero}</p>
              <p className="text-sm text-muted-foreground">
                Emitido em {format(new Date(pedido.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
            <Badge variant="outline" className={statusConfig[pedido.status]?.color}>
              {statusConfig[pedido.status]?.label}
            </Badge>
          </div>

          <Tabs defaultValue="geral">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 mt-4">
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />Fornecedor
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-muted-foreground">Razão Social</p><p className="font-medium">{pedido.fornecedor?.razao_social || '-'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Nome Fantasia</p><p className="font-medium">{pedido.fornecedor?.nome_fantasia || '-'}</p></div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm"><Mail className="w-4 h-4 mr-2" />E-mail</Button>
                  <Button variant="outline" size="sm"><MessageCircle className="w-4 h-4 mr-2" />WhatsApp</Button>
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />Datas
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-muted-foreground">Data de Emissão</p><p className="font-medium">{format(new Date(pedido.data_emissao), "dd/MM/yyyy", { locale: ptBR })}</p></div>
                  <div><p className="text-xs text-muted-foreground">Previsão de Entrega</p><p className="font-medium">{pedido.data_previsao ? format(new Date(pedido.data_previsao), "dd/MM/yyyy", { locale: ptBR }) : '-'}</p></div>
                  {pedido.data_entrega && <div><p className="text-xs text-muted-foreground">Data de Entrega</p><p className="font-medium text-success">{format(new Date(pedido.data_entrega), "dd/MM/yyyy", { locale: ptBR })}</p></div>}
                </div>
              </Card>
              {pedido.observacoes && <Card className="p-4"><h3 className="font-semibold text-foreground mb-2">Observações</h3><p className="text-sm text-muted-foreground">{pedido.observacoes}</p></Card>}
            </TabsContent>

            <TabsContent value="financeiro" className="space-y-4 mt-4">
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />Resumo Financeiro
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{(pedido.valor_total - (pedido.valor_frete || 0) + (pedido.desconto || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frete</span>
                    <span className="font-medium">{(pedido.valor_frete || 0) > 0 ? (pedido.valor_frete || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Grátis'}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span className="text-primary">{pedido.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Timeline do pedido será exibida aqui.</p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
