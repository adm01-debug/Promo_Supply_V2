import { useState, useMemo, useCallback } from "react";
import { FornecedorModal } from "@/components/compras/FornecedorModal";
import { HistoricoComprasModal } from "@/components/compras/HistoricoComprasModal";
import { AISupplierSuggestion } from "@/components/compras/AISupplierSuggestion";
import { SupplierRiskAnalysis } from "@/components/compras/SupplierRiskAnalysis";
import { PriceComparator } from "@/components/compras/PriceComparator";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Building2
} from "lucide-react";
import { useFornecedores, useFornecedoresKPIs } from "@/hooks/useFornecedores";
import { useIsMobile } from "@/hooks/use-mobile";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { EliteButton } from "@/components/atoms/EliteButton";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
        <div className="space-y-8 pb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight uppercase leading-none">Fornecedores</h1>
                <div className="flex items-center gap-2 mt-2">
                   <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{filteredFornecedores.length} Parceiros</Badge>
                   <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-50">• Supplier Network</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AISupplierSuggestion />
              <EliteButton onClick={() => handleOpenModal()} className="h-11 px-6">
                <Plus className="w-4 h-4 mr-2" /> NOVO FORNECEDOR
              </EliteButton>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border-border/40 bg-card/40 backdrop-blur-xl rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary"><Users className="w-6 h-6" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total</p>
                  <p className="text-2xl font-black text-foreground">{kpis.total}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 border-border/40 bg-card/40 backdrop-blur-xl rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-success/10 text-success"><Plug className="w-6 h-6" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">APIs Ativas</p>
                  <p className="text-2xl font-black text-foreground">{kpis.integradosApi}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 border-border/40 bg-card/40 backdrop-blur-xl rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-warning/10 text-warning"><Star className="w-6 h-6" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rating Médio</p>
                  <p className="text-2xl font-black text-foreground">{kpis.mediaAvaliacao.toFixed(1)} ★</p>
                </div>
              </div>
            </Card>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/40 p-6 rounded-[2rem] border border-border/40 backdrop-blur-xl shadow-xl shadow-primary/5"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Pesquisar parceiros por nome, CNPJ..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="pl-12 bg-background/40 border-border/50 h-12 rounded-xl focus:bg-background transition-all" 
                />
              </div>
              
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="bg-background/40 h-12 border-border/50 rounded-xl">
                  <Filter className="w-4 h-4 mr-2 text-primary" />
                  <SelectValue placeholder="Tipo de Empresa" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="IMPORTADORA">Importadora</SelectItem>
                  <SelectItem value="FABRICANTE">Fabricante</SelectItem>
                  <SelectItem value="DISTRIBUIDORA">Distribuidora</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <SupplierRiskAnalysis />
                <PriceComparator />
              </div>
            </div>
          </motion.div>

          <Card className="rounded-[2rem] border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden shadow-2xl">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/10">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 pl-8">Parceiro</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Tipo</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Desempenho</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Conexão</TableHead>
                  <TableHead className="w-20 pr-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id} className="group border-border/5 hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => handleOpenModal(fornecedor)}>
                    <TableCell className="pl-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                          {fornecedor.nomeFantasia.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-foreground leading-none">{fornecedor.nomeFantasia}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-tighter">{fornecedor.cnpj || 'PESSOA FÍSICA'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("rounded-full px-3 py-0.5 border-none", getTipoBadgeColor(fornecedor.tipo))}>
                        {getTipoLabel(fornecedor.tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                       <div className="flex items-center justify-center gap-0.5">
                         {[...Array(5)].map((_, i) => (
                           <Star key={i} className={cn("w-3 h-3", i < fornecedor.rating ? "text-warning fill-amber-400" : "text-muted-foreground/20")} />
                         ))}
                       </div>
                    </TableCell>
                    <TableCell className="text-center">
                       {fornecedor.apiIntegrada ? (
                         <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/10 text-success rounded-full text-[10px] font-black uppercase">
                           <div className="w-1 h-1 rounded-full bg-success animate-pulse" /> API ATIVA
                         </div>
                       ) : (
                         <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-widest">Manual</span>
                       )}
                    </TableCell>
                    <TableCell className="pr-8">
                       <EliteButton variant="ghost" size="icon" className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity">
                         <MoreHorizontal className="w-4 h-4" />
                       </EliteButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
