import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MainLayout } from "@/components/compras/MainLayout";
import { ApprovalMatrixConfig } from "@/components/compras/ApprovalMatrixConfig";
import { PendingApprovalsPanel } from "@/components/compras/PendingApprovalsPanel";
import { 
  ClipboardCheck, 
  Settings, 
  History,
  BarChart3
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock approval history
const approvalHistory = [
  { 
    id: "1", 
    solicitacao: "SOL-2024-150", 
    valor: 12500, 
    acao: "Aprovado",
    por: "Você",
    data: "2024-12-15 14:30"
  },
  { 
    id: "2", 
    solicitacao: "SOL-2024-148", 
    valor: 8200, 
    acao: "Aprovado",
    por: "Você",
    data: "2024-12-14 10:15"
  },
  { 
    id: "3", 
    solicitacao: "SOL-2024-145", 
    valor: 3500, 
    acao: "Rejeitado",
    por: "Você",
    data: "2024-12-13 16:45"
  },
  { 
    id: "4", 
    solicitacao: "SOL-2024-142", 
    valor: 45000, 
    acao: "Escalado",
    por: "Sistema",
    data: "2024-12-12 09:00"
  },
];

// Mock stats
const approvalStats = {
  pendentes: 3,
  aprovadasMes: 28,
  rejeitadasMes: 2,
  tempoMedioAprovacao: "4.2h",
  escalacoesMes: 1,
};

const Aprovacoes = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Aprovações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie aprovações pendentes, configure regras e delegações
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 border-amber-500/20">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-amber-600">{approvalStats.pendentes}</p>
          </Card>
          <Card className="p-4 border-emerald-500/20">
            <p className="text-xs text-muted-foreground">Aprovadas (mês)</p>
            <p className="text-2xl font-bold text-emerald-600">{approvalStats.aprovadasMes}</p>
          </Card>
          <Card className="p-4 border-red-500/20">
            <p className="text-xs text-muted-foreground">Rejeitadas (mês)</p>
            <p className="text-2xl font-bold text-red-500">{approvalStats.rejeitadasMes}</p>
          </Card>
          <Card className="p-4 border-blue-500/20">
            <p className="text-xs text-muted-foreground">Tempo Médio</p>
            <p className="text-2xl font-bold text-blue-600">{approvalStats.tempoMedioAprovacao}</p>
          </Card>
          <Card className="p-4 border-purple-500/20">
            <p className="text-xs text-muted-foreground">Escalações (mês)</p>
            <p className="text-2xl font-bold text-purple-600">{approvalStats.escalacoesMes}</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pendentes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pendentes" className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Pendentes
              <Badge variant="secondary" className="ml-1">{approvalStats.pendentes}</Badge>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="metricas" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Métricas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes">
            <PendingApprovalsPanel />
          </TabsContent>

          <TabsContent value="config">
            <ApprovalMatrixConfig />
          </TabsContent>

          <TabsContent value="historico">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Histórico de Aprovações
              </h2>
              <div className="space-y-3">
                {approvalHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-mono text-sm">{item.solicitacao}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {item.valor.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant={
                          item.acao === "Aprovado" ? "default" : 
                          item.acao === "Rejeitado" ? "destructive" : 
                          "secondary"
                        }
                      >
                        {item.acao}
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm">{item.por}</p>
                        <p className="text-xs text-muted-foreground">{item.data}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="metricas">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Métricas de Aprovação
              </h2>
              <p className="text-muted-foreground text-center py-8">
                Gráficos e métricas detalhadas em desenvolvimento
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Aprovacoes;
