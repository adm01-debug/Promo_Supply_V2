import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Package, 
  Check, 
  AlertTriangle, 
  Truck,
  ClipboardCheck,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PedidoItem {
  id: string;
  descricao: string;
  quantidade: number;
  quantidade_recebida: number;
  valor_unitario: number;
  valor_total: number;
  unidade: string;
}

export interface PedidoParaRecebimento {
  id: string;
  numero: string;
  fornecedor_nome: string;
  data_prevista_entrega: string | null;
  itens: PedidoItem[];
}

interface RecebimentoItemState {
  id: string;
  quantidade_recebida: number;
  observacao: string;
}

interface RecebimentoParcialDialogProps {
  pedido: PedidoParaRecebimento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RecebimentoParcialDialog({
  pedido,
  open,
  onOpenChange,
  onSuccess,
}: RecebimentoParcialDialogProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [itensState, setItensState] = useState<RecebimentoItemState[]>([]);
  const [observacaoGeral, setObservacaoGeral] = useState('');

  // Inicializar estado dos itens quando o pedido mudar
  useState(() => {
    if (pedido) {
      setItensState(pedido.itens.map(item => ({
        id: item.id,
        quantidade_recebida: item.quantidade_recebida || 0,
        observacao: '',
      })));
    }
  });

  const handleQuantidadeChange = useCallback((itemId: string, quantidade: number) => {
    setItensState(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, quantidade_recebida: Math.max(0, quantidade) }
        : item
    ));
  }, []);

  const handleObservacaoChange = useCallback((itemId: string, observacao: string) => {
    setItensState(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, observacao }
        : item
    ));
  }, []);

  // Marcar todos como recebidos
  const marcarTodosRecebidos = useCallback(() => {
    if (!pedido) return;
    setItensState(pedido.itens.map(item => ({
      id: item.id,
      quantidade_recebida: item.quantidade,
      observacao: '',
    })));
  }, [pedido]);

  // Limpar recebimento
  const limparRecebimento = useCallback(() => {
    if (!pedido) return;
    setItensState(pedido.itens.map(item => ({
      id: item.id,
      quantidade_recebida: 0,
      observacao: '',
    })));
  }, [pedido]);

  // Calcular status
  const calcularStatusRecebimento = useCallback(() => {
    if (!pedido) return { status: 'pendente', percentual: 0 };

    let totalPedido = 0;
    let totalRecebido = 0;

    pedido.itens.forEach(item => {
      const itemState = itensState.find(i => i.id === item.id);
      totalPedido += item.quantidade;
      totalRecebido += itemState?.quantidade_recebida || 0;
    });

    const percentual = totalPedido > 0 ? (totalRecebido / totalPedido) * 100 : 0;

    if (percentual === 0) return { status: 'pendente', percentual };
    if (percentual < 100) return { status: 'parcial', percentual };
    return { status: 'entregue', percentual };
  }, [pedido, itensState]);

  // Confirmar recebimento
  const confirmarRecebimento = async () => {
    if (!pedido || !user) return;

    try {
      setIsProcessing(true);

      const { status } = calcularStatusRecebimento();

      // Atualizar cada item
      for (const itemState of itensState) {
        const { error } = await supabase
          .from('pedido_itens')
          .update({
            quantidade_recebida: itemState.quantidade_recebida,
            observacao_recebimento: itemState.observacao || null,
          })
          .eq('id', itemState.id);

        if (error) throw error;
      }

      // Atualizar status do pedido
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({
          status: status,
          data_entrega: status === 'entregue' ? new Date().toISOString() : null,
          observacoes_entrega: observacaoGeral || null,
        })
        .eq('id', pedido.id);

      if (pedidoError) throw pedidoError;

      // Registrar no audit log
      await supabase.from('audit_logs').insert({
        action: status === 'entregue' ? 'full_receipt' : 'partial_receipt',
        entity_type: 'pedido',
        entity_id: pedido.id,
        user_id: user.id,
        details: {
          status,
          itens: itensState,
          observacao_geral: observacaoGeral,
        },
      });

      toast.success(
        status === 'entregue' 
          ? 'Recebimento total confirmado!' 
          : 'Recebimento parcial registrado!',
        { duration: 4000 }
      );

      onOpenChange(false);
      onSuccess?.();

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error confirming receipt:', err);
      toast.error('Erro ao confirmar recebimento: ' + errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!pedido) return null;

  const { status: statusCalculado, percentual } = calcularStatusRecebimento();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Conferência de Recebimento
          </DialogTitle>
          <DialogDescription>
            Pedido <strong>{pedido.numero}</strong> • {pedido.fornecedor_nome}
          </DialogDescription>
        </DialogHeader>

        {/* Status calculado */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso do Recebimento</span>
              <Badge variant={
                statusCalculado === 'entregue' ? 'default' :
                statusCalculado === 'parcial' ? 'secondary' :
                'outline'
              }>
                {statusCalculado === 'entregue' ? 'Completo' :
                 statusCalculado === 'parcial' ? 'Parcial' :
                 'Pendente'}
              </Badge>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-300",
                  statusCalculado === 'entregue' ? 'bg-green-500' :
                  statusCalculado === 'parcial' ? 'bg-yellow-500' :
                  'bg-gray-300'
                )}
                style={{ width: `${percentual}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {percentual.toFixed(0)}% recebido
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={marcarTodosRecebidos}>
              <Check className="h-4 w-4 mr-1" />
              Todos
            </Button>
            <Button variant="ghost" size="sm" onClick={limparRecebimento}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          </div>
        </div>

        {/* Tabela de itens */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Item</TableHead>
                <TableHead className="text-center">Pedido</TableHead>
                <TableHead className="text-center">Recebido</TableHead>
                <TableHead className="text-center">Pendente</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedido.itens.map((item) => {
                const itemState = itensState.find(i => i.id === item.id);
                const qtdRecebida = itemState?.quantidade_recebida || 0;
                const qtdPendente = item.quantidade - qtdRecebida;
                const itemStatus = qtdRecebida >= item.quantidade ? 'ok' : 
                                   qtdRecebida > 0 ? 'parcial' : 'pendente';

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{item.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.unidade} • R$ {item.valor_unitario.toFixed(2)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {item.quantidade}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={item.quantidade}
                        value={qtdRecebida}
                        onChange={(e) => handleQuantidadeChange(item.id, parseInt(e.target.value) || 0)}
                        className="w-20 text-center mx-auto"
                      />
                    </TableCell>
                    <TableCell className={cn(
                      "text-center font-medium",
                      qtdPendente > 0 ? "text-orange-500" : "text-green-500"
                    )}>
                      {qtdPendente}
                    </TableCell>
                    <TableCell>
                      {itemStatus === 'ok' && (
                        <Badge variant="default" className="bg-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          OK
                        </Badge>
                      )}
                      {itemStatus === 'parcial' && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Parcial
                        </Badge>
                      )}
                      {itemStatus === 'pendente' && (
                        <Badge variant="outline">
                          <Package className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Observações */}
        <div className="space-y-2">
          <Label htmlFor="observacao">Observações do Recebimento</Label>
          <Textarea
            id="observacao"
            placeholder="Ex: Embalagem danificada, falta de itens, etc."
            value={observacaoGeral}
            onChange={(e) => setObservacaoGeral(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={confirmarRecebimento}
            disabled={isProcessing || percentual === 0}
            className={cn(
              statusCalculado === 'entregue' ? 'bg-green-600 hover:bg-green-700' :
              'bg-yellow-600 hover:bg-yellow-700'
            )}
          >
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Truck className="h-4 w-4 mr-2" />
            )}
            {statusCalculado === 'entregue' ? 'Confirmar Recebimento Total' : 'Registrar Recebimento Parcial'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Card resumo para listagem de pedidos
export function RecebimentoStatusCard({
  pedido,
  onAbrirConferencia,
  className,
}: {
  pedido: {
    id: string;
    numero: string;
    status: string;
    total_itens: number;
    itens_recebidos: number;
  };
  onAbrirConferencia: () => void;
  className?: string;
}) {
  const percentual = pedido.total_itens > 0 
    ? (pedido.itens_recebidos / pedido.total_itens) * 100 
    : 0;

  const isParcial = percentual > 0 && percentual < 100;
  const isCompleto = percentual >= 100;

  return (
    <Card className={cn(
      "cursor-pointer hover:shadow-md transition-shadow",
      isParcial && "border-yellow-500/30",
      isCompleto && "border-green-500/30",
      className
    )} onClick={onAbrirConferencia}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{pedido.numero}</p>
            <p className="text-sm text-muted-foreground">
              {pedido.itens_recebidos}/{pedido.total_itens} itens recebidos
            </p>
          </div>
          <div className="text-right">
            <Badge variant={
              isCompleto ? 'default' :
              isParcial ? 'secondary' :
              'outline'
            }>
              {percentual.toFixed(0)}%
            </Badge>
          </div>
        </div>
        <div className="mt-2 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full",
              isCompleto ? 'bg-green-500' :
              isParcial ? 'bg-yellow-500' :
              'bg-gray-300'
            )}
            style={{ width: `${percentual}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
