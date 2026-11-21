import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Truck } from 'lucide-react';
import { useXbzIntegration, type XbzPedidoRaw } from '@/hooks/useXbzIntegration';
import { XbzPortadorDialog } from './XbzPortadorDialog';
import {
  XBZ_FILTROS_FINANCEIROS, XBZ_PERIODOS, formatBRL, formatXbzDate,
  pagamentoStatusPedido, statusLogisticoLabel,
} from './xbzHelpers';

interface XbzPedidosTabProps {
  showPrices: boolean;
  /** Pode cadastrar/revogar o portador de retirada (exige papel admin/coordinator no proxy). */
  canManagePortador?: boolean;
}

export function XbzPedidosTab({ showPrices, canManagePortador = false }: XbzPedidosTabProps) {
  const { loading, getPedidos } = useXbzIntegration();
  const [pedidos, setPedidos] = useState<XbzPedidoRaw[]>([]);
  const [portadorOpen, setPortadorOpen] = useState(false);
  const [periodo, setPeriodo] = useState(1);
  const [statusFinanceiro, setStatusFinanceiro] = useState(0);
  const [numero, setNumero] = useState('');

  const load = useCallback(async () => {
    const result = await getPedidos({ periodo, statusFinanceiro, numeroPedido: numero.trim() });
    setPedidos(Array.isArray(result) ? result : []);
  }, [getPedidos, periodo, statusFinanceiro, numero]);

  useEffect(() => { void load(); }, [load]);

  const totais = useMemo(() => {
    const pagos = pedidos.filter((p) => pagamentoStatusPedido(p) === 'pago').length;
    const pendentes = pedidos.filter((p) => pagamentoStatusPedido(p) === 'pendente').length;
    return { pagos, pendentes, total: pedidos.length };
  }, [pedidos]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Pedidos XBZ</CardTitle>
          <CardDescription>
            {totais.total} pedidos • {totais.pagos} pagos • {totais.pendentes} pendentes
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPortadorOpen(true)}
            aria-label="Portador de retirada na XBZ"
          >
            <Truck className="mr-2 h-4 w-4" aria-hidden="true" />
            Portador de retirada
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Atualizar pedidos XBZ">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select value={String(periodo)} onValueChange={(v) => setPeriodo(Number(v))}>
            <SelectTrigger className="w-56" aria-label="Período de busca">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {XBZ_PERIODOS.map((p) => (
                <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(statusFinanceiro)} onValueChange={(v) => setStatusFinanceiro(Number(v))}>
            <SelectTrigger className="w-48" aria-label="Filtro financeiro">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {XBZ_FILTROS_FINANCEIROS.map((f) => (
                <SelectItem key={f.value} value={String(f.value)}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Número do pedido (ex.: P9481340)"
            className="w-64"
            aria-label="Filtrar por número do pedido"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Status logístico</TableHead>
              <TableHead>Pagamento</TableHead>
              {showPrices ? <TableHead className="text-right">Total</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidos.map((p, index) => {
              const status = pagamentoStatusPedido(p);
              return (
                <TableRow key={String(p.pedidoNumero ?? p.numero ?? index)}>
                  <TableCell className="font-medium">{String(p.pedidoNumero ?? p.numero ?? '—')}</TableCell>
                  <TableCell>{formatXbzDate(p.dataEmissao)}</TableCell>
                  <TableCell>{statusLogisticoLabel(p.idStatus, p.statusLogistico)}</TableCell>
                  <TableCell>
                    <Badge variant={status === 'pago' ? 'default' : status === 'pendente' ? 'destructive' : 'secondary'}>
                      {p.loteDebitoStatusCliente ?? (status === 'pago' ? 'PAGO' : 'PENDENTE')}
                    </Badge>
                  </TableCell>
                  {showPrices ? (
                    <TableCell className="text-right">{formatBRL(typeof p.valor === 'number' ? p.valor : null)}</TableCell>
                  ) : null}
                </TableRow>
              );
            })}
            {pedidos.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={showPrices ? 5 : 4} className="text-center text-muted-foreground">
                  Nenhum pedido encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>

      <XbzPortadorDialog open={portadorOpen} onOpenChange={setPortadorOpen} canManage={canManagePortador} />
    </Card>
  );
}
