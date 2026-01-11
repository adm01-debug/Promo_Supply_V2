import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Clock, 
  Check, 
  X, 
  MessageSquare,
  User,
  DollarSign,
  Calendar,
  ArrowUpRight,
  Bell,
  BellRing,
  AlertTriangle,
  Filter,
  ChevronDown,
  Timer,
  Eye,
  History
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useApprovalNotifications } from "@/hooks/useApprovalNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PendingApprovalItem {
  id: string;
  workflow_id: string;
  solicitacao_id: string;
  solicitacao_numero: string;
  descricao: string;
  solicitante: string;
  valor: number;
  categoria: string;
  data_solicitacao: string;
  prazo_limite: string;
  etapa_atual: number;
  total_etapas: number;
  aprovadores_anteriores: string[];
  urgente: boolean;
  escalado: boolean;
}

// Mock data for demo
const mockPendingApprovals: PendingApprovalItem[] = [
  {
    id: "step-1",
    workflow_id: "wf-1",
    solicitacao_id: "sol-1",
    solicitacao_numero: "SOL-2024-156",
    descricao: "Mochilas Executivas para evento corporativo",
    solicitante: "Maria Santos",
    valor: 15800,
    categoria: "Brindes Promocionais",
    data_solicitacao: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    prazo_limite: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    etapa_atual: 2,
    total_etapas: 3,
    aprovadores_anteriores: ["João Silva (Gestor)"],
    urgente: false,
    escalado: false,
  },
  {
    id: "step-2",
    workflow_id: "wf-2",
    solicitacao_id: "sol-2",
    solicitacao_numero: "SOL-2024-158",
    descricao: "Kit escritório para onboarding - 500 unidades",
    solicitante: "Carlos Lima",
    valor: 8500,
    categoria: "Material de Escritório",
    data_solicitacao: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    prazo_limite: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    etapa_atual: 1,
    total_etapas: 2,
    aprovadores_anteriores: [],
    urgente: true,
    escalado: false,
  },
  {
    id: "step-3",
    workflow_id: "wf-3",
    solicitacao_id: "sol-3",
    solicitacao_numero: "SOL-2024-152",
    descricao: "Equipamentos de informática - Renovação parque",
    solicitante: "Ana Oliveira",
    valor: 75000,
    categoria: "Equipamentos",
    data_solicitacao: new Date(Date.now() - 78 * 60 * 60 * 1000).toISOString(),
    prazo_limite: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    etapa_atual: 3,
    total_etapas: 4,
    aprovadores_anteriores: ["Pedro Costa (Gestor)", "Lucia Ferreira (Coordenadora)"],
    urgente: false,
    escalado: true,
  },
];

type SortOption = 'prazo' | 'valor' | 'data';
type FilterStatus = 'all' | 'urgente' | 'escalado' | 'normal';

export const PendingApprovalsList = () => {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<PendingApprovalItem[]>(mockPendingApprovals);
  const [selectedApproval, setSelectedApproval] = useState<PendingApprovalItem | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveComment, setApproveComment] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('prazo');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(false);
  
  const { 
    unreadCount,
    permissionGranted,
    startMonitoring,
    checkApprovalDeadlines
  } = useApprovalNotifications();

  // Convert approvals to monitoring format
  const getMonitoringApprovals = useCallback(() => {
    return approvals.map(a => ({
      id: a.id,
      solicitacaoId: a.solicitacao_numero,
      requesterName: a.solicitante,
      value: a.valor,
      createdAt: new Date(a.data_solicitacao),
      deadlineMinutes: Math.floor((new Date(a.prazo_limite).getTime() - new Date(a.data_solicitacao).getTime()) / (1000 * 60)),
      currentStage: a.etapa_atual,
      totalStages: a.total_etapas
    }));
  }, [approvals]);

  // Start monitoring on mount
  useEffect(() => {
    const cleanup = startMonitoring(getMonitoringApprovals, 30000);
    return cleanup;
  }, [startMonitoring, getMonitoringApprovals]);

  // Filter and sort approvals
  const filteredApprovals = useMemo(() => {
    let filtered = [...approvals];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.solicitacao_numero.toLowerCase().includes(search) ||
        a.descricao.toLowerCase().includes(search) ||
        a.solicitante.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => {
        if (filterStatus === 'urgente') return a.urgente;
        if (filterStatus === 'escalado') return a.escalado;
        if (filterStatus === 'normal') return !a.urgente && !a.escalado;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'prazo') {
        return new Date(a.prazo_limite).getTime() - new Date(b.prazo_limite).getTime();
      }
      if (sortBy === 'valor') {
        return b.valor - a.valor;
      }
      return new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime();
    });

    return filtered;
  }, [approvals, searchTerm, filterStatus, sortBy]);

  const getTimeStatus = (prazoLimite: string) => {
    const now = new Date();
    const deadline = new Date(prazoLimite);
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 0) {
      return { 
        status: "overdue", 
        color: "text-red-500", 
        bgColor: "bg-red-500",
        label: `Atrasado ${Math.abs(Math.round(diffHours))}h`
      };
    }
    if (diffHours <= 4) {
      return { 
        status: "critical", 
        color: "text-amber-500", 
        bgColor: "bg-amber-500",
        label: `${Math.round(diffHours)}h restantes`
      };
    }
    return { 
      status: "normal", 
      color: "text-blue-500", 
      bgColor: "bg-blue-500",
      label: `${Math.round(diffHours)}h restantes`
    };
  };

  const getTimeProgress = (dataSolicitacao: string, prazoLimite: string) => {
    const start = new Date(dataSolicitacao).getTime();
    const end = new Date(prazoLimite).getTime();
    const now = Date.now();
    const progress = ((now - start) / (end - start)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const handleApprove = async (approval: PendingApprovalItem) => {
    setLoading(true);
    try {
      // In production, call the API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setApprovals(prev => prev.filter(a => a.id !== approval.id));
      toast.success(`${approval.solicitacao_numero} aprovada com sucesso!`, {
        description: approveComment ? `Comentário: ${approveComment}` : undefined
      });
      setApproveComment("");
    } catch (error) {
      toast.error("Erro ao aprovar solicitação");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval || !rejectReason) return;
    
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setApprovals(prev => prev.filter(a => a.id !== selectedApproval.id));
      toast.error(`${selectedApproval.solicitacao_numero} rejeitada`, {
        description: `Motivo: ${rejectReason}`
      });
      setRejectModalOpen(false);
      setSelectedApproval(null);
      setRejectReason("");
    } catch (error) {
      toast.error("Erro ao rejeitar solicitação");
    } finally {
      setLoading(false);
    }
  };

  const triggerNotificationCheck = () => {
    checkApprovalDeadlines(
      getMonitoringApprovals(),
      120, // Warning: 2 hours before
      30,  // Critical: 30 min before
      0    // Escalate at 0
    );
    toast.info("Verificação de prazos realizada", {
      description: "Notificações serão enviadas para aprovações próximas do limite"
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const urgentCount = approvals.filter(a => a.urgente).length;
  const escalatedCount = approvals.filter(a => a.escalado).length;
  const overdueCount = approvals.filter(a => getTimeStatus(a.prazo_limite).status === 'overdue').length;

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Aprovações Pendentes
            <Badge variant="secondary" className="ml-1">{approvals.length}</Badge>
          </h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {urgentCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {urgentCount} urgente(s)
              </Badge>
            )}
            {escalatedCount > 0 && (
              <Badge variant="outline" className="text-xs border-purple-500 text-purple-500">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                {escalatedCount} escalada(s)
              </Badge>
            )}
            {overdueCount > 0 && (
              <Badge variant="outline" className="text-xs border-red-500 text-red-500">
                <Timer className="w-3 h-3 mr-1" />
                {overdueCount} atrasada(s)
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} alertas
            </Badge>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerNotificationCheck}
                  className="flex items-center gap-1"
                >
                  {permissionGranted ? (
                    <BellRing className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Verificar Prazos</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Verificar e enviar notificações para aprovações próximas do limite
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Buscar por número, descrição ou solicitante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="sm:max-w-xs"
        />
        
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={(v: FilterStatus) => setFilterStatus(v)}>
            <SelectTrigger className="w-[130px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="urgente">Urgentes</SelectItem>
              <SelectItem value="escalado">Escaladas</SelectItem>
              <SelectItem value="normal">Normais</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v: SortOption) => setSortBy(v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prazo">Por Prazo</SelectItem>
              <SelectItem value="valor">Por Valor</SelectItem>
              <SelectItem value="data">Por Data</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {filteredApprovals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Check className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
          <p className="text-lg font-medium">Nenhuma aprovação pendente</p>
          <p className="text-sm">
            {searchTerm || filterStatus !== 'all' 
              ? "Tente ajustar os filtros" 
              : "Todas as solicitações foram processadas"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApprovals.map((approval) => {
            const timeStatus = getTimeStatus(approval.prazo_limite);
            const timeProgress = getTimeProgress(approval.data_solicitacao, approval.prazo_limite);

            return (
              <div 
                key={approval.id} 
                className={cn(
                  "p-4 rounded-xl border transition-all hover:shadow-md",
                  approval.escalado && "border-purple-500/50 bg-purple-500/5",
                  approval.urgente && !approval.escalado && "border-amber-500/50 bg-amber-500/5",
                  timeStatus.status === 'overdue' && "border-red-500/50 bg-red-500/5",
                  !approval.escalado && !approval.urgente && timeStatus.status !== 'overdue' && "border-border bg-card"
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-sm text-primary font-medium">
                        {approval.solicitacao_numero}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {approval.categoria}
                      </Badge>
                      {approval.urgente && (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          URGENTE
                        </Badge>
                      )}
                      {approval.escalado && (
                        <Badge variant="outline" className="text-[10px] border-purple-500 text-purple-500">
                          <ArrowUpRight className="w-3 h-3 mr-1" />
                          ESCALADO
                        </Badge>
                      )}
                    </div>
                    
                    <h4 className="font-medium text-foreground mb-3">{approval.descricao}</h4>
                    
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{approval.solicitante}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-medium text-foreground">{formatCurrency(approval.valor)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(approval.data_solicitacao).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className={cn("flex items-center gap-2", timeStatus.color)}>
                        <Timer className="w-4 h-4" />
                        <span className="font-medium">{timeStatus.label}</span>
                      </div>
                    </div>

                    {/* Approval Progress */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          Etapa {approval.etapa_atual} de {approval.total_etapas}
                        </span>
                        {approval.aprovadores_anteriores.length > 0 && (
                          <span className="text-xs text-emerald-600">
                            ✓ {approval.aprovadores_anteriores.join(' → ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: approval.total_etapas }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-2 flex-1 rounded-full transition-all",
                              i < approval.etapa_atual - 1 && "bg-emerald-500",
                              i === approval.etapa_atual - 1 && "bg-primary animate-pulse",
                              i > approval.etapa_atual - 1 && "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Time Progress */}
                    <div className="mt-3">
                      <Progress 
                        value={timeProgress} 
                        className={cn(
                          "h-1.5",
                          timeStatus.status === "overdue" && "[&>div]:bg-red-500",
                          timeStatus.status === "critical" && "[&>div]:bg-amber-500"
                        )} 
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                    <Button 
                      size="sm" 
                      className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleApprove(approval)}
                      disabled={loading}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 lg:flex-none border-red-500/50 text-red-500 hover:bg-red-500/10"
                      onClick={() => {
                        setSelectedApproval(approval);
                        setRejectModalOpen(true);
                      }}
                      disabled={loading}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rejeitar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="flex-1 lg:flex-none">
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedApproval(approval);
                          setDetailsModalOpen(true);
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <History className="w-4 h-4 mr-2" />
                          Ver Histórico
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <X className="w-5 h-5" />
              Rejeitar Solicitação
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          {selectedApproval && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">{selectedApproval.solicitacao_numero}</p>
                <p className="text-sm text-muted-foreground">{selectedApproval.descricao}</p>
                <p className="text-sm font-medium mt-2">{formatCurrency(selectedApproval.valor)}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Motivo da Rejeição *
                </label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Descreva o motivo da rejeição..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectReason || loading}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Detalhes da Solicitação
            </DialogTitle>
          </DialogHeader>
          
          {selectedApproval && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Número</p>
                  <p className="font-mono font-medium">{selectedApproval.solicitacao_numero}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-medium">{formatCurrency(selectedApproval.valor)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Solicitante</p>
                  <p>{selectedApproval.solicitante}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p>{selectedApproval.categoria}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <p>{selectedApproval.descricao}</p>
                </div>
              </div>

              {selectedApproval.aprovadores_anteriores.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Aprovadores Anteriores</p>
                  <div className="space-y-1">
                    {selectedApproval.aprovadores_anteriores.map((ap, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>{ap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
