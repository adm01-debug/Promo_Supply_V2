import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Send, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const FiscalDashboard = () => {
  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  const { data: events, isLoading } = useQuery({
    queryKey: ["fiscal-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fiscal_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  /** Agregados reais do mês corrente — substituem os números fixos que existiam aqui. */
  const { data: kpis } = useQuery({
    queryKey: ["fiscal-kpis-mes", monthStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fiscal_events")
        .select("status, created_at, processed_at")
        .gte("created_at", monthStart.toISOString());

      if (error) throw error;

      const autorizadas = data.filter((e) => e.status === "authorized").length;
      const pendentes = data.filter((e) => e.status === "pending").length;
      const erros = data.filter((e) => e.status === "error" || e.status === "denied").length;

      const latencias = data
        .filter((e) => e.processed_at)
        .map((e) => (new Date(e.processed_at as string).getTime() - new Date(e.created_at).getTime()) / 1000)
        .filter((s) => Number.isFinite(s) && s >= 0);

      const latenciaMedia = latencias.length > 0
        ? (latencias.reduce((acc, s) => acc + s, 0) / latencias.length).toFixed(1)
        : null;

      return { autorizadas, pendentes, erros, latenciaMedia };
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "authorized":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Autorizada</Badge>;
      case "error":
      case "denied":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Erro</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-amber-500 border-amber-500"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel Fiscal e-Invoicing</h1>
          <p className="text-muted-foreground">Monitoramento de documentos fiscais eletrônicos (NFe, NFSe, CTe, MDFe)</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1">
            SEFAZ: {kpis && kpis.erros > 0 ? 'Oscilação detectada' : 'Sem erros no mês'}
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            Eventos no mês: {kpis ? kpis.autorizadas + kpis.pendentes + kpis.erros : 0}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NFe Autorizadas (Mês)</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.autorizadas ?? 0}</div>
            <p className="text-xs text-muted-foreground">Eventos com status authorized</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes de Envio</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.pendentes ?? 0}</div>
            <p className="text-xs text-muted-foreground">Aguardando retorno do provedor</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros/Rejeições</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.erros ?? 0}</div>
            <p className="text-xs text-destructive">
              {kpis && kpis.erros > 0 ? 'Ação manual necessária' : 'Nenhuma rejeição no mês'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio Resposta</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis?.latenciaMedia ? `${kpis.latenciaMedia}s` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {kpis?.latenciaMedia ? 'created_at → processed_at' : 'Sem evento processado no mês'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos Eventos Fiscais</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Protocolo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando eventos...</TableCell>
                </TableRow>
              ) : events?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum evento fiscal registrado.</TableCell>
                </TableRow>
              ) : (
                events?.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-xs">
                      {format(new Date(event.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell><Badge variant="outline">{event.type}</Badge></TableCell>
                    <TableCell className="capitalize">{event.action}</TableCell>
                    <TableCell className="font-mono text-xs">{event.protocol || "—"}</TableCell>
                    <TableCell>{getStatusBadge(event.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  
  );
};

export default FiscalDashboard;
