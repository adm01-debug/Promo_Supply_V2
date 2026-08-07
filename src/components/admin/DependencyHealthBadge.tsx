import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

interface PackageEntry {
  name: string;
  driftDetected?: boolean;
}

interface SmokeCi {
  event?: string | null;
  runUrl?: string;
  prNumber?: number;
  prUrl?: string;
  branch?: string | null;
}

interface SmokeLog {
  path?: string;
  sizeBytes?: number;
  capturedAt?: string;
}

interface SmokeTest {
  status?: "pass" | "fail" | string;
  ranAt?: string;
  durationMs?: number;
  ci?: SmokeCi;
  log?: SmokeLog;
}

interface DepHealthSnapshot {
  generatedAt?: string;
  lockfileDrift?: { detected?: boolean };
  packages?: PackageEntry[];
  treeShaking?: { riskLevel?: "ok" | "warning" | "critical" | string };
  smokeTest?: SmokeTest;
}

type Tone = "ok" | "warn" | "fail" | "unknown";

interface Status {
  tone: Tone;
  label: string;
  dotClass: string;
  reasons: string[];
}

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

function computeStatus(snap: DepHealthSnapshot | null | undefined): Status {
  if (!snap) {
    return { tone: "unknown", label: "CI ?", dotClass: "bg-muted-foreground", reasons: ["Snapshot indisponível"] };
  }

  const reasons: string[] = [];
  const driftedPkgs = (snap.packages ?? []).filter((p) => p.driftDetected);
  const lockDrift = snap.lockfileDrift?.detected === true;
  const risk = snap.treeShaking?.riskLevel;
  const smoke = snap.smokeTest?.status;
  const generatedAt = snap.generatedAt ? new Date(snap.generatedAt).getTime() : null;
  const ageMs = generatedAt ? Date.now() - generatedAt : null;
  const stale = ageMs !== null && ageMs > STALE_MS;

  if (lockDrift) reasons.push("Lockfile drift detectado");
  if (risk === "critical") reasons.push("Tree-shaking: risco crítico");
  if (smoke === "fail") reasons.push("Smoke test falhou");

  if (lockDrift || risk === "critical" || smoke === "fail") {
    return { tone: "fail", label: "CI falhou", dotClass: "bg-destructive", reasons };
  }

  if (driftedPkgs.length > 0) reasons.push(`${driftedPkgs.length} pacote(s) com drift`);
  if (risk === "warning") reasons.push("Tree-shaking: aviso");
  if (stale) reasons.push("Verificação antiga (>7d)");

  if (driftedPkgs.length > 0 || risk === "warning" || stale) {
    return { tone: "warn", label: "CI atenção", dotClass: "bg-warning", reasons };
  }

  return { tone: "ok", label: "CI OK", dotClass: "bg-success", reasons: ["Sem drift", "Sem riscos"] };
}

function formatRelative(iso?: string): string {
  if (!iso) return "desconhecido";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return "desconhecido";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "agora há pouco";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

const DependencyHealthBadge = () => {
  const navigate = useNavigate();
  const { isAdmin } = usePermissions() as { isAdmin?: boolean };

  const { data, isSuccess, isError } = useQuery({
    queryKey: ["dep-health-static"],
    queryFn: async (): Promise<DepHealthSnapshot | null> => {
      const res = await fetch("/dependency-health.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as DepHealthSnapshot;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  if (!isAdmin) return null;
  if (!isSuccess && !isError) return null;
  if (isError || !data) return null;

  const status = computeStatus(data);
  const smoke = data.smokeTest;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/dependency-health")}
          aria-label={`Status do CI: ${status.label}`}
          className="gap-1.5 h-8 px-2"
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              status.dotClass,
              status.tone === "fail" && "animate-pulse",
            )}
            aria-hidden="true"
          />
          <span className="hidden md:inline text-xs">{status.label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent align="end" className="max-w-xs">
        <div className="space-y-1 text-xs">
          <p className="font-semibold">{status.label}</p>
          <p className="text-muted-foreground">
            Última verificação {formatRelative(data.generatedAt)}
          </p>
          {status.reasons.length > 0 && (
            <ul className="list-disc list-inside space-y-0.5">
              {status.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          {smoke?.status && (
            <div className="pt-1 border-t border-border/50 space-y-0.5">
              <p>
                Smoke test: <span className="font-medium">{smoke.status}</span>
                {typeof smoke.durationMs === "number" && ` (${smoke.durationMs}ms)`}
              </p>
              {smoke.ci?.prNumber && smoke.ci.prUrl && (
                <p className="text-muted-foreground">
                  PR{" "}
                  <a
                    href={smoke.ci.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    #{smoke.ci.prNumber}
                  </a>
                  {smoke.ci.branch && ` · ${smoke.ci.branch}`}
                </p>
              )}
              {smoke.ci?.runUrl && (
                <p className="text-muted-foreground">
                  <a
                    href={smoke.ci.runUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Abrir execução no GitHub Actions
                  </a>
                </p>
              )}
              {smoke.log?.path && (
                <p className="text-muted-foreground">
                  <a
                    href={smoke.log.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Log completo do vitest
                  </a>
                  {typeof smoke.log.sizeBytes === "number" &&
                    ` (${(smoke.log.sizeBytes / 1024).toFixed(1)} KB)`}
                </p>
              )}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default DependencyHealthBadge;
