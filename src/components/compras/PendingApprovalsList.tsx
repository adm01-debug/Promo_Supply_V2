import { useState, useEffect, useCallback, useMemo } from "react";
import Fuse from "fuse.js";
import { 
  Clock, 
  Check, 
  X, 
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
  History,
  Sparkles
} from "lucide-react";

import { normalizeText } from "@/hooks/useFuseSearch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
import { cn, formatCurrency } from "@/lib/utils";
import { useApprovalNotifications } from "@/hooks/useApprovalNotifications";
import { useApprovalWorkflow, type ApprovalStep } from "@/hooks/useApprovalWorkflow";
import { toast } from "@/lib/feedbackToast";
import {
  PendingApprovalItem,
  SortOption,
  FilterStatus,
  getTimeStatus,
  getTimeProgress,
} from "./pending-approvals/pendingApprovalsData";
import { RejectModal, DetailsModal } from "./pending-approvals/ApprovalModals";

export const PendingApprovalsList = () => {
  const { pendingSteps, workflows, allHistory, approveStep, rejectStep, loading: workflowLoading, fetchAllHistory } = useApprovalWorkflow();
  const [selectedApproval, setSelectedApproval] = useState<PendingApprovalItem | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveComment, setApproveComment] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('prazo');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(false);

  // Map pendingSteps to the format expected by the UI
  const approvals: PendingApprovalItem[] = useMemo(() => {
    return pendingSteps.map((step: any) => {
      const workflow = workflows.find(w => w.id === step.workflow_id);
      const history = allHistory.filter(h => h.workflow_id === step.workflow_id && h.acao === 'approved');
      
      return {
        id: step.id,
        workflow_id: step.workflow_id,
        solicitacao_id: workflow?.solicitacao_id || step.solicitacao_id || step.workflow_id,
        solicitacao_numero: (workflow as any)?.solicitacoes?.numero || workflow?.id?.substring(0, 8) || "SOL-...",
        descricao: (workflow as any)?.solicitacoes?.titulo || "Aprovação pendente",
        solicitante: (workflow as any)?.solicitacoes?.solicitante?.full_name || "Sistema",
        valor: workflow?.valor || 0,
        data_solicitacao: workflow?.created_at || step.created_at,
        prazo_limite: step.prazo_limite,
        etapa_atual: step.etapa,
        total_etapas: workflow?.total_etapas || 1,
        urgente: (workflow as any)?.solicitacoes?.prioridade === 'urgente',
        escalado: !!step.delegacao_id,
        categoria: (workflow as any)?.categorias?.nome || "Geral",
        aprovadores_anteriores: history.map(h => h.usuario_nome || 'Aprovador')
      };
    });
  }, [pendingSteps, workflows, allHistory]);
  useEffect(() => {
    fetchAllHistory();
  }, [fetchAllHistory]);

  const { 
    unreadCount,
    permissionGranted,
    startMonitoring,
    checkApprovalDeadlines
  } = useApprovalNotifications();

  const getMonitoringApprovals = useCallback(() => {
    return approvals.map((a: PendingApprovalItem) => ({
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

  useEffect(() => {
    const cleanup = startMonitoring(getMonitoringApprovals, 30000);
    return cleanup;
  }, [startMonitoring, getMonitoringApprovals]);

  const approvalsFuse = useMemo(() => {
    const preparedApprovals = approvals.map((a: PendingApprovalItem) => ({
      ...a,
      normalizedDescricao: normalizeText(a.descricao),
      normalizedSolicitante: normalizeText(a.solicitante),
    }));
    return new Fuse(preparedApprovals, {
      isCaseSensitive: false,
      includeScore: true,
      threshold: 0.4,
      keys: [
        { name: 'solicitacao_numero', weight: 2.0 },
        { name: 'descricao', weight: 1.5 },
        { name: 'solicitante', weight: 1.5 },
        { name: 'normalizedDescricao', weight: 1.3 },
        { name: 'normalizedSolicitante', weight: 1.3 },
      ],
    });
  }, [approvals]);

  const filteredApprovals = useMemo(() => {
    let filtered = [...approvals];

    if (searchTerm.trim()) {
      const normalizedSearch = normalizeText(searchTerm);
      const fuseResults = approvalsFuse.search(searchTerm);
      const normalizedFuseResults = approvalsFuse.search(normalizedSearch);
      
      const seenIds = new Set<string>();
      const merged: PendingApprovalItem[] = [];
      
      [...fuseResults, ...normalizedFuseResults].forEach(r => {
        if (!seenIds.has(r.item.id)) {
          seenIds.add(r.item.id);
          merged.push(r.item);
        }
      });
      
      filtered = merged.length > 0 ? merged : filtered.filter(a => 
        a.solicitacao_numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.solicitante.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => {
        if (filterStatus === 'urgente') return a.urgente;
        if (filterStatus === 'escalado') return a.escalado;
        if (filterStatus === 'normal') return !a.urgente && !a.escalado;
        return true;
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === 'prazo') return new Date(a.prazo_limite).getTime() - new Date(b.prazo_limite).getTime();
      if (sortBy === 'valor') return b.valor - a.valor;
      return new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime();
    });

    return filtered;
  }, [approvals, searchTerm, filterStatus, sortBy, approvalsFuse]);

  const handleApprove = async (approval: PendingApprovalItem) => {
    setSelectedApproval(approval);
    setDetailsModalOpen(true);
  };

  const confirmApprove = async () => {
    if (!selectedApproval) return;
    setLoading(true);
    try {
      await approveStep(selectedApproval.id, approveComment);
      setApproveComment("");
      setDetailsModalOpen(false);
      setSelectedApproval(null);
    } catch (error: unknown) {
      toast.error("Erro ao aprovar solicitação");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval || !rejectReason) return;
    setLoading(true);
    try {
      await rejectStep(selectedApproval.id, rejectReason);
      setRejectModalOpen(false);
      setSelectedApproval(null);
      setRejectReason("");
    } catch (error: unknown) {
      toast.error("Erro ao rejeitar solicitação");
    } finally {
      setLoading(false);
    }
  };

  const triggerNotificationCheck = () => {
    checkApprovalDeadlines(getMonitoringApprovals(), 120, 30, 0);
    toast.info("Verificação de prazos realizada", {
      description: "Notificações serão enviadas para aprovações próximas do limite"
    });
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
              <Badge variant="outline" className="text-xs border-red-500 text-destructive">
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
                <Button variant="outline" size="sm" onClick={triggerNotificationCheck} className="flex items-center gap-1">
                  {permissionGranted ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  <span className="hidden sm:inline">Verificar Prazos</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Verificar e enviar notificações para aprovações próximas do limite</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input placeholder="Buscar por número, descrição ou solicitante..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="sm:max-w-xs" />
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
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
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
          <Check className="w-16 h-16 mx-auto mb-4 text-success" />
          <p className="text-lg font-medium">Nenhuma aprovação pendente</p>
          <p className="text-sm">
            {searchTerm || filterStatus !== 'all' ? "Tente ajustar os filtros" : "Todas as solicitações foram processadas"}
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
                  approval.urgente && !approval.escalado && "border-amber-500/50 bg-warning/5",
                  timeStatus.status === 'overdue' && "border-red-500/50 bg-destructive/5",
                  !approval.escalado && !approval.urgente && timeStatus.status !== 'overdue' && "border-border bg-card"
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 relative">
                    <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                      <Sparkles className="w-12 h-12 text-primary" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-sm text-primary font-medium">{approval.solicitacao_numero}</span>
                      <Badge variant="outline" className="text-xs">{approval.categoria}</Badge>
                      {approval.urgente && (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="w-3 h-3 mr-1" />URGENTE
                        </Badge>
                      )}
                      {approval.escalado && (
                        <Badge variant="outline" className="text-[10px] border-purple-500 text-purple-500">
                          <ArrowUpRight className="w-3 h-3 mr-1" />ESCALADO
                        </Badge>
                      )}
                    </div>
                    
                    <h4 className="font-medium text-foreground mb-3">{approval.descricao}</h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" /><span>{approval.solicitante}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="w-4 h-4" /><span className="font-medium text-foreground">{formatCurrency(approval.valor)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" /><span>{new Date(approval.data_solicitacao).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className={cn("flex items-center gap-2", timeStatus.color)}>
                        <Timer className="w-4 h-4" /><span className="font-medium">{timeStatus.label}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Etapa {approval.etapa_atual} de {approval.total_etapas}</span>
                        {approval.aprovadores_anteriores.length > 0 && (
                          <span className="text-xs text-success">✓ {approval.aprovadores_anteriores.join(' → ')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: approval.total_etapas }).map((_, i) => (
                          <div key={i} className={cn(
                            "h-2 flex-1 rounded-full transition-all duration-700",
                            i < approval.etapa_atual - 1 && "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
                            i === approval.etapa_atual - 1 && "bg-primary animate-pulse shadow-[0_0_15px_rgba(139,92,246,0.4)]",
                            i > approval.etapa_atual - 1 && "bg-muted"

                          )} />
                        ))}
                      </div>
                    </div>

                    <div className="mt-3">
                      <Progress 
                        value={timeProgress} 
                        className={cn(
                          "h-1.5",
                          timeStatus.status === "overdue" && "[&>div]:bg-destructive",
                          timeStatus.status === "critical" && "[&>div]:bg-warning"
                        )} 
                      />
                    </div>
                  </div>

                  <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                    <Button size="sm" className="flex-1 lg:flex-none bg-success hover:bg-success/80" onClick={() => handleApprove(approval)} disabled={loading}>
                      <Check className="w-4 h-4 mr-1" />Aprovar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 lg:flex-none border-red-500/50 text-destructive hover:bg-destructive/10" onClick={() => { setSelectedApproval(approval); setRejectModalOpen(true); }} disabled={loading}>
                      <X className="w-4 h-4 mr-1" />Rejeitar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="flex-1 lg:flex-none"><ChevronDown className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedApproval(approval); setDetailsModalOpen(true); }}>
                          <Eye className="w-4 h-4 mr-2" />Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <History className="w-4 h-4 mr-2" />Ver Histórico
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

      <RejectModal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        approval={selectedApproval}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onConfirm={handleReject}
        loading={loading}
      />

      <DetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        approval={selectedApproval}
        approveComment={approveComment}
        onApproveCommentChange={setApproveComment}
        onConfirm={confirmApprove}
        loading={loading}
      />
    </Card>
  );
};
