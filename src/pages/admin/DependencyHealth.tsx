import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, Package, Lock, Clock, RefreshCw, Boxes, Scissors, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { parseISO } from "date-fns/parseISO";
import { ptBR } from "date-fns/locale/pt-BR";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Sparkline } from "@/components/ui/sparkline";

interface HistoryEntry {
  id: string;
  generatedAt: string;
  driftCount: number;
  barrelImports: number;
  packages: { name: string; driftDetected: boolean }[];
}

const fetchHistory = async (): Promise<HistoryEntry[]> => {
  const { data, error } = await supabase.functions.invoke("dependency-health?history=true", {
    method: "GET",
  });
  if (error) throw error;
  return ((data as { history?: HistoryEntry[] } | null)?.history) ?? [];
};

interface PackageHealth {
  name: string;
  label: string;
  spec: string;
  installed: string;
  locked: string;
  exactPinned: boolean;
  driftDetected: boolean;
}

interface TreeShakingOffender {
  file: string;
  line: number;
  importPath: string;
}

interface TreeShakingReport {
  scannedAt: string;
  filesScanned: number;
  barrelImportsFound: number;
  offenders: TreeShakingOffender[];
  truncated?: boolean;
  riskLevel: "ok" | "warning" | "critical";
  note?: string;
}

interface DependencyHealthSnapshot {
  generatedAt: string;
  dateFns: {
    spec: string;
    installed: string;
    locked: string;
    exactPinned: boolean;
  };
  packages?: PackageHealth[];
  lockfileDrift: {
    detected: boolean;
    lastCheckedAt: string;
    source: string;
  };
  treeShaking?: TreeShakingReport;
}

const fetchSnapshot = async (): Promise<DependencyHealthSnapshot> => {
  // Prefer edge function (runtime refreshable)
  try {
    const { data, error } = await supabase.functions.invoke("dependency-health", {
      method: "GET",
    });
    if (!error && data) return data as DependencyHealthSnapshot;
  } catch {
    // fall through to static
  }
  const res = await fetch("/dependency-health.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const DependencyHealth = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dependency-health"],
    queryFn: fetchSnapshot,
    staleTime: 60_000,
  });

  const { data: history } = useQuery({
    queryKey: ["dependency-health-history"],
    queryFn: fetchHistory,
    staleTime: 60_000,
  });

  const buildRefresh = (dispatchCi: boolean) =>
    useMutation({
      mutationFn: async () => {
        const { data, error } = await supabase.functions.invoke(
          `dependency-health${dispatchCi ? "?dispatchCi=true" : ""}`,
          { method: "POST" },
        );
        if (error) throw error;
        return data as DependencyHealthSnapshot & { ciDispatch?: string };
      },
      onSuccess: (fresh) => {
        queryClient.setQueryData(["dependency-health"], fresh);
        queryClient.invalidateQueries({ queryKey: ["dependency-health-history"] });
        toast({
          title: dispatchCi ? "Snapshot atualizado + CI" : "Snapshot atualizado",
          description: dispatchCi
            ? `Gerado em ${fresh.generatedAt} · CI: ${fresh.ciDispatch ?? "n/a"}`
            : `Gerado em ${fresh.generatedAt}`,
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Falha ao atualizar snapshot";
        toast({ title: "Erro", description: msg, variant: "destructive" });
      },
    });

  const refresh = buildRefresh(false);
  const refreshAndCommit = buildRefresh(true);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Saúde das Dependências</h1>
        <Card>
          <CardContent className="p-6 text-muted-foreground">Carregando snapshot…</CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Saúde das Dependências</h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Snapshot não encontrado</AlertTitle>
          <AlertDescription>
            Execute <code className="font-mono">bun run ci:check</code> para gerar este relatório.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { dateFns, lockfileDrift, generatedAt, packages } = data;
  const hasPackages = Array.isArray(packages) && packages.length > 0;
  const aggregateDrift = hasPackages
    ? packages!.some((p) => p.driftDetected)
    : lockfileDrift.detected;
  const versionsMatch =
    dateFns.spec.replace(/^[\^~]/, "") === dateFns.installed &&
    dateFns.installed === dateFns.locked;
  const generatedDate = parseISO(generatedAt);
  const lastCheckedDate = parseISO(lockfileDrift.lastCheckedAt);

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Saúde das Dependências</h1>
          <p className="text-sm text-muted-foreground">
            Snapshot gerado pela rotina <code className="font-mono">bun run ci:check</code> ou pelo botão abaixo.
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending || refreshAndCommit.isPending}
              variant="outline"
              aria-label="Atualizar snapshot agora"
            >
              <RefreshCw className={`h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`} />
              {refresh.isPending ? "Atualizando…" : "Atualizar agora"}
            </Button>
            <Button
              onClick={() => refreshAndCommit.mutate()}
              disabled={refresh.isPending || refreshAndCommit.isPending}
              variant="outline"
              aria-label="Atualizar e commitar snapshot no repositório"
            >
              <RefreshCw className={`h-4 w-4 ${refreshAndCommit.isPending ? "animate-spin" : ""}`} />
              {refreshAndCommit.isPending ? "Disparando CI…" : "Atualizar & commitar no repo"}
            </Button>
          </div>
        )}
      </div>

      {hasPackages ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Boxes className="h-5 w-5 text-primary" />
              Pacotes monitorados
            </CardTitle>
            <CardDescription>
              Versões declaradas, do lockfile e instaladas para os pacotes-chave do projeto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pacote</TableHead>
                  <TableHead className="font-mono text-xs">package.json</TableHead>
                  <TableHead className="font-mono text-xs">bun.lock</TableHead>
                  <TableHead className="font-mono text-xs">node_modules</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages!.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.label}</TableCell>
                    <TableCell className="font-mono text-xs">{p.spec || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.locked || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.installed || "—"}</TableCell>
                    <TableCell>
                      {p.driftDetected ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Drift
                        </Badge>
                      ) : p.spec ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          OK
                        </Badge>
                      ) : (
                        <Badge variant="outline">N/D</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-primary" />
              date-fns
            </CardTitle>
            <CardDescription>Versão pinada e estado do lockfile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-base px-3 py-1 font-mono">
                v{dateFns.installed}
              </Badge>
              {versionsMatch ? (
                <span className="flex items-center gap-1 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  spec / lock / installed alinhados
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Versões divergentes
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">package.json</div>
                <div className="font-mono">{dateFns.spec || "—"}</div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">bun.lock</div>
                <div className="font-mono">{dateFns.locked || "—"}</div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">node_modules</div>
                <div className="font-mono">{dateFns.installed || "—"}</div>
              </div>
            </div>

            {!dateFns.exactPinned && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  A spec em <code className="font-mono">package.json</code> não está pinada de forma exata.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            Lockfile drift
          </CardTitle>
          <CardDescription>
            Resultado do último <code className="font-mono">{lockfileDrift.source}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {aggregateDrift ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Drift detectado</AlertTitle>
              <AlertDescription>
                <code className="font-mono">package.json</code> e <code className="font-mono">bun.lock</code>{" "}
                divergem em um ou mais pacotes. Rode <code className="font-mono">bun install</code> e commit do lockfile.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              Nenhum drift detectado
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Última verificação:{" "}
            {formatDistanceToNow(lastCheckedDate, { addSuffix: true, locale: ptBR })} ·{" "}
            {lockfileDrift.lastCheckedAt}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Snapshot gerado em
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div>
            {formatDistanceToNow(generatedDate, { addSuffix: true, locale: ptBR })}
          </div>
          <div className="font-mono text-xs text-muted-foreground">{generatedAt}</div>
        </CardContent>
      </Card>
      {data.treeShaking && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scissors className="h-5 w-5 text-primary" />
              Risco de tree-shaking
            </CardTitle>
            <CardDescription>
              Imports barrel de <code className="font-mono">date-fns</code> /{" "}
              <code className="font-mono">date-fns/locale</code> derrotam o tree-shaking e aumentam o bundle.
              Use sempre subpaths (ex.: <code className="font-mono">date-fns/format</code>). A regra ESLint{" "}
              <code className="font-mono">local/date-fns-subpath</code> bloqueia novos casos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {data.treeShaking.riskLevel === "ok" ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  OK
                </Badge>
              ) : data.treeShaking.riskLevel === "warning" ? (
                <Badge className="gap-1 bg-warning text-warning-foreground hover:bg-warning/90">
                  <AlertTriangle className="h-3 w-3" />
                  Atenção
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Crítico
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {data.treeShaking.filesScanned} arquivo(s) escaneado(s) ·{" "}
                {data.treeShaking.barrelImportsFound} import(s) barrel
                {data.treeShaking.truncated ? " (lista truncada em 50)" : ""}
              </span>
            </div>

            {data.treeShaking.barrelImportsFound === 0 ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Nenhum import barrel detectado — tree-shaking saudável.
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono text-xs">Arquivo</TableHead>
                      <TableHead className="font-mono text-xs w-16">Linha</TableHead>
                      <TableHead className="font-mono text-xs">Import</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.treeShaking.offenders.map((o, idx) => (
                      <TableRow key={`${o.file}:${o.line}:${idx}`}>
                        <TableCell className="font-mono text-xs">{o.file}</TableCell>
                        <TableCell className="font-mono text-xs">{o.line || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{o.importPath}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Escaneado em {data.treeShaking.scannedAt}
              {data.treeShaking.note ? ` · ${data.treeShaking.note}` : ""}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DependencyHealth;
