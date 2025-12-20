import { useState, useMemo } from "react";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Printer,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Package,
  DollarSign,
  MoreHorizontal,
  Copy,
  Mail,
  MessageCircle,
  X,
  ArrowUpDown,
  ChevronDown,
  ExternalLink
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/compras/MainLayout";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { solicitacoesMock, fornecedoresMock, getTipoLabel, getStatusLabel } from "@/data/mockData";

// Mock de ordens de compra baseado nas solicitações
const ordensCompra = solicitacoesMock
  .filter(s => ['FORNECEDOR_SELECIONADO', 'PEDIDO_GERADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_TRANSITO', 'ENTREGUE'].includes(s.status))
  .map((s, idx) => ({
    id: `OC-2024-${String(450 + idx).padStart(4, '0')}`,
    solicitacaoId: s.id,
    empresa: s.empresa,
    produto: s.produto,
    quantidade: s.quantidadeReal,
    tipo: s.tipo,
    fornecedor: s.fornecedorSelecionado || 'N/A',
    valorUnitario: s.valorUnitario || 0,
    valorTotal: s.valorTotal || 0,
    status: s.status,
    prazoEntrega: s.prazoEntrega,
    vendedor: s.vendedor,
    createdAt: s.createdAt,
    condicaoPagamento: 'À vista via PIX',
    frete: Math.random() > 0.5 ? 0 : Math.floor(Math.random() * 300),
    observacoes: '',
  }));

type OrdemCompra = typeof ordensCompra[0];

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  FORNECEDOR_SELECIONADO: { label: 'Aguardando Pedido', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Clock },
  PEDIDO_GERADO: { label: 'Pedido Gerado', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', icon: FileText },
  AGUARDANDO_PAGAMENTO: { label: 'Aguardando Pagamento', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: DollarSign },
  PAGO: { label: 'Pago', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', icon: CheckCircle2 },
  EM_TRANSITO: { label: 'Em Trânsito', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Truck },
  ENTREGUE: { label: 'Entregue', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
};

const Pedidos = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fornecedorFilter, setFornecedorFilter] = useState("all");
  const [sortField, setSortField] = useState<'createdAt' | 'valorTotal' | 'prazoEntrega'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemCompra | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Filtros e ordenação
  const filteredOrdens = useMemo(() => {
    let result = ordensCompra.filter(ordem => {
      const matchSearch = 
        ordem.id.toLowerCase().includes(search.toLowerCase()) ||
        ordem.produto.toLowerCase().includes(search.toLowerCase()) ||
        ordem.empresa.toLowerCase().includes(search.toLowerCase()) ||
        ordem.fornecedor.toLowerCase().includes(search.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || ordem.status === statusFilter;
      const matchFornecedor = fornecedorFilter === 'all' || ordem.fornecedor === fornecedorFilter;
      
      return matchSearch && matchStatus && matchFornecedor;
    });

    // Ordenação
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'valorTotal') {
        comparison = a.valorTotal - b.valorTotal;
      } else if (sortField === 'prazoEntrega') {
        comparison = new Date(a.prazoEntrega).getTime() - new Date(b.prazoEntrega).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [search, statusFilter, fornecedorFilter, sortField, sortDirection]);

  // Fornecedores únicos para filtro
  const uniqueFornecedores = useMemo(() => 
    [...new Set(ordensCompra.map(o => o.fornecedor))].filter(f => f !== 'N/A'),
    []
  );

  // KPIs
  const kpis = useMemo(() => ({
    total: ordensCompra.length,
    aguardandoPagamento: ordensCompra.filter(o => o.status === 'AGUARDANDO_PAGAMENTO').length,
    emTransito: ordensCompra.filter(o => ['PAGO', 'EM_TRANSITO'].includes(o.status)).length,
    entregues: ordensCompra.filter(o => o.status === 'ENTREGUE').length,
    valorTotal: ordensCompra.reduce((acc, o) => acc + o.valorTotal, 0),
  }), []);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleViewDetails = (ordem: OrdemCompra) => {
    setSelectedOrdem(ordem);
    setDetailsOpen(true);
  };

  const handleCopyOrderNumber = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    toast.success("Número da ordem copiado!");
  };

  const handleExportPDF = () => {
    toast.success("Exportando para PDF...");
    // Implementação futura
  };

  const handleExportExcel = () => {
    toast.success("Exportando para Excel...");
    // Implementação futura
  };

  const getPrazoStatus = (prazo: string) => {
    const dias = differenceInDays(parseISO(prazo), new Date());
    if (dias < 0) return { label: 'Atrasado', color: 'text-destructive', urgent: true };
    if (dias === 0) return { label: 'Hoje', color: 'text-destructive', urgent: true };
    if (dias <= 2) return { label: `${dias}d`, color: 'text-orange-500', urgent: true };
    return { label: `${dias}d`, color: 'text-muted-foreground', urgent: false };
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Ordens de Compra
            </h1>
            <p className="text-sm text-muted-foreground">Gerencie todas as ordens de compra geradas</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpis.total}</p>
                <p className="text-xs text-muted-foreground">Total Ordens</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <DollarSign className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{kpis.aguardandoPagamento}</p>
                <p className="text-xs text-muted-foreground">Aguard. Pagto</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Truck className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{kpis.emTransito}</p>
                <p className="text-xs text-muted-foreground">Em Trânsito</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{kpis.entregues}</p>
                <p className="text-xs text-muted-foreground">Entregues</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">
                  R$ {(kpis.valorTotal / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-muted-foreground">Valor Total</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por OC, produto, empresa ou fornecedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={fornecedorFilter} onValueChange={setFornecedorFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Fornecedores</SelectItem>
                {uniqueFornecedores.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || statusFilter !== 'all' || fornecedorFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setFornecedorFilter("all");
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>

        {/* Tabela */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Ordem de Compra</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('prazoEntrega')}
                >
                  <div className="flex items-center gap-1">
                    Prazo
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('valorTotal')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Valor Total
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrdens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                    <p className="text-muted-foreground">Nenhuma ordem de compra encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrdens.map((ordem) => {
                  const config = statusConfig[ordem.status];
                  const StatusIcon = config?.icon || FileText;
                  const prazoStatus = getPrazoStatus(ordem.prazoEntrega);

                  return (
                    <TableRow 
                      key={ordem.id} 
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => handleViewDetails(ordem)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-primary">{ordem.id}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyOrderNumber(ordem.id);
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{ordem.empresa}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{ordem.produto}</p>
                        <p className="text-xs text-muted-foreground">{ordem.quantidade} un • {getTipoLabel(ordem.tipo)}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{ordem.fornecedor}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={config?.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {config?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(parseISO(ordem.prazoEntrega), 'dd/MM/yy')}
                          </span>
                          {prazoStatus.urgent && ordem.status !== 'ENTREGUE' && (
                            <Badge variant="outline" className={`text-xs ${prazoStatus.color}`}>
                              {prazoStatus.label}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold">
                          {ordem.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(ordem)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="w-4 h-4 mr-2" />
                              Imprimir OC
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Mail className="w-4 h-4 mr-2" />
                              Enviar por E-mail
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Enviar WhatsApp
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Resumo */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Mostrando {filteredOrdens.length} de {ordensCompra.length} ordens de compra
          </p>
          <p>
            Valor filtrado: {filteredOrdens.reduce((acc, o) => acc + o.valorTotal, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Detalhes da Ordem de Compra
            </DialogTitle>
          </DialogHeader>

          {selectedOrdem && (
            <div className="space-y-6">
              {/* Header da OC */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="text-2xl font-bold text-primary font-mono">{selectedOrdem.id}</p>
                  <p className="text-sm text-muted-foreground">Solicitação #{selectedOrdem.solicitacaoId}</p>
                </div>
                <Badge variant="outline" className={statusConfig[selectedOrdem.status]?.color}>
                  {statusConfig[selectedOrdem.status]?.label}
                </Badge>
              </div>

              <Tabs defaultValue="geral">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="geral">Geral</TabsTrigger>
                  <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="geral" className="space-y-4 mt-4">
                  {/* Dados do Produto */}
                  <Card className="p-4">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      Dados do Produto
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Produto</p>
                        <p className="font-medium">{selectedOrdem.produto}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Quantidade</p>
                        <p className="font-medium">{selectedOrdem.quantidade} unidades</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tipo</p>
                        <Badge variant="outline">{getTipoLabel(selectedOrdem.tipo)}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Empresa Cliente</p>
                        <p className="font-medium">{selectedOrdem.empresa}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Dados do Fornecedor */}
                  <Card className="p-4">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      Fornecedor
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Nome</p>
                        <p className="font-medium">{selectedOrdem.fornecedor}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vendedor Responsável</p>
                        <p className="font-medium">{selectedOrdem.vendedor}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm">
                        <Mail className="w-4 h-4 mr-2" />
                        E-mail
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                    </div>
                  </Card>

                  {/* Prazos */}
                  <Card className="p-4">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Datas
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Data de Criação</p>
                        <p className="font-medium">{format(parseISO(selectedOrdem.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Prazo de Entrega</p>
                        <p className="font-medium">{format(parseISO(selectedOrdem.prazoEntrega), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="financeiro" className="space-y-4 mt-4">
                  <Card className="p-4">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      Resumo Financeiro
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor Unitário</span>
                        <span className="font-medium">
                          {selectedOrdem.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quantidade</span>
                        <span className="font-medium">× {selectedOrdem.quantidade}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">
                          {(selectedOrdem.valorUnitario * selectedOrdem.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frete</span>
                        <span className="font-medium">
                          {selectedOrdem.frete > 0 
                            ? selectedOrdem.frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : 'Grátis'
                          }
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold text-primary">
                          {selectedOrdem.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold text-foreground mb-3">Condição de Pagamento</h3>
                    <Badge variant="outline">{selectedOrdem.condicaoPagamento}</Badge>
                  </Card>
                </TabsContent>

                <TabsContent value="timeline" className="space-y-4 mt-4">
                  <Card className="p-4">
                    <h3 className="font-semibold text-foreground mb-4">Histórico do Pedido</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Ordem Criada', date: selectedOrdem.createdAt, completed: true },
                        { label: 'Pedido Enviado ao Fornecedor', date: selectedOrdem.createdAt, completed: true },
                        { label: 'Pagamento Realizado', date: selectedOrdem.status !== 'AGUARDANDO_PAGAMENTO' ? selectedOrdem.createdAt : null, completed: ['PAGO', 'EM_TRANSITO', 'ENTREGUE'].includes(selectedOrdem.status) },
                        { label: 'Em Trânsito', date: ['EM_TRANSITO', 'ENTREGUE'].includes(selectedOrdem.status) ? selectedOrdem.createdAt : null, completed: ['EM_TRANSITO', 'ENTREGUE'].includes(selectedOrdem.status) },
                        { label: 'Entregue', date: selectedOrdem.status === 'ENTREGUE' ? selectedOrdem.prazoEntrega : null, completed: selectedOrdem.status === 'ENTREGUE' },
                      ].map((step, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            step.completed ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            {step.completed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {step.label}
                            </p>
                            {step.date && (
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(step.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Ações */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </Button>
                <Button>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Acompanhar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Pedidos;
