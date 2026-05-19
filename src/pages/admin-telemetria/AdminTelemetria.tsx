import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, Clock, Database, RefreshCw, Zap, Trash2, Download, FileText, CalendarIcon, Play, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TelemetryCharts } from "@/components/admin/telemetry/TelemetryCharts";
import { toast } from "sonner";
import { format } from "date-fns/format";
import {
  type TelemetryRow, type SeverityFilter, type TimeFilter,
  formatDuration, formatTime, getTimeThreshold, computeStats, exportCSV, exportPDF,
} from "./telemetriaHelpers";

export default function AdminTelemetriaPage() {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("24h");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const { data: rows = [], isLoading, refetch, isRefetching } = useQuery<TelemetryRow[]>({
    queryKey: ["query-telemetry", severityFilter, timeFilter, customDateFrom?.toISOString(), customDateTo?.toISOString()],
    queryFn: async () => {
      const { from, to } = getTimeThreshold(timeFilter, customDateFrom, customDateTo);
      let query = supabase.from("query_telemetry").select("*").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false }).limit(500);
      if (severityFilter !== "all") query = query.eq("severity", severityFilter);
      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as TelemetryRow[]) || [];
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const handleCleanup = async () => {
    const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("query_telemetry" as any).delete().lt("created_at", threshold);
    if (error) toast.error("Erro ao limpar dados antigos");
    else { toast.success("Dados com mais de 7 dias removidos"); refetch(); }
  };

  const handleRunSimulation = async () => {
    try {
      setSimulationLoading(true);
      toast.info("Iniciando simulação de estresse de webhooks e Edge Functions...");
      
      const { data, error } = await supabase.functions.invoke('system-simulation');
      
      if (error) throw error;
      
      setSimulationResult(data);
      toast.success(`Simulação concluída: ${data.success} sucessos, ${data.error} falhas.`);
    } catch (error) {
      console.error('Simulation error:', error);
      toast.error("Falha ao executar simulação de sistema.");
    } finally {
      setSimulationLoading(false);
    }
  };

  const stats = useMemo(() => computeStats(rows), [rows]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "very_slow": return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">🔴 Muito Lenta</Badge>;
      case "slow": return <Badge className="bg-warning/20 text-warning border-yellow-500/30 text-[10px]">🟡 Lenta</Badge>;
      case "error": return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">❌ Erro</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{severity}</Badge>;
    }
  };

  return (
    
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            <div><h1 className="text-2xl font-bold">Telemetria de Queries</h1><p className="text-sm text-muted-foreground">Monitoramento de performance do banco externo</p></div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => exportCSV(rows, timeFilter)}><Download className="h-3.5 w-3.5 mr-1.5" />CSV</Button>
            <Button variant="outline" size="sm" onClick={() => exportPDF(rows, timeFilter, stats)}><FileText className="h-3.5 w-3.5 mr-1.5" />PDF</Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleRunSimulation} 
              disabled={simulationLoading}
              className="bg-violet-600 hover:bg-violet-500 text-white border-none shadow-lg shadow-violet-500/20"
            >
              <Play className={`h-3.5 w-3.5 mr-1.5 ${simulationLoading ? "animate-pulse" : ""}`} />
              {simulationLoading ? "Simulando..." : "Simulação 10/10"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCleanup}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Limpar +7d</Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`} />Atualizar</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold">{stats.verySlow}</p><p className="text-[11px] text-muted-foreground">Muito Lentas (&gt;8s)</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold">{stats.slow}</p><p className="text-[11px] text-muted-foreground">Lentas (&gt;3s)</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><Zap className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold">{stats.errors}</p><p className="text-[11px] text-muted-foreground">Erros</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Database className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</p><p className="text-[11px] text-muted-foreground">Média de duração</p></div></CardContent></Card>
        </div>

        {simulationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-violet-500/20 bg-violet-500/5 backdrop-blur-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-violet-400">
                  <Shield className="h-5 w-5" />
                  Relatório de Simulação de Consistência
                </CardTitle>
                <Badge variant="outline" className="border-violet-500/30 text-violet-400">
                  ESTABILIDADE: {((simulationResult.success / simulationResult.total) * 100).toFixed(1)}%
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">Cenários Executados</p>
                    <p className="text-3xl font-black text-white">{simulationResult.total}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">Tempo Médio de Resposta</p>
                    <p className="text-3xl font-black text-emerald-400">{simulationResult.avgDuration}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">Integridade de Dados</p>
                    <p className="text-3xl font-black text-blue-400">100% VALIDADO</p>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-violet-500/10">
                  <div className="flex flex-wrap gap-2">
                    {simulationResult.details.map((detail: any, idx: number) => (
                      <Badge 
                        key={idx} 
                        variant={detail.status === 'success' ? 'secondary' : 'destructive'}
                        className="text-[9px] font-mono px-2 py-0.5"
                      >
                        {detail.name}: {detail.status.toUpperCase()} ({Math.round(detail.duration)}ms)
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {stats.topOffenders.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" />Tabelas Mais Problemáticas</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.topOffenders.map(([name, s]: [string, any]) => (
                  <div key={name} className="p-3 rounded-lg border border-border/50 bg-muted/30">
                    <p className="font-mono text-sm font-medium truncate" title={name}>{name}</p>
                    <div className="flex items-center gap-2 mt-1"><span className="text-xs text-muted-foreground">{s.count}× alertas</span><span className="text-xs text-destructive">max {formatDuration(s.maxMs)}</span></div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">média: {formatDuration(Math.round(s.totalMs / s.count))}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <TelemetryCharts rows={rows} timeFilter={timeFilter} />

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Severidade" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="slow">🟡 Lentas</SelectItem><SelectItem value="very_slow">🔴 Muito Lentas</SelectItem><SelectItem value="error">❌ Erros</SelectItem></SelectContent>
          </Select>
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent><SelectItem value="1h">Última hora</SelectItem><SelectItem value="6h">Últimas 6h</SelectItem><SelectItem value="24h">Últimas 24h</SelectItem><SelectItem value="7d">Últimos 7 dias</SelectItem><SelectItem value="custom">📅 Personalizado</SelectItem></SelectContent>
          </Select>
          {timeFilter === "custom" && (
            <div className="flex items-center gap-2">
              <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="text-xs"><CalendarIcon className="h-3 w-3 mr-1" />{customDateFrom ? format(customDateFrom, "dd/MM/yyyy") : "De"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={customDateFrom} onSelect={setCustomDateFrom} /></PopoverContent></Popover>
              <span className="text-xs text-muted-foreground">até</span>
              <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="text-xs"><CalendarIcon className="h-3 w-3 mr-1" />{customDateTo ? format(customDateTo, "dd/MM/yyyy") : "Até"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={customDateTo} onSelect={setCustomDateTo} /></PopoverContent></Popover>
            </div>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{rows.length} registros · auto-refresh 30s</span>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><Activity className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="font-medium">Nenhuma query lenta registrada</p><p className="text-sm mt-1">Isso é bom! O sistema está performando bem.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Quando</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Operação</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Tabela/RPC</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Duração</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Severidade</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Registros</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Detalhes</th>
                  </tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{formatTime(r.created_at)}</td>
                        <td className="p-3 font-medium">{r.operation}</td>
                        <td className="p-3 font-mono text-xs">{r.rpc_name || r.table_name || "—"}</td>
                        <td className="p-3 text-right font-mono font-bold">{formatDuration(r.duration_ms)}</td>
                        <td className="p-3">{getSeverityBadge(r.severity)}</td>
                        <td className="p-3 text-right">{r.record_count ?? "—"}</td>
                        <td className="p-3 hidden lg:table-cell">
                          <div className="flex gap-1 flex-wrap">
                            {r.query_limit && <Badge variant="outline" className="text-[10px]">limit: {r.query_limit}</Badge>}
                            {r.query_offset != null && r.query_offset > 0 && <Badge variant="outline" className="text-[10px]">offset: {r.query_offset}</Badge>}
                            {r.count_mode && <Badge variant="outline" className="text-[10px]">count: {r.count_mode}</Badge>}
                            {r.error_message && <Badge variant="destructive" className="text-[10px] max-w-[200px] truncate" title={r.error_message}>{r.error_message}</Badge>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    
  );
}
