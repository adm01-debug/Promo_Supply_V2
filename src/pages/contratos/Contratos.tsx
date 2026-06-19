import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { TableSkeleton, KPICardSkeleton } from "@/components/ui/contextual-skeletons";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { DigitalSignature } from "@/components/compras/DigitalSignature";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Eye,
  Edit,
  Trash2,
  FileSignature,
  Building2,
  DollarSign,
  Filter,
  History,
  ShieldCheck,
  MoreHorizontal
} from "lucide-react";
import { format } from "date-fns/format";
import { differenceInDays } from "date-fns/differenceInDays";
import { ptBR } from "date-fns/locale/pt-BR";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/feedbackToast";
import { ContractModal } from "@/components/compras/ContractModal";
import { ContractDetailsModal } from "@/components/compras/ContractDetailsModal";
import type { Contract } from "@/types/contract";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { EliteButton } from "@/components/atoms/EliteButton";
import { motion } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: FileText },
  pending_approval: { label: "Aguard. Aprovação", color: "bg-warning/10 text-warning", icon: History },
  active: { label: "Ativo", color: "bg-success/10 text-success", icon: CheckCircle2 },
  expired: { label: "Expirado", color: "bg-destructive/10 text-destructive", icon: ShieldCheck },
};

export default function Contratos() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setContracts((data as unknown as Contract[]) || []);
    } catch (err) {
      console.error('Erro ao buscar contratos:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    const matchesType = typeFilter === "all" || contract.contract_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getExpiryBadge = (endDate: string, status: string) => {
    if (status !== 'active') return null;
    const days = differenceInDays(new Date(endDate), new Date());
    if (days < 0) return <Badge variant="destructive" className="text-[9px] font-black uppercase">Expirado</Badge>;
    if (days <= 30) return <Badge className="bg-warning/10 text-warning border-none text-[9px] font-black uppercase">Expira em {days}d</Badge>;
    return null;
  };

  const activeContracts = contracts.filter(c => c.status === 'active');
  const totalValue = activeContracts.reduce((sum, c) => sum + Number(c.total_value), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <KPICardSkeleton />
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  return (
    <ModuleErrorBoundary module="contratos">
      <ElitePageWrapper>
        <div className="space-y-8 pb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                <FileSignature className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight uppercase leading-none">Contratos</h1>
                <div className="flex items-center gap-2 mt-2">
                   <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{contracts.length} Ativos</Badge>
                   <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-50">• Legal & Compliance</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DigitalSignature />
              <EliteButton variant="default" onClick={() => setIsCreateModalOpen(true)} className="h-11 px-6">
                <Plus className="w-4 h-4 mr-2" /> NOVO CONTRATO
              </EliteButton>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border-border/40 bg-card/40 backdrop-blur-xl rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary"><FileText className="w-6 h-6" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total</p>
                  <p className="text-2xl font-black text-foreground">{contracts.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 border-border/40 bg-card/40 backdrop-blur-xl rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-success/10 text-success"><CheckCircle2 className="w-6 h-6" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vigentes</p>
                  <p className="text-2xl font-black text-foreground">{activeContracts.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 border-border/40 bg-card/40 backdrop-blur-xl rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600"><DollarSign className="w-6 h-6" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Equity Value</p>
                  <p className="text-2xl font-black text-foreground">R$ {(totalValue / 1000).toFixed(0)}K</p>
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar por título ou fornecedor..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-12 bg-background/40 border-border/50 h-12 rounded-xl" 
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background/40 h-12 border-border/50 rounded-xl">
                  <Filter className="w-4 h-4 mr-2 text-primary" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-background/40 h-12 border-border/50 rounded-xl">
                  <Building2 className="w-4 h-4 mr-2 text-primary" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  <SelectItem value="service">Serviço</SelectItem>
                  <SelectItem value="supply">Fornecimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          <Card className="rounded-[2rem] border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden shadow-2xl">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/10">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 pl-8">Dossiê Contratual</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Parceiro</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Vigência</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Valor Equity</TableHead>
                  <TableHead className="w-20 pr-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => {
                  const status = statusConfig[contract.status] || statusConfig["draft"];
                  return (
                    <TableRow key={contract.id} className="group border-border/5 hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => { setSelectedContract(contract); setIsDetailsModalOpen(true); }}>
                      <TableCell className="pl-8">
                        <div>
                          <p className="font-bold text-foreground leading-none">{contract.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                             <Badge variant="outline" className={cn("text-[8px] font-black uppercase border-none px-2", status.color)}>
                               {status.label}
                             </Badge>
                             {getExpiryBadge(contract.end_date, contract.status)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2">
                           <Building2 className="w-4 h-4 text-muted-foreground" />
                           <span className="text-sm font-semibold">{contract.supplier_name}</span>
                         </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                          Até {format(new Date(contract.end_date), "dd MMM yyyy", { locale: ptBR })}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-black text-foreground">
                          {formatCurrency(Number(contract.total_value))}
                        </span>
                      </TableCell>
                      <TableCell className="pr-8">
                         <EliteButton variant="ghost" size="icon" className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity">
                           <MoreHorizontal className="w-4 h-4" />
                         </EliteButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      </ElitePageWrapper>

      <ContractModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} onSuccess={() => { setIsCreateModalOpen(false); fetchContracts(); }} />
      <ContractModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} contract={selectedContract ?? undefined} onSuccess={() => { setIsEditModalOpen(false); fetchContracts(); }} />
      {selectedContract && <ContractDetailsModal open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen} contract={selectedContract} />}
    </ModuleErrorBoundary>
  );
}
