import { useState, useMemo, useCallback } from "react";
import { FornecedorModal } from "@/components/compras/FornecedorModal";
import { AISupplierSuggestion } from "@/components/compras/AISupplierSuggestion";
import { SupplierRiskAnalysis } from "@/components/compras/SupplierRiskAnalysis";
import { PriceComparator } from "@/components/compras/PriceComparator";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TableSkeleton, KPICardSkeleton } from "@/components/ui/contextual-skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Plus, 
  Star, 
  Plug,
  Users,
  Filter,
  MoreHorizontal,
  Building2,
  Network,
  ShieldCheck,
  Zap
} from "lucide-react";
import { useFornecedores, useFornecedoresKPIs } from "@/hooks/useFornecedores";
import { useIsMobile } from "@/hooks/use-mobile";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { EliteButton } from "@/components/atoms/EliteButton";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ExecutiveMetricCard } from "@/components/compras/executive/ExecutiveMetricCard";

import { 
  type LegacyFornecedor, adaptToLegacy, 
  getTipoLabel, getTipoBadgeColor
} from './fornecedorHelpers';

const Fornecedores = () => {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<LegacyFornecedor | null>(null);

  const { fornecedores: dbFornecedores, loading, createFornecedor, updateFornecedor } = useFornecedores({ search: search || undefined });
  const { kpis } = useFornecedoresKPIs();

  const fornecedores = useMemo(() => dbFornecedores.map(adaptToLegacy), [dbFornecedores]);

  const filteredFornecedores = useMemo(() => {
    let filtered = fornecedores;
    if (search.trim()) {
      filtered = (fornecedores as LegacyFornecedor[]).filter((f: LegacyFornecedor) =>
        f.nomeFantasia.toLowerCase().includes(search.toLowerCase()) ||
        f.razaoSocial.toLowerCase().includes(search.toLowerCase()) ||
        f.cnpj.includes(search)
      );
    }
    if (tipoFilter !== "todos") {
      filtered = filtered.filter((f: LegacyFornecedor) => f.tipo === tipoFilter);
    }
    return filtered;
  }, [fornecedores, search, tipoFilter]);

  const handleOpenModal = (fornecedor?: LegacyFornecedor) => {
    setSelectedFornecedor(fornecedor || null);
    setModalOpen(true);
  };

  const handleSaveFornecedor = async (data: Partial<LegacyFornecedor>) => {
    if (selectedFornecedor) {
      const dbRecord = dbFornecedores.find(f => f.id === selectedFornecedor.id);
      if (dbRecord) {
        await updateFornecedor(dbRecord.id, {
          razao_social: data.razaoSocial || dbRecord.razao_social,
          nome_fantasia: data.nomeFantasia,
          cnpj: data.cnpj,
          email: data.email,
          telefone: data.telefone,
          tipo: data.tipo === 'IMPORTADORA' ? 'internacional' : 
                data.tipo === 'DISTRIBUIDORA' ? 'local' : 'nacional',
          segmento: data.ramos?.[0],
        });
      }
    } else {
      await createFornecedor({
        razao_social: data.razaoSocial || 'Novo Fornecedor',
        nome_fantasia: data.nomeFantasia,
        cnpj: data.cnpj,
        email: data.email,
        telefone: data.telefone,
        tipo: data.tipo === 'IMPORTADORA' ? 'internacional' : 
              data.tipo === 'DISTRIBUIDORA' ? 'local' : 'nacional',
        segmento: data.ramos?.[0],
      });
    }
    setModalOpen(false);
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
    <ModuleErrorBoundary module="fornecedores">
      <ElitePageWrapper>
        <div className="space-y-10 pb-20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-400 shadow-inner">
                <Network className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>Partner Network</h1>
                <div className="flex items-center gap-3 mt-3">
                   <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-emerald-500/30 text-emerald-400 px-3 py-1">{filteredFornecedores.length} Active Partners</Badge>
                   <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest opacity-50">• Supplier Ecosystem</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AISupplierSuggestion />
              <EliteButton onClick={() => handleOpenModal()} className="h-11 px-8 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-none shadow-lg shadow-violet-500/20 font-black text-[10px] tracking-widest uppercase">
                <Plus className="w-4 h-4 mr-2" /> ADD PARTNER
              </EliteButton>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ExecutiveMetricCard
              title="Total Suppliers"
              value={kpis.total}
              icon={Users}
              delay={0}
            />
            <ExecutiveMetricCard
              title="Cloud Integrations"
              value={kpis.integradosApi}
              icon={Plug}
              delay={1}
            />
            <ExecutiveMetricCard
              title="Avg Network Rating"
              value={kpis.mediaAvaliacao}
              icon={Star}
              format="number"
              delay={2}
              subtitle="Performance Score"
            />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl shadow-2xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-2 relative group">
                <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] ml-1 mb-2 block">Partner Discovery</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-emerald-400 transition-colors" />
                  <Input 
                    placeholder="Search by name, CNPJ or segment..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    className="pl-12 bg-white/[0.03] border-white/10 h-12 rounded-xl focus:bg-white/[0.05] transition-all text-white font-bold" 
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] ml-1 mb-2 block">Supply Category</Label>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="bg-white/[0.03] h-12 border-white/10 rounded-xl text-zinc-200 font-bold">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-emerald-400" />
                      <SelectValue placeholder="Company Type" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f] border-white/10 backdrop-blur-3xl rounded-2xl">
                    <SelectItem value="todos" className="text-xs font-bold py-2.5">All Categories</SelectItem>
                    <SelectItem value="IMPORTADORA" className="text-xs font-bold py-2.5">Importer</SelectItem>
                    <SelectItem value="FABRICANTE" className="text-xs font-bold py-2.5">Manufacturer</SelectItem>
                    <SelectItem value="DISTRIBUIDORA" className="text-xs font-bold py-2.5">Distributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-3">
                <SupplierRiskAnalysis />
                <PriceComparator />
              </div>
            </div>
          </motion.div>

          <Card className="rounded-[2.5rem] border-white/5 bg-white/[0.03] backdrop-blur-3xl overflow-hidden shadow-2xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 py-6 pl-10">Entity Name</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Operation Type</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Trust Rating</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Integrations</TableHead>
                    <TableHead className="w-20 pr-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filteredFornecedores.map((fornecedor, index) => (
                      <motion.tr 
                        key={fornecedor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group border-white/5 hover:bg-white/[0.02] transition-all cursor-pointer"
                        onClick={() => handleOpenModal(fornecedor)}
                      >
                        <TableCell className="pl-10">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center font-black text-emerald-400 text-xs shadow-inner border border-emerald-500/10 transition-transform group-hover:scale-110">
                              {fornecedor.nomeFantasia.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white leading-tight group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{fornecedor.nomeFantasia}</p>
                              <p className="text-[10px] text-zinc-500 mt-1.5 font-black uppercase tracking-widest">{fornecedor.cnpj || 'INDIVIDUAL ENTITY'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("rounded-full px-4 py-1.5 border-none font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg", getTipoBadgeColor(fornecedor.tipo))}>
                            {getTipoLabel(fornecedor.tipo)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                           <div className="flex items-center justify-center gap-1">
                             {[...Array(5)].map((_, i) => (
                               <Star key={i} className={cn("w-3.5 h-3.5 transition-all", i < fornecedor.rating ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" : "text-white/5")} />
                             ))}
                           </div>
                        </TableCell>
                        <TableCell className="text-center">
                           {fornecedor.apiIntegrada ? (
                             <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> CLOUD ACTIVE
                             </div>
                           ) : (
                             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] opacity-60">Legacy / Manual</span>
                           )}
                        </TableCell>
                        <TableCell className="pr-10">
                           <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all">
                             <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-white">
                               <MoreHorizontal className="w-4 h-4" />
                             </Button>
                           </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </ElitePageWrapper>

      <FornecedorModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        fornecedor={selectedFornecedor}
        onSave={handleSaveFornecedor}
      />
    </ModuleErrorBoundary>
  );
};

export default Fornecedores;
