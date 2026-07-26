import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, ShoppingCart, WifiOff } from 'lucide-react';
import { useXbzIntegration, type XbzProdutoRaw } from '@/hooks/useXbzIntegration';
import { formatBRL } from './xbzHelpers';

interface XbzCatalogoTabProps {
  canAddToCart: boolean;
  showPrices: boolean;
  onCartChanged?: () => void;
}

function produtoId(p: XbzProdutoRaw): number {
  return Number(p.ProdutoId ?? p.Id ?? 0);
}

export function XbzCatalogoTab({ canAddToCart, showPrices, onCartChanged }: XbzCatalogoTabProps) {
  const { loading, buscarProdutosDetalhado, adicionarItem } = useXbzIntegration();
  const [term, setTerm] = useState('');
  const [produtos, setProdutos] = useState<XbzProdutoRaw[]>([]);
  const [searched, setSearched] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    const result = await buscarProdutosDetalhado(term);
    setSearched(true);
    setProdutos(result ? result.produtos.slice(0, 200) : []);
    setIsStale(result?.stale === true);
    setSyncedAt(result?.syncedAt ?? null);
  }, [buscarProdutosDetalhado, term]);

  /** Formata o instante da última sincronização de forma legível (pt-BR). */
  const syncedAtLabel = useMemo(() => {
    if (!syncedAt) return null;
    const date = new Date(syncedAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }, [syncedAt]);



  const handleAdd = useCallback(async (produto: XbzProdutoRaw) => {
    const id = produtoId(produto);
    if (id <= 0) return;
    const minimo = Number(produto.VendaMinima ?? 1) || 1;
    const added = await adicionarItem(id, minimo);
    if (added !== null) onCartChanged?.();
  }, [adicionarItem, onCartChanged]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catálogo XBZ</CardTitle>
        <CardDescription>
          A XBZ exige um termo de busca. Deixe em branco para varrer o catálogo completo
          (usa o termo padrão &quot;a&quot;, ~10 mil itens — resultados limitados a 200).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }}
            placeholder="Buscar por nome ou código amigável (ex.: caneta, 12487)"
            aria-label="Buscar produtos na XBZ"
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="mr-2 h-4 w-4" aria-hidden="true" />}
            Buscar
          </Button>
        </div>

        {isStale ? (
          <div
            role="status"
            className="flex items-center gap-4 rounded-md border border-warning/40 bg-warning/10 p-4"
          >
            <WifiOff className="h-4 w-4 text-warning" aria-hidden="true" />
            <div className="text-sm">
              <Badge variant="outline" className="mr-4 border-warning/50 text-warning">
                Dados em cache
              </Badge>
              <span className="text-muted-foreground">
                A XBZ está indisponível no momento. Exibindo o último catálogo sincronizado —
                preços e estoque podem estar desatualizados.
              </span>
            </div>
          </div>
        ) : null}



        {searched && produtos.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">
            Nenhum produto encontrado. A busca por SKU não é suportada pela XBZ — use o nome ou o código amigável.
          </p>
        ) : null}

        {produtos.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Cor</TableHead>
                {showPrices ? <TableHead className="text-right">Preço</TableHead> : null}
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Mín. / Múltiplo</TableHead>
                <TableHead>Disponibilidade</TableHead>
                {canAddToCart ? <TableHead className="w-24" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((p) => (
                <TableRow key={`${produtoId(p)}-${String(p.Sku ?? '')}`}>
                  <TableCell>
                    <span className="font-medium">{String(p.Nome ?? '—')}</span>
                    <span className="block text-xs text-muted-foreground">{String(p.Sku ?? '')}</span>
                  </TableCell>
                  <TableCell>{String(p.NomeCor ?? '—')}</TableCell>
                  {showPrices ? (
                    <TableCell className="text-right">{formatBRL(Number(p.Preco ?? NaN))}</TableCell>
                  ) : null}
                  <TableCell className="text-right">{Number(p.Quantidade ?? 0)}</TableCell>
                  <TableCell className="text-right">
                    {Number(p.VendaMinima ?? 1)} / {Number(p.Multiplos ?? 1)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={String(p.Disponivel ?? '').toUpperCase() === 'SIM' ? 'default' : 'secondary'}>
                      {String(p.Disponivel ?? '—')}
                    </Badge>
                  </TableCell>
                  {canAddToCart ? (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdd(p)}
                        disabled={loading}
                        aria-label={`Adicionar ${String(p.Nome ?? 'produto')} ao carrinho XBZ`}
                      >
                        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
