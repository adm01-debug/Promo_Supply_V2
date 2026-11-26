/**
 * Resolves the effective deadline for a pending approval step.
 *
 * Priority:
 *   1. `stepPrazoLimite`   — deadline set directly on the step
 *   2. `workflowPrazoLimite` — deadline inherited from the parent workflow
 *   3. `(workflowCreatedAt ?? stepCreatedAt) + 24h` — safe fallback
 *
 * Never returns "now", which would falsely mark the item as overdue.
 * Returns an ISO string (UTC).
 *
 * If both `workflowCreatedAt` and `stepCreatedAt` are missing/invalid,
 * falls back to `Date.now() + 24h` so the item is not immediately overdue.
 */
export function resolveApprovalDeadline(input: {
  stepPrazoLimite?: string | null;
  workflowPrazoLimite?: string | null;
  workflowCreatedAt?: string | null;
  stepCreatedAt?: string | null;
}): string {
  const { stepPrazoLimite, workflowPrazoLimite, workflowCreatedAt, stepCreatedAt } = input;

  if (stepPrazoLimite) return stepPrazoLimite;
  if (workflowPrazoLimite) return workflowPrazoLimite;

  const base = workflowCreatedAt ?? stepCreatedAt ?? null;
  const baseMs = base ? new Date(base).getTime() : Number.NaN;
  const anchor = Number.isFinite(baseMs) ? baseMs : Date.now();
  return new Date(anchor + 24 * 60 * 60 * 1000).toISOString();
}
