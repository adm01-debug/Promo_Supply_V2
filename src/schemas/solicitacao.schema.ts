import { z } from "zod";

export const solicitacaoSchema = z.object({
  empresa: z.string().min(1, "Selecione a empresa"),
  vendedor: z.string().min(1, "Selecione o vendedor"),
  produto: z.string().min(2, "O nome do produto deve ter pelo menos 2 caracteres").max(200, "Nome do produto muito longo"),
  categoriaId: z.string().min(1, "Selecione a categoria"),
  quantidade: z.number().int().positive("A quantidade deve ser maior que zero"),
  tipo: z.enum(['PE_LISO', 'FAB_LISO', 'FAB_PERSONALIZADO']),
  prazoEntrega: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date >= new Date(new Date().setHours(0, 0, 0, 0));
  }, "O prazo de entrega deve ser uma data futura"),
  observacoes: z.string().max(2000, "As observações não podem exceder 2000 caracteres").optional(),
  prioridade: z.enum(['baixa', 'normal', 'alta', 'urgente']),
  valorEstimado: z.number().nonnegative("O valor estimado não pode ser negativo"),
  centroCusto: z.string().optional(),
  costCenterId: z.string().min(1, "Selecione o centro de custo"),
  anexos: z.array(z.any()).optional(),
});

export type SolicitacaoFormData = z.infer<typeof solicitacaoSchema>;
