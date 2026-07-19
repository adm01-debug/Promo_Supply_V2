import { z } from 'zod';

export const NegotiationSchema = z.object({
  cotacoes: z.array(z.object({
    id: z.string().uuid(),
    fornecedor: z.string(),
    total: z.number().positive(),
  })),
  solicitacao: z.object({
    id: z.string().uuid(),
    titulo: z.string().min(3),
  }),
});

export const WorkflowSchema = z.object({
  action: z.enum(['start_workflow', 'approve_step', 'submit_decision']),
  tenant_id: z.string().uuid().optional(),
  entity_id: z.string().uuid().optional(),
  instance_id: z.string().uuid().optional(),
});

export const ApprovalDecisionSchema = z.object({
  workflow_id: z.string().uuid(),
  step_id: z.string().uuid(),
  decision: z.enum(['approved', 'rejected', 'delegated']),
  comment: z.string().optional(),
  delegate_to: z.string().uuid().optional(),
});
