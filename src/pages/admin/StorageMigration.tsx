import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Play, AlertTriangle, CheckCircle2, Database } from "lucide-react";

interface LegacyRow {
  bucket: string;
  table_name: string;
  column_name: string;
  legacy_count: number;
  migrated_count: number;
  total_with_url: number;
}

interface MigrationStats {
  bucket: string;
  scanned: number;
  moved: number;
  skipped_already_new: number;
  skipped_no_tenant: number;
  url_rows_updated: number;
  errors: Array<{ path: string; error: string }>;
}

export default function StorageMigration() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [lastReport, setLastReport] = useState<{ dryRun: boolean; results: MigrationStats[] } | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["legacy-storage-urls"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("count_legacy_storage_urls");
      if (error) throw error;
      return (data ?? []) as LegacyRow[];
    },
  });

  const totalLegacy = (data ?? []).reduce((sum, r) => sum + Number(r.legacy_count ?? 0), 0);
  const totalMigrated = (data ?? []).reduce((sum, r) => sum + Number(r.migrated_count ?? 0), 0);

  const runMigration = async (dryRun: boolean) => {
    setRunning(true);
    try {
      const { data: result, error: invokeErr } = await supabase.functions.invoke(
        "migrate-storage-paths",
        { body: { dryRun } },
      );
      if (invokeErr) throw invokeErr;
      setLastReport(result as { dryRun: boolean; results: MigrationStats[] });
      toast({
        title: dryRun ? "Simulação concluída" : "Migração concluída",
        description: "Confira os totais abaixo.",
      });
      if (!dryRun) {
        await queryClient.invalidateQueries({ queryKey: ["legacy-storage-urls"] });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Migração de Storage por Tenant
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Validação do impacto da migração de paths antigos <code>{"{userId}/..."}</code> para o novo formato <code>{"{tenantId}/{userId}/..."}</code>.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label="Atualizar contagens">
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">URLs legados (pendentes)</p>
          <p className={`text-3xl font-bold mt-1 ${totalLegacy > 0 ? "text-destructive" : "text-success"}`}>
            {isLoading ? "—" : totalLegacy}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">URLs já migrados</p>
          <p className="text-3xl font-bold mt-1 text-success">{isLoading ? "—" : totalMigrated}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-2">
            {isLoading ? (
              <Badge variant="outline">Carregando…</Badge>
            ) : totalLegacy === 0 ? (
              <Badge className="bg-success/10 text-success border-success/30">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Migração completa
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" /> Pendências detectadas
              </Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Detalhes por tabela */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Detalhamento por tabela</h2>
        {error ? (
          <p className="text-sm text-destructive">Erro ao consultar: {String((error as Error).message)}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bucket</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Coluna</TableHead>
                <TableHead className="text-right">Legados</TableHead>
                <TableHead className="text-right">Migrados</TableHead>
                <TableHead className="text-right">Total c/ URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((row) => (
                <TableRow key={`${row.table_name}.${row.column_name}`}>
                  <TableCell><Badge variant="outline">{row.bucket}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{row.table_name}</TableCell>
                  <TableCell className="font-mono text-sm">{row.column_name}</TableCell>
                  <TableCell className={`text-right font-bold ${Number(row.legacy_count) > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {row.legacy_count}
                  </TableCell>
                  <TableCell className="text-right text-success">{row.migrated_count}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{row.total_with_url}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Ações */}
      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">Executar migração</h2>
        <p className="text-sm text-muted-foreground">
          Rode primeiro em modo simulação para ver quantos arquivos seriam movidos. A execução real move os objetos no Storage e atualiza as colunas de URL.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => runMigration(true)} disabled={running}>
            <Play className="h-4 w-4 mr-2" /> Simular (dry-run)
          </Button>
          <Button onClick={() => runMigration(false)} disabled={running || totalLegacy === 0}>
            <Play className="h-4 w-4 mr-2" /> Executar migração
          </Button>
        </div>
      </Card>

      {/* Relatório da última execução */}
      {lastReport && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">
            Último relatório {lastReport.dryRun && <Badge variant="outline" className="ml-2">simulação</Badge>}
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bucket</TableHead>
                <TableHead className="text-right">Escaneados</TableHead>
                <TableHead className="text-right">Movidos</TableHead>
                <TableHead className="text-right">Já novos</TableHead>
                <TableHead className="text-right">Sem tenant</TableHead>
                <TableHead className="text-right">URLs atualizados</TableHead>
                <TableHead className="text-right">Erros</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lastReport.results.map((r) => (
                <TableRow key={r.bucket}>
                  <TableCell><Badge variant="outline">{r.bucket}</Badge></TableCell>
                  <TableCell className="text-right">{r.scanned}</TableCell>
                  <TableCell className="text-right font-bold">{r.moved}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.skipped_already_new}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.skipped_no_tenant}</TableCell>
                  <TableCell className="text-right text-success">{r.url_rows_updated}</TableCell>
                  <TableCell className={`text-right ${r.errors.length > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                    {r.errors.length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {lastReport.results.some((r) => r.errors.length > 0) && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-destructive">Ver erros</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(lastReport.results.flatMap((r) => r.errors.map((e) => ({ bucket: r.bucket, ...e }))), null, 2)}
              </pre>
            </details>
          )}
        </Card>
      )}
    </div>
  );
}
