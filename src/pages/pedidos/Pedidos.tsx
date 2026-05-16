import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { 
  FileText, Search, Download, Building2, Calendar, Clock,
  CheckCircle2, Truck, Package, X, ArrowUpDown, ChevronDown, RefreshCw, Trash2, BarChart3,
  Filter, MoreHorizontal, Copy, List
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
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
import { usePedidos, usePedidosKPIs, type Pedido } from "@/features/pedidos";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useIsMobile } from "@/hooks/use-mobile";
import { exportToCSV } from "@/lib/exportData";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { EliteButton } from "@/components/atoms/EliteButton";
import { motion, AnimatePresence } from "framer-motion";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: CheckCircle2 },
  enviado: { label: 'Enviado', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: FileText },
  em_transito: { label: 'Em Trânsito', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Truck },
  entregue: { label: 'Entregue', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: X },
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

  const isMobile = useIsMobile();
  const { pedidos, loading, refetch } = usePedidos();
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

  const handleViewDetails = (pedido: Pedido) => { setSelectedPedido(pedido); setDetailsOpen(true); };

  const handleExportPDF = () => {
    const exportData = filteredPedidos.map(p => ({
      numero: p.numero, status: statusConfig[p.status]?.label || p.status,
      fornecedor: p.fornecedor?.razao_social || '', valor_total: p.valor_total,
    }));
    exportToCSV(exportData, [], 'pedidos');
    toast.success(`Data exported successfully`);
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
        <div className="space-y-10 pb-20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-blue-500/10 rounded-[2rem] flex items-center justify-center text-blue-400 shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>Purchase Orders</h1>
                <div className="flex items-center gap-3 mt-3">
                   <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-blue-500/30 text-blue-300 px-3 py-1">{filteredPedidos.length} Total Orders</Badge>
                   <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest opacity-50">• Logistics & Fulfillment Hub</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <EliteButton variant="outline" size="sm" onClick={() => refetch()} className="h-11 px-5 rounded-xl border-white/10 hover:bg-white/5 font-black text-[10px] tracking-widest uppercase text-zinc-400">
                <RefreshCw className="w-4 h-4 mr-2" /> REFRESH
              </EliteButton>
              <EliteButton variant="default" size="sm" onClick={handleExportPDF} className="h-11 px-8 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-none shadow-lg shadow-violet-500/20 font-black text-[10px] tracking-widest uppercase">
                <Download className="w-4 h-4 mr-2" /> EXPORT DATA
              </EliteButton>
            </div>
          </div>

          <PedidosKPIs kpis={kpis} />

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl shadow-2xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-2 relative group">
                <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] ml-1 mb-2 block">Global Search</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-violet-400 transition-colors" />
                  <Input 
                    placeholder="Search by ID or supplier..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    className="pl-12 bg-white/[0.03] border-white/10 h-12 rounded-xl focus:bg-white/[0.05] transition-all text-white font-bold" 
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] ml-1 mb-2 block">Fulfillment Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white/[0.03] h-12 border-white/10 rounded-xl text-zinc-200 font-bold">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-violet-400" />
                      <SelectValue placeholder="All Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f] border-white/10 backdrop-blur-3xl rounded-2xl">
                    <SelectItem value="all" className="text-xs font-bold py-2.5">All Orders</SelectItem>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-xs font-bold py-2.5">{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] ml-1 mb-2 block">Provider Entity</Label>
                <Select value={fornecedorFilter} onValueChange={setFornecedorFilter}>
                  <SelectTrigger className="bg-white/[0.03] h-12 border-white/10 rounded-xl text-zinc-200 font-bold">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-violet-400" />
                      <SelectValue placeholder="All Suppliers" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f] border-white/10 backdrop-blur-3xl rounded-2xl">
                    <SelectItem value="all" className="text-xs font-bold py-2.5">All Suppliers</SelectItem>
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id} className="text-xs font-bold py-2.5">{f.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          <Card className="rounded-[2.5rem] border-white/5 bg-white/[0.03] backdrop-blur-3xl overflow-hidden shadow-2xl">
            <CardContent className="p-0">
              {isMobile ? (
                <div className="p-5 space-y-5">
                  {filteredPedidos.map((pedido) => (
                    <PedidoMobileCard key={pedido.id} pedido={pedido} onView={handleViewDetails} />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-white/[0.02]">
                    <TableRow className="hover:bg-transparent border-white/5">
                      <TableHead className="w-14 pl-6"><Checkbox checked={selectedIds.length === filteredPedidos.length} onCheckedChange={handleSelectAll} className="border-white/20" /></TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 py-6">Reference</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Supplier Entity</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Logistics State</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right pr-10">Total Volume</TableHead>
                      <TableHead className="w-20 pr-6"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredPedidos.map((pedido, index) => {
                        const config = statusConfig[pedido.status] || statusConfig["pendente"];
                        const StatusIcon = config.icon;
                        return (
                          <motion.tr 
                            key={pedido.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="group border-white/5 hover:bg-white/[0.02] transition-all cursor-pointer relative"
                            onClick={() => handleViewDetails(pedido)}
                          >
                            <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                              <Checkbox checked={selectedIds.includes(pedido.id)} onCheckedChange={() => handleSelectOne(pedido.id)} className="border-white/20" />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-black text-violet-400 group-hover:text-violet-300 transition-colors tracking-widest text-sm">#{pedido.numero}</span>
                                <span className="text-[10px] text-zinc-500 font-black uppercase mt-1">{format(new Date(pedido.data_emissao), 'dd MMM yyyy')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                               <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black text-zinc-400 uppercase border border-white/5 shadow-inner">
                                   {pedido.fornecedor?.razao_social?.slice(0, 2)}
                                 </div>
                                 <span className="text-sm font-bold text-zinc-200">{pedido.fornecedor?.razao_social}</span>
                               </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("rounded-full px-4 py-1.5 border-none font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg", config.color)}>
                                <StatusIcon className="w-3 h-3" />
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-10">
                              <span className="font-black text-white text-base tracking-tighter">
                                {pedido.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </TableCell>
                            <TableCell className="pr-6">
                              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all">
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-white">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </ElitePageWrapper>

      <PedidoDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} pedido={selectedPedido} />
    </ModuleErrorBoundary>
  );
};

export default Pedidos;
