import { useState } from "react";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDevolucoes, useCreditosFornecedor, useDevolucoesKPIs } from "@/hooks/useDevolucoes";
import { 
  RotateCcw, Plus, Search, TrendingDown, Truck, CheckCircle2, 
  AlertTriangle, DollarSign, CreditCard, Package, 
  Clock, Eye
} from "lucide-react";
import { format } from "date-fns/format";
import { Skeleton } from "@/components/ui/skeleton";
import { NovaDevolucaoModal, DevolucaoDetailModal, MOTIVO_LABELS } from "./DevolucoesModals";
import { STATUS_MAP, CREDITO_STATUS_MAP } from "./devolucoesData";
import { EnhancedKpiCard } from "@/components/compras/EnhancedKpiCard";

export default function Devolucoes() {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedDev, setSelectedDev] = useState<import("@/hooks/useDevolucoes").Devolucao | null>(null);
  const [activeTab, setActiveTab] = useState("devolucoes");

  const { devolucoes, loading } = useDevolucoes({ status: statusFilter, search: searchTerm });
  const { kpis, loading: kpisLoading } = useDevolucoesKPIs();
  const { creditos, saldoTotal, loading: creditosLoading } = useCreditosFornecedor();

  return (
    <ModuleErrorBoundary module="devolucoes">
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-primary" />
              Devoluções & Créditos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gestão de devoluções, trocas e créditos de fornecedores</p>
          </div>
          <Button onClick={() => setShowNewModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Devolução
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpisLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : (
            <>
              <EnhancedKpiCard title="Total Devoluções" value={kpis.total} icon={RotateCcw} color="blue" variant="compact" />
              <EnhancedKpiCard title="Abertas" value={kpis.abertas} icon={AlertTriangle} color="orange" variant="compact" />
              <EnhancedKpiCard title="Em Trânsito" value={kpis.emTransito} icon={Truck} color="blue" variant="compact" />
              <EnhancedKpiCard title="Concluídas" value={kpis.concluidas} icon={CheckCircle2} color="emerald" variant="compact" />
              <EnhancedKpiCard title="Valor Total" value={kpis.valorTotal} format="currency" icon={TrendingDown} color="red" variant="compact" />
              <EnhancedKpiCard title="Créditos Ativos" value={saldoTotal} format="currency" icon={CreditCard} color="indigo" variant="compact" subtitle="Saldo disponível" />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="devolucoes" className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" />Devoluções</TabsTrigger>
            <TabsTrigger value="creditos" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" />Créditos</TabsTrigger>
          </TabsList>

          {/* Devoluções Tab */}
          <TabsContent value="devolucoes" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar devoluções..." className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k, v]: [string, any]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card className="border-border/50">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : devolucoes.length === 0 ? (
                  <div className="p-12 text-center">
                    <RotateCcw className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">Nenhuma devolução encontrada</p>
                    <p className="text-xs text-muted-foreground mt-1">Crie uma nova devolução para começar</p>
                  </div>
                ) : (
                  <Table aria-label="Tabela de dados">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Número</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devolucoes.map(dev => {
                        const st = STATUS_MAP[dev.status];
                        return (
                          <TableRow key={dev.id} className="cursor-pointer" onClick={() => setSelectedDev(dev)}>
                            <TableCell className="font-mono font-semibold text-primary">{dev.numero}</TableCell>
                            <TableCell className="font-medium">{dev.fornecedor?.nome_fantasia || dev.fornecedor?.razao_social || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {dev.tipo === 'troca' ? 'Troca' : dev.tipo === 'garantia' ? 'Garantia' : 'Devolução'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{MOTIVO_LABELS[dev.motivo] || dev.motivo}</TableCell>
                            <TableCell><Badge className={`${st?.color} text-xs`}>{st?.label}</Badge></TableCell>
                            <TableCell className="text-right font-semibold">R$ {dev.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{format(new Date(dev.data_solicitacao), "dd/MM/yy")}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="w-8 h-8"><Eye className="w-4 h-4" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Créditos Tab */}
          <TabsContent value="creditos" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Créditos de Fornecedores
                  <Badge variant="secondary" className="ml-auto">
                    Saldo Total: R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {creditosLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : creditos.length === 0 ? (
                  <div className="p-12 text-center">
                    <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">Nenhum crédito registrado</p>
                    <p className="text-xs text-muted-foreground mt-1">Créditos são gerados automaticamente ao concluir devoluções</p>
                  </div>
                ) : (
                  <Table aria-label="Tabela de dados">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Ref. Devolução</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor Original</TableHead>
                        <TableHead className="text-right">Utilizado</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Emissão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditos.map(cred => {
                        const cs = CREDITO_STATUS_MAP[cred.status] || CREDITO_STATUS_MAP["ativo"];
                        return (
                          <TableRow key={cred.id}>
                            <TableCell className="font-medium">{cred.fornecedor?.nome_fantasia || cred.fornecedor?.razao_social || '—'}</TableCell>
                            <TableCell className="font-mono text-xs text-primary">{cred.devolucao?.numero || '—'}</TableCell>
                            <TableCell className="text-sm">{cred.tipo === 'credito_devolucao' ? 'Devolução' : cred.tipo}</TableCell>
                            <TableCell className="text-right font-medium">R$ {cred.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-muted-foreground">R$ {cred.valor_utilizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right font-semibold text-kpi-success">R$ {cred.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell><Badge className={`${cs.color} text-xs`}>{cs.label}</Badge></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{format(new Date(cred.data_emissao), "dd/MM/yy")}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <NovaDevolucaoModal open={showNewModal} onClose={() => setShowNewModal(false)} />
      <DevolucaoDetailModal devolucao={selectedDev} open={!!selectedDev} onClose={() => setSelectedDev(null)} />
      
    </ModuleErrorBoundary>
  );
}
