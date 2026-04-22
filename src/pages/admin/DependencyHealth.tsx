import { useMemo, useState, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const DateFnsUsagePanel = lazy(() => import("@/components/admin/DateFnsUsagePanel"));
const InstallReportPanel = lazy(() => import("@/components/admin/InstallReportPanel"));
const InstallReportHelp = lazy(() => import("@/components/admin/InstallReportHelp"));
const RefreshNowHelp = lazy(() => import("@/components/admin/RefreshNowHelp"));
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

type SnapshotSource = "edge" | "static";

interface SnapshotResult {
  snapshot: DependencyHealthSnapshot;
  source: SnapshotSource;
  fetchedAt: string;
  edgeError?: string;
}

const fetchSnapshot = async (): Promise<SnapshotResult> => {
  // Prefer edge function (runtime refreshable)
  let edgeError: string | undefined;
  try {
    const { data, error } = await supabase.functions.invoke("dependency-health", {
      method: "GET",
    });
    if (!error && data) {
      return {
        snapshot: data as DependencyHealthSnapshot,
        source: "edge",
        fetchedAt: new Date().toISOString(),
      };
    }
    if (error) edgeError = error.message;
  } catch (e) {
    edgeError = e instanceof Error ? e.message : String(e);
  }
  const res = await fetch("/dependency-health.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return {
    snapshot: (await res.json()) as DependencyHealthSnapshot,
    source: "static",
    fetchedAt: new Date().toISOString(),
    edgeError,
  };
};

const DependencyHealth = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const selectedDiff = useMemo(() => {
    if (!history || history.length === 0) return null;
    const idx = selectedId ? history.findIndex((h) => h.id === selectedId) : 0;
    const currentIdx = idx === -1 ? 0 : idx;
    const current = history[currentIdx];
    const previous = history[currentIdx + 1] ?? null;
    const prevMap = new Map<string, boolean>(
      (previous?.packages ?? []).map((p) => [p.name, p.driftDetected]),
    );
    const drifted: string[] = [];
    const recovered: string[] = [];
    const persisted: string[] = [];
    for (const p of current.packages ?? []) {
      const wasDrift = prevMap.get(p.name) ?? false;
      if (p.driftDetected && !wasDrift) drifted.push(p.name);
      else if (!p.driftDetected && wasDrift) recovered.push(p.name);
      else if (p.driftDetected && wasDrift) persisted.push(p.name);
    }
    return { current, previous, drifted, recovered, persisted };
  }, [history, selectedId]);


  const buildRefresh = (dispatchCi: boolean) =>
    useMutation({
      mutationFn: async (): Promise<SnapshotResult & { ciDispatch?: string }> => {
        const { data, error } = await supabase.functions.invoke(
          `dependency-health${dispatchCi ? "?dispatchCi=true" : ""}`,
          { method: "POST" },
        );
        if (error) throw error;
        const payload = data as DependencyHealthSnapshot & { ciDispatch?: string };
        return {
          snapshot: payload,
          source: "edge",
          fetchedAt: new Date().toISOString(),
          ciDispatch: payload.ciDispatch,
        };
      },
      onSuccess: (fresh) => {
        queryClient.setQueryData(["dependency-health"], fresh);
        queryClient.invalidateQueries({ queryKey: ["dependency-health-history"] });
        toast({
          title: dispatchCi ? "Snapshot atualizado + CI" : "Snapshot atualizado",
          description: dispatchCi
            ? `Gerado em ${fresh.snapshot.generatedAt} · CI: ${fresh.ciDispatch ?? "n/a"}`
            : `Gerado em ${fresh.snapshot.generatedAt}`,
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

  const { snapshot, source, fetchedAt, edgeError } = data;
  const { dateFns, lockfileDrift, generatedAt, packages } = snapshot;
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
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Saúde das Dependências</h1>
          <p className="text-sm text-muted-foreground">
            Snapshot gerado pela rotina <code className="font-mono">bun run ci:check</code> ou pelo botão abaixo.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Última atualização da tela:{" "}
              <span className="font-medium text-foreground">
                {formatDistanceToNow(parseISO(fetchedAt), { addSuffix: true, locale: ptBR })}
              </span>{" "}
              <span className="font-mono">({fetchedAt})</span>
            </span>
            {source === "edge" ? (
              <Badge variant="secondary" className="gap-1" aria-label="Fonte: edge function">
                <RefreshCw className="h-3 w-3" />
                Edge (ao vivo)
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1" aria-label="Fonte: arquivo estático de fallback">
                <AlertTriangle className="h-3 w-3" />
                Fallback estático
              </Badge>
            )}
            {edgeError && (
              <span className="text-destructive" title={edgeError}>
                · edge falhou: {edgeError.length > 60 ? `${edgeError.slice(0, 60)}…` : edgeError}
              </span>
            )}
          </div>
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

      {isAdmin && (
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <RefreshNowHelp />
        </Suspense>
      )}

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
      {snapshot.treeShaking && (
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
              {snapshot.treeShaking.riskLevel === "ok" ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  OK
                </Badge>
              ) : snapshot.treeShaking.riskLevel === "warning" ? (
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
                {snapshot.treeShaking.filesScanned} arquivo(s) escaneado(s) ·{" "}
                {snapshot.treeShaking.barrelImportsFound} import(s) barrel
                {snapshot.treeShaking.truncated ? " (lista truncada em 50)" : ""}
              </span>
            </div>

            {snapshot.treeShaking.barrelImportsFound === 0 ? (
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
                    {snapshot.treeShaking.offenders.map((o: TreeShakingOffender, idx: number) => (
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
              Escaneado em {snapshot.treeShaking.scannedAt}
              {snapshot.treeShaking.note ? ` · ${snapshot.treeShaking.note}` : ""}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Histórico de drift (últimas 30 atualizações)
          </CardTitle>
          <CardDescription>
            Tendência de drift e imports barrel ao longo das últimas atualizações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!history || history.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma atualização registrada ainda — clique em "Atualizar agora" para começar a coletar histórico.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Drift count</span>
                    <Badge variant={history[0].driftCount > 0 ? "destructive" : "secondary"} className="font-mono">
                      atual: {history[0].driftCount}
                    </Badge>
                  </div>
                  <Sparkline
                    data={[...history].reverse().map((h) => h.driftCount)}
                    width={280}
                    height={48}
                    showDots
                  />
                </div>
                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Imports barrel</span>
                    <Badge variant={history[0].barrelImports > 0 ? "destructive" : "secondary"} className="font-mono">
                      atual: {history[0].barrelImports}
                    </Badge>
                  </div>
                  <Sparkline
                    data={[...history].reverse().map((h) => h.barrelImports)}
                    width={280}
                    height={48}
                    showDots
                  />
                </div>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead className="font-mono text-xs">Drift</TableHead>
                      <TableHead className="font-mono text-xs">Barrel</TableHead>
                      <TableHead className="font-mono text-xs">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.slice(0, 10).map((h) => {
                      const isSelected = (selectedId ?? history[0].id) === h.id;
                      return (
                        <TableRow
                          key={h.id}
                          onClick={() => setSelectedId(h.id)}
                          className={`cursor-pointer ${
                            isSelected ? "bg-primary/10 hover:bg-primary/15" : h.driftCount > 0 ? "bg-destructive/5" : ""
                          }`}
                          aria-label={`Selecionar snapshot de ${h.generatedAt}`}
                        >
                          <TableCell className="text-sm">
                            {formatDistanceToNow(parseISO(h.generatedAt), { addSuffix: true, locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {h.driftCount > 0 ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {h.driftCount}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">0</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{h.barrelImports}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{h.generatedAt}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {selectedDiff && (
                <div className="rounded-md border bg-muted/20 p-4 space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="text-sm font-medium">Diff do snapshot selecionado</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {selectedDiff.current.generatedAt}
                      {selectedDiff.previous
                        ? ` vs ${selectedDiff.previous.generatedAt}`
                        : " (sem snapshot anterior)"}
                    </div>
                  </div>

                  {selectedDiff.drifted.length === 0 &&
                  selectedDiff.recovered.length === 0 &&
                  selectedDiff.persisted.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      Nenhuma mudança de drift entre os dois snapshots.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pacote</TableHead>
                          <TableHead>Mudança</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDiff.drifted.map((name) => (
                          <TableRow key={`drifted-${name}`}>
                            <TableCell className="font-mono text-xs">{name}</TableCell>
                            <TableCell>
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Novo drift
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {selectedDiff.recovered.map((name) => (
                          <TableRow key={`recovered-${name}`}>
                            <TableCell className="font-mono text-xs">{name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="gap-1 bg-success/15 text-success hover:bg-success/20">
                                <CheckCircle2 className="h-3 w-3" />
                                Recuperado
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {selectedDiff.persisted.map((name) => (
                          <TableRow key={`persisted-${name}`}>
                            <TableCell className="font-mono text-xs">{name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Drift persistente
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

            </>
          )}
        </CardContent>
      </Card>

      <Suspense fallback={<Skeleton className="h-48" />}>
        <InstallReportPanel />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-48" />}>
        <InstallReportHelp />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-48" />}>
        <DateFnsUsagePanel />
      </Suspense>
    </div>
  );
};

export default DependencyHealth;
