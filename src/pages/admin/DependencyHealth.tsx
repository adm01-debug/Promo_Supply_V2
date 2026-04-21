import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Package, Lock, Clock, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { parseISO } from "date-fns/parseISO";
import { ptBR } from "date-fns/locale/pt-BR";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface DependencyHealthSnapshot {
  generatedAt: string;
  dateFns: {
    spec: string;
    installed: string;
    locked: string;
    exactPinned: boolean;
  };
  lockfileDrift: {
    detected: boolean;
    lastCheckedAt: string;
    source: string;
  };
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

  const { dateFns, lockfileDrift, generatedAt } = data;
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
          <Button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            variant="outline"
            aria-label="Atualizar snapshot agora"
          >
            <RefreshCw className={`h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`} />
            {refresh.isPending ? "Atualizando…" : "Atualizar agora"}
          </Button>
        )}
      </div>

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
          {lockfileDrift.detected ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Drift detectado</AlertTitle>
              <AlertDescription>
                <code className="font-mono">package.json</code> e <code className="font-mono">bun.lock</code>{" "}
                divergem. Rode <code className="font-mono">bun install</code> e commit do lockfile.
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
    </div>
  );
};

export default DependencyHealth;
