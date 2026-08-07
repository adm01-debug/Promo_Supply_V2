import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns/format";
import { AlertCircle, Info, AlertTriangle, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type TelemetryLogRow = Database["public"]["Tables"]["telemetry_logs"]["Row"];
type LogLevel = "info" | "warn" | "error" | "debug";

export interface AppLog {
  id: string;
  created_at: string;
  level: LogLevel;
  message: string;
  context: Record<string, unknown> | null;
  request_id: string | null;
  user_id: string | null;
  url: string | null;
  user_agent: string | null;
}

const toLogLevel = (v: unknown): LogLevel => {
  return v === "warn" || v === "error" || v === "debug" ? v : "info";
};

export function AppLogsView() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: logs = [], isLoading } = useQuery<AppLog[]>({
    queryKey: ["app-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("telemetry_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      const rows = (data ?? []) as TelemetryLogRow[];
      return rows.map((r): AppLog => ({
        id: String(r.id),
        created_at: r.created_at ?? new Date().toISOString(),
        level: toLogLevel((r as { level?: unknown }).level),
        message: (r as { message?: string }).message ?? "",
        context: ((r as { context?: unknown }).context ?? null) as Record<string, unknown> | null,
        request_id: (r as { request_id?: string | null }).request_id ?? null,
        user_id: (r as { user_id?: string | null }).user_id ?? null,
        url: (r as { url?: string | null }).url ?? null,
        user_agent: (r as { user_agent?: string | null }).user_agent ?? null,
      }));
    },
    refetchInterval: 10000,
  });


  const getLevelBadge = (level: string) => {
    switch (level) {
      case "error":
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> ERRO</Badge>;
      case "warn":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> AVISO</Badge>;
      case "info":
        return <Badge variant="secondary" className="flex items-center gap-1"><Info className="h-3 w-3" /> INFO</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          Logs da Aplicação (Frontend & Backend)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground italic">
            Nenhum log registrado ainda.
          </div>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <div key={log.id} className="p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getLevelBadge(log.level)}</div>
                    <div>
                      <p className="font-medium text-sm">{log.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}</span>
                        <span>•</span>
                        <span className="font-mono">{log.url}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    {expandedId === log.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                
                {expandedId === log.id && (
                  <div className="mt-3 p-3 bg-muted rounded-md overflow-x-auto">
                    <pre className="text-[10px] font-mono whitespace-pre-wrap">
                      {JSON.stringify({
                        context: log.context,
                        requestId: log.request_id,
                        userId: log.user_id,
                        userAgent: log.user_agent
                      }, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
