import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, ShieldAlert, RefreshCw, Lock, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchRlsAuditReport } from "@/services/rlsAuditService";

type SeverityFilter = "all" | "CRITICAL" | "INFO" | "OK";

export const RlsCompliancePanel = () => {
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["rls-audit-report"],
    queryFn: fetchRlsAuditReport,
    staleTime: 5 * 60 * 1000,
  });

  const entries = useMemo(() => {
    if (!data?.compliance_report) return [];
    return data.compliance_report.filter((e) => {
      if (filter !== "all" && e.severity !== filter) return false;
      if (search && !`${e.table} ${e.policy}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, filter, search]);

  const severityBadge = (severity: string) => {
    if (severity === "CRITICAL") return <Badge variant="destructive">CRITICAL</Badge>;
    if (severity === "INFO") return <Badge variant="outline">INFO</Badge>;
    return <Badge variant="secondary">OK</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Compliance RLS</CardTitle>
          <CardDescription>Auditoria das políticas de segurança linha a linha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" /> Compliance RLS</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Falha ao executar auditoria</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : String(error)} — é exibido somente para administradores.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const nonCompliant = data!.overall_status === "NON_COMPLIANT";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            {nonCompliant ? <ShieldAlert className="h-5 w-5 text-destructive" /> : <ShieldCheck className="h-5 w-5 text-green-500" />}
            Compliance RLS
          </CardTitle>
          <CardDescription>
            {data!.total_policies} políticas auditadas · {data!.critical_findings} críticas · {new Date(data!.timestamp).toLocaleString("pt-BR")}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefetching ? "animate-spin" : ""}`} />
          Reauditar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {nonCompliant && (
          <Alert variant={data!.critical_findings > 0 ? "destructive" : "default"}>
            <AlertTitle>{data!.critical_findings > 0 ? "Ação necessária" : "Atenção"}</AlertTitle>
            <AlertDescription>
              {data!.remediation_required.length > 0
                ? `Corrigir: ${data!.remediation_required.join("; ")}`
                : "Nenhuma política crítica, mas há ressalvas de acesso global."}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por tabela ou política..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "CRITICAL", "INFO", "OK"] as SeverityFilter[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Todas" : f}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tabela</TableHead>
                <TableHead>Política</TableHead>
                <TableHead>Comando</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Isolamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    Nenhuma política corresponde aos filtros.
                  </TableCell>
                </TableRow>
              ) : entries.map((e) => (
                <TableRow key={`${e.table}-${e.policy}`}>
                  <TableCell className="font-mono text-xs">{e.table}</TableCell>
                  <TableCell className="font-mono text-xs">{e.policy}</TableCell>
                  <TableCell>{e.command}</TableCell>
                  <TableCell>{severityBadge(e.severity)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Lock className="h-3 w-3" />
                      {e.access_level}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
