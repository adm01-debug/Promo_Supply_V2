import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveApprovalDeadline } from "../deadlineFallback";
import { getTimeStatus } from "../pendingApprovalsData";

const H = 60 * 60 * 1000;
const D = 24 * H;

describe("resolveApprovalDeadline", () => {
  const stepPrazo = "2026-08-01T12:00:00.000Z";
  const workflowPrazo = "2026-08-02T12:00:00.000Z";
  const workflowCreated = "2026-07-20T00:00:00.000Z";
  const stepCreated = "2026-07-21T00:00:00.000Z";

  it("prioriza step.prazo_limite quando presente", () => {
    expect(
      resolveApprovalDeadline({
        stepPrazoLimite: stepPrazo,
        workflowPrazoLimite: workflowPrazo,
        workflowCreatedAt: workflowCreated,
        stepCreatedAt: stepCreated,
      }),
    ).toBe(stepPrazo);
  });

  it("cai para workflow.prazo_limite quando step é nulo", () => {
    expect(
      resolveApprovalDeadline({
        stepPrazoLimite: null,
        workflowPrazoLimite: workflowPrazo,
        workflowCreatedAt: workflowCreated,
        stepCreatedAt: stepCreated,
      }),
    ).toBe(workflowPrazo);
  });

  it("usa workflow.created_at + 24h quando ambos prazos são nulos", () => {
    const result = resolveApprovalDeadline({
      stepPrazoLimite: null,
      workflowPrazoLimite: null,
      workflowCreatedAt: workflowCreated,
      stepCreatedAt: stepCreated,
    });
    expect(new Date(result).getTime()).toBe(new Date(workflowCreated).getTime() + D);
  });

  it("usa step.created_at + 24h quando workflow.created_at também é nulo", () => {
    const result = resolveApprovalDeadline({
      stepPrazoLimite: null,
      workflowPrazoLimite: null,
      workflowCreatedAt: null,
      stepCreatedAt: stepCreated,
    });
    expect(new Date(result).getTime()).toBe(new Date(stepCreated).getTime() + D);
  });

  it("nunca retorna 'agora' — fallback fica no futuro mesmo sem nenhuma data", () => {
    vi.useFakeTimers();
    const now = new Date("2026-07-23T10:00:00.000Z");
    vi.setSystemTime(now);
    try {
      const result = resolveApprovalDeadline({
        stepPrazoLimite: null,
        workflowPrazoLimite: null,
        workflowCreatedAt: null,
        stepCreatedAt: null,
      });
      expect(new Date(result).getTime()).toBe(now.getTime() + D);
    } finally {
      vi.useRealTimers();
    }
  });

  it("trata strings inválidas de created_at caindo para now + 24h", () => {
    vi.useFakeTimers();
    const now = new Date("2026-07-23T10:00:00.000Z");
    vi.setSystemTime(now);
    try {
      const result = resolveApprovalDeadline({
        stepPrazoLimite: null,
        workflowPrazoLimite: null,
        workflowCreatedAt: "not-a-date",
        stepCreatedAt: null,
      });
      expect(new Date(result).getTime()).toBe(now.getTime() + D);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("integração com getTimeStatus (regressão de falso 'vencida')", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T10:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("aprovação criada agora sem prazo_limite NÃO aparece como vencida", () => {
    const workflowCreated = new Date().toISOString();
    const deadline = resolveApprovalDeadline({
      stepPrazoLimite: null,
      workflowPrazoLimite: null,
      workflowCreatedAt: workflowCreated,
      stepCreatedAt: workflowCreated,
    });
    expect(getTimeStatus(deadline).status).not.toBe("overdue");
  });

  it("aprovação já vencida via step.prazo_limite continua marcada como overdue", () => {
    const past = new Date(Date.now() - 2 * H).toISOString();
    const deadline = resolveApprovalDeadline({
      stepPrazoLimite: past,
      workflowPrazoLimite: null,
      workflowCreatedAt: new Date().toISOString(),
      stepCreatedAt: new Date().toISOString(),
    });
    expect(getTimeStatus(deadline).status).toBe("overdue");
  });
});
