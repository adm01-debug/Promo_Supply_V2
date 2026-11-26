import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { DynamicApprovalMatrix } from "@/components/compras/DynamicApprovalMatrix";
import { PendingApprovalsList } from "@/components/compras/PendingApprovalsList";
import { WorkflowDLQPanel } from "@/components/compras/approval/WorkflowDLQPanel";
import { useApprovalWorkflow } from "@/hooks/useApprovalWorkflow";
import { 
  ClipboardCheck, 
  Settings,
  History,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  ApprovalTrendChart,
  StatusDistributionChart,
  BottleneckAnalysis,
  ApprovalKPIs,
} from "@/features/aprovacoes";

import {
  distribuicaoPorStatus,
  gargalos,
  historicoDaLista,
  inicioDaJanela,
  resumirAprovacoes,
  serieMensal,
} from './aprovacoesData';

const Aprovacoes = () => {
  const [periodo, setPeriodo] = useState("6m");
  const {
    allHistory,
    allSteps,
    allWorkflows,
    workflows,
    loading,
    fetchAllHistory,
    fetchAllWorkflows,
    fetchAllSteps,
    checkEscalations,
  } = useApprovalWorkflow();

  useEffect(() => {
    checkEscalations();
  }, [checkEscalations]);

  useEffect(() => {
    fetchAllHistory();
    fetchAllWorkflows();
    fetchAllSteps();
  }, [fetchAllHistory, fetchAllWorkflows, fetchAllSteps]);

  const inicio = useMemo(() => inicioDaJanela(periodo), [periodo]);

  const resumo = useMemo(
    () => resumirAprovacoes(allHistory, workflows.length, allSteps, inicio),
    [allHistory, workflows.length, allSteps, inicio],
  );

  const tendencia = useMemo(() => serieMensal(allHistory, allSteps, periodo), [allHistory, allSteps, periodo]);

  const distribuicao = useMemo(() => distribuicaoPorStatus(allWorkflows), [allWorkflows]);

  const listaGargalos = useMemo(() => gargalos(allSteps), [allSteps]);

  const historico = useMemo(() => historicoDaLista(allHistory), [allHistory]);

  return (
    <ModuleErrorBoundary module="aprovacoes">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Aprovações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie aprovações pendentes, configure regras e delegações
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-5">
          <Card className="p-3 sm:p-4 border-amber-500/20">
            <p className="text-xs text-muted-foreground truncate">Pendentes</p>
            <p className="text-xl sm:text-2xl font-bold text-warning">{resumo.pendentes}</p>
          </Card>
          <Card className="p-3 sm:p-4 border-emerald-500/20">
            <p className="text-xs text-muted-foreground truncate">Aprovadas</p>
            <p className="text-xl sm:text-2xl font-bold text-success">{resumo.aprovadas}</p>
          </Card>
          <Card className="p-3 sm:p-4 border-red-500/20">
            <p className="text-xs text-muted-foreground truncate">Rejeitadas</p>
            <p className="text-xl sm:text-2xl font-bold text-destructive">{resumo.rejeitadas}</p>
          </Card>
          <Card className="p-3 sm:p-4 border-blue-500/20">
            <p className="text-xs text-muted-foreground truncate">Tempo Médio</p>
            <p className="text-xl sm:text-2xl font-bold text-info">{resumo.tempoMedioHoras === null ? "—" : `${resumo.tempoMedioHoras.toFixed(1)}h`}</p>
          </Card>
          <Card className="p-3 sm:p-4 border-purple-500/20 col-span-2 md:col-span-1">
            <p className="text-xs text-muted-foreground truncate">Escalações</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-600">{resumo.escalacoes}</p>
          </Card>
        </div>

        <Tabs defaultValue="pendentes" className="space-y-4">
          <TabsList className="w-full grid grid-cols-2 gap-1 h-auto p-1 sm:grid-cols-4">
            <TabsTrigger value="pendentes" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Pendentes</span>
              <Badge variant="secondary" className="ml-1 text-xs">{resumo.pendentes}</Badge>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Config</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="metricas" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Métricas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes">
            <WorkflowDLQPanel />
            <PendingApprovalsList />
          </TabsContent>

          <TabsContent value="config">
            <DynamicApprovalMatrix />
          </TabsContent>

          <TabsContent value="historico">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Histórico de Aprovações
              </h2>
              <div className="space-y-3">
                {loading && historico.length === 0 && (
                  <p className="text-sm text-muted-foreground">Carregando histórico…</p>
                )}
                {!loading && historico.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma decisão de aprovação registrada até agora.
                  </p>
                )}
                {historico.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-mono text-sm">{item.solicitacao}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.valor ? `R$ ${item.valor.toLocaleString('pt-BR')}` : item.acao}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant={
                          item.acao === "approved" || item.acao === "Aprovado" ? "default" : 
                          item.acao === "rejected" || item.acao === "Rejeitado" ? "destructive" : 
                          item.acao === "escalated" || item.acao === "escalado_automatico" ? "secondary" :
                          "outline"
                        }
                      >
                        {item.acao === "escalated" ? "Escalado" : item.acao}
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm">{item.por}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.data}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="metricas" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Métricas de Aprovação
              </h2>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Último mês</SelectItem>
                  <SelectItem value="3m">Últimos 3 meses</SelectItem>
                  <SelectItem value="6m">Últimos 6 meses</SelectItem>
                  <SelectItem value="12m">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {resumo.taxaAprovacao === null || resumo.tempoMedioHoras === null ? (
              <Card className="p-6 text-sm text-muted-foreground">
                Sem decisões de aprovação no período selecionado — não há taxa de aprovação nem tempo médio para calcular.
              </Card>
            ) : (
              <ApprovalKPIs
                metrics={{
                  taxaAprovacao: resumo.taxaAprovacao,
                  tempoMedioGeral: resumo.tempoMedioHoras,
                  totalAprovadas: resumo.aprovadas,
                  totalRejeitadas: resumo.rejeitadas,
                }}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {allHistory.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground">
                  Nenhuma movimentação de aprovação no período selecionado.
                </Card>
              ) : (
                <ApprovalTrendChart data={tendencia} />
              )}
              {allWorkflows.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground">
                  Nenhum workflow de aprovação registrado.
                </Card>
              ) : (
                <StatusDistributionChart data={distribuicao} />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {listaGargalos.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground">
                  Nenhuma etapa de aprovação em aberto no momento.
                </Card>
              ) : (
                <BottleneckAnalysis data={listaGargalos} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleErrorBoundary>
  );
};

export default Aprovacoes;
