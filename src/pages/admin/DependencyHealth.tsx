import { useMemo, useState, useEffect, lazy, Suspense } from "react";
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
import { CheckCircle2, AlertTriangle, Package, Lock, Clock, RefreshCw, Boxes, Scissors, History, GitCommit, GitBranch, ExternalLink, Rocket, TrendingUp, TrendingDown, Minus, FlaskConical, HelpCircle, FileText } from "lucide-react";
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

interface CiDispatchInfo {
  status: string;
  branch?: string;
  dispatchedAt?: string;
  workflowRunUrl?: string;
  workflowRunId?: number;
  workflowRunStatus?: string;
  latestCommitSha?: string;
  latestCommitUrl?: string;
  latestCommitMessage?: string;
  latestCommitAuthor?: string;
  latestCommitAt?: string;
}

const fetchHistory = async (): Promise<HistoryEntry[]> => {
  const { data, error } = await supabase.functions.invoke("dependency-health?history=true", {
    method: "GET",
  });
  if (error) throw error;
  return ((data as { history?: HistoryEntry[] } | null)?.history) ?? [];
};

interface PrSmokeArtifact {
  id: number;
  name: string;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string;
  downloadUrl: string;
  webUrl: string;
  runId: number | null;
  headBranch: string | null;
  headSha: string | null;
  prNumber: number | null;
}

interface PrSmokeResponse {
  status: "ok" | "empty" | "skipped" | "error";
  artifact: PrSmokeArtifact | null;
  reason?: string;
  totalScanned?: number;
}

const fetchPrSmokeArtifact = async (): Promise<PrSmokeResponse> => {
  const { data, error } = await supabase.functions.invoke("dependency-health?prSmoke=true", {
    method: "GET",
  });
  if (error) throw error;
  return (data as PrSmokeResponse) ?? { status: "empty", artifact: null };
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

interface SmokeTestInfo {
  status?: "pass" | "fail" | "unknown" | string;
  ranAt?: string;
  durationMs?: number;
  testFile?: string;
  ci?: {
    runUrl?: string;
    prNumber?: number;
    prUrl?: string;
    branch?: string | null;
    event?: string | null;
  };
  log?: {
    path?: string;
    sizeBytes?: number;
    capturedAt?: string;
  };
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
  smokeTest?: SmokeTestInfo;
}

function suggestReplacement(importPath: string): string {
  const p = importPath.trim();
  if (p === "date-fns") {
    return 'import { format } from "date-fns/format" (use subpath por função)';
  }
  if (p === "date-fns/locale") {
    return 'import { ptBR } from "date-fns/locale/pt-BR" (subpath por locale)';
  }
  if (p === "lodash") {
    return 'import debounce from "lodash/debounce" ou migrar para lodash-es';
  }
  if (p === "lodash-es") {
    return "OK com bundler moderno; prefira imports nomeados de lodash-es";
  }
  if (p === "react-icons") {
    return 'import { FiHome } from "react-icons/fi" (subpath por família)';
  }
  if (p === "@mui/icons-material") {
    return 'import HomeIcon from "@mui/icons-material/Home" (subpath por ícone)';
  }
  if (p === "rxjs") {
    return 'import { map } from "rxjs/operators" (subpath por operador)';
  }
  if (p === "ramda") {
    return 'import map from "ramda/src/map" (subpath por função)';
  }
  return "Verifique se há subpath específico exportado por esse pacote";
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

  // Most recent PR smoke-test artifact (uploaded by the smoke-date-fns
  // workflow on pull_request events). Polled less aggressively than the
  // main snapshot since it only changes on PR pushes, not on every
  // "Atualizar agora" click.
  const { data: prSmoke, isLoading: prSmokeLoading, refetch: refetchPrSmoke } = useQuery({
    queryKey: ["dependency-health-pr-smoke"],
    queryFn: fetchPrSmokeArtifact,
    staleTime: 5 * 60_000,
    retry: 1,
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
      mutationFn: async (): Promise<SnapshotResult & { ciDispatch?: CiDispatchInfo | string }> => {
        const { data, error } = await supabase.functions.invoke(
          `dependency-health${dispatchCi ? "?dispatchCi=true" : ""}`,
          { method: "POST" },
        );
        if (error) throw error;
        const payload = data as DependencyHealthSnapshot & { ciDispatch?: CiDispatchInfo | string };
        return {
          snapshot: payload,
          source: "edge",
          fetchedAt: new Date().toISOString(),
          ciDispatch: payload.ciDispatch,
        };
      },
      onSuccess: (fresh) => {
        // Preserve the previous smokeTest if the refreshed payload omits it —
        // the edge function only emits package/lockfile/tree-shake data, while
        // smokeTest is recorded by the smoke-date-fns CI workflow. Without this
        // merge, "Atualizar agora" would wipe the smoke card to empty.
        const prev = queryClient.getQueryData<SnapshotResult>(["dependency-health"]);
        const merged: SnapshotResult = {
          ...fresh,
          snapshot: {
            ...fresh.snapshot,
            smokeTest: fresh.snapshot.smokeTest ?? prev?.snapshot.smokeTest,
          },
        };
        queryClient.setQueryData(["dependency-health"], merged);
        queryClient.invalidateQueries({ queryKey: ["dependency-health-history"] });

        if (!dispatchCi) {
          toast({
            title: "Snapshot atualizado",
            description: `Gerado em ${fresh.snapshot.generatedAt}`,
          });
          return;
        }

        const ci = fresh.ciDispatch;
        const ciObj = typeof ci === "object" && ci !== null ? ci : null;
        const statusRaw = (ciObj?.status ?? (typeof ci === "string" ? ci : "")) || "unknown";
        const statusLower = statusRaw.toLowerCase();

        // Derive owner/repo from any GitHub URL we got back.
        const anyUrl = ciObj?.workflowRunUrl ?? ciObj?.latestCommitUrl ?? "";
        let ownerRepo = "";
        try {
          if (anyUrl) {
            const u = new URL(anyUrl);
            const parts = u.pathname.split("/").filter(Boolean);
            if (parts.length >= 2) ownerRepo = `${parts[0]}/${parts[1]}`;
          }
        } catch {
          // ignore
        }
        const branchSuffix = ciObj?.branch ? `@${ciObj.branch}` : "";
        const repoLabel = ownerRepo ? `${ownerRepo}${branchSuffix}` : "repositório não identificado";

        let title = "CI: status desconhecido";
        let variant: "default" | "destructive" = "default";
        if (statusLower === "queued") {
          title = "CI enfileirado ✓";
        } else if (statusLower.startsWith("skipped")) {
          title = "CI ignorado";
        } else if (statusLower.startsWith("failed")) {
          title = "CI falhou";
          variant = "destructive";
        }

        toast({
          title,
          description: `${repoLabel} · ${statusRaw}`,
          variant,
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Falha ao atualizar snapshot";
        toast({ title: "Erro", description: msg, variant: "destructive" });
      },
    });

  const refresh = buildRefresh(false);
  const refreshAndCommit = buildRefresh(true);

  const anyPending = refresh.isPending || refreshAndCommit.isPending;

  // Track last successful CI dispatch to prevent overlapping triggers.
  const [lastDispatch, setLastDispatch] = useState<{ at: number; status?: string } | null>(null);
  useEffect(() => {
    const ci = refreshAndCommit.data?.ciDispatch;
    if (ci && typeof ci !== "string") {
      setLastDispatch({ at: Date.now(), status: ci.workflowRunStatus });
    }
  }, [refreshAndCommit.data]);

  const CI_COOLDOWN_MS = 30_000;
  const ciStillRunning =
    lastDispatch != null &&
    Date.now() - lastDispatch.at < CI_COOLDOWN_MS &&
    (lastDispatch.status === "queued" || lastDispatch.status === "in_progress" || !lastDispatch.status);

  const handleRefresh = () => {
    if (anyPending) return;
    refresh.mutate();
  };
  const handleRefreshAndCommit = () => {
    if (anyPending) return;
    if (ciStillRunning) {
      toast({
        title: "CI já em execução",
        description: "Aguarde o workflow anterior concluir antes de disparar outro.",
        variant: "destructive",
      });
      return;
    }
    refreshAndCommit.mutate();
  };

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
              onClick={handleRefresh}
              disabled={anyPending}
              variant="outline"
              aria-label="Atualizar snapshot agora"
            >
              <RefreshCw className={`h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`} />
              {refresh.isPending ? "Atualizando…" : "Atualizar agora"}
            </Button>
            <Button
              onClick={handleRefreshAndCommit}
              disabled={anyPending || ciStillRunning}
              variant="outline"
              aria-label="Atualizar e commitar snapshot no repositório"
              title={ciStillRunning ? "Workflow CI anterior ainda em execução" : undefined}
            >
              <RefreshCw className={`h-4 w-4 ${refreshAndCommit.isPending ? "animate-spin" : ""}`} />
              {refreshAndCommit.isPending
                ? "Disparando CI…"
                : ciStillRunning
                ? "CI em execução…"
                : "Atualizar & commitar no repo"}
            </Button>
          </div>
        )}
      </div>

      {isAdmin && (
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <RefreshNowHelp />
        </Suspense>
      )}

      {isAdmin && refreshAndCommit.data?.ciDispatch && typeof refreshAndCommit.data.ciDispatch !== "string" && (() => {
        const ci = refreshAndCommit.data.ciDispatch as CiDispatchInfo;
        const queued = ci.status === "queued";
        return (
          <Card aria-labelledby="ci-dispatch-result-title" className="border-primary/30">
            <CardHeader>
              <CardTitle id="ci-dispatch-result-title" className="flex items-center gap-2 text-base">
                <Rocket className="h-4 w-4 text-primary" aria-hidden="true" />
                Resultado do dispatch CI
                <Badge variant={queued ? "secondary" : "destructive"} className="ml-1">
                  {ci.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                {ci.dispatchedAt
                  ? `Disparado ${formatDistanceToNow(parseISO(ci.dispatchedAt), { addSuffix: true, locale: ptBR })}`
                  : "Verifique se o push do bot foi concluído usando os links abaixo."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                    Branch
                  </div>
                  <div className="font-mono text-xs">{ci.branch ?? "—"}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Workflow run
                  </div>
                  {ci.workflowRunUrl ? (
                    <a
                      href={ci.workflowRunUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-xs break-all"
                      aria-label="Abrir workflow run no GitHub"
                    >
                      #{ci.workflowRunId} · {ci.workflowRunStatus ?? "queued"}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Aguardando GitHub registrar o run…
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1 border-t pt-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GitCommit className="h-3.5 w-3.5" aria-hidden="true" />
                  Último commit em <span className="font-mono">{ci.branch ?? "main"}</span>
                </div>
                {ci.latestCommitSha ? (
                  <div className="space-y-1">
                    <a
                      href={ci.latestCommitUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                      aria-label="Abrir commit no GitHub"
                    >
                      {ci.latestCommitSha.slice(0, 12)}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                    <div className="text-xs text-foreground">{ci.latestCommitMessage ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      por <span className="font-medium">{ci.latestCommitAuthor ?? "?"}</span>
                      {ci.latestCommitAt && (
                        <>
                          {" · "}
                          {formatDistanceToNow(parseISO(ci.latestCommitAt), { addSuffix: true, locale: ptBR })}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Não foi possível ler o último commit (token sem permissão ou GitHub indisponível).
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                Após o workflow concluir, o bot fará push de <code className="font-mono">public/dependency-health.json</code>{" "}
                e o SHA acima vai mudar — atualize esta tela para confirmar.
              </p>
            </CardContent>
          </Card>
        );
      })()}

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
            {(() => {
              const ts = snapshot.treeShaking!;
              const denom = Math.max(ts.filesScanned, 10);
              const ratio = ts.barrelImportsFound / denom;
              const score = Math.max(0, Math.min(100, Math.round(100 - ratio * 100 - ts.barrelImportsFound * 2)));

              const prev = history && history.length > 1 ? history[1] : null;
              const prevBarrel = prev?.barrelImports;
              const prevScore = typeof prevBarrel === "number"
                ? Math.max(0, Math.min(100, Math.round(100 - (prevBarrel / Math.max(denom, 10)) * 100 - prevBarrel * 2)))
                : null;
              const delta = prevScore != null ? score - prevScore : null;

              const scoreTone =
                score >= 90 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";
              const trendIcon = delta == null
                ? <Minus className="h-3 w-3" />
                : delta > 0
                  ? <TrendingUp className="h-3 w-3 text-success" />
                  : delta < 0
                    ? <TrendingDown className="h-3 w-3 text-destructive" />
                    : <Minus className="h-3 w-3 text-muted-foreground" />;
              const trendLabel = delta == null
                ? "sem snapshot anterior"
                : delta === 0
                  ? "estável"
                  : `${delta > 0 ? "+" : ""}${delta} vs anterior`;

              return (
                <div className="rounded-md border bg-muted/20 p-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold tabular-nums ${scoreTone}`}>{score}</span>
                    <span className="text-xs text-muted-foreground">/ 100</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {trendIcon}
                    <span>{trendLabel}</span>
                    {prevScore != null && (
                      <span className="font-mono ml-1">(antes: {prevScore})</span>
                    )}
                  </div>
                </div>
              );
            })()}
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
                      <TableHead className="font-mono text-xs">Substituição sugerida</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshot.treeShaking.offenders.map((o: TreeShakingOffender, idx: number) => {
                      const suggestion = suggestReplacement(o.importPath);
                      return (
                        <TableRow key={`${o.file}:${o.line}:${idx}`}>
                          <TableCell className="font-mono text-xs">{o.file}</TableCell>
                          <TableCell className="font-mono text-xs">{o.line || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{o.importPath}</TableCell>
                          <TableCell className="font-mono text-xs text-success-foreground">
                            {suggestion}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

      {/* Smoke test card — always renders, even when snapshot.smokeTest is missing
          or status === "unknown". The "Atualizar agora" action only refreshes the
          deps health payload (no smoke run), so we render an "Sem dados" state
          instead of hiding the card, making the absence of data discoverable. */}
      {(() => {
        const smoke = snapshot.smokeTest;
        const statusRaw = (smoke?.status ?? "").toLowerCase();
        const hasData = !!smoke && statusRaw !== "" && statusRaw !== "unknown";
        const tone: "ok" | "fail" | "unknown" =
          statusRaw === "pass" ? "ok" : statusRaw === "fail" ? "fail" : "unknown";
        const dotClass =
          tone === "ok" ? "bg-success" : tone === "fail" ? "bg-destructive" : "bg-muted-foreground";
        const label = tone === "ok" ? "Passou" : tone === "fail" ? "Falhou" : "Sem dados";

        return (
          <Card aria-labelledby="smoke-test-card-title">
            <CardHeader>
              <CardTitle id="smoke-test-card-title" className="flex items-center gap-2 text-lg">
                <FlaskConical className="h-5 w-5 text-primary" />
                Smoke test (date-fns)
                <Badge
                  variant={tone === "ok" ? "default" : tone === "fail" ? "destructive" : "secondary"}
                  className="ml-2 gap-1.5"
                >
                  <span className={`w-2 h-2 rounded-full ${dotClass}`} aria-hidden="true" />
                  {label}
                </Badge>
              </CardTitle>
              <CardDescription>
                Resultado do workflow <code className="font-mono text-xs">smoke-date-fns</code> gravado em{" "}
                <code className="font-mono text-xs">public/dependency-health.json</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!hasData ? (
                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertTitle>Sem dados de smoke test</AlertTitle>
                  <AlertDescription className="space-y-1">
                    <p>
                      Nenhum resultado registrado ainda. O bloco{" "}
                      <code className="font-mono text-xs">smokeTest</code> só é preenchido pelo workflow{" "}
                      <code className="font-mono text-xs">.github/workflows/smoke-date-fns.yml</code> em
                      pushes para <code className="font-mono text-xs">main</code> ou pull requests que tocam{" "}
                      <code className="font-mono text-xs">src/**</code>.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      A ação <strong>Atualizar agora</strong> só recalcula drift e tree-shaking — ela preserva
                      o último smoke conhecido, mas não dispara um novo. Aguarde o próximo PR ou commit em{" "}
                      <code className="font-mono text-xs">main</code>.
                    </p>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-md border bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground">Duração</div>
                      <div className="font-medium">
                        {typeof smoke!.durationMs === "number" ? `${smoke!.durationMs} ms` : "—"}
                      </div>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground">Executado</div>
                      <div className="font-medium">
                        {smoke!.ranAt
                          ? formatDistanceToNow(parseISO(smoke!.ranAt), { addSuffix: true, locale: ptBR })
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {smoke!.testFile && (
                    <div className="text-xs text-muted-foreground">
                      Arquivo: <code className="font-mono">{smoke!.testFile}</code>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {smoke!.ci?.runUrl && (
                      <Button asChild variant="outline" size="sm">
                        <a href={smoke!.ci.runUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Abrir execução
                        </a>
                      </Button>
                    )}
                    {smoke!.ci?.prNumber && smoke!.ci.prUrl && (
                      <Button asChild variant="outline" size="sm">
                        <a href={smoke!.ci.prUrl} target="_blank" rel="noopener noreferrer">
                          <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                          PR #{smoke!.ci.prNumber}
                          {smoke!.ci.branch ? ` · ${smoke!.ci.branch}` : ""}
                        </a>
                      </Button>
                    )}
                    {smoke!.log?.path && (
                      <Button asChild variant="outline" size="sm">
                        <a href={smoke!.log.path} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                          Log completo
                          {typeof smoke!.log.sizeBytes === "number" &&
                            ` (${(smoke!.log.sizeBytes / 1024).toFixed(1)} KB)`}
                        </a>
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* PR smoke artifact card — surfaces the most recent
          `dependency-health-smoke-*` artifact uploaded by the
          smoke-date-fns workflow on pull_request runs. The main snapshot
          card above only ever reflects what's committed to `main`; this
          card is the only way to see in-flight PR results without
          navigating to GitHub Actions. */}
      <Card aria-labelledby="pr-smoke-card-title">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle id="pr-smoke-card-title" className="flex items-center gap-2 text-lg">
                <GitBranch className="h-5 w-5 text-primary" />
                Smoke test de PR (último artefato)
                <Badge
                  variant={
                    prSmoke?.status === "ok"
                      ? "default"
                      : prSmoke?.status === "error"
                      ? "destructive"
                      : "secondary"
                  }
                  className="ml-2"
                >
                  {prSmokeLoading
                    ? "Carregando..."
                    : prSmoke?.status === "ok"
                    ? prSmoke.artifact?.prNumber
                      ? `PR #${prSmoke.artifact.prNumber}`
                      : "Disponível"
                    : prSmoke?.status === "empty"
                    ? "Sem PRs recentes"
                    : prSmoke?.status === "skipped"
                    ? "Não configurado"
                    : prSmoke?.status === "error"
                    ? "Erro"
                    : "—"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Artefato <code className="font-mono text-xs">dependency-health-smoke-*</code> mais
                recente da API do GitHub. Diferente do card acima (que só reflete{" "}
                <code className="font-mono text-xs">main</code>), este mostra o último resultado de
                pull request — útil para revisar PRs antes do merge.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchPrSmoke()}
              disabled={prSmokeLoading}
              aria-label="Recarregar artefato de PR"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${prSmokeLoading ? "animate-spin" : ""}`} />
              Recarregar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {prSmoke?.status === "skipped" && (
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>Integração com GitHub não configurada</AlertTitle>
              <AlertDescription>
                {prSmoke.reason ?? "GITHUB_DISPATCH_TOKEN ausente nas secrets da edge function."}
              </AlertDescription>
            </Alert>
          )}
          {prSmoke?.status === "error" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Falha ao consultar a API do GitHub</AlertTitle>
              <AlertDescription className="font-mono text-xs">
                {prSmoke.reason ?? "Erro desconhecido"}
              </AlertDescription>
            </Alert>
          )}
          {prSmoke?.status === "empty" && (
            <p className="text-muted-foreground">
              Nenhum artefato de PR encontrado nos últimos 14 dias (período de retenção). Abra um PR
              que toque <code className="font-mono text-xs">src/**</code> para gerar o primeiro.
            </p>
          )}
          {prSmoke?.status === "ok" && prSmoke.artifact && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Branch</div>
                  <div className="font-medium font-mono text-xs truncate">
                    {prSmoke.artifact.headBranch ?? "—"}
                  </div>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Commit</div>
                  <div className="font-medium font-mono text-xs">
                    {prSmoke.artifact.headSha?.slice(0, 7) ?? "—"}
                  </div>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Gerado</div>
                  <div className="font-medium">
                    {formatDistanceToNow(parseISO(prSmoke.artifact.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Tamanho</div>
                  <div className="font-medium">
                    {(prSmoke.artifact.sizeBytes / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild variant="outline" size="sm">
                  <a href={prSmoke.artifact.webUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Abrir execução
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={prSmoke.artifact.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Baixar artefato (.zip)
                  </a>
                </Button>
                {prSmoke.artifact.prNumber && (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`https://github.com/${(prSmoke.artifact.webUrl.match(/github\.com\/([^/]+\/[^/]+)/) ?? [])[1]}/pull/${prSmoke.artifact.prNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                      PR #{prSmoke.artifact.prNumber}
                    </a>
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                Expira{" "}
                {formatDistanceToNow(parseISO(prSmoke.artifact.expiresAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}{" "}
                · {prSmoke.totalScanned ?? 0} artefato(s) de PR ativos no repositório.
              </p>
            </>
          )}
        </CardContent>
      </Card>

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
