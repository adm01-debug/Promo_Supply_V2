import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Search, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useSpotProducts,
  useSpotSkus,
  useSpotStock,
  type SpotCatalogFilters,
} from './useSpotCatalog';
import { SPOT_COLLECTIONS, SPOT_CATEGORY_FILTERS } from './spotHelpers';

export interface SpotCatalogTabProps {
  onAddToCart: (productId: string) => void;
  disabled?: boolean;
}

/**
 * Mesmo limiar que o painel de integração usa para a leitura de pedidos
 * (`SpotSyncPanel`): passando disso, a tela precisa avisar em vez de exibir o
 * número como se fosse corrente.
 */
const STOCK_STALE_MINUTES = 45;

/**
 * Catálogo SPOT servido pelo PIM (`v_compras_catalogo`, filtro fornecedor `SPOT`).
 * A busca não dispara chamadas à API oficial — preço e estoque são do PIM.
 */
export const SpotCatalogTab = ({ onAddToCart, disabled = false }: SpotCatalogTabProps) => {
  const [search, setSearch] = useState('');
  const [collection, setCollection] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  // PERF-06 (etapa 219): o termo ia direto para a chave da consulta, entao cada
  // tecla disparava uma requisicao nova (e mais duas quando `references` mudava).
  const debouncedSearch = useDebouncedValue(search, 300);

  const filters: SpotCatalogFilters = useMemo(() => {
    const category = SPOT_CATEGORY_FILTERS.find((c) => c.name === categoryName) ?? null;
    return {
      search: debouncedSearch,
      collection,
      typeCodes: category ? { legacy: category.legacy, modern: category.modern } : null,
    };
  }, [debouncedSearch, collection, categoryName]);

  const { data: products = [], isLoading } = useSpotProducts(filters);
  const references = useMemo(() => products.map((p) => p.reference), [products]);
  const { data: skus = [] } = useSpotSkus(references);
  const { data: stock = [] } = useSpotStock(references);

  const skusByProduct = useMemo(() => {
    const map = new Map<string, typeof skus>();
    for (const sku of skus) {
      const list = map.get(sku.product_reference) ?? [];
      list.push(sku);
      map.set(sku.product_reference, list);
    }
    return map;
  }, [skus]);

  const stockByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stock) {
      const key = row.product_reference ?? '';
      map.set(key, (map.get(key) ?? 0) + row.quantity);
    }
    return map;
  }, [stock]);

    // INT-11 (etapa 183): a quantidade vinha do cache sem dizer de quando era.
    // O carimbo mais recente do lote é a idade real do estoque exibido.
    const stockSyncedAt = useMemo(() => {
      let maisRecente: number | null = null;
      for (const row of stock) {
        const instante = new Date(row.synced_at).getTime();
        if (Number.isNaN(instante)) continue;
        if (maisRecente === null || instante > maisRecente) maisRecente = instante;
      }
      return maisRecente;
    }, [stock]);

    const stockSyncedAtLabel = useMemo(() => {
      if (stockSyncedAt === null) return null;
      return new Date(stockSyncedAt).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    }, [stockSyncedAt]);

    const stockStale =
      stockSyncedAt !== null && Date.now() - stockSyncedAt > STOCK_STALE_MINUTES * 60000;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="w-4 h-4" aria-hidden="true" />
            Catálogo SPOT (cache local)
          </CardTitle>
          <CardDescription>
            Busque por referência ou nome. Filtros de categoria consideram os dois sistemas de código do fornecedor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Ex: 81198, caneta, bolsa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar produtos no catálogo SPOT"
          />

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por coleção">
            {SPOT_COLLECTIONS.map((item) => (
              <Badge
                key={item}
                variant={collection === item ? 'default' : 'outline'}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-pressed={collection === item}
                onClick={() => setCollection(collection === item ? null : item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setCollection(collection === item ? null : item);
                  }
                }}
              >
                {item}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
            {SPOT_CATEGORY_FILTERS.map((cat) => (
              <Badge
                key={cat.name}
                variant={categoryName === cat.name ? 'secondary' : 'outline'}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-pressed={categoryName === cat.name}
                onClick={() => setCategoryName(categoryName === cat.name ? null : cat.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setCategoryName(categoryName === cat.name ? null : cat.name);
                  }
                }}
              >
                {cat.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

              {stockSyncedAtLabel && (
                <div
                  className={
                    stockStale
                      ? 'flex flex-wrap items-center gap-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-xs text-warning'
                      : 'text-xs text-muted-foreground'
                  }
                  role={stockStale ? 'status' : undefined}
                  data-testid="spot-stock-freshness"
                >
                  {stockStale ? (
                    <>
                      <Badge variant="outline" className="border-warning/50 text-warning">
                        Estoque defasado
                      </Badge>
                      <span>
                        Última sincronização de estoque em {stockSyncedAtLabel} — as quantidades
                        podem estar desatualizadas. Use "Sincronizar" para atualizar.
                      </span>
                    </>
                  ) : (
                    <span>Estoque sincronizado em {stockSyncedAtLabel}.</span>
                  )}
                </div>
              )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground" data-testid="spot-catalog-empty">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
          <p>Nenhum produto no cache com esses filtros.</p>
          <p className="text-sm mt-1">Se o cache estiver vazio, aguarde a próxima sincronização diária.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="spot-catalog-grid">
          {products.map((product) => {
            const productSkus = skusByProduct.get(product.reference) ?? [];
            const bestPrice = productSkus
              .map((s) => s.your_price)
              .filter((p): p is number => typeof p === 'number')
              .sort((a, b) => a - b)[0];
            const noReplenishment = productSkus.length > 0 && productSkus.every((s) => s.no_replenishment);
            const available = stockByProduct.get(product.reference) ?? 0;

            return (
              <Card key={product.reference} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium leading-snug">{product.name}</CardTitle>
                    <Badge variant="outline" className="font-mono text-xs shrink-0">
                      {product.reference}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {product.category_name ?? 'Sem categoria'}
                    {product.brand ? ` · ${product.brand}` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 flex-1">
                  {product.main_image_url && (
                    <img
                      src={product.main_image_url}
                      alt={`Produto SPOT ${product.name}`}
                      loading="lazy"
                      className="h-32 w-full object-contain rounded-md bg-muted"
                    />
                  )}

                  {productSkus.length > 0 && (
                    <div className="flex flex-wrap gap-1.5" aria-label="Cores disponíveis">
                      {productSkus.slice(0, 10).map((sku) => (
                        <span
                          key={sku.sku}
                          title={sku.color_name ?? sku.sku}
                          aria-label={sku.color_name ?? sku.sku}
                          className="h-4 w-4 rounded-full border border-border"
                          style={sku.color_hex ? { backgroundColor: sku.color_hex } : undefined}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{available > 0 ? `${available.toLocaleString('pt-BR')} em estoque` : 'Sem estoque'}</span>
                    {typeof bestPrice === 'number' && (
                      <span className="text-foreground font-medium">a partir de {formatCurrency(bestPrice)}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {product.catalogs.slice(0, 3).map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                    ))}
                    {noReplenishment && (
                      <Badge variant="destructive" className="text-xs">Sem reposição</Badge>
                    )}
                  </div>

                  <Button
                    size="sm"
                    className="mt-auto"
                    disabled={disabled}
                    onClick={() => onAddToCart(product.reference)}
                    aria-label={`Adicionar ${product.name} ao carrinho`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Adicionar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
