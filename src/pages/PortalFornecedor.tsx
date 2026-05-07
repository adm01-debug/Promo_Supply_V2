import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
import {
  Building2, Package, FileText, TrendingUp, Clock,
  CheckCircle, AlertTriangle, DollarSign, Eye, Search,
  Star, Truck, BarChart3, ShieldCheck, Gavel
} from 'lucide-react';
import { MainLayout } from '@/components/compras/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  usePortalFornecedorData,
  statusPedido,
  statusCotacao,
  formatCurrency,
} from './portal-fornecedor/portalFornecedorData';

export default function PortalFornecedor() {
  const { user } = useAuth();
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // First, load the list of fornecedores for selection
  const { data: fornecedoresList = [], isLoading: loadingList } = useQuery({
    queryKey: ['portal-fornecedores-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, razao_social, cnpj, status, avaliacao, segmento')
        .eq('status', 'ativo')
        .order('razao_social');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { fornecedor, pedidos, cotacoes, contratos, qualScore, isLoading } = usePortalFornecedorData(selectedFornecedorId);

  // KPIs
  const kpis = useMemo(() => {
    const pedidosAbertos = pedidos.filter(p => !['entregue', 'cancelado'].includes(p.status)).length;
    const cotacoesPendentes = cotacoes.filter(c => c.status === 'pendente').length;
    const volumeTotal = pedidos.reduce((s, p) => s + (p.valor_total || 0), 0);
    const entregasNoPrazo = pedidos.filter(p => p.data_entrega && p.data_previsao && new Date(p.data_entrega) <= new Date(p.data_previsao)).length;
    const totalEntregues = pedidos.filter(p => p.data_entrega && p.data_previsao).length;
    const otif = totalEntregues > 0 ? Math.round((entregasNoPrazo / totalEntregues) * 100) : 0;

    return { pedidosAbertos, cotacoesPendentes, volumeTotal, otif };
  }, [pedidos, cotacoes]);

  const filteredFornecedores = useMemo(() => {
    if (!search) return fornecedoresList;
    const q = search.toLowerCase();
    return fornecedoresList.filter(f => f.razao_social.toLowerCase().includes(q) || (f.cnpj || '').includes(q));
  }, [fornecedoresList, search]);

  // If no supplier selected, show selector
  if (!selectedFornecedorId) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <PageHeader
            title="Portal do Fornecedor"
            description="Selecione um fornecedor para visualizar seu painel completo"
            icon={Building2}
          />

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fornecedor por nome ou CNPJ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loadingList ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFornecedores.map(f => (
                <Card
                  key={f.id}
                  className="cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => setSelectedFornecedorId(f.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground truncate">{f.razao_social}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{f.cnpj || 'Sem CNPJ'}</p>
                        <Badge variant="outline" className="mt-2 text-[10px]">{f.segmento || 'Geral'}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-warning" />
                        <span className="font-bold text-foreground">{f.avaliacao?.toFixed(1) || '—'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredFornecedores.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum fornecedor encontrado</p>
                </div>
              )}
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title={fornecedor?.razao_social || 'Portal do Fornecedor'}
            description={fornecedor?.cnpj ? `CNPJ: ${fornecedor.cnpj}` : 'Painel de visibilidade do fornecedor'}
            icon={Building2}
          />
          <Button variant="outline" size="sm" onClick={() => setSelectedFornecedorId(null)}>
            Trocar Fornecedor
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><Package className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pedidos Abertos</p>
                    <p className="text-2xl font-bold text-foreground">{kpis.pedidosAbertos}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10"><FileText className="w-5 h-5 text-warning" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cotações Pendentes</p>
                    <p className="text-2xl font-bold text-foreground">{kpis.cotacoesPendentes}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10"><DollarSign className="w-5 h-5 text-success" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Volume Total</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(kpis.volumeTotal)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">OTIF</p>
                    <p className="text-2xl font-bold text-foreground">{kpis.otif}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Qualification Score */}
            {qualScore && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    Qualificação
                    <Badge variant={qualScore.qualification_status === 'approved' ? 'default' : qualScore.qualification_status === 'blocked' ? 'destructive' : 'secondary'}>
                      {qualScore.qualification_status === 'approved' ? 'Aprovado' : qualScore.qualification_status === 'blocked' ? 'Bloqueado' : 'Pendente'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Score Geral', value: qualScore.overall_score },
                      { label: 'Compliance', value: qualScore.compliance_score },
                      { label: 'Documentação', value: qualScore.document_score },
                      { label: 'Validade Docs', value: qualScore.expiry_score },
                    ].map(m => (
                      <div key={m.label}>
                        <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-lg font-bold",
                            m.value >= 80 ? "text-success" : m.value >= 60 ? "text-warning" : "text-destructive"
                          )}>{Math.round(m.value)}</span>
                          <Progress value={m.value} className="flex-1 h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="pedidos">
              <TabsList>
                <TabsTrigger value="pedidos" className="gap-1.5">
                  <Package className="w-4 h-4" /> Pedidos ({pedidos.length})
                </TabsTrigger>
                <TabsTrigger value="cotacoes" className="gap-1.5">
                  <FileText className="w-4 h-4" /> Cotações ({cotacoes.length})
                </TabsTrigger>
                <TabsTrigger value="contratos" className="gap-1.5">
                  <Truck className="w-4 h-4" /> Contratos ({contratos.length})
                </TabsTrigger>
                <TabsTrigger value="sourcing" className="gap-1.5">
                  <Gavel className="w-4 h-4" /> Sourcing (RFx)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pedidos">
                <Card>
                  <CardContent className="p-0">
                    {pedidos.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Nenhum pedido encontrado</p>
                      </div>
                    ) : (
                      <Table aria-label="Pedidos do fornecedor">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden md:table-cell">Emissão</TableHead>
                            <TableHead className="hidden md:table-cell">Previsão</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pedidos.map(p => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                              <TableCell>
                                <Badge variant={statusPedido[p.status]?.variant || 'secondary'}>
                                  {statusPedido[p.status]?.label || p.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                {format(new Date(p.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                {p.data_previsao ? format(new Date(p.data_previsao), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(p.valor_total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cotacoes">
                <Card>
                  <CardContent className="p-0">
                    {cotacoes.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Nenhuma cotação encontrada</p>
                      </div>
                    ) : (
                      <Table aria-label="Cotações do fornecedor">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Solicitação</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead className="hidden md:table-cell">Prazo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cotacoes.map(c => (
                            <TableRow key={c.id}>
                              <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                              <TableCell className="text-sm">
                                {(c as any).solicitacao?.titulo || (c as any).solicitacao?.numero || '—'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusCotacao[c.status]?.variant || 'secondary'}>
                                  {statusCotacao[c.status]?.label || c.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(c.valor_total)}</TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                {c.prazo_entrega} dias
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contratos">
                <Card>
                  <CardContent className="p-0">
                    {contratos.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground">
                        <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Nenhum contrato encontrado</p>
                      </div>
                    ) : (
                      <Table aria-label="Contratos do fornecedor">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden md:table-cell">Vigência</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contratos.map((ct: any) => (
                            <TableRow key={ct.id}>
                              <TableCell className="font-mono text-xs">{ct.contract_number}</TableCell>
                              <TableCell className="font-medium max-w-[200px] truncate">{ct.title}</TableCell>
                              <TableCell>
                                <Badge variant={ct.status === 'active' ? 'default' : ct.status === 'expired' ? 'destructive' : 'secondary'}>
                                  {ct.status === 'active' ? 'Ativo' : ct.status === 'expired' ? 'Expirado' : ct.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                {format(new Date(ct.start_date), 'dd/MM/yy')} — {format(new Date(ct.end_date), 'dd/MM/yy')}
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(ct.total_value)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </MainLayout>
  );
}
