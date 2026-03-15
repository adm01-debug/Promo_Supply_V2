import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/compras/MainLayout';
import { useSpotIntegration, SpotOrder, SpotCartItem, SpotFinancialDoc } from '@/hooks/useSpotIntegration';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Search, ShoppingCart, Package, FileText, CreditCard, Loader2, Plug, Trash2, RefreshCw,
  ExternalLink, AlertTriangle, CheckCircle2
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'Submetida': 'bg-cyan-500',
  'Em processamento': 'bg-gray-500',
  'Processada': 'bg-yellow-500',
  'Aguardando Pagamento': 'bg-orange-500',
  'Pago': 'bg-emerald-500',
  'Pendencia Layout': 'bg-purple-500',
  'Em Separação': 'bg-green-300',
  'Em Produção': 'bg-green-500',
  'Expedida': 'bg-green-700',
  'Anulada': 'bg-red-600',
};

const CatalogoSpot = () => {
  const spot = useSpotIntegration();
  const [activeTab, setActiveTab] = useState('catalogo');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ line: number; value: string; text: string }>>([]);
  const [cart, setCart] = useState<{ items: SpotCartItem[]; total: number; itemCount: number } | null>(null);
  const [orders, setOrders] = useState<SpotOrder[]>([]);
  const [financialDocs, setFinancialDocs] = useState<{ documents: SpotFinancialDoc[]; hasOverdue: boolean } | null>(null);
  const [connected, setConnected] = useState(false);
  const [orderYear, setOrderYear] = useState(new Date().getFullYear().toString());

  // Test connection on mount
  useEffect(() => {
    let cancelled = false;
    spot.testConnection().then(data => {
      if (!cancelled && data?.success) setConnected(true);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    const results = await spot.searchProducts(searchQuery);
    setHasSearched(true);
    if (results) setSearchResults(results);
  }, [searchQuery, spot]);

  const handleAddToCart = useCallback(async (ref: string) => {
    await spot.addToCart(ref, 1, '0', '0');
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot]);

  const loadCart = useCallback(async () => {
    const data = await spot.getCart();
    if (data) setCart(data);
  }, [spot]);

  const loadOrders = useCallback(async () => {
    const data = await spot.getOrders(orderYear);
    if (data) setOrders(data.orders);
  }, [spot, orderYear]);

  const loadFinancial = useCallback(async () => {
    const data = await spot.getFinancialDocs();
    if (data) setFinancialDocs(data);
  }, [spot]);

  const handleRemoveFromCart = useCallback(async (groupId: string) => {
    await spot.removeFromCart(groupId);
    loadCart();
  }, [spot, loadCart]);

  const handleReconnect = useCallback(async () => {
    const d = await spot.testConnection();
    if (d?.success) setConnected(true);
  }, [spot]);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">SPOT / Stricker</h1>
            <p className="text-muted-foreground mt-1">
              Catálogo de brindes promocionais — Integração direta
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={connected ? 'default' : 'destructive'} className="gap-1.5 py-1.5">
              {connected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {connected ? 'Conectado' : 'Desconectado'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReconnect}
              disabled={spot.loading}
            >
              <Plug className="w-4 h-4 mr-2" />
              Reconectar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="catalogo" className="gap-2">
              <Search className="w-4 h-4" />
              Catálogo
            </TabsTrigger>
            <TabsTrigger value="carrinho" className="gap-2" onClick={loadCart}>
              <ShoppingCart className="w-4 h-4" />
              Carrinho
              {cart && cart.itemCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{cart.itemCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="gap-2" onClick={loadOrders}>
              <Package className="w-4 h-4" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-2" onClick={loadFinancial}>
              <CreditCard className="w-4 h-4" />
              Financeiro
            </TabsTrigger>
          </TabsList>

          {/* CATÁLOGO */}
          <TabsContent value="catalogo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Pesquisa de Produtos SPOT
                </CardTitle>
                <CardDescription>
                  Busque por referência, nome ou descrição no catálogo SPOT (987+ produtos)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: 81198, caneta, bolsa..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={spot.loading || !searchQuery.trim()}>
                    {spot.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span className="ml-2">Buscar</span>
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {searchResults.length} resultado(s)
                    </h3>
                    {searchResults.map((result, i) => {
                      const parts = result.text.split(' - ');
                      const ref = parts[0] || '';
                      const name = parts.slice(1).join(' - ') || result.text;

                      return (
                        <Card key={i} className="hover:bg-accent/50 transition-colors">
                          <CardContent className="flex items-center justify-between p-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">{ref}</Badge>
                                <span className="font-medium">{name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {result.value}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`https://www.spotgifts.com.br${result.value}`, '_blank')}
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                Ver
                              </Button>
                              <Button size="sm" onClick={() => handleAddToCart(ref)} disabled={spot.loading}>
                                <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                                Adicionar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {searchResults.length === 0 && hasSearched && !spot.loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum produto encontrado para &quot;{searchQuery}&quot;</p>
                    <p className="text-sm mt-1">Tente buscar por referência (ex: 81198) ou nome</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CARRINHO */}
          <TabsContent value="carrinho" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Carrinho SPOT
                  </CardTitle>
                  <CardDescription>
                    {cart ? `${cart.itemCount} item(s) — Total: R$ ${cart.total.toFixed(2)}` : 'Carregando...'}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadCart} disabled={spot.loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${spot.loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </CardHeader>
              <CardContent>
                {spot.loading && !cart ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : cart && cart.items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referência</TableHead>
                        <TableHead className="text-right">Preço Unit.</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">{item.ref}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {item.unitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">{item.stockAvailable}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveFromCart(item.groupId)}
                              disabled={spot.loading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Carrinho vazio</p>
                    <p className="text-sm mt-1">Busque produtos no catálogo e adicione ao carrinho</p>
                  </div>
                )}

                {cart && cart.items.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">
                        Total: R$ {cart.total.toFixed(2)}
                      </span>
                      <Button onClick={() => toast.info('Checkout SPOT — Em desenvolvimento')}>
                        Finalizar Pedido
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PEDIDOS */}
          <TabsContent value="pedidos" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Pedidos SPOT
                  </CardTitle>
                  <CardDescription>
                    Acompanhamento de todos os pedidos da conta
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={orderYear}
                    onChange={e => setOrderYear(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {[2026, 2025, 2024].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <Button variant="outline" size="sm" onClick={loadOrders} disabled={spot.loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${spot.loading ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {spot.loading && orders.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : orders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Nº</TableHead>
                        <TableHead>Ref. Cliente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Transportadora</TableHead>
                        <TableHead>Rastreio</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-3 h-3 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-400'}`}
                              />
                              <span className="text-sm">{order.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono font-medium">{order.id}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{order.reference || '—'}</TableCell>
                          <TableCell className="text-sm">
                            {order.date ? new Date(order.date).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {order.total > 0 ? `R$ ${order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                          </TableCell>
                          <TableCell className="text-sm">{order.carrier || '—'}</TableCell>
                          <TableCell>
                            {order.tracking ? (
                              <Badge variant="outline" className="font-mono text-xs">{order.tracking}</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            {order.detailsUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(order.detailsUrl, '_blank')}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum pedido encontrado para {orderYear}</p>
                    <Button variant="outline" className="mt-3" onClick={loadOrders}>
                      Carregar Pedidos
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Legend */}
            <Card>
              <CardContent className="pt-4">
                <h4 className="text-sm font-medium mb-3">Legenda de Status</h4>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <div key={status} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                      <span className="text-xs text-muted-foreground">{status}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FINANCEIRO */}
          <TabsContent value="financeiro" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Documentos Financeiros SPOT
                  </CardTitle>
                  <CardDescription>
                    Faturas, notas fiscais e status de pagamento
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadFinancial} disabled={spot.loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${spot.loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </CardHeader>
              <CardContent>
                {financialDocs?.hasOverdue && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Atenção: Existem faturas vencidas que ainda não foram liquidadas.</span>
                  </div>
                )}

                {spot.loading && !financialDocs ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : financialDocs && financialDocs.documents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Doc</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financialDocs.documents.map((doc, i) => (
                        <TableRow key={i} className={doc.isOverdue ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-mono font-medium">{doc.docNumber}</TableCell>
                          <TableCell>{doc.orderNumber}</TableCell>
                          <TableCell className="text-sm">{doc.date}</TableCell>
                          <TableCell className="text-sm">{doc.dueDate}</TableCell>
                          <TableCell className="text-right font-medium">{doc.amount}</TableCell>
                          <TableCell>
                            <Badge variant={doc.isOverdue ? 'destructive' : 'outline'}>
                              {doc.isOverdue ? 'Vencida' : doc.status || 'Normal'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {doc.downloadUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(doc.downloadUrl!, '_blank')}
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum documento financeiro carregado</p>
                    <Button variant="outline" className="mt-3" onClick={loadFinancial}>
                      Carregar Documentos
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default CatalogoSpot;
