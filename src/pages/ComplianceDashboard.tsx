import { useState, useEffect } from "react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShieldAlert, AlertTriangle, CheckCircle2, XCircle, TrendingDown,
  TrendingUp, Award, Ban, Star, Package, Clock, BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/feedbackToast";

interface ComplianceData {
  fornecedor_id: string;
  razao_social: string;
  avaliacao: number | null;
  supplier_status: string;
  penalty_count: number;
  total_penalty_value: number;
  total_deliveries: number;
  on_time_deliveries: number;
  late_deliveries: number;
  on_time_rate: number;
  avg_quality_score: number;
  total_inspections: number;
  rejected_count: number;
  active_bonifications: number;
}

interface EscalationRule {
  id: string;
  level: number;
  min_infractions: number;
  max_infractions: number | null;
  action_type: string;
  penalty_multiplier: number;
  block_days: number;
  description: string;
  is_active: boolean;
}

const actionTypeLabels: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  warning: { label: "Advertência", color: "bg-warning/10 text-warning dark:bg-warning/15 dark:text-warning", icon: AlertTriangle },
  standard_fine: { label: "Multa Padrão", color: "bg-warning/10 text-warning dark:bg-warning/15 dark:text-warning", icon: ShieldAlert },
  double_fine: { label: "Multa Dobrada", color: "bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-destructive", icon: ShieldAlert },
  temp_block: { label: "Bloq. Temporário", color: "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300", icon: Ban },
  permanent_block: { label: "Bloq. Permanente", color: "bg-destructive text-destructive-foreground", icon: XCircle },
};

export default function ComplianceDashboard() {
  const [data, setData] = useState<ComplianceData[]>([]);
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("penalties");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [compRes, rulesRes] = await Promise.all([
        supabase.from('supplier_compliance_summary' as any).select('*'),
        supabase.from('penalty_escalation_config' as any).select('*').order('level', { ascending: true }),
      ]);
      setData((compRes.data as any[]) || []);
      setRules((rulesRes.data as any[]) || []);
    } catch (error: unknown) {
      console.error('Error fetching compliance data:', error);
      toast.error("Erro ao carregar dados de compliance");
    } finally {
      setLoading(false);
    }
  };

  const sortedData = [...data].sort((a, b) => {
    switch (sortBy) {
      case "penalties": return b.penalty_count - a.penalty_count;
      case "late": return b.late_deliveries - a.late_deliveries;
      case "quality": return (a.avg_quality_score || 5) - (b.avg_quality_score || 5);
      case "ontime": return a.on_time_rate - b.on_time_rate;
      default: return 0;
    }
  });

  const infractors = data.filter(d => d.penalty_count > 0 || d.late_deliveries > 0 || d.rejected_count > 0);
  const compliant = data.filter(d => d.on_time_rate >= 95 && d.penalty_count === 0);
  const totalPenaltyValue = data.reduce((s, d) => s + Number(d.total_penalty_value), 0);
  const avgOnTimeRate = data.length > 0 ? data.reduce((s, d) => s + Number(d.on_time_rate), 0) / data.length : 0;

  const getComplianceStatus = (item: ComplianceData) => {
    if (item.supplier_status === 'bloqueado') return { label: "Bloqueado", color: "bg-destructive text-destructive-foreground", icon: Ban };
    if (item.penalty_count >= 3) return { label: "Crítico", color: "bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-destructive", icon: XCircle };
    if (item.penalty_count >= 1 || item.late_deliveries > 0) return { label: "Em Risco", color: "bg-warning/10 text-warning dark:bg-warning/15 dark:text-warning", icon: AlertTriangle };
    if (item.on_time_rate >= 95) return { label: "Excelente", color: "bg-success/10 text-success dark:bg-success/15 dark:text-success", icon: CheckCircle2 };
    return { label: "Regular", color: "bg-info/10 text-info dark:bg-info/15 dark:text-info", icon: Clock };
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-primary" />
            Dashboard de Compliance Contratual
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoramento em tempo real de conformidade, infrações e bonificações de fornecedores
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Fornecedores Infratores</p>
                  <p className="text-2xl font-bold text-destructive">{infractors.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Em Conformidade</p>
                  <p className="text-2xl font-bold text-success">{compliant.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-success/10 dark:bg-success/15 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Penalidades</p>
                  <p className="text-2xl font-bold text-destructive">
                    {totalPenaltyValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Taxa Pontualidade</p>
                  <p className="text-2xl font-bold">{avgOnTimeRate.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="ranking" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ranking" className="gap-1">
              <BarChart3 className="w-4 h-4" />
              Ranking de Compliance
            </TabsTrigger>
            <TabsTrigger value="escalation" className="gap-1">
              <TrendingDown className="w-4 h-4" />
              Regras de Escalonamento
            </TabsTrigger>
            <TabsTrigger value="bonifications" className="gap-1">
              <Award className="w-4 h-4" />
              Bonificações
            </TabsTrigger>
          </TabsList>

          {/* Ranking Tab */}
          <TabsContent value="ranking" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="penalties">Mais Penalidades</SelectItem>
                  <SelectItem value="late">Mais Atrasos</SelectItem>
                  <SelectItem value="quality">Menor Qualidade</SelectItem>
                  <SelectItem value="ontime">Menor Pontualidade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table aria-label="Tabela de dados">
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Entregas</TableHead>
                      <TableHead className="text-center">Pontualidade</TableHead>
                      <TableHead className="text-center">Qualidade</TableHead>
                      <TableHead className="text-center">Penalidades</TableHead>
                      <TableHead className="text-right">Valor Multas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((item, idx) => {
                      const status = getComplianceStatus(item);
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={item.fornecedor_id}>
                          <TableCell className="font-bold text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.razao_social}</p>
                              <div className="flex items-center gap-1 mt-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < (item.avaliacao || 0) ? 'text-warning fill-amber-500' : 'text-muted'}`} />
                                ))}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${status.color} flex items-center gap-1 w-fit`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="text-sm">
                              <span className="font-medium">{item.total_deliveries}</span>
                              {item.late_deliveries > 0 && (
                                <span className="text-destructive ml-1">({item.late_deliveries} atrasadas)</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <span className={`text-sm font-bold ${item.on_time_rate >= 90 ? 'text-success' : item.on_time_rate >= 70 ? 'text-warning' : 'text-destructive'}`}>
                                {item.on_time_rate}%
                              </span>
                              <Progress value={item.on_time_rate} className="h-1.5" />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-sm font-bold ${Number(item.avg_quality_score) >= 4 ? 'text-success' : Number(item.avg_quality_score) >= 3 ? 'text-warning' : 'text-destructive'}`}>
                              {Number(item.avg_quality_score).toFixed(1)}/5
                            </span>
                            {item.rejected_count > 0 && (
                              <p className="text-xs text-destructive">{item.rejected_count} rejeitado(s)</p>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.penalty_count > 0 ? (
                              <Badge variant="destructive">{item.penalty_count}</Badge>
                            ) : (
                              <Badge className="bg-success/10 text-success dark:bg-success/15 dark:text-success">0</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-destructive">
                            {Number(item.total_penalty_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {sortedData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          Nenhum fornecedor encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Escalation Rules Tab */}
          <TabsContent value="escalation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                  Regras de Escalonamento Progressivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {rules.map((rule) => {
                    const actionConfig = actionTypeLabels[rule.action_type] || actionTypeLabels.warning;
                    const ActionIcon = actionConfig.icon;
                    return (
                      <div key={rule.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-lg">
                          {rule.level}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{rule.description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={actionConfig.color}>
                              <ActionIcon className="w-3 h-3 mr-1" />
                              {actionConfig.label}
                            </Badge>
                            {rule.penalty_multiplier > 0 && (
                              <Badge variant="outline">Multiplicador: {rule.penalty_multiplier}x</Badge>
                            )}
                            {rule.block_days > 0 && (
                              <Badge variant="destructive">Bloqueio: {rule.block_days} dias</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {rule.min_infractions === rule.max_infractions
                            ? `${rule.min_infractions}ª infração`
                            : rule.max_infractions
                              ? `${rule.min_infractions}ª a ${rule.max_infractions}ª`
                              : `${rule.min_infractions}ª+ infração`
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bonifications Tab */}
          <TabsContent value="bonifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-warning" />
                  Fornecedores Elegíveis para Bonificação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table aria-label="Tabela de dados">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-center">Pontualidade</TableHead>
                      <TableHead className="text-center">Qualidade</TableHead>
                      <TableHead className="text-center">Penalidades</TableHead>
                      <TableHead className="text-center">Elegível</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.filter(d => d.total_deliveries > 0).sort((a, b) => b.on_time_rate - a.on_time_rate).map((item) => {
                      const eligible = item.on_time_rate >= 95 && item.penalty_count === 0 && Number(item.avg_quality_score) >= 4;
                      return (
                        <TableRow key={item.fornecedor_id}>
                          <TableCell className="font-medium">{item.razao_social}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${item.on_time_rate >= 95 ? 'text-success' : 'text-warning'}`}>
                              {item.on_time_rate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${Number(item.avg_quality_score) >= 4 ? 'text-success' : 'text-warning'}`}>
                              {Number(item.avg_quality_score).toFixed(1)}/5
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{item.penalty_count}</TableCell>
                          <TableCell className="text-center">
                            {eligible ? (
                              <Badge className="bg-success/10 text-success dark:bg-success/15 dark:text-success">
                                <Award className="w-3 h-3 mr-1" />
                                Elegível
                              </Badge>
                            ) : (
                              <Badge variant="outline">Não elegível</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {data.filter(d => d.total_deliveries > 0).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum fornecedor com entregas registradas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
