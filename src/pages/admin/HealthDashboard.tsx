import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Activity, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

type SeverityCounts = Record<string, number>;

interface OverviewRow {
  alert_type: string;
  severity: string;
  open_count: number;
  last_1h: number;
  last_24h: number;
  oldest_open_at: string | null;
  newest_open_at: string | null;
}

interface RunRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  ok_count: number;
  failed_count: number;
  results: unknown;
}

interface TimeseriesRow {
  day: string;
  EMERGENCY?: number;
  CRITICAL?: number;
  HIGH?: number;
  MEDIUM?: number;
  LOW?: number;
  INFO?: number;
}

interface DashboardResponse {
  generated_at: string;
  open_alerts_by_type: OverviewRow[];
  last_runs: RunRow[];
  severity_counts_24h: SeverityCounts;
  severity_timeseries_7d?: TimeseriesRow[];
}

const severityColors: Record<string, string> = {
  EMERGENCY: "hsl(var(--destructive))",
  CRITICAL: "#dc2626",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#3b82f6",
  INFO: "hsl(var(--muted-foreground))",
};

const severityStyles: Record<string, string> = {
  EMERGENCY: "bg-destructive text-destructive-foreground",
  CRITICAL: "bg-destructive/90 text-destructive-foreground",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-blue-500 text-white",
  INFO: "bg-muted text-muted-foreground",
};

function SeverityBadge({ severity }: { severity: string }) {
  const cls = severityStyles[severity] ?? "bg-muted text-muted-foreground";
  return <Badge className={cls}>{severity}</Badge>;
}

async function fetchHealth(): Promise<DashboardResponse> {
  const { data, error } = await supabase.functions.invoke<DashboardResponse>("health-dashboard", {
    method: "GET",
  });
  if (error) throw error;
  if (!data) throw new Error("Resposta vazia do endpoint");
  return data;
}

export default function HealthDashboard() {
  const query = useQuery({
    queryKey: ["admin", "health-dashboard"],
    queryFn: fetchHealth,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const handleRefresh = async () => {
    await query.refetch();
    toast.success("Dashboard atualizado");
  };

  const data = query.data;
  const severities = data?.severity_counts_24h ?? {};
  const totalOpen = data?.open_alerts_by_type.reduce((acc, r) => acc + r.open_count, 0) ?? 0;

  useEffect(() => {
    document.title = "Saúde do Sistema | Admin";
  }, []);

  // Realtime push para novos alertas críticos
  useEffect(() => {
    const channel = supabase
      .channel("system_alerts_admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_alerts" },
        (payload) => {
          const row = payload.new as { severity?: string; alert_type?: string; message?: string };
          const sev = (row.severity ?? "INFO").toUpperCase();
          if (sev === "CRITICAL" || sev === "EMERGENCY") {
            toast.error(`🚨 ${sev}: ${row.alert_type ?? "alerta"}`, {
              description: row.message ?? "Novo alerta crítico recebido",
              duration: 10_000,
            });
          }
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>


      <div className="container mx-auto p-6 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" aria-hidden />
              Saúde do Banco de Dados
            </h1>
            <p className="text-sm text-muted-foreground">
              Consolidação em tempo real dos 20+ scanners automatizados.
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={query.isFetching} size="sm" variant="outline" aria-label="Atualizar dashboard">
            <RefreshCw className={`h-4 w-4 mr-2 ${query.isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </header>

        {query.isError && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-destructive text-sm">
              Erro ao carregar dashboard: {(query.error as Error).message}
            </CardContent>
          </Card>
        )}

        {/* Severity summary 24h */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {query.isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            : ["EMERGENCY", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map((sev) => (
                <Card key={sev}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">{sev} · 24h</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{severities[sev] ?? 0}</div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Timeseries 7 dias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" aria-hidden />
              Alertas por severidade · últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (data?.severity_timeseries_7d?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Sem dados no período.</div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.severity_timeseries_7d ?? []} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="day"
                      tickFormatter={(v: string) => new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={(v: string) => new Date(v).toLocaleDateString("pt-BR")}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {["EMERGENCY", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map((sev) => (
                      <Line
                        key={sev}
                        type="monotone"
                        dataKey={sev}
                        stroke={severityColors[sev]}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>



        {/* Alerts by type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Alertas abertos por tipo ({totalOpen})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : data?.open_alerts_by_type.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden />
                Nenhum alerta aberto no momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 pr-4">Tipo</th>
                      <th className="py-2 pr-4">Severidade</th>
                      <th className="py-2 pr-4 text-right">Abertos</th>
                      <th className="py-2 pr-4 text-right">1h</th>
                      <th className="py-2 pr-4 text-right">24h</th>
                      <th className="py-2 pr-4">Mais antigo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.open_alerts_by_type.map((row, idx) => (
                      <tr key={`${row.alert_type}-${row.severity}-${idx}`} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">{row.alert_type}</td>
                        <td className="py-2 pr-4"><SeverityBadge severity={row.severity} /></td>
                        <td className="py-2 pr-4 text-right font-semibold">{row.open_count}</td>
                        <td className="py-2 pr-4 text-right">{row.last_1h}</td>
                        <td className="py-2 pr-4 text-right">{row.last_24h}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {row.oldest_open_at ? new Date(row.oldest_open_at).toLocaleString("pt-BR") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last runs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden />
              Últimas execuções do orquestrador
            </CardTitle>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 pr-4">Início</th>
                      <th className="py-2 pr-4 text-right">Duração</th>
                      <th className="py-2 pr-4 text-right">OK</th>
                      <th className="py-2 pr-4 text-right">Falhas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.last_runs.map((run) => (
                      <tr key={run.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-muted-foreground">
                          {new Date(run.started_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="py-2 pr-4 text-right">{run.duration_ms ?? "—"} ms</td>
                        <td className="py-2 pr-4 text-right text-green-600 font-semibold">{run.ok_count}</td>
                        <td className={`py-2 pr-4 text-right font-semibold ${run.failed_count > 0 ? "text-destructive" : ""}`}>
                          {run.failed_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {data?.generated_at && (
          <p className="text-xs text-muted-foreground text-right">
            Gerado em {new Date(data.generated_at).toLocaleString("pt-BR")}
          </p>
        )}
      </div>
    </>
  );
}
