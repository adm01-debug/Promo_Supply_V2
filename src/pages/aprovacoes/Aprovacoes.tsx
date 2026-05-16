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
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Users,
  Timer,
  Target
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  TooltipProps,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

import {
  approvalHistory,
  approvalStats,
  approvalTrendData,
  approvalByValueRange,
  approvalByApprover,
  bottleneckData,
  statusDistribution,
  weeklyTrend,
  COLORS,
} from './aprovacoesData';

const Aprovacoes = () => {
  const [periodo, setPeriodo] = useState("6m");
  const { allHistory, fetchAllHistory, workflows, checkEscalations } = useApprovalWorkflow();

  // Check escalations periodically
  useEffect(() => {
    checkEscalations();
    const interval = setInterval(() => {
      checkEscalations();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(interval);
  }, [checkEscalations]);

  // Fetch approval history
  useEffect(() => {
    fetchAllHistory();
  }, [fetchAllHistory]);

  interface PayloadEntry {
    name: string;
    value: number | string;
    color: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{label}</p>
          {(payload as PayloadEntry[]).map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{String(entry.name).includes('Tempo') ? 'h' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Cálculo de métricas agregadas
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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Aprovações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie aprovações pendentes, configure regras e delegações
          </p>
        </div>

        {/* Stats Cards */}
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

        {/* Tabs */}
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
                {(allHistory.length > 0 ? (allHistory as any[]) : approvalHistory).map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-mono text-sm">{(item as any).solicitacao || (item as any).solicitacao_id?.substring(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {(item as any).valor ? `R$ ${(item as any).valor.toLocaleString('pt-BR')}` : (item as any).acao}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant={
                          (item as any).acao === "Aprovado" || (item as any).acao === "aprovado" ? "default" : 
                          (item as any).acao === "Rejeitado" || (item as any).acao === "rejeitado" ? "destructive" : 
                          (item as any).acao === "escalado_automatico" ? "secondary" :
                          "outline"
                        }
                      >
                        {(item as any).acao === "escalado_automatico" ? "Escalado" : (item as any).acao}
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm">{(item as any).por || (item as any).usuario_nome || "Sistema"}</p>
                        <p className="text-xs text-muted-foreground">
                          {(item as any).data || ((item as any).created_at ? new Date((item as any).created_at).toLocaleString('pt-BR') : '')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {allHistory.length === 0 && approvalHistory.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum histórico de aprovação encontrado.
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="metricas" className="space-y-6">
            {/* Header de Métricas */}
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

            {/* KPIs Principais */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{metricas.taxaAprovacao.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Taxa de Aprovação</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-success">
                  <ArrowUpRight className="w-3 h-3" />
                  +2.3% vs período anterior
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Timer className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{metricas.tempoMedioGeral.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Tempo Médio</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-success">
                  <TrendingDown className="w-3 h-3" />
                  -0.8h vs período anterior
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{metricas.totalAprovadas}</p>
                    <p className="text-xs text-muted-foreground">Total Aprovadas</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <XCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{metricas.totalRejeitadas}</p>
                    <p className="text-xs text-muted-foreground">Total Rejeitadas</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Gráficos Principais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tendência de Aprovações */}
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Tendência de Aprovações
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={approvalTrendData}>
                    <defs>
                      <linearGradient id="colorAprovadas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRejeitadas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="aprovadas" name="Aprovadas" stroke="#10b981" fill="url(#colorAprovadas)" strokeWidth={2} />
                    <Area type="monotone" dataKey="rejeitadas" name="Rejeitadas" stroke="#ef4444" fill="url(#colorRejeitadas)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Distribuição por Status */}
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Distribuição por Status
                </h3>
                <div className="flex items-center">
                  <ResponsiveContainer width="50%" height={220}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {statusDistribution.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Gargalos e Tempo por Faixa */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Análise de Gargalos */}
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Análise de Gargalos
                </h3>
                <div className="space-y-4">
                  {bottleneckData.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground">{item.etapa}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{item.tempo}h média</span>
                          <Badge variant="outline" className="text-xs">{item.percentual}%</Badge>
                        </div>
                      </div>
                      <Progress value={item.percentual} className="h-2" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Principal gargalo: <span className="text-warning font-medium">Aguardando Aprovador</span> representa 42% do tempo total
                </p>
              </Card>

              {/* Tempo por Faixa de Valor */}
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-info" />
                  Tempo por Faixa de Valor
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={approvalByValueRange} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis type="category" dataKey="faixa" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="tempoMedio" name="Tempo Médio (h)" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">
                  Valores acima de R$25K levam em média 3x mais tempo para aprovação
                </p>
              </Card>
            </div>

            {/* Performance por Aprovador */}
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Performance por Aprovador
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {approvalByApprover.map((aprovador, idx) => {
                  const taxaAprov = (aprovador.aprovadas / (aprovador.aprovadas + aprovador.rejeitadas)) * 100;
                  return (
                    <Card key={idx} className="p-4 bg-muted/30">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {aprovador.nome.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{aprovador.nome}</p>
                          <p className="text-xs text-muted-foreground">{aprovador.aprovadas + aprovador.rejeitadas} decisões</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Taxa de Aprovação</span>
                          <span className="font-medium text-success">{taxaAprov.toFixed(0)}%</span>
                        </div>
                        <Progress value={taxaAprov} className="h-1.5" />
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Tempo Médio</span>
                          <span className="font-medium">{aprovador.tempoMedio}h</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>

            {/* Tendência Semanal */}
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Volume Semanal de Aprovações
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dia" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantidade" name="Aprovações" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Terça-feira é o dia com maior volume de aprovações. Sexta-feira tem o maior tempo médio de resposta.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
    </ModuleErrorBoundary>
  );
};

export default Aprovacoes;
