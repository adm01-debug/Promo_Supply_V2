import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Search, ShoppingCart, WifiOff } from 'lucide-react';
import { useXbzIntegration, type XbzProdutoRaw } from '@/hooks/useXbzIntegration';
import { formatBRL, isBuscaValida, produtoView, XBZ_BUSCA_MIN } from './xbzHelpers';

interface XbzCatalogoTabProps {
  canAddToCart: boolean;
  showPrices: boolean;
  onCartChanged?: () => void;
}

export function XbzCatalogoTab({ canAddToCart, showPrices, onCartChanged }: XbzCatalogoTabProps) {
  const { loading, buscarProdutosDetalhado, adicionarItem } = useXbzIntegration();
  const [term, setTerm] = useState('');
  const [produtos, setProdutos] = useState<XbzProdutoRaw[]>([]);
  const [searched, setSearched] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  const buscaValida = isBuscaValida(term);

  const handleSearch = useCallback(async () => {
    if (!isBuscaValida(term)) return;
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
    const { id, vendaMinima } = produtoView(produto);
    if (id <= 0) return;
    const added = await adicionarItem(id, vendaMinima);
    if (added !== null) onCartChanged?.();
  }, [adicionarItem, onCartChanged]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catálogo XBZ</CardTitle>
        <CardDescription>
          A XBZ exige um termo de busca com ao menos {XBZ_BUSCA_MIN} caracteres
          (nome ou código amigável; busca por SKU não é suportada). Resultados limitados a 200.
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
          <Button onClick={handleSearch} disabled={loading || !buscaValida}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="mr-2 h-4 w-4" aria-hidden="true" />}
            Buscar
          </Button>
        </div>

        {isStale ? (
          <div
            role="status"
            className="flex items-start gap-4 rounded-md border border-warning/40 bg-warning/10 p-4"
          >
            <WifiOff className="mt-1 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <div className="flex-1 text-sm">
              <Badge variant="outline" className="mr-4 border-warning/50 text-warning">
                Dados em cache
              </Badge>
              <span className="text-muted-foreground">
                A XBZ está indisponível no momento. Exibindo o último catálogo sincronizado
                {syncedAtLabel ? ` em ${syncedAtLabel}` : ''} — preços e estoque podem estar
                desatualizados.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSearch}
              disabled={loading}
              aria-label="Tentar buscar novamente na XBZ"
            >
              <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} aria-hidden="true" />
              Tentar novamente
            </Button>
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
              {produtos.map((p) => {
                const v = produtoView(p);
                return (
                <TableRow key={`${v.id}-${v.sku}`}>
                  <TableCell>
                    <span className="font-medium">{v.nome}</span>
                    <span className="block text-xs text-muted-foreground">{v.sku}</span>
                  </TableCell>
                  <TableCell>{v.cor ?? '—'}</TableCell>
                  {showPrices ? (
                    <TableCell className="text-right">{formatBRL(v.preco)}</TableCell>
                  ) : null}
                  <TableCell className="text-right">
                    {v.quantidade === null ? '—' : v.quantidade.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    {v.vendaMinima} / {v.multiplos}
                  </TableCell>
                  <TableCell>
                    <Badge variant={v.disponivel.toUpperCase() === 'SIM' ? 'default' : 'secondary'}>
                      {v.disponivel}
                    </Badge>
                  </TableCell>
                  {canAddToCart ? (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdd(p)}
                        disabled={loading || v.id <= 0}
                        aria-label={`Adicionar ${v.nome} ao carrinho XBZ`}
                      >
                        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
