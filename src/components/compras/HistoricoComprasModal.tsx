import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HistoricoComprasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedor: { id: string; nomeFantasia?: string; nome_fantasia?: string | null; razao_social?: string } | null;
}

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  em_transito: 'Em Trânsito',
  entregue: 'Entregue',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-500',
  aprovado: 'bg-blue-500',
  em_transito: 'bg-orange-500',
  entregue: 'bg-green-500',
  recebido: 'bg-emerald-500',
  cancelado: 'bg-red-500',
};

export const HistoricoComprasModal = ({ open, onOpenChange, fornecedor }: HistoricoComprasModalProps) => {
  const fornecedorName = fornecedor?.nomeFantasia || fornecedor?.nome_fantasia || fornecedor?.razao_social || '';

  const { data: pedidos = [] } = useQuery({
    queryKey: ['historico-compras-fornecedor', fornecedor?.id],
    queryFn: async () => {
      if (!fornecedor?.id) return [];
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero, status, valor_total, data_emissao, data_entrega, condicao_pagamento, pedido_itens(descricao, quantidade, valor_unitario, valor_total)')
        .eq('fornecedor_id', fornecedor.id)
        .order('data_emissao', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!fornecedor?.id,
  });

  if (!fornecedor) return null;

  const totalCompras = pedidos.reduce((acc, p) => acc + (p.valor_total || 0), 0);
  const mediaValor = pedidos.length > 0 ? totalCompras / pedidos.length : 0;
  const lastDate = pedidos[0]?.data_emissao;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Compras - {fornecedorName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="w-4 h-4" />
              <span className="text-xs">Total Pedidos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{pedidos.length}</p>
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
              {lastDate ? new Date(lastDate).toLocaleDateString('pt-BR') : '—'}
            </p>
          </div>
        </div>

        {pedidos.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nº Pedido</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((pedido) => {
                  const itens = (pedido.pedido_itens as any[]) || [];
                  return (
                    <TableRow key={pedido.id}>
                      <TableCell className="font-medium">{pedido.numero}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {itens.map(i => i.descricao).join(', ').slice(0, 50) || '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(pedido.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[pedido.status] || 'bg-gray-500'} text-white text-xs`}>
                          {statusLabels[pedido.status] || pedido.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {pedido.data_emissao ? new Date(pedido.data_emissao).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
