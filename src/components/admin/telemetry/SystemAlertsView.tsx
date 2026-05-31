import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns/format";
import { Bell, AlertCircle, AlertTriangle, ShieldCheck, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/feedbackToast";

export interface SystemAlert {
  id: string;
  created_at: string;
  tenant_id: string;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  metadata: any;
  resolved_at: string | null;
  resolved_by: string | null;
}

export function SystemAlertsView() {
  const { data: alerts = [], isLoading, refetch } = useQuery<SystemAlert[]>({
    queryKey: ["system-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data as unknown) as SystemAlert[];
    },
    refetchInterval: 15000,
  });

  const handleResolve = async (id: string) => {
    const { error } = await supabase
      .from("system_alerts")
      .update({ 
        resolved_at: new Date().toISOString(),
        // resolved_by: (await supabase.auth.getUser()).data.user?.id 
      })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao resolver alerta");
    } else {
      toast.success("Alerta resolvido");
      refetch();
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <Badge className="bg-red-600 text-white animate-pulse">CRÍTICO</Badge>;
      case "HIGH":
        return <Badge variant="destructive">ALTO</Badge>;
      case "MEDIUM":
        return <Badge className="bg-yellow-500 text-white">MÉDIO</Badge>;
      default:
        return <Badge variant="secondary">BAIXO</Badge>;
    }
  };

  return (
    <Card className="border-red-500/10 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-red-500" />
          Alertas Ativos & Incidentes
        </CardTitle>
        <Badge variant="outline" className="font-mono">
          {alerts.filter(a => !a.resolved_at).length} pendentes
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-10 w-10 text-emerald-500 opacity-50" />
            <p className="font-medium">Sistema saudável. Nenhum alerta registrado.</p>
          </div>
        ) : (
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 transition-colors ${alert.resolved_at ? 'bg-muted/20 opacity-60' : 'bg-background hover:bg-muted/30'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(alert.severity)}
                      <span className="font-mono text-[10px] text-muted-foreground">{alert.alert_type}</span>
                    </div>
                    <p className="text-sm font-semibold">{alert.message}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(alert.created_at), "dd/MM HH:mm")}
                      </div>
                      {alert.tenant_id && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          ID: {alert.tenant_id.slice(0, 8)}...
                        </div>
                      )}
                      {alert.resolved_at && (
                        <div className="text-emerald-500 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Resolvido em {format(new Date(alert.resolved_at), "dd/MM HH:mm")}
                        </div>
                      )}
                    </div>
                  </div>
                  {!alert.resolved_at && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-xs hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                      onClick={() => handleResolve(alert.id)}
                    >
                      Resolver
                    </Button>
                  )}
                </div>
                {alert.metadata && Object.keys(alert.metadata).length > 0 && !alert.resolved_at && (
                  <div className="mt-3 p-2 bg-muted/50 rounded text-[10px] font-mono whitespace-pre-wrap border border-border/50">
                    {JSON.stringify(alert.metadata, null, 2)}
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
