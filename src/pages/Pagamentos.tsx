import { useState, useMemo } from "react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeleton, KPICardSkeleton } from "@/components/ui/contextual-skeletons";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CreditCard, 
  Search, 
  QrCode, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  Calendar,
  DollarSign,
  RefreshCw,
  Eye,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PagamentoMobileCard } from "@/components/pagamentos/PagamentoMobileCard";
import { usePagamentos, usePagamentosKPIs, type Pagamento } from "@/hooks/usePagamentos";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/lib/feedbackToast";
import { format, differenceInDays } from "date-fns";

const Pagamentos = () => {
  const [busca, setBusca] = useState("");
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Pagamento | null>(null);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [comprovante, setComprovante] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const isMobile = useIsMobile();
  const { pagamentos, loading, refetch, markAsPaid, approvePagamento } = usePagamentos();
  const { kpis } = usePagamentosKPIs();

  const pagamentosPendentes = useMemo(() => 
    pagamentos.filter(p => ['pendente', 'aprovado'].includes(p.status)),
    [pagamentos]
  );

  const pagamentosPagos = useMemo(() => 
    pagamentos.filter(p => p.status === 'pago'),
    [pagamentos]
  );

  const filtrarPagamentos = (lista: Pagamento[]) => {
    if (!busca) return lista;
    const termoBusca = busca.toLowerCase();
    return lista.filter(p => 
      p.numero.toLowerCase().includes(termoBusca) ||
      p.fornecedor?.razao_social?.toLowerCase().includes(termoBusca) ||
      p.numero_nf?.toLowerCase().includes(termoBusca)
    );
  };

  const handlePagar = (pagamento: Pagamento) => {
    setPagamentoSelecionado(pagamento);
    setComprovante("");
    setModalPagamento(true);
  };

  const handleConfirmarPagamento = async () => {
    if (!pagamentoSelecionado) return;
    
    setIsProcessing(true);
    try {
      const success = await markAsPaid(pagamentoSelecionado.id);
      if (success) {
        toast.success("Pagamento confirmado com sucesso!");
        setModalPagamento(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAprovar = async (pagamento: Pagamento) => {
    const success = await approvePagamento(pagamento.id);
    if (success) {
      toast.success("Pagamento aprovado!");
    }
  };

  const getVencimentoStatus = (vencimento: string, status: string) => {
    if (status === 'pago') {
      return { label: "Pago", variant: "success" as const, icon: CheckCircle2, color: "text-green-600" };
    }
    
    const dias = differenceInDays(new Date(vencimento), new Date());
    
    if (dias < 0) return { label: "Vencido", variant: "destructive" as const, icon: AlertTriangle, color: "text-destructive" };
    if (dias === 0) return { label: "Vence Hoje", variant: "destructive" as const, icon: AlertTriangle, color: "text-destructive" };
    if (dias <= 2) return { label: `${dias}d restante${dias > 1 ? 's' : ''}`, variant: "warning" as const, icon: Clock, color: "text-orange-500" };
    return { label: `${dias}d restantes`, variant: "secondary" as const, icon: Calendar, color: "text-muted-foreground" };
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      pendente: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
      aprovado: { label: 'Aprovado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      pago: { label: 'Pago', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
      cancelado: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    };
    return configs[status] || configs.pendente;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-64 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </div>
          <TableSkeleton rows={6} columns={7} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              Pagamentos
            </h1>
            <p className="text-sm text-muted-foreground">Gestão financeira de compras</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold">{kpis.pendentes}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-xl font-bold text-red-600">{kpis.atrasados}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <DollarSign className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pendente</p>
                <p className="text-xl font-bold text-yellow-600">
                  {kpis.valorPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pago (Mês)</p>
                <p className="text-xl font-bold text-emerald-600">
                  {kpis.valorPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por número, fornecedor ou NF..." 
                className="pl-10"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="pendentes" className="space-y-4">
          <TabsList className="w-full grid grid-cols-2 h-auto p-1">
            <TabsTrigger value="pendentes" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Pendentes ({pagamentosPendentes.length})
            </TabsTrigger>
            <TabsTrigger value="pagos" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Pagos ({pagamentosPagos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes">
            {isMobile ? (
              /* Mobile View */
              <div className="space-y-3">
                {filtrarPagamentos(pagamentosPendentes).length === 0 ? (
                  <Card className="p-8">
                    <IllustratedEmptyState
                      type="payments"
                      title={busca ? "Nenhum pagamento encontrado" : "Nenhum pagamento pendente"}
                      description={busca ? "Tente ajustar os termos da busca" : "Todos os pagamentos estão em dia!"}
                      size="sm"
                    />
                  </Card>
                ) : (
                  filtrarPagamentos(pagamentosPendentes).map((pagamento) => (
                    <PagamentoMobileCard
                      key={pagamento.id}
                      pagamento={pagamento}
                      onPagar={handlePagar}
                      onAprovar={handleAprovar}
                    />
                  ))
                )}
              </div>
            ) : (
              /* Desktop Table */
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>NF</TableHead>
                      <TableHead>Forma Pgto</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrarPagamentos(pagamentosPendentes).map((pagamento) => {
                      const vencStatus = getVencimentoStatus(pagamento.data_vencimento, pagamento.status);
                      const VencIcon = vencStatus.icon;
                      const statusBadge = getStatusBadge(pagamento.status);
                      
                      return (
                        <TableRow key={pagamento.id}>
                          <TableCell>
                            <span className="font-mono font-medium">{pagamento.numero}</span>
                            <div className="mt-1">
                              <Badge variant="outline" className={statusBadge.color}>
                                {statusBadge.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {pagamento.fornecedor?.razao_social || 'Fornecedor não encontrado'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {pagamento.numero_nf || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={pagamento.forma_pagamento === "pix" ? "default" : "secondary"} className="gap-1">
                              {pagamento.forma_pagamento === "pix" ? (
                                <QrCode className="h-3 w-3" />
                              ) : (
                                <FileText className="h-3 w-3" />
                              )}
                              {pagamento.forma_pagamento?.toUpperCase() || 'N/D'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={vencStatus.variant === "warning" ? "outline" : vencStatus.variant === "success" ? "default" : vencStatus.variant}
                                className={vencStatus.variant === "warning" ? "border-orange-500 text-orange-600" : vencStatus.variant === "success" ? "bg-green-600" : ""}
                              >
                                <VencIcon className="h-3 w-3 mr-1" />
                                {vencStatus.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(pagamento.data_vencimento), 'dd/MM/yyyy')}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold">
                              {pagamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handlePagar(pagamento)}>
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Registrar Pagamento
                                </DropdownMenuItem>
                                {pagamento.status === 'pendente' && (
                                  <DropdownMenuItem onClick={() => handleAprovar(pagamento)}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Aprovar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filtrarPagamentos(pagamentosPendentes).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <IllustratedEmptyState
                            type="payments"
                            title={busca ? "Nenhum pagamento encontrado" : "Nenhum pagamento pendente"}
                            description={busca ? "Tente ajustar os termos da busca" : "Todos os pagamentos estão em dia!"}
                            size="sm"
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pagos">
            {isMobile ? (
              /* Mobile View */
              <div className="space-y-3">
                {filtrarPagamentos(pagamentosPagos).length === 0 ? (
                  <Card className="p-8">
                    <IllustratedEmptyState
                      type="payments"
                      title={busca ? "Nenhum pagamento encontrado" : "Nenhum pagamento confirmado"}
                      description={busca ? "Tente ajustar os termos da busca" : "Os pagamentos confirmados aparecerão aqui"}
                      size="sm"
                    />
                  </Card>
                ) : (
                  filtrarPagamentos(pagamentosPagos).map((pagamento) => (
                    <PagamentoMobileCard
                      key={pagamento.id}
                      pagamento={pagamento}
                      onPagar={handlePagar}
                    />
                  ))
                )}
              </div>
            ) : (
              /* Desktop Table */
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>NF</TableHead>
                      <TableHead>Forma Pgto</TableHead>
                      <TableHead>Data Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrarPagamentos(pagamentosPagos).map((pagamento) => (
                      <TableRow key={pagamento.id}>
                        <TableCell>
                          <span className="font-mono font-medium">{pagamento.numero}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {pagamento.fornecedor?.razao_social || 'Fornecedor não encontrado'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {pagamento.numero_nf || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {pagamento.forma_pagamento === "pix" ? (
                              <QrCode className="h-3 w-3" />
                            ) : (
                              <FileText className="h-3 w-3" />
                            )}
                            {pagamento.forma_pagamento?.toUpperCase() || 'N/D'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {pagamento.data_pagamento 
                            ? format(new Date(pagamento.data_pagamento), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold">
                            {pagamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="default" className="bg-emerald-600 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Pago
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtrarPagamentos(pagamentosPagos).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <IllustratedEmptyState
                            type="payments"
                            title={busca ? "Nenhum pagamento encontrado" : "Nenhum pagamento confirmado"}
                            description={busca ? "Tente ajustar os termos da busca" : "Os pagamentos confirmados aparecerão aqui"}
                            size="sm"
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Resumo */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Total: {pagamentos.length} pagamentos</p>
          <p>
            Valor total: {pagamentos.reduce((acc, p) => acc + p.valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      {/* Modal de Pagamento */}
      <Dialog open={modalPagamento} onOpenChange={setModalPagamento}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Registrar Pagamento
            </DialogTitle>
          </DialogHeader>

          {pagamentoSelecionado && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Pagamento</span>
                  <span className="font-mono font-medium">{pagamentoSelecionado.numero}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Fornecedor</span>
                  <span className="font-medium">{pagamentoSelecionado.fornecedor?.razao_social}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Valor</span>
                  <span className="text-xl font-bold text-primary">
                    {pagamentoSelecionado.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comprovante">URL do Comprovante (opcional)</Label>
                <Input
                  id="comprovante"
                  placeholder="https://..."
                  value={comprovante}
                  onChange={(e) => setComprovante(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalPagamento(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarPagamento}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Pagamentos;
