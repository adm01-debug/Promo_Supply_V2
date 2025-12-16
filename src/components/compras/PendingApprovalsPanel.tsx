import { useState, useEffect, useCallback } from "react";
import { 
  Clock, 
  Check, 
  X, 
  AlertTriangle,
  MessageSquare,
  User,
  DollarSign,
  Calendar,
  ArrowUpRight,
  Bell,
  BellRing
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useApprovalNotifications } from "@/hooks/useApprovalNotifications";

interface PendingApproval {
  id: string;
  solicitacao: string;
  descricao: string;
  solicitante: string;
  valor: number;
  categoria: string;
  dataHoraSolicitacao: string;
  tempoLimite: number; // horas
  tempoDecorrido: number; // horas
  etapaAtual: number;
  totalEtapas: number;
  aprovadoresAnteriores: string[];
  urgente: boolean;
  escalado: boolean;
}

const mockPendingApprovals: PendingApproval[] = [
  {
    id: "1",
    solicitacao: "SOL-2024-156",
    descricao: "Mochilas Executivas para evento corporativo",
    solicitante: "Maria Santos",
    valor: 15800,
    categoria: "Brindes Promocionais",
    dataHoraSolicitacao: "2024-12-15T10:30:00",
    tempoLimite: 48,
    tempoDecorrido: 36,
    etapaAtual: 2,
    totalEtapas: 3,
    aprovadoresAnteriores: ["João Silva (Gestor)"],
    urgente: false,
    escalado: false,
  },
  {
    id: "2",
    solicitacao: "SOL-2024-158",
    descricao: "Kit escritório para onboarding - 500 unidades",
    solicitante: "Carlos Lima",
    valor: 8500,
    categoria: "Material de Escritório",
    dataHoraSolicitacao: "2024-12-16T08:15:00",
    tempoLimite: 24,
    tempoDecorrido: 22,
    etapaAtual: 1,
    totalEtapas: 2,
    aprovadoresAnteriores: [],
    urgente: true,
    escalado: false,
  },
  {
    id: "3",
    solicitacao: "SOL-2024-152",
    descricao: "Equipamentos de informática - Renovação parque",
    solicitante: "Ana Oliveira",
    valor: 75000,
    categoria: "Equipamentos",
    dataHoraSolicitacao: "2024-12-14T14:00:00",
    tempoLimite: 72,
    tempoDecorrido: 78,
    etapaAtual: 3,
    totalEtapas: 4,
    aprovadoresAnteriores: ["Pedro Costa (Gestor)", "Lucia Ferreira (Coordenadora)"],
    urgente: false,
    escalado: true,
  },
];

export const PendingApprovalsPanel = () => {
  const [approvals, setApprovals] = useState<PendingApproval[]>(mockPendingApprovals);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();
  
  const { 
    notifications,
    unreadCount,
    permissionGranted,
    startMonitoring,
    stopMonitoring,
    checkApprovalDeadlines,
    clearNotifications
  } = useApprovalNotifications();

  // Convert approvals to monitoring format and start monitoring
  const getMonitoringApprovals = useCallback(() => {
    return approvals.map(a => ({
      id: a.id,
      solicitacaoId: a.solicitacao,
      requesterName: a.solicitante,
      value: a.valor,
      createdAt: new Date(a.dataHoraSolicitacao),
      deadlineMinutes: a.tempoLimite * 60, // Convert hours to minutes
      currentStage: a.etapaAtual,
      totalStages: a.totalEtapas
    }));
  }, [approvals]);

  // Start monitoring on mount
  useEffect(() => {
    const cleanup = startMonitoring(getMonitoringApprovals, 30000); // Check every 30 seconds
    return cleanup;
  }, [startMonitoring, getMonitoringApprovals]);

  // Manual check trigger
  const triggerNotificationCheck = () => {
    checkApprovalDeadlines(
      getMonitoringApprovals(),
      120, // Warning: 2 hours before
      30,  // Critical: 30 min before
      0    // Escalate at 0
    );
    toast({
      title: "Verificação de Prazos",
      description: "Notificações disparadas para aprovações próximas do limite.",
    });
  };

  const getTimeStatus = (tempoDecorrido: number, tempoLimite: number) => {
    const percentual = (tempoDecorrido / tempoLimite) * 100;
    if (percentual >= 100) return { status: "overdue", color: "text-red-500", bgColor: "bg-red-500" };
    if (percentual >= 75) return { status: "critical", color: "text-amber-500", bgColor: "bg-amber-500" };
    return { status: "normal", color: "text-blue-500", bgColor: "bg-blue-500" };
  };

  const handleApprove = (approval: PendingApproval) => {
    setApprovals(prev => prev.filter(a => a.id !== approval.id));
    toast({
      title: "Solicitação Aprovada",
      description: `${approval.solicitacao} foi aprovada e seguirá para próxima etapa.`,
    });
  };

  const handleReject = () => {
    if (!selectedApproval || !rejectReason) return;
    
    setApprovals(prev => prev.filter(a => a.id !== selectedApproval.id));
    toast({
      title: "Solicitação Rejeitada",
      description: `${selectedApproval.solicitacao} foi rejeitada.`,
      variant: "destructive",
    });
    setRejectModalOpen(false);
    setSelectedApproval(null);
    setRejectReason("");
  };

  const formatTimeRemaining = (tempoDecorrido: number, tempoLimite: number) => {
    const remaining = tempoLimite - tempoDecorrido;
    if (remaining <= 0) return `Atrasado ${Math.abs(remaining)}h`;
    return `${remaining}h restantes`;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Aprovações Pendentes
          <Badge variant="secondary" className="ml-2">{approvals.length}</Badge>
        </h2>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} alertas
            </Badge>
          )}
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
            Verificar Prazos
          </Button>
        </div>
      </div>

      {approvals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Check className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
          <p>Nenhuma aprovação pendente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => {
            const timeStatus = getTimeStatus(approval.tempoDecorrido, approval.tempoLimite);
            const timeProgress = Math.min((approval.tempoDecorrido / approval.tempoLimite) * 100, 100);

            return (
              <div 
                key={approval.id} 
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  approval.escalado && "border-red-500/50 bg-red-500/5",
                  approval.urgente && !approval.escalado && "border-amber-500/50 bg-amber-500/5",
                  !approval.escalado && !approval.urgente && "border-border bg-card"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-muted-foreground">{approval.solicitacao}</span>
                      {approval.urgente && (
                        <Badge variant="destructive" className="text-[10px]">
                          URGENTE
                        </Badge>
                      )}
                      {approval.escalado && (
                        <Badge variant="outline" className="text-[10px] border-red-500 text-red-500">
                          <ArrowUpRight className="w-3 h-3 mr-1" />
                          ESCALADO
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-foreground mb-2">{approval.descricao}</h4>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {approval.solicitante}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        R$ {approval.valor.toLocaleString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(approval.dataHoraSolicitacao).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    {/* Approval Progress */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Etapa {approval.etapaAtual}/{approval.totalEtapas}</span>
                      <div className="flex-1 flex items-center gap-1">
                        {Array.from({ length: approval.totalEtapas }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1.5 flex-1 rounded-full",
                              i < approval.etapaAtual - 1 && "bg-emerald-500",
                              i === approval.etapaAtual - 1 && "bg-primary",
                              i > approval.etapaAtual - 1 && "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Time Progress */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-xs flex items-center gap-1", timeStatus.color)}>
                          <Clock className="w-3 h-3" />
                          {formatTimeRemaining(approval.tempoDecorrido, approval.tempoLimite)}
                        </span>
                      </div>
                      <Progress 
                        value={timeProgress} 
                        className={cn(
                          "h-1.5",
                          timeStatus.status === "overdue" && "[&>div]:bg-red-500",
                          timeStatus.status === "critical" && "[&>div]:bg-amber-500"
                        )} 
                      />
                    </div>

                    {/* Previous Approvers */}
                    {approval.aprovadoresAnteriores.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span>Aprovado por: </span>
                        {approval.aprovadoresAnteriores.map((ap, i) => (
                          <span key={i}>
                            <span className="text-emerald-600">{ap}</span>
                            {i < approval.aprovadoresAnteriores.length - 1 && " → "}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <Button 
                      size="sm" 
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleApprove(approval)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                      onClick={() => {
                        setSelectedApproval(approval);
                        setRejectModalOpen(true);
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rejeitar
                    </Button>
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
          </DialogHeader>
          
          {selectedApproval && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-sm font-medium">{selectedApproval.solicitacao}</p>
                <p className="text-sm text-muted-foreground">{selectedApproval.descricao}</p>
                <p className="text-sm font-medium mt-2">
                  R$ {selectedApproval.valor.toLocaleString('pt-BR')}
                </p>
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
              disabled={!rejectReason}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
