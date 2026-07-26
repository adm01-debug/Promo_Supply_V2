import { useCallback, useEffect, useState } from 'react';
import { MainLayout } from '@/features/layout/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Loader2, Plug } from 'lucide-react';
import { useXbzIntegration, type XbzCredentialStatus, type XbzDashboard } from '@/hooks/useXbzIntegration';
import { XbzCredenciaisDialog } from './XbzCredenciaisDialog';
import { XbzCatalogoTab } from './XbzCatalogoTab';
import { XbzPedidosTab } from './XbzPedidosTab';
import { XbzCarrinhoTab } from './XbzCarrinhoTab';

const CatalogoXbz = () => {
  const { loading, getCredentialStatus, testConnection, getDashboard } = useXbzIntegration();
  const [status, setStatus] = useState<XbzCredentialStatus | null>(null);
  const [dashboard, setDashboard] = useState<XbzDashboard | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('catalogo');

  const loadStatus = useCallback(async () => {
    const data = await getCredentialStatus();
    setStatus(data ?? null);
  }, [getCredentialStatus]);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  const configured = Boolean(status?.pessoa_id) && status?.is_active !== false;
  const permissions = status?.permissions;
  const showPrices = permissions?.podeVerPreco !== false;
  const canWrite = permissions?.podeAlterarCarrinho !== false;
  const canGenerateOrders = Boolean(permissions?.podeGerarPedido);

  const handleTest = useCallback(async () => {
    const info = await testConnection();
    if (info) {
      void loadStatus();
      const dash = await getDashboard();
      if (dash) setDashboard(dash);
    }
  }, [testConnection, getDashboard, loadStatus]);

  return (
    <MainLayout>
      <div className="space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Catálogo XBZ</h1>
            <p className="text-sm text-muted-foreground">
              Integração direta com o portal MinhaXBZ: catálogo, carrinho, pedidos e status financeiro.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={configured ? 'default' : 'secondary'}>
              {configured ? 'Conectado' : 'Não configurado'}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleTest} disabled={loading || !configured}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Plug className="mr-2 h-4 w-4" aria-hidden="true" />}
              Testar conexão
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
              Credenciais
            </Button>
          </div>
        </header>

        {status?.last_login_ok === false && status?.last_error ? (
          <Alert variant="destructive">
            <AlertDescription>Última tentativa de login falhou: {status.last_error}</AlertDescription>
          </Alert>
        ) : null}

        {!configured ? (
          <Card>
            <CardHeader>
              <CardTitle>Configure as credenciais XBZ</CardTitle>
              <CardDescription>
                Cada empresa do grupo usa suas próprias credenciais do portal XBZ. Elas são cifradas
                no backend e nunca trafegam de volta para o navegador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setDialogOpen(true)}>Configurar agora</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {dashboard ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ['Aguardando aprovação', dashboard.qtdAguardandoAprovacao],
                  ['Emitidos', dashboard.qtdEmitidos],
                  ['Aguardando pagamento', dashboard.qtdAguardandoPagamento],
                  ['Em produção', dashboard.qtdProducao],
                  ['Pronto p/ retirada', dashboard.qtdProntoParaRetirada],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">{String(label)}</p>
                    <p className="text-2xl font-semibold">{Number(value ?? 0)}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
                <TabsTrigger value="carrinho">Carrinho</TabsTrigger>
                <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
              </TabsList>

              <TabsContent value="catalogo">
                <XbzCatalogoTab
                  canAddToCart={canWrite}
                  showPrices={showPrices}
                  onCartChanged={() => setActiveTab('catalogo')}
                />
              </TabsContent>

              <TabsContent value="carrinho">
                <XbzCarrinhoTab canGenerateOrders={canGenerateOrders} canWrite={canWrite} />
              </TabsContent>

              <TabsContent value="pedidos">
                <XbzPedidosTab showPrices={showPrices} />
              </TabsContent>
            </Tabs>
          </>
        )}

        <XbzCredenciaisDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={loadStatus} />
      </div>
    </MainLayout>
  );
};

export default CatalogoXbz;
