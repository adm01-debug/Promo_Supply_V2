import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ChevronDown, ChevronRight, CheckCircle2, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlaRow {
  scan_name: string;
  last_run_at: string | null;
  age_minutes: number | null;
  sla_minutes: number | null;
  last_status: string | null;
  health: "ok" | "late" | "critical";
}

interface ResolvedAlert {
  id: string;
  alert_type: string;
  severity: string;
  created_at: string;
  resolved_at: string;
  metadata: Record<string, unknown> | null;
}

interface HistoryRow {
  started_at: string;
  finished_at: string | null;
  status: string | null;
  duration_ms: number | null;
  findings_count: number | null;
}

const healthStyles: Record<string, string> = {
  ok: "bg-green-500/15 text-green-600 border-green-500/30",
  late: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  critical: "bg-destructive/15 text-destructive border-destructive/40",
};

function formatAge(min: number | null): string {
  if (min === null) return "—";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatDateTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "—";
}

async function fetchSla(): Promise<SlaRow[]> {
  const { data, error } = await supabase.rpc("admin_scan_runs_sla_status");
  if (error) throw error;
  return (data ?? []) as SlaRow[];
}

async function fetchRecentlyResolved(): Promise<ResolvedAlert[]> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("system_alerts")
    .select("id, alert_type, severity, created_at, resolved_at, metadata")
    .in("alert_type", ["scan_sla_late", "scan_sla_critical"])
    .not("resolved_at", "is", null)
    .gte("resolved_at", cutoff)
    .order("resolved_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as ResolvedAlert[];
}

async function fetchHistory(scanName: string): Promise<HistoryRow[]> {
  const { data, error } = await supabase
    .from("health_scan_runs")
    .select("started_at, finished_at, status, duration_ms, findings_count")
    .eq("scan_name", scanName)
    .order("started_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as HistoryRow[];
}

function ScannerHistory({ scanName }: { scanName: string }) {
  const query = useQuery({
    queryKey: ["admin", "scan-history", scanName],
    queryFn: () => fetchHistory(scanName),
    staleTime: 60_000,
  });

  if (query.isLoading) return <Skeleton className="h-24 w-full" />;
  if (query.isError)
    return <div className="text-xs text-destructive py-2">Erro: {(query.error as Error).message}</div>;
  if (!query.data?.length)
    return <div className="text-xs text-muted-foreground py-2">Sem histórico registrado.</div>;

  return (
    <div className="rounded-md bg-muted/30 p-3">
      <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <History className="h-3 w-3" aria-hidden /> Últimas 10 execuções
      </div>
      <table className="w-full text-xs">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-1 pr-2">Início</th>
            <th className="py-1 pr-2">Status</th>
            <th className="py-1 pr-2 text-right">Duração</th>
            <th className="py-1 pr-2 text-right">Findings</th>
          </tr>
        </thead>
        <tbody>
          {query.data.map((h, i) => (
            <tr key={`${h.started_at}-${i}`} className="border-t border-border/40">
              <td className="py-1 pr-2 whitespace-nowrap">{formatDateTime(h.started_at)}</td>
              <td className="py-1 pr-2">
                <span
                  className={cn(
                    "font-medium",
                    h.status === "ok" && "text-green-600",
                    (h.status === "failed" || h.status === "error") && "text-destructive",
                  )}
                >
                  {h.status ?? "—"}
                </span>
              </td>
              <td className="py-1 pr-2 text-right text-muted-foreground">
                {h.duration_ms != null ? `${h.duration_ms}ms` : "—"}
              </td>
              <td className="py-1 pr-2 text-right text-muted-foreground">
                {h.findings_count ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResolvedAlertsSection() {
  const query = useQuery({
    queryKey: ["admin", "scan-sla-resolved"],
    queryFn: fetchRecentlyResolved,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  if (query.isLoading) return <Skeleton className="h-20 w-full" />;
  if (query.isError)
    return (
      <div className="text-xs text-destructive py-2">
        Erro ao carregar resolvidos: {(query.error as Error).message}
      </div>
    );
  if (!query.data?.length)
    return (
      <div className="text-xs text-muted-foreground py-2">
        Nenhum alerta de SLA resolvido nas últimas 24h.
      </div>
    );

  return (
    <ul className="space-y-1.5">
      {query.data.map((a) => {
        const scanName = (a.metadata as { scan_name?: string } | null)?.scan_name ?? "—";
        const reason = (a.metadata as { auto_resolved_reason?: string } | null)?.auto_resolved_reason;
        return (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 text-xs rounded-md border border-border/50 bg-muted/20 px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" aria-hidden />
              <span className="font-mono truncate">{scanName}</span>
              <Badge variant="outline" className="text-[10px] uppercase">
                {a.severity}
              </Badge>
              {reason && (
                <span className="text-muted-foreground truncate">· {reason}</span>
              )}
            </div>
            <span className="text-muted-foreground whitespace-nowrap">
              {formatDateTime(a.resolved_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function ScanRunsSlaCard() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["admin", "scan-runs-sla"],
    queryFn: fetchSla,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const rows = [...(query.data ?? [])].sort((a, b) => {
    const order = { critical: 0, late: 1, ok: 2 } as const;
    return order[a.health] - order[b.health];
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          SLA dos jobs de manutenção
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {query.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : query.isError ? (
          <div className="text-sm text-destructive py-4">
            Erro ao carregar SLA: {(query.error as Error).message}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            Nenhum scanner registrado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-3 w-8"></th>
                  <th className="py-2 pr-3">Scanner</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Última exec.</th>
                  <th className="py-2 pr-3 text-right">Idade</th>
                  <th className="py-2 pr-3 text-right">SLA</th>
                  <th className="py-2 pr-3">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isOpen = expanded === r.scan_name;
                  return (
                    <Fragment key={r.scan_name}>
                      <tr className="border-b last:border-0">
                        <td className="py-2 pr-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            aria-label={isOpen ? "Ocultar histórico" : "Ver histórico"}
                            aria-expanded={isOpen}
                            onClick={() => setExpanded(isOpen ? null : r.scan_name)}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" aria-hidden />
                            ) : (
                              <ChevronRight className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">{r.scan_name}</td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className={healthStyles[r.health]}>
                            {r.health.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                          {formatDateTime(r.last_run_at)}
                        </td>
                        <td className="py-2 pr-3 text-right">{formatAge(r.age_minutes)}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">
                          {formatAge(r.sla_minutes)}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{r.last_status ?? "—"}</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={7} className="py-2 pr-3">
                            <ScannerHistory scanName={r.scan_name} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden />
            Resolvidos nas últimas 24h
          </div>
          <ResolvedAlertsSection />
        </div>
      </CardContent>
    </Card>
  );
}
