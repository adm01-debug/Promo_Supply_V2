import { useMemo } from "react";
import { Check, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineStep {
  label: string;
  status: "completed" | "current" | "upcoming";
  date?: string;
}

interface StatusTimelineProps {
  currentStatus: string;
  dates?: {
    created_at?: string;
    data_cotacao?: string;
    data_aprovacao?: string;
    data_pedido?: string;
    data_entrega?: string;
    data_pagamento?: string;
  };
  compact?: boolean;
}

const STATUS_FLOW = [
  { key: "pendente", label: "Solicitação" },
  { key: "em_cotacao", label: "Cotação" },
  { key: "cotada", label: "Cotada" },
  { key: "aprovada", label: "Aprovada" },
  { key: "em_andamento", label: "Pedido" },
  { key: "concluida", label: "Concluída" },
];

const STATUS_INDEX: Record<string, number> = {};
STATUS_FLOW.forEach((s, i) => {
  STATUS_INDEX[s.key] = i;
});

export function StatusTimeline({ currentStatus, dates, compact = false }: StatusTimelineProps) {
  const steps = useMemo<TimelineStep[]>(() => {
    const currentIdx = STATUS_INDEX[currentStatus] ?? -1;

    if (currentStatus === "cancelada") {
      return STATUS_FLOW.map((s, i) => ({
        label: s.label,
        status: "upcoming" as const,
      }));
    }

    return STATUS_FLOW.map((s, i) => ({
      label: s.label,
      status:
        i < currentIdx
          ? ("completed" as const)
          : i === currentIdx
          ? ("current" as const)
          : ("upcoming" as const),
    }));
  }, [currentStatus]);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                step.status === "completed" && "bg-green-500",
                step.status === "current" && "bg-primary animate-pulse",
                step.status === "upcoming" && "bg-muted-foreground/30"
              )}
              title={step.label}
            />
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-3 h-0.5",
                  step.status === "completed" ? "bg-green-500" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center flex-1 min-w-0">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 shrink-0",
                step.status === "completed" &&
                  "bg-green-500 border-green-500 text-white",
                step.status === "current" &&
                  "bg-primary border-primary text-primary-foreground animate-pulse",
                step.status === "upcoming" &&
                  "bg-background border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {step.status === "completed" ? (
                <Check className="w-3 h-3" />
              ) : step.status === "current" ? (
                <Clock className="w-3 h-3" />
              ) : (
                <Circle className="w-2.5 h-2.5" />
              )}
            </div>
            <span
              className={cn(
                "text-[10px] text-center leading-tight whitespace-nowrap",
                step.status === "completed" && "text-green-600 font-medium",
                step.status === "current" && "text-primary font-semibold",
                step.status === "upcoming" && "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 mx-1 min-w-2",
                step.status === "completed" ? "bg-green-500" : "bg-muted-foreground/20"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
