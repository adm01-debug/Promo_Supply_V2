import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useXbzIntegration, type XbzCarrinhoItem, type XbzCarrinhoResumo } from '@/hooks/useXbzIntegration';
import { useCooldown } from '@/hooks/useCooldown';

import { formatBRL } from './xbzHelpers';

interface XbzCarrinhoTabProps {
  canGenerateOrders: boolean;
  canWrite: boolean;
}

export function XbzCarrinhoTab({ canGenerateOrders, canWrite }: XbzCarrinhoTabProps) {
  const { loading, getCarrinhoResumo, getCarrinhoItens, removerItem, gerarPedidos } = useXbzIntegration();
  const [resumo, setResumo] = useState<XbzCarrinhoResumo | null>(null);
  const [itens, setItens] = useState<XbzCarrinhoItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    const [r, i] = await Promise.all([getCarrinhoResumo(), getCarrinhoItens()]);
    if (r) setResumo(r);
    setItens(Array.isArray(i) ? i : []);
  }, [getCarrinhoResumo, getCarrinhoItens]);

  useEffect(() => { void load(); }, [load]);

  const handleRemove = useCallback(async (itemId: number) => {
    await removerItem(itemId);
    void load();
  }, [removerItem, load]);

  const handleGenerate = useCallback(async () => {
    setConfirmOpen(false);
    const result = await gerarPedidos();
    // Espelha a janela de deduplicação do backend (30s): novo clique nesse
    // intervalo seria rejeitado com 409, então bloqueamos o botão antes.
    if (result !== null) startCooldown();
    void load();
  }, [gerarPedidos, load, startCooldown]);


  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Carrinho XBZ</CardTitle>
          <CardDescription>
            {resumo?.pessoaRazaoSocial ? String(resumo.pessoaRazaoSocial) : 'Itens no carrinho do portal XBZ'}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Atualizar carrinho XBZ">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">Itens</p>
            <p className="text-2xl font-semibold">{Number(resumo?.itensNoCarrinhoQtd ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">Valor no carrinho</p>
            <p className="text-2xl font-semibold">{formatBRL(Number(resumo?.itensNoCarrinhoValor ?? 0))}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">Selecionados (com impostos)</p>
            <p className="text-2xl font-semibold">{formatBRL(Number(resumo?.itensSelecionadosValorTotal ?? 0))}</p>
          </div>
        </div>

        {itens.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {canWrite ? <TableHead className="w-16" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item, index) => (
                <TableRow key={String(item.id ?? index)}>
                  <TableCell>{String(item.produtoNome ?? item.produtoId ?? '—')}</TableCell>
                  <TableCell className="text-right">{Number(item.quantidade ?? 0)}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(item.valorTotal ?? NaN))}</TableCell>
                  {canWrite ? (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemove(Number(item.id ?? 0))}
                        disabled={loading || !item.id}
                        aria-label="Remover item do carrinho XBZ"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Carrinho vazio.</p>
        )}

        {canGenerateOrders ? (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                Gerar pedidos cria pedidos reais na XBZ a partir dos itens selecionados. A ação é auditada.
              </AlertDescription>
            </Alert>
            <Button onClick={() => setConfirmOpen(true)} disabled={loading || itens.length === 0}>
              Gerar pedidos na XBZ
            </Button>
          </>
        ) : null}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar emissão de pedidos</AlertDialogTitle>
              <AlertDialogDescription>
                Os itens selecionados no carrinho serão convertidos em pedidos reais na XBZ.
                Esta operação não pode ser desfeita automaticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleGenerate}>Confirmar e gerar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
