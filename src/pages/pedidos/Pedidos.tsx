import { useState, useMemo, useCallback } from "react";
import { 
  FileText, Search, Download, Building2, Calendar, Clock,
  CheckCircle2, Truck, Package, X, ArrowUpDown, ChevronDown, RefreshCw, Trash2, BarChart3,
  Filter, MoreHorizontal, Copy, List
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { useTourPreferences } from "@/hooks/useTourPreferences";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TableSkeleton, KPICardSkeleton } from "@/components/ui/contextual-skeletons";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { PedidoMobileCard } from "@/components/pedidos/PedidoMobileCard";
import { PedidosKPIs } from "@/pages/pedidos/PedidosKPIs";
import { PedidoDetailsDialog } from "@/pages/pedidos/PedidoDetailsDialog";
import { toast } from "@/lib/feedbackToast";
import { format } from "date-fns/format";
import { differenceInDays } from "date-fns/differenceInDays";
import { usePedidos, usePedidosKPIs, type Pedido } from "@/features/pedidos";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useIsMobile } from "@/hooks/use-mobile";
import { PriceHistoryModal } from "@/components/compras/PriceHistoryModal";
import { exportToCSV, pedidoColumns } from "@/lib/exportData";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { EliteButton } from "@/components/atoms/EliteButton";
import { motion, AnimatePresence } from "framer-motion";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pendente: { label: 'Pendente', color: 'bg-warning/10 text-warning border-yellow-500/20', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-info/10 text-info border-blue-500/20', icon: CheckCircle2 },
  enviado: { label: 'Enviado', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', icon: FileText },
  em_transito: { label: 'Em Trânsito', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Truck },
  entregue: { label: 'Entregue', color: 'bg-success/10 text-success border-green-500/20', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive border-red-500/20', icon: X },
};

const Pedidos = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fornecedorFilter, setFornecedorFilter] = useState("all");
  const [sortField, setSortField] = useState<'data_emissao' | 'valor_total' | 'data_previsao'>('data_emissao');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);

  const isMobile = useIsMobile();
  const { pedidos, loading, refetch, updateStatus } = usePedidos();
  const { kpis } = usePedidosKPIs();
  const { fornecedores } = useFornecedores();

  const filteredPedidos = useMemo(() => {
    let result = pedidos.filter(pedido => {
      const matchSearch = pedido.numero.toLowerCase().includes(search.toLowerCase()) ||
        (pedido.fornecedor?.razao_social?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchStatus = statusFilter === 'all' || pedido.status === statusFilter;
      const matchFornecedor = fornecedorFilter === 'all' || pedido.fornecedor_id === fornecedorFilter;
      return matchSearch && matchStatus && matchFornecedor;
    });
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'data_emissao') comparison = new Date(a.data_emissao).getTime() - new Date(b.data_emissao).getTime();
      else if (sortField === 'valor_total') comparison = a.valor_total - b.valor_total;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [pedidos, search, statusFilter, fornecedorFilter, sortField, sortDirection]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(selectedIds.length === filteredPedidos.length ? [] : filteredPedidos.map(p => p.id));
  }, [selectedIds.length, filteredPedidos]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const handleViewDetails = (pedido: Pedido) => { setSelectedPedido(pedido); setDetailsOpen(true); };

  const handleExportPDF = () => {
    const exportData = filteredPedidos.map(p => ({
      numero: p.numero, status: statusConfig[p.status]?.label || p.status,
      fornecedor: p.fornecedor?.razao_social || '', valor_total: p.valor_total,
    }));
    exportToCSV(exportData, [], 'pedidos');
    toast.success(`Exportado com sucesso`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <KPICardSkeleton />
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  return (
    <ModuleErrorBoundary module="pedidos">
      <ElitePageWrapper>
        <div className="space-y-8 pb-10">
          {/* Elite Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight uppercase leading-none">Pedidos de Compra</h1>
                <div className="flex items-center gap-2 mt-2">
                   <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{filteredPedidos.length} Pedidos</Badge>
                   <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-50">• Fulfillment Hub</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <EliteButton variant="outline" size="sm" onClick={() => refetch()} className="h-11 px-4">
                <RefreshCw className="w-4 h-4 mr-2" /> REFRESH
              </EliteButton>
              <EliteButton variant="default" size="sm" onClick={handleExportPDF} className="h-11 px-6">
                <Download className="w-4 h-4 mr-2" /> EXPORTAR
              </EliteButton>
            </div>
          </div>

          <PedidosKPIs kpis={kpis} />

          {/* Elite Filters */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/40 p-6 rounded-[2rem] border border-border/40 backdrop-blur-xl shadow-xl shadow-primary/5"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Pesquisar pedidos..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="pl-12 bg-background/40 border-border/50 h-12 rounded-xl focus:bg-background transition-all" 
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background/40 h-12 border-border/50 rounded-xl">
                  <Filter className="w-4 h-4 mr-2 text-primary" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={fornecedorFilter} onValueChange={setFornecedorFilter}>
                <SelectTrigger className="bg-background/40 h-12 border-border/50 rounded-xl">
                  <Building2 className="w-4 h-4 mr-2 text-primary" />
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos Fornecedores</SelectItem>
                  {fornecedores.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          <Card className="rounded-[2rem] border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden shadow-2xl">
            {isMobile ? (
              <div className="p-4 space-y-4">
                {filteredPedidos.map((pedido) => (
                  <PedidoMobileCard key={pedido.id} pedido={pedido} onView={handleViewDetails} />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/10">
                    <TableHead className="w-12"><Checkbox checked={selectedIds.length === filteredPedidos.length} onCheckedChange={handleSelectAll} /></TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-5">Número</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Fornecedor</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Valor Total</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPedidos.map((pedido) => {
                    const config = statusConfig[pedido.status] || statusConfig["pendente"];
                    const StatusIcon = config.icon;
                    return (
                      <TableRow 
                        key={pedido.id} 
                        className="group border-border/5 hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => handleViewDetails(pedido)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(pedido.id)} onCheckedChange={() => handleSelectOne(pedido.id)} /></TableCell>
                        <TableCell>
                          <span className="font-mono font-bold text-primary group-hover:underline underline-offset-4">{pedido.numero}</span>
                          <p className="text-[10px] text-muted-foreground font-medium">{format(new Date(pedido.data_emissao), 'dd MMM yyyy')}</p>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-xs font-bold text-muted-foreground uppercase">
                               {pedido.fornecedor?.razao_social?.slice(0, 2)}
                             </div>
                             <span className="text-sm font-semibold">{pedido.fornecedor?.razao_social}</span>
                           </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("rounded-full px-3 py-1 border-none", config.color)}>
                            <StatusIcon className="w-3 h-3 mr-2" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-black text-foreground">
                            {pedido.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <EliteButton variant="ghost" size="icon" className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </EliteButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </ElitePageWrapper>

      <PedidoDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} pedido={selectedPedido} />
    </ModuleErrorBoundary>
  );
};

export default Pedidos;
