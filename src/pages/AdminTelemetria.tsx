import { useState } from "react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, Clock, Database, RefreshCw, Zap, Trash2, Download, FileText, CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TelemetryCharts } from "@/components/admin/telemetry/TelemetryCharts";
import { toast } from "sonner";
import { format } from "date-fns";

interface TelemetryRow {
  id: string;
  operation: string;
  table_name: string | null;
  rpc_name: string | null;
  duration_ms: number;
  record_count: number | null;
  query_limit: number | null;
  query_offset: number | null;
  count_mode: string | null;
  severity: string;
  error_message: string | null;
  user_id: string | null;
  created_at: string;
}

type SeverityFilter = "all" | "slow" | "very_slow" | "error";
type TimeFilter = "1h" | "6h" | "24h" | "7d" | "custom";

export default function AdminTelemetriaPage() {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("24h");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();

  const getTimeThreshold = (): { from: string; to: string } => {
    const now = new Date();
    const to = now.toISOString();
    if (timeFilter === "custom" && customDateFrom) {
      const fromDate = new Date(customDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = customDateTo ? new Date(customDateTo) : new Date();
      toDate.setHours(23, 59, 59, 999);
      return { from: fromDate.toISOString(), to: toDate.toISOString() };
    }
    const offsets: Record<string, number> = {
      "1h": 3600000,
      "6h": 21600000,
      "24h": 86400000,
      "7d": 604800000,
    };
    return {
      from: new Date(now.getTime() - (offsets[timeFilter] || 86400000)).toISOString(),
      to,
    };
  };

  const { data: rows = [], isLoading, refetch, isRefetching } = useQuery<TelemetryRow[]>({
    queryKey: ["query-telemetry", severityFilter, timeFilter, customDateFrom?.toISOString(), customDateTo?.toISOString()],
    queryFn: async () => {
      const { from, to } = getTimeThreshold();
      let query = supabase
        .from("query_telemetry")
        .select("*")
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false })
        .limit(500);

      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as TelemetryRow[]) || [];
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const handleCleanup = async () => {
    const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("query_telemetry" as any)
      .delete()
      .lt("created_at", threshold);
    if (error) {
      toast.error("Erro ao limpar dados antigos");
    } else {
      toast.success("Dados com mais de 7 dias removidos");
      refetch();
    }
  };

  // === EXPORT CSV ===
  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    const headers = [
      "Data/Hora", "Operação", "Tabela/RPC", "Duração (ms)", "Severidade",
      "Registros", "Limit", "Offset", "Count Mode", "Erro"
    ];
    const csvRows = rows.map(r => [
      new Date(r.created_at).toLocaleString("pt-BR"),
      r.operation,
      r.table_name || r.rpc_name || "-",
      String(r.duration_ms),
      r.severity,
      r.record_count != null ? String(r.record_count) : "-",
      r.query_limit != null ? String(r.query_limit) : "-",
      r.query_offset != null ? String(r.query_offset) : "-",
      r.count_mode ?? "-",
      (r.error_message || "").replace(/"/g, '""'),
    ]);
    const escapeCSV = (v: string) =>
      v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v}"` : v;
    const content = [headers.map(escapeCSV).join(";"), ...csvRows.map(r => r.map(escapeCSV).join(";"))].join("\r\n");
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `telemetria_${format(new Date(), "yyyy-MM-dd")}_${timeFilter}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} registros exportados para CSV`);
  };

  // === EXPORT PDF ===
  const handleExportPDF = async () => {
    if (rows.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const now = new Date();

      doc.setFontSize(16);
      doc.text("Telemetria de Queries", 14, 15);
      doc.setFontSize(9);
      doc.text(
        `Exportado em ${now.toLocaleString("pt-BR")} · Período: ${timeFilter} · Filtro: ${severityFilter}`,
        14,
        22
      );
      doc.text(
        `Total: ${rows.length} registros | Muito Lentas: ${verySlow} | Lentas: ${slow} | Erros: ${errors} | Média: ${formatDuration(avgDuration)}`,
        14,
        27
      );

      const headers = ["Data/Hora", "Operação", "Tabela/RPC", "Duração", "Severidade", "Registros", "Erro"];
      const body = rows.map(r => [
        formatTime(r.created_at),
        r.operation,
        r.rpc_name || r.table_name || "-",
        formatDuration(r.duration_ms),
        r.severity === "very_slow" ? "Muito Lenta" : r.severity === "slow" ? "Lenta" : r.severity === "error" ? "Erro" : r.severity,
        r.record_count != null ? String(r.record_count) : "-",
        (r.error_message || "-").substring(0, 60),
      ]);

      autoTable(doc, {
        head: [headers],
        body,
        startY: 32,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [41, 37, 36], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 244] },
      });

      doc.save(`telemetria_${format(now, "yyyy-MM-dd")}_${timeFilter}.pdf`);
      toast.success("PDF exportado com sucesso");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Erro ao gerar PDF");
    }
  };

  // Stats
  const verySlow = rows.filter(r => r.severity === "very_slow").length;
  const slow = rows.filter(r => r.severity === "slow").length;
  const errors = rows.filter(r => r.severity === "error").length;
  const avgDuration = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.duration_ms, 0) / rows.length) : 0;

  // Top offenders
  const tableStats = new Map<string, { count: number; totalMs: number; maxMs: number }>();
  for (const r of rows) {
    const key = r.rpc_name || r.table_name || "unknown";
    const prev = tableStats.get(key) || { count: 0, totalMs: 0, maxMs: 0 };
    tableStats.set(key, {
      count: prev.count + 1,
      totalMs: prev.totalMs + r.duration_ms,
      maxMs: Math.max(prev.maxMs, r.duration_ms),
    });
  }
  const topOffenders = [...tableStats.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  const formatDuration = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString("pt-BR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      day: "2-digit", month: "2-digit",
    });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "very_slow":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">🔴 Muito Lenta</Badge>;
      case "slow":
        return <Badge className="bg-warning/20 text-warning border-yellow-500/30 text-[10px]">🟡 Lenta</Badge>;
      case "error":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">❌ Erro</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{severity}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Telemetria de Queries</h1>
              <p className="text-sm text-muted-foreground">Monitoramento de performance do banco externo</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleCleanup}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Limpar +7d
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{verySlow}</p>
                <p className="text-[11px] text-muted-foreground">Muito Lentas (&gt;8s)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{slow}</p>
                <p className="text-[11px] text-muted-foreground">Lentas (&gt;3s)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Zap className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{errors}</p>
                <p className="text-[11px] text-muted-foreground">Erros</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatDuration(avgDuration)}</p>
                <p className="text-[11px] text-muted-foreground">Média de duração</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Offenders */}
        {topOffenders.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Tabelas Mais Problemáticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {topOffenders.map(([name, stats]) => (
                  <div key={name} className="p-3 rounded-lg border border-border/50 bg-muted/30">
                    <p className="font-mono text-sm font-medium truncate" title={name}>{name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{stats.count}× alertas</span>
                      <span className="text-xs text-destructive">max {formatDuration(stats.maxMs)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      média: {formatDuration(Math.round(stats.totalMs / stats.count))}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <TelemetryCharts rows={rows} timeFilter={timeFilter} />

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="slow">🟡 Lentas</SelectItem>
              <SelectItem value="very_slow">🔴 Muito Lentas</SelectItem>
              <SelectItem value="error">❌ Erros</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Última hora</SelectItem>
              <SelectItem value="6h">Últimas 6h</SelectItem>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="custom">📅 Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom date range */}
          {timeFilter === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {customDateFrom ? format(customDateFrom, "dd/MM/yyyy") : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customDateFrom} onSelect={setCustomDateFrom} />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {customDateTo ? format(customDateTo, "dd/MM/yyyy") : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customDateTo} onSelect={setCustomDateTo} />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <span className="text-xs text-muted-foreground ml-auto">
            {rows.length} registros · auto-refresh 30s
          </span>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma query lenta registrada</p>
                <p className="text-sm mt-1">Isso é bom! O sistema está performando bem.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Quando</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Operação</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Tabela/RPC</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Duração</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Records</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Limit</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Offset</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Count</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Severidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                          {formatTime(row.created_at)}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {row.operation}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-xs font-medium">
                          {row.rpc_name || row.table_name || "-"}
                        </td>
                        <td className="p-3 text-right font-mono font-bold tabular-nums">
                          <span className={row.duration_ms >= 8000 ? "text-destructive" : row.duration_ms >= 3000 ? "text-warning" : ""}>
                            {formatDuration(row.duration_ms)}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-xs tabular-nums">
                          {row.record_count ?? "-"}
                        </td>
                        <td className="p-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                          {row.query_limit ?? "-"}
                        </td>
                        <td className="p-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                          {row.query_offset ?? "-"}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {row.count_mode || "-"}
                        </td>
                        <td className="p-3">
                          {getSeverityBadge(row.severity)}
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
    </MainLayout>
  );
}
