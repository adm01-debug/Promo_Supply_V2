// Onda 40 — Detalhe de um alerta específico com timeline e runbook sugerido.
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BookOpen, Clock, Activity, AlertTriangle } from "lucide-react";
import { getRunbook } from "./alertRunbooks";

interface AlertDetail {
  id: string;
  alert_type: string;
  severity: string;
  message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

interface TimelineEvent {
  id: string;
  action: string;
  actor_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface Related {
  id: string;
  severity: string;
  created_at: string;
  resolved_at: string | null;
}

interface Payload {
  alert: AlertDetail;
  timeline: TimelineEvent[];
  related_same_type: Related[];
}

const SEV_STYLES: Record<string, string> = {
  EMERGENCY: "bg-destructive text-destructive-foreground",
  CRITICAL: "bg-destructive/90 text-destructive-foreground",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-blue-500 text-white",
  INFO: "bg-muted text-muted-foreground",
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge className={SEV_STYLES[severity] ?? "bg-muted text-muted-foreground"}>
      {severity}
    </Badge>
  );
}

export default function AlertDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["health-dashboard", "alert", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<Payload>(
        `health-dashboard?alert_id=${encodeURIComponent(id!)}`,
        { method: "GET" },
      );
      if (error) throw error;
      if (!data) throw new Error("Sem dados");
      return data;
    },
  });

  const runbook = data ? getRunbook(data.alert.alert_type) : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/health")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h1 className="text-2xl font-semibold">Detalhe do alerta</h1>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {error && (
        <Card>
          <CardContent className="p-6 text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Falha ao carregar detalhe: {String((error as Error).message ?? error)}
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-mono text-base">{data.alert.alert_type}</span>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={data.alert.severity} />
                  {data.alert.resolved_at ? (
                    <Badge variant="outline">Resolvido</Badge>
                  ) : (
                    <Badge variant="destructive">Aberto</Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-foreground">{data.alert.message ?? "Sem mensagem."}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-muted-foreground">
                <div>
                  <div className="text-xs uppercase">Criado em</div>
                  <div className="text-foreground">
                    {new Date(data.alert.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase">Resolvido em</div>
                  <div className="text-foreground">
                    {data.alert.resolved_at
                      ? new Date(data.alert.resolved_at).toLocaleString("pt-BR")
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase">Resolvido por</div>
                  <div className="text-foreground font-mono text-xs break-all">
                    {data.alert.resolved_by ?? "—"}
                  </div>
                </div>
              </div>
              {data.alert.metadata && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    Metadata bruto
                  </summary>
                  <pre className="mt-2 p-3 rounded bg-muted text-xs overflow-x-auto">
                    {JSON.stringify(data.alert.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>

          {runbook && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4" /> Runbook: {runbook.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Sintoma</div>
                  <p>{runbook.symptom}</p>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Impacto</div>
                  <p>{runbook.impact}</p>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Passos sugeridos</div>
                  <ol className="list-decimal list-inside space-y-1 mt-1">
                    {runbook.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" /> Timeline ({data.timeline.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum evento de auditoria registrado ainda.
                </p>
              ) : (
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />
                    <div className="text-sm">
                      <div className="font-medium">Alerta criado</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(data.alert.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  </li>
                  {data.timeline.map((ev) => (
                    <li key={ev.id} className="flex gap-3">
                      <div className="w-2 h-2 mt-2 rounded-full bg-muted-foreground shrink-0" />
                      <div className="text-sm">
                        <div className="font-medium">{ev.action}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(ev.created_at).toLocaleString("pt-BR")}
                          {ev.actor_id ? ` • ${ev.actor_id.slice(0, 8)}…` : ""}
                        </div>
                        {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                          <pre className="mt-1 p-2 rounded bg-muted text-xs overflow-x-auto">
                            {JSON.stringify(ev.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {data.related_same_type.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" /> Recentes do mesmo tipo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {data.related_same_type.slice(0, 10).map((r) => (
                    <li key={r.id} className="py-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("pt-BR")}
                      </span>
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={r.severity} />
                        {r.resolved_at ? (
                          <Badge variant="outline">Resolvido</Badge>
                        ) : (
                          <Badge variant="destructive">Aberto</Badge>
                        )}
                        <Link
                          to={`/admin/health/alerts/${r.id}`}
                          className="text-primary hover:underline text-xs"
                        >
                          Abrir
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
