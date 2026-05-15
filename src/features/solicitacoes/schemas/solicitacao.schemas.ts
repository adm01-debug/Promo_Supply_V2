import { z } from 'zod';

export const SolicitacaoStatusSchema = z.enum([
  'pendente', 'em_cotacao', 'aprovada', 'rejeitada', 'em_andamento', 'concluida', 'cancelada'
]);

export const SolicitacaoPrioridadeSchema = z.enum(['baixa', 'media', 'alta', 'urgente']);

export const CreateSolicitacaoSchema = z.object({
  titulo: z.string().min(3, "O título deve ter pelo menos 3 caracteres").max(200),
  descricao: z.string().optional().nullable(),
  tipo: z.string(),
  prioridade: SolicitacaoPrioridadeSchema.default('media'),
  valor_estimado: z.number().positive("O valor estimado deve ser positivo").optional().nullable(),
  quantidade: z.number().positive("A quantidade deve ser maior que zero").default(1),
  unidade: z.string().default('un'),
  data_necessidade: z.string().optional().nullable(),
  departamento: z.string().optional().nullable(),
  centro_custo: z.string().optional().nullable(),
  cost_center_id: z.string().uuid().optional().nullable(),
  justificativa: z.string().optional().nullable(),
  categoria_id: z.string().uuid().optional().nullable(),
});

export type CreateSolicitacaoInput = z.infer<typeof CreateSolicitacaoSchema>;
