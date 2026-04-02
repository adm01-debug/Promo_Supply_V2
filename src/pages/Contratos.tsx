import { useState, useEffect } from "react";
import { MainLayout } from "@/components/compras/MainLayout";
import { TableSkeleton, KPICardSkeleton } from "@/components/ui/contextual-skeletons";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DigitalSignature } from "@/components/compras/DigitalSignature";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  FileSignature,
  Building2,
  DollarSign,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/feedbackToast";
import { ContractModal } from "@/components/compras/ContractModal";
import { ContractDetailsModal } from "@/components/compras/ContractDetailsModal";
import type { Contract, StatusConfig, TypeConfig } from "@/types/contract";

const statusConfig: Record<string, StatusConfig> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: FileText },
  pending_approval: { label: "Aguard. Aprovação", color: "bg-warning/10 text-amber-800 dark:bg-amber-900/30 dark:text-warning", icon: Clock },
  active: { label: "Ativo", color: "bg-success/10 text-emerald-800 dark:bg-emerald-900/30 dark:text-success", icon: CheckCircle2 },
  expired: { label: "Expirado", color: "bg-destructive/10 text-red-800 dark:bg-red-900/30 dark:text-destructive", icon: XCircle },
  cancelled: { label: "Cancelado", color: "bg-muted text-gray-800 dark:bg-gray-900/30 dark:text-muted-foreground", icon: XCircle },
  renewed: { label: "Renovado", color: "bg-info/10 text-blue-800 dark:bg-blue-900/30 dark:text-info", icon: RefreshCw },
};

const typeConfig: Record<string, TypeConfig> = {
  service: { label: "Serviço", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  supply: { label: "Fornecimento", color: "bg-info/10 text-blue-800 dark:bg-blue-900/30 dark:text-info" },
  framework: { label: "Acordo-Quadro", color: "bg-warning/10 text-orange-800 dark:bg-orange-900/30 dark:text-warning" },
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

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error("Erro ao carregar contratos");
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    const matchesType = typeFilter === "all" || contract.contract_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getDaysUntilExpiry = (endDate: string) => {
    return differenceInDays(new Date(endDate), new Date());
  };

  const getExpiryBadge = (endDate: string, status: string) => {
    if (status !== 'active') return null;
    const days = getDaysUntilExpiry(endDate);
    
    if (days < 0) {
      return <Badge variant="destructive" className="text-xs">Expirado há {Math.abs(days)} dias</Badge>;
    } else if (days <= 30) {
      return <Badge className="bg-warning/10 text-amber-800 dark:bg-amber-900/30 dark:text-warning text-xs">Expira em {days} dias</Badge>;
    } else if (days <= 90) {
      return <Badge className="bg-info/10 text-blue-800 dark:bg-blue-900/30 dark:text-info text-xs">Expira em {days} dias</Badge>;
    }
    return null;
  };

  // Calculate KPIs
  const activeContracts = contracts.filter(c => c.status === 'active');
  const expiringContracts = activeContracts.filter(c => getDaysUntilExpiry(c.end_date) <= 30);
  const totalValue = activeContracts.reduce((sum, c) => sum + Number(c.total_value), 0);

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm("Tem certeza que deseja excluir este contrato?")) return;
    
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);

      if (error) throw error;
      
      toast.success("Contrato excluído com sucesso");
      fetchContracts();
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error("Erro ao excluir contrato");
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileSignature className="w-7 h-7 text-primary" />
              Gestão de Contratos
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie contratos com fornecedores, renovações e vencimentos
            </p>
          </div>
          <div className="flex gap-2">
            <DigitalSignature />
            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Contrato
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Contratos</p>
                  <p className="text-xl sm:text-2xl font-bold">{contracts.length}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Ativos</p>
                  <p className="text-xl sm:text-2xl font-bold text-success">{activeContracts.length}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-success/10 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">A Vencer</p>
                  <p className="text-xl sm:text-2xl font-bold text-warning">{expiringContracts.length}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-warning/10 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Valor Total</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">
                    {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-info/10 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, número ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="pending_approval">Aguard. Aprovação</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="renewed">Renovado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="service">Serviço</SelectItem>
                  <SelectItem value="supply">Fornecimento</SelectItem>
                  <SelectItem value="framework">Acordo-Quadro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts for expiring contracts */}
        {expiringContracts.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800 bg-warning/5 dark:bg-amber-900/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-warning">
                    Atenção: {expiringContracts.length} contrato(s) a vencer
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-warning">
                    {expiringContracts.map(c => c.title).join(', ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contracts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Contratos ({filteredContracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 gap-4">
                <TableSkeleton rows={5} columns={7} />
              </div>
            ) : filteredContracts.length === 0 ? (
              <IllustratedEmptyState
                type="documents"
                title="Nenhum contrato encontrado"
                description={contracts.length === 0 
                  ? "Comece criando seu primeiro contrato para gerenciar suas parcerias"
                  : "Tente ajustar os filtros de busca para encontrar o contrato desejado"}
                action={contracts.length === 0 ? { label: "Criar Contrato", onClick: () => setIsCreateModalOpen(true) } : undefined}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vigência</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((contract) => {
                      const status = statusConfig[contract.status] || statusConfig.draft;
                      const type = typeConfig[contract.contract_type] || typeConfig.service;
                      const StatusIcon = status.icon;

                      return (
                        <TableRow key={contract.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <p className="font-medium">{contract.title}</p>
                              <p className="text-xs text-muted-foreground">{contract.contract_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span>{contract.supplier_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={type.color}>{type.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge className={`${status.color} flex items-center gap-1 w-fit`}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </Badge>
                              {getExpiryBadge(contract.end_date, contract.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{format(new Date(contract.start_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                              <p className="text-muted-foreground">
                                até {format(new Date(contract.end_date), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {Number(contract.total_value).toLocaleString('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedContract(contract);
                                  setIsDetailsModalOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedContract(contract);
                                  setIsEditModalOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteContract(contract.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <ContractModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={fetchContracts}
      />

      <ContractModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        contract={selectedContract}
        onSuccess={fetchContracts}
      />

      <ContractDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        contract={selectedContract}
      />
    </MainLayout>
  );
}
