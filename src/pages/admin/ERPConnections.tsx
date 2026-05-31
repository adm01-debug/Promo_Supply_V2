import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { 
  Database, 
  Plus, 
  Settings2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  History,
  ExternalLink,
  ArrowRightLeft
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/feedbackToast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth";
import { cn } from "@/lib/utils";

const ERPConnections = () => {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();

  const { data: connections, isLoading } = useQuery({
    queryKey: ['erp-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_connections')
        .select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: logs } = useQuery({
    queryKey: ['erp-sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  const syncMutation = useMutation({
    mutationFn: async ({ connectionId, entity }: { connectionId: string, entity: string }) => {
      if (!organizationId) throw new Error("ID da organização não encontrado");
      
      const { data, error } = await supabase.functions.invoke('erp-sync', {
        body: { action: 'pull', connectionId, entity },
        headers: { 'x-tenant-id': organizationId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Sincronização iniciada com sucesso");
      queryClient.invalidateQueries({ queryKey: ['erp-sync-logs'] });
    },
    onError: (error: any) => {
      toast.error("Erro ao sincronizar: " + error.message);
    }
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <ArrowRightLeft className="h-8 w-8 text-primary" />
            CONECTORES ERP
          </h1>
          <p className="text-muted-foreground mt-1">
            Integração nativa com SAP S/4HANA, TOTVS (Protheus/Datasul) e Oracle Procurement.
          </p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Configurar Nova Conexão
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Connections */}
        <Card className="lg:col-span-2 shadow-xl border-primary/10">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Conexões Ativas</CardTitle>
                <CardDescription>Status em tempo real dos seus conectores enterprise.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {connections?.length || 0} Integrados
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="pl-6">ERP / Sistema</TableHead>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Última Sinc.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12">Carregando conexões...</TableCell></TableRow>
                ) : connections?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Database className="h-12 w-12 opacity-20" />
                        <p>Nenhuma integração ERP configurada.</p>
                        <Button variant="outline" size="sm">Documentação de API</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : connections?.map((conn) => (
                  <TableRow key={conn.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Database className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm uppercase">{conn.erp_type.replace('_', ' ')}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{conn.base_url}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold">{conn.auth_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString('pt-BR') : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", conn.is_active ? "bg-success animate-pulse" : "bg-muted")} />
                        <span className="text-xs font-medium">{conn.is_active ? 'Online' : 'Offline'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8"
                        onClick={() => syncMutation.mutate({ connectionId: conn.id, entity: 'fornecedor' })}
                        disabled={syncMutation.isPending}
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5 mr-2", syncMutation.isPending && "animate-spin")} />
                        Sync Forn.
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sync History / Recent Logs */}
        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Atividade Recente</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {logs?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem logs de integração.</p>
                ) : logs?.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase truncate">{log.entity}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {log.duration_ms}ms
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {log.direction === 'inbound' ? 'ERP → Promo Supply' : 'Promo Supply → ERP'}
                      </p>
                      {log.error_message && (
                        <p className="text-[10px] text-destructive bg-destructive/5 p-1 rounded mt-1 truncate">
                          {log.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full text-xs text-primary" size="sm">
                  Ver Log Completo <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Settings2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold">Mapeamento Dinâmico</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure campos customizados e transformações de dados sem escrever uma linha de código.
              </p>
              <Button size="sm" className="w-full">Configurar Campos</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ERPConnections;
