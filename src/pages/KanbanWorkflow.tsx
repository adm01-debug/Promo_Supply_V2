import { useState } from "react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Columns3, Clock, AlertTriangle, CheckCircle, ArrowRight, Filter, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInHours } from "date-fns";

const STATUS_COLUMNS = [
  { id: "pendente", label: "Pendente", color: "bg-yellow-500/10 border-yellow-500/30", textColor: "text-yellow-600" },
  { id: "em_cotacao", label: "Em Cotação", color: "bg-purple-500/10 border-purple-500/30", textColor: "text-purple-600" },
  { id: "aprovada", label: "Aprovada", color: "bg-blue-500/10 border-blue-500/30", textColor: "text-blue-600" },
  { id: "em_andamento", label: "Em Andamento", color: "bg-orange-500/10 border-orange-500/30", textColor: "text-orange-600" },
  { id: "rejeitada", label: "Rejeitada", color: "bg-rose-500/10 border-rose-500/30", textColor: "text-rose-600" },
  { id: "concluida", label: "Concluída", color: "bg-green-500/10 border-green-500/30", textColor: "text-green-600" },
  { id: "cancelada", label: "Cancelada", color: "bg-red-500/10 border-red-500/30", textColor: "text-red-600" },
];

// Valid transitions per DB trigger validate_solicitacao_status_transition
const VALID_TRANSITIONS: Record<string, string[]> = {
  pendente: ["em_cotacao", "aprovada", "rejeitada", "cancelada"],
  em_cotacao: ["aprovada", "rejeitada", "cancelada"],
  aprovada: ["em_andamento", "cancelada"],
  em_andamento: ["concluida", "cancelada"],
  rejeitada: ["pendente"],
  concluida: [],
  cancelada: [],
};

const KanbanWorkflow = () => {
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: solicitacoes } = useQuery({
    queryKey: ["kanban-solicitacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes")
        .select("id, numero, titulo, status, prioridade, valor_estimado, created_at, data_necessidade, departamento")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from("solicitacoes")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-solicitacoes"] });
      toast.success("Status atualizado!");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao atualizar status"),
  });

  const getSLAStatus = (createdAt: string, status: string) => {
    if (status === "concluida" || status === "cancelada") return "ok";
    const hours = differenceInHours(new Date(), new Date(createdAt));
    if (hours > 72) return "critical";
    if (hours > 48) return "warning";
    return "ok";
  };

  const filtered = solicitacoes?.filter(s =>
    prioridadeFilter === "all" || s.prioridade === prioridadeFilter
  );

  const getColumnItems = (statusId: string) =>
    filtered?.filter(s => s.status === statusId) || [];

  const getValidTargets = (currentStatus: string) => {
    const targets = VALID_TRANSITIONS[currentStatus] || [];
    return STATUS_COLUMNS.filter(c => targets.includes(c.id));
  };

  return (
    <MainLayout>
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Columns3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Kanban Workflow</h1>
              <p className="text-sm text-muted-foreground">Visão visual do fluxo de solicitações</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["kanban-solicitacoes"] })}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "70vh" }}>
          {STATUS_COLUMNS.map(col => {
            const items = getColumnItems(col.id);
            return (
              <div key={col.id} className={`flex-shrink-0 w-72 rounded-lg border ${col.color} p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-semibold text-sm ${col.textColor}`}>{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
                <div className="space-y-2 max-h-[65vh] overflow-y-auto">
                  {items.map(item => {
                    const sla = getSLAStatus(item.created_at, item.status);
                    const validTargets = getValidTargets(col.id);
                    return (
                      <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-mono text-muted-foreground">{item.numero}</p>
                            {sla === "critical" && <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                            {sla === "warning" && <Clock className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />}
                            {sla === "ok" && item.status === "concluida" && <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
                          </div>
                          <p className="text-sm font-medium leading-tight line-clamp-2">{item.titulo}</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant={
                              item.prioridade === "critica" ? "destructive" :
                              item.prioridade === "alta" ? "default" : "secondary"
                            } className="text-[10px] px-1.5 py-0">
                              {item.prioridade}
                            </Badge>
                            {item.valor_estimado && (
                              <span className="text-[10px] text-muted-foreground">
                                R$ {Number(item.valor_estimado).toLocaleString("pt-BR")}
                              </span>
                            )}
                          </div>
                          {item.departamento && (
                            <p className="text-[10px] text-muted-foreground">{item.departamento}</p>
                          )}
                          {validTargets.length > 0 && (
                            <div className="flex gap-1 pt-1 flex-wrap">
                              {validTargets.slice(0, 2).map(target => (
                                <Button
                                  key={target.id}
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] px-2"
                                  onClick={() => updateStatusMutation.mutate({ id: item.id, newStatus: target.id })}
                                >
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  {target.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Nenhum item</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default KanbanWorkflow;
