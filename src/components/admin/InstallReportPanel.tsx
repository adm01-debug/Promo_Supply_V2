import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, PackageCheck, FileLock2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InstallReport {
  generatedAt: string | null;
  dateFns: {
    spec: string;
    specNormalized: string;
    locked: string;
    installed: string;
    pkgSha256: string;
    exactPinned: boolean;
  };
  bunLock: { sha256: string; sizeBytes: number };
  alignment: {
    aligned: boolean;
    specEqLocked: boolean;
    lockedEqInstalled: boolean;
    specEqInstalled: boolean;
  };
  strict: boolean;
}

const fetchReport = async (): Promise<InstallReport> => {
  const res = await fetch("/install-report.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const formatBytes = (n: number) => {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

const InstallReportPanel = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["install-report"],
    queryFn: fetchReport,
    staleTime: 60_000,
    retry: false,
  });

  const driftMessages: string[] = [];
  if (data) {
    if (!data.alignment.specEqLocked) driftMessages.push("package.json ≠ bun.lock");
    if (!data.alignment.lockedEqInstalled) driftMessages.push("bun.lock ≠ node_modules");
    if (!data.alignment.specEqInstalled) driftMessages.push("package.json ≠ node_modules");
    if (!data.dateFns.exactPinned) driftMessages.push("spec não pinada exatamente");
  }
  const hasDrift = !!data && (!data.alignment.aligned || !data.dateFns.exactPinned);

  const toastFiredRef = useRef(false);
  const driftSummary = driftMessages.join(" · ");
  useEffect(() => {
    if (hasDrift && !toastFiredRef.current) {
      toastFiredRef.current = true;
      toast({
        title: "Drift de instalação detectado",
        description: driftSummary || "Spec / lock / installed divergentes.",
        variant: "destructive",
      });
    }
  }, [hasDrift, driftSummary]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Carregando relatório de instalação…
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PackageCheck className="h-5 w-5 text-primary" />
            Relatório de instalação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Relatório não encontrado</AlertTitle>
            <AlertDescription>
              Execute <code className="font-mono">bun run verify:install-report</code> para gerá-lo.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { dateFns, bunLock, alignment, generatedAt } = data;

  return (
    <Card className={hasDrift ? "border-destructive/50" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PackageCheck className="h-5 w-5 text-primary" />
          Relatório de instalação
        </CardTitle>
        <CardDescription>
          Saída de <code className="font-mono">bun install</code> + <code className="font-mono">scripts/install-report.mjs</code>.

  return (
    <Card className={hasDrift ? "border-destructive/50" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PackageCheck className="h-5 w-5 text-primary" />
          Relatório de instalação
        </CardTitle>
        <CardDescription>
          Saída de <code className="font-mono">bun install</code> + <code className="font-mono">scripts/install-report.mjs</code>.
          {generatedAt && (
            <> Gerado em <span className="font-mono">{generatedAt}</span>.</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alignment */}
        <div className="flex flex-wrap items-center gap-2">
          {alignment.aligned ? (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              spec / lock / installed alinhados
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Drift detectado
            </Badge>
          )}
          {!dateFns.exactPinned && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Spec não pinada exatamente
            </Badge>
          )}
        </div>

        {/* Drift breakdown */}
        {!alignment.aligned && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className={`rounded-md border p-2 ${alignment.specEqLocked ? "" : "border-destructive/50 bg-destructive/5"}`}>
              <div className="text-muted-foreground">spec ↔ locked</div>
              <div className="font-medium">{alignment.specEqLocked ? "OK" : "Divergente"}</div>
            </div>
            <div className={`rounded-md border p-2 ${alignment.lockedEqInstalled ? "" : "border-destructive/50 bg-destructive/5"}`}>
              <div className="text-muted-foreground">locked ↔ installed</div>
              <div className="font-medium">{alignment.lockedEqInstalled ? "OK" : "Divergente"}</div>
            </div>
            <div className={`rounded-md border p-2 ${alignment.specEqInstalled ? "" : "border-destructive/50 bg-destructive/5"}`}>
              <div className="text-muted-foreground">spec ↔ installed</div>
              <div className="font-medium">{alignment.specEqInstalled ? "OK" : "Divergente"}</div>
            </div>
          </div>
        )}

        {/* date-fns versions */}
        <div>
          <div className="text-sm font-medium mb-2">date-fns</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
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
          <div className="mt-2 text-xs text-muted-foreground font-mono break-all">
            pkg sha256: {dateFns.pkgSha256}
          </div>
        </div>

        {/* Lockfile */}
        <div>
          <div className="text-sm font-medium mb-2 flex items-center gap-2">
            <FileLock2 className="h-4 w-4 text-muted-foreground" />
            bun.lock
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">sha256</div>
              <div className="font-mono break-all">{bunLock.sha256}</div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">tamanho</div>
              <div className="font-mono">{formatBytes(bunLock.sizeBytes)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstallReportPanel;
