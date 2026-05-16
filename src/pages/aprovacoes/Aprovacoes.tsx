import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { DynamicApprovalMatrix } from "@/components/compras/DynamicApprovalMatrix";
import { PendingApprovalsList } from "@/components/compras/PendingApprovalsList";
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
  type ApprovalHistoryItem,
} from "@/features/aprovacoes";

import {
  approvalHistory,
  approvalStats,
  approvalTrendData,
  statusDistribution,
  bottleneckData,
} from './aprovacoesData';

const Aprovacoes = () => {
  const [periodo, setPeriodo] = useState("6m");
  const { allHistory, fetchAllHistory, checkEscalations } = useApprovalWorkflow();

  useEffect(() => {
    checkEscalations();
    const interval = setInterval(() => {
      checkEscalations();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkEscalations]);

  useEffect(() => {
    fetchAllHistory();
  }, [fetchAllHistory]);

  const metricas = useMemo(() => {
    const totalAprovacoes = approvalTrendData.reduce((acc: number, d) => acc + d.aprovadas + d.rejeitadas, 0);
    const totalAprovadas = approvalTrendData.reduce((acc: number, d) => acc + d.aprovadas, 0);
    const totalRejeitadas = approvalTrendData.reduce((acc: number, d) => acc + d.rejeitadas, 0);
    const tempoMedioGeral = approvalTrendData.reduce((acc: number, d) => acc + d.tempoMedio, 0) / approvalTrendData.length;
    const taxaAprovacao = totalAprovacoes > 0 ? (totalAprovadas / totalAprovacoes) * 100 : 0;
    
    return {
      totalAprovacoes,
      totalAprovadas,
      totalRejeitadas,
      tempoMedioGeral,
      taxaAprovacao,
    };
  }, []);

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
            <p className="text-xl sm:text-2xl font-bold text-warning">{approvalStats.pendentes}</p>
          </Card>
          <Card className="p-3 sm:p-4 border-emerald-500/20">
            <p className="text-xs text-muted-foreground truncate">Aprovadas</p>
            <p className="text-xl sm:text-2xl font-bold text-success">{approvalStats.aprovadasMes}</p>
          </Card>
          <Card className="p-3 sm:p-4 border-red-500/20">
            <p className="text-xs text-muted-foreground truncate">Rejeitadas</p>
            <p className="text-xl sm:text-2xl font-bold text-destructive">{approvalStats.rejeitadasMes}</p>
          </Card>
          <Card className="p-3 sm:p-4 border-blue-500/20">
            <p className="text-xs text-muted-foreground truncate">Tempo Médio</p>
            <p className="text-xl sm:text-2xl font-bold text-info">{approvalStats.tempoMedioAprovacao}</p>
          </Card>
          <Card className="p-3 sm:p-4 border-purple-500/20 col-span-2 md:col-span-1">
            <p className="text-xs text-muted-foreground truncate">Escalações</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-600">{approvalStats.escalacoesMes}</p>
          </Card>
        </div>

        <Tabs defaultValue="pendentes" className="space-y-4">
          <TabsList className="w-full grid grid-cols-2 gap-1 h-auto p-1 sm:grid-cols-4">
            <TabsTrigger value="pendentes" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Pendentes</span>
              <Badge variant="secondary" className="ml-1 text-xs">{approvalStats.pendentes}</Badge>
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
                {(allHistory.length > 0 ? (allHistory as ApprovalHistoryItem[]) : (approvalHistory as ApprovalHistoryItem[])).map((item) => (
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
                          item.acao === "Aprovado" || item.acao === "aprovado" ? "default" : 
                          item.acao === "Rejeitado" || item.acao === "rejeitado" ? "destructive" : 
                          item.acao === "escalado_automatico" ? "secondary" :
                          "outline"
                        }
                      >
                        {item.acao === "escalado_automatico" ? "Escalado" : item.acao}
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

            <ApprovalKPIs metrics={metricas} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ApprovalTrendChart data={approvalTrendData} />
              <StatusDistributionChart data={statusDistribution} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BottleneckAnalysis data={bottleneckData} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleErrorBoundary>
  );
};

export default Aprovacoes;
