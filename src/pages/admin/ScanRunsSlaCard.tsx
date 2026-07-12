import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck } from "lucide-react";

interface SlaRow {
  scan_name: string;
  last_run_at: string | null;
  age_minutes: number | null;
  sla_minutes: number | null;
  last_status: string | null;
  health: "ok" | "late" | "critical";
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

async function fetchSla(): Promise<SlaRow[]> {
  const { data, error } = await supabase.rpc("admin_scan_runs_sla_status");
  if (error) throw error;
  return (data ?? []) as SlaRow[];
}

export default function ScanRunsSlaCard() {
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
      <CardContent>
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
                  <th className="py-2 pr-3">Scanner</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Última exec.</th>
                  <th className="py-2 pr-3 text-right">Idade</th>
                  <th className="py-2 pr-3 text-right">SLA</th>
                  <th className="py-2 pr-3">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.scan_name} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs">{r.scan_name}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline" className={healthStyles[r.health]}>
                        {r.health.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                      {r.last_run_at ? new Date(r.last_run_at).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="py-2 pr-3 text-right">{formatAge(r.age_minutes)}</td>
                    <td className="py-2 pr-3 text-right text-muted-foreground">
                      {formatAge(r.sla_minutes)}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.last_status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
