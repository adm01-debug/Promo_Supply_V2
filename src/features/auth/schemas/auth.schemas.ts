import { z } from 'zod';

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  full_name: z.string().nullable(),
  email: z.string().email().nullable(),
  avatar_url: z.string().url().nullable().or(z.literal('')),
  department: z.string().nullable(),
  phone: z.string().nullable(),
  current_organization_id: z.string().uuid().nullable(),
  empresa_default_id: z.string().uuid().nullable().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const RegimeTributarioSchema = z.enum([
  'simples_nacional',
  'lucro_presumido',
  'lucro_real',
  'mei',
]);
export type RegimeTributario = z.infer<typeof RegimeTributarioSchema>;

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  cnpj: z.string().nullable().optional(),
  razao_social: z.string().nullable().optional(),
  nome_fantasia: z.string().nullable().optional(),
  uf: z.string().nullable().optional(),
  regime_tributario: RegimeTributarioSchema.nullable().optional(),
  cor_identificacao: z.string().nullable().optional(),
  empresa_codigo: z.string().nullable().optional(),
  organization_id: z.string().uuid().nullable().optional(),
});

export type Tenant = z.infer<typeof TenantSchema>;
/** Alias semântico — uma empresa do grupo */
export type Empresa = Tenant;
