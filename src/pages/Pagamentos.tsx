import { useState } from "react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Filter
} from "lucide-react";
import { pagamentosMock, type Pagamento } from "@/data/mockData";
import { PagamentoModal } from "@/components/compras/PagamentoModal";
import { toast } from "@/hooks/use-toast";

const Pagamentos = () => {
  const [busca, setBusca] = useState("");
  const [pagamentos, setPagamentos] = useState<Pagamento[]>(pagamentosMock);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Pagamento | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const pagamentosPendentes = pagamentos.filter(p => p.status === "PENDENTE");
  const pagamentosPagos = pagamentos.filter(p => p.status === "PAGO");

  const totalPendente = pagamentosPendentes.reduce((acc, p) => acc + p.valor, 0);
  const totalPago = pagamentosPagos.reduce((acc, p) => acc + p.valor, 0);

  const filtrarPagamentos = (lista: Pagamento[]) => {
    if (!busca) return lista;
    const termoBusca = busca.toLowerCase();
    return lista.filter(p => 
      p.ordemCompra.toLowerCase().includes(termoBusca) ||
      p.fornecedor.toLowerCase().includes(termoBusca) ||
      p.produto.toLowerCase().includes(termoBusca)
    );
  };

  const handlePagar = (pagamento: Pagamento) => {
    setPagamentoSelecionado(pagamento);
    setModalAberto(true);
  };

  const handleConfirmarPagamento = (id: string, comprovante: string) => {
    setPagamentos(prev => prev.map(p => 
      p.id === id ? { ...p, status: "PAGO" as const } : p
    ));
    toast({
      title: "Pagamento Confirmado!",
      description: `Comprovante ${comprovante} registrado com sucesso`,
    });
  };

  const getVencimentoStatus = (vencimento: string) => {
    const hoje = new Date();
    const dataVenc = new Date(vencimento);
    const diff = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return { label: "Vencido", variant: "destructive" as const, icon: AlertTriangle };
    if (diff === 0) return { label: "Vence Hoje", variant: "destructive" as const, icon: AlertTriangle };
    if (diff <= 2) return { label: `${diff}d restante${diff > 1 ? 's' : ''}`, variant: "warning" as const, icon: Clock };
    return { label: `${diff}d restantes`, variant: "secondary" as const, icon: Calendar };
  };

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
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold">{pagamentosPendentes.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pendente</p>
                <p className="text-xl font-bold text-red-600">
                  {totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                  {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                placeholder="Buscar por OC, fornecedor ou produto..." 
                className="pl-10"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="pendentes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pendentes" className="gap-2">
              <Clock className="h-4 w-4" />
              Pendentes ({pagamentosPendentes.length})
            </TabsTrigger>
            <TabsTrigger value="pagos" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Pagos ({pagamentosPagos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem de Compra</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrarPagamentos(pagamentosPendentes).map((pagamento) => {
                    const vencStatus = getVencimentoStatus(pagamento.vencimento);
                    const VencIcon = vencStatus.icon;
                    return (
                      <TableRow key={pagamento.id}>
                        <TableCell>
                          <span className="font-mono font-medium">{pagamento.ordemCompra}</span>
                          <p className="text-xs text-muted-foreground">Item {pagamento.solicitacaoId}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {pagamento.fornecedor}
                          </div>
                        </TableCell>
                        <TableCell>{pagamento.produto}</TableCell>
                        <TableCell>
                          <Badge variant={pagamento.metodo === "PIX" ? "default" : "secondary"} className="gap-1">
                            {pagamento.metodo === "PIX" ? (
                              <QrCode className="h-3 w-3" />
                            ) : (
                              <FileText className="h-3 w-3" />
                            )}
                            {pagamento.metodo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={vencStatus.variant === "warning" ? "outline" : vencStatus.variant}
                              className={vencStatus.variant === "warning" ? "border-orange-500 text-orange-600" : ""}
                            >
                              <VencIcon className="h-3 w-3 mr-1" />
                              {vencStatus.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(pagamento.vencimento).toLocaleDateString('pt-BR')}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold">
                            {pagamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => handlePagar(pagamento)}>
                            {pagamento.metodo === "PIX" ? (
                              <QrCode className="h-4 w-4 mr-2" />
                            ) : (
                              <FileText className="h-4 w-4 mr-2" />
                            )}
                            Pagar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtrarPagamentos(pagamentosPendentes).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {busca ? "Nenhum pagamento encontrado para a busca" : "Nenhum pagamento pendente"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="pagos">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem de Compra</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrarPagamentos(pagamentosPagos).map((pagamento) => (
                    <TableRow key={pagamento.id}>
                      <TableCell>
                        <span className="font-mono font-medium">{pagamento.ordemCompra}</span>
                        <p className="text-xs text-muted-foreground">Item {pagamento.solicitacaoId}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {pagamento.fornecedor}
                        </div>
                      </TableCell>
                      <TableCell>{pagamento.produto}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {pagamento.metodo === "PIX" ? (
                            <QrCode className="h-3 w-3" />
                          ) : (
                            <FileText className="h-3 w-3" />
                          )}
                          {pagamento.metodo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(pagamento.vencimento).toLocaleDateString('pt-BR')}
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
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {busca ? "Nenhum pagamento encontrado para a busca" : "Nenhum pagamento confirmado"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <PagamentoModal 
        pagamento={pagamentoSelecionado}
        open={modalAberto}
        onOpenChange={setModalAberto}
        onConfirmarPagamento={handleConfirmarPagamento}
      />
    </MainLayout>
  );
};

export default Pagamentos;
