import { useState } from "react";
import { AlertTriangle, RotateCcw, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import {
  useApprovalWorkflow,
} from "@/hooks/useApprovalWorkflow";
import type { WorkflowDLQEntry } from "@/hooks/useWorkflowDLQ";

const TYPE_LABEL: Record<WorkflowDLQEntry["type"], string> = {
  create_workflow: "Criar workflow",
  approve_step: "Aprovar etapa",
  reject_step: "Rejeitar etapa",
  escalate: "Escalar",
};

/**
 * Dead-letter queue retry surface for failed approval operations.
 * Lists operations that failed transiently and were pushed to the DLQ,
 * letting the user retry, drop, or clear them. Wired to the same actions
 * used by live approval flows so a successful retry reuses the full path.
 */
export function WorkflowDLQPanel() {
  const { workflowDLQ, retryDLQEntry } = useApprovalWorkflow();
  const { dlqEntries, retryableEntries, removeEntry, clearDLQ } = workflowDLQ;
  const [busyId, setBusyId] = useState<string | null>(null);

  if (dlqEntries.length === 0) return null;

  const handleRetry = async (entry: WorkflowDLQEntry) => {
    setBusyId(entry.id);
    try {
      const ok = await retryDLQEntry(entry.id);
      if (!ok) {
        logger.info("DLQ retry ainda falhou; entrada mantida", { id: entry.id });
      }
    } catch (err) {
      logger.error("Erro inesperado ao reprocessar DLQ", { err });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-4 h-4" />
          Aprovações pendentes de reprocessamento
          <Badge variant="destructive" className="ml-auto">{dlqEntries.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {dlqEntries.map((entry) => {
          const canRetry = retryableEntries.some(e => e.id === entry.id);
          const typeLabel = TYPE_LABEL[entry.type] ?? entry.type;
          const label =
            entry.type === "approve_step" || entry.type === "reject_step"
              ? (entry.payload.stepId as string)?.slice(0, 8)
              : (entry.payload.solicitacaoId as string)?.slice(0, 8);
          return (
            <div
              key={entry.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/40 border border-border/60"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {typeLabel} {label ? `• ${label}` : ""}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {entry.lastError}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {entry.retryCount}/3 tentativas
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!canRetry || busyId === entry.id}
                onClick={() => handleRetry(entry)}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Retry
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === entry.id}
                onClick={() => removeEntry(entry.id)}
                aria-label="Descartar operação"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          );
        })}
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-xs text-muted-foreground"
          onClick={() => clearDLQ()}
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Limpar todos
        </Button>
      </CardContent>
    </Card>
  );
}